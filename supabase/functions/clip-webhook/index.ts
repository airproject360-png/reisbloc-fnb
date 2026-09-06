import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clip-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Config error: Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing JSON payload' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('📥 Clip Webhook Payload received:', JSON.stringify(body));

    // Extract transaction details from Clip payload format
    // Clip Webhooks send event type e.g. "payment.created", "payment.paid", "payment.failed"
    const eventType = body.event || body.type || 'payment.paid';
    const data = body.data || body.payload || body;
    const metadata = data.metadata || {};
    const orderId = metadata.order_id || data.reference || data.order_id;
    const paymentId = data.id || data.payment_id || body.id;
    const amount = data.amount || body.amount;
    const status = data.status || body.status;

    if (!orderId) {
      console.warn('⚠️ Webhook missing order_id / reference');
      return new Response(
        JSON.stringify({ message: 'Webhook received but order_id not specified' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (eventType === 'payment.paid' || status === 'PAID' || status === 'APPROVED') {
      console.log(`✅ Updating Order ${orderId} as PAID via Clip (Tx: ${paymentId})`);

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'completed',
          payment_method: 'clip',
          payment_id: paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('❌ Error updating order status in Supabase:', updateError.message);
        return new Response(
          JSON.stringify({ error: 'Failed to update order status' }),
          { status: 500, headers: corsHeaders }
        );
      }

      // Log into audit_logs
      await supabaseAdmin.from('audit_logs').insert({
        event_type: 'PAYMENT_RECEIVED_CLIP',
        description: `Pago procesado en Terminal Clip por $${amount} MXN (Tx: ${paymentId})`,
        metadata: { orderId, paymentId, amount, provider: 'clip' }
      }).catch(() => {});
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
