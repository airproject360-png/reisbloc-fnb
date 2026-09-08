import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clip-signature, x-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * Validates HMAC-SHA256 signature for Clip webhooks.
 * Supports both Hexadecimal and Base64 encoded signatures.
 */
async function verifyClipHmac(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    let signatureBytes: Uint8Array;
    const cleanSig = signature.trim();

    if (/^[0-9a-fA-F]+$/.test(cleanSig)) {
      const match = cleanSig.match(/.{1,2}/g) || [];
      signatureBytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
    } else {
      signatureBytes = Uint8Array.from(atob(cleanSig), c => c.charCodeAt(0));
    }

    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(rawBody)
    );
  } catch (err) {
    console.error('❌ Error verifying Clip HMAC signature:', err);
    return false;
  }
}

serve(async (req) => {
  // 1. Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clipWebhookSecret = Deno.env.get('CLIP_WEBHOOK_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Server Config Error: Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 2. Read raw body as text for cryptographic HMAC verification
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Empty request payload' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Strict HMAC Verification
    const clipSignature = req.headers.get('x-clip-signature') || req.headers.get('x-signature');
    if (clipWebhookSecret) {
      if (!clipSignature) {
        console.warn('🛑 Unauthorized webhook attempt: Missing x-clip-signature header');
        return new Response(
          JSON.stringify({ error: 'Missing webhook signature header' }),
          { status: 401, headers: corsHeaders }
        );
      }

      const isValid = await verifyClipHmac(rawBody, clipSignature, clipWebhookSecret);
      if (!isValid) {
        console.warn('🛑 Forbidden webhook attempt: Invalid HMAC signature');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 403, headers: corsHeaders }
        );
      }
      console.log('🔒 Clip HMAC signature verified successfully');
    } else {
      console.warn('⚠️ WARNING: CLIP_WEBHOOK_SECRET is not configured in Supabase Secrets. Webhook is running unverified.');
    }

    // 4. Parse verified payload
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Malformed JSON payload' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('📥 Verified Clip Webhook received:', JSON.stringify(body));

    const eventType = body.event || body.type || 'payment.paid';
    const data = body.data || body.payload || body;
    const metadata = data.metadata || {};
    const orderId = metadata.order_id || data.reference || data.order_id;
    const paymentId = data.id || data.payment_id || body.id || `clip_${Date.now()}`;
    const amount = Number(data.amount || body.amount || 0);
    const status = String(data.status || body.status || '').toUpperCase();

    if (!orderId) {
      console.warn('⚠️ Webhook missing order_id / reference');
      return new Response(
        JSON.stringify({ message: 'Webhook received but order_id not specified' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 5. Tenant Validation: Verify target order exists and belongs to a valid organization
    const { data: targetOrder, error: orderQueryErr } = await supabaseAdmin
      .from('orders')
      .select('id, organization_id, status, total')
      .eq('id', orderId)
      .maybeSingle();

    if (orderQueryErr || !targetOrder) {
      console.warn(`⚠️ Target order ${orderId} not found in database:`, orderQueryErr?.message);
      return new Response(
        JSON.stringify({ error: 'Referenced order not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 6. Process Payment Event
    if (eventType === 'payment.paid' || status === 'PAID' || status === 'APPROVED') {
      if (targetOrder.status === 'completed') {
        console.log(`ℹ️ Order ${orderId} is already marked completed. Idempotent return.`);
        return new Response(
          JSON.stringify({ success: true, message: 'Order already completed' }),
          { status: 200, headers: corsHeaders }
        );
      }

      console.log(`✅ Updating Order ${orderId} (Org: ${targetOrder.organization_id}) as PAID via Clip`);

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'completed',
          payment_method: 'clip',
          payment_id: String(paymentId),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('organization_id', targetOrder.organization_id);

      if (updateError) {
        console.error('❌ Error updating order status:', updateError.message);
        return new Response(
          JSON.stringify({ error: 'Failed to update order status' }),
          { status: 500, headers: corsHeaders }
        );
      }

      // 7. Audit log with tenant isolation guarantee
      await supabaseAdmin.from('audit_logs').insert({
        organization_id: targetOrder.organization_id,
        action: 'PAYMENT_RECEIVED_CLIP',
        table_name: 'orders',
        record_id: orderId,
        changes: {
          orderId,
          paymentId,
          amount,
          status,
          provider: 'clip',
          verifiedHmac: !!clipWebhookSecret
        },
        created_at: new Date().toISOString()
      }).catch(err => {
        console.warn('⚠️ Could not write audit log:', err?.message);
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Clip Webhook processed successfully' }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Exception processing Clip Webhook:', error?.message || error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
