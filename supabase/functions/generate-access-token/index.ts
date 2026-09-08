import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ============================================================
// FUNCIÓN: Obtener geolocalización por IP
// ============================================================
async function getGeolocation(ipAddress: string): Promise<any> {
  try {
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
      headers: { 'User-Agent': 'Reisbloc-POS' }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      country: data.country,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.warn('⚠️ Geolocation error:', error?.message || error);
    return null;
  }
}

// ============================================================
// FUNCIÓN: Generar JWT con crypto.subtle
// ============================================================
async function generateJWT(
  user: any,
  sessionId: string,
  deviceId: string | null,
  requiresTwoFA: boolean,
  anomalies: any,
  jwtSecret: string
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    sub: user.id,
    iat: now,
    exp: now + (24 * 60 * 60),
    user_id: user.id,
    email: user.name,
    org_id: user.organization_id,
    session_id: sessionId,
    device_id: deviceId,
    requires_2fa: requiresTwoFA,
    user_metadata: { name: user.name, role: user.role }
  };

  const base64url = (str: string) => {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(payload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signatureInput)
    );
    
    const signatureEncoded = base64url(
      String.fromCharCode(...new Uint8Array(signature))
    );

    return `${signatureInput}.${signatureEncoded}`;
  } catch (error: any) {
    console.error('❌ JWT generation error:', error?.message || error);
    throw new Error('Failed to generate JWT');
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Main handler
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Empty body' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { pin, deviceInfo } = body;
    console.log('📥 Auth request: PIN=', pin ? '***' : 'none');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const jwtSecret = Deno.env.get('JWT_SECRET');

    if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
      console.error('❌ CRITICAL: Missing server environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or JWT_SECRET)');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing credentials or JWT_SECRET' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP and fingerprint
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const fingerprint = deviceInfo?.fingerprint || 'unknown';
    const targetOrgId = body.orgId || body.organizationId || body.organization_id;

    console.log('🔍 Request context: IP=', ipAddress, 'Fingerprint=', fingerprint.substring(0, 8) + '***', 'OrgId=', targetOrgId || 'unspecified');

    // ============================================================
    // 1. VALIDATE PIN FORMAT
    // ============================================================
    if (!pin || !/^\d{4,6}$/.test(String(pin))) {
      console.log('❌ Invalid PIN format');
      return new Response(
        JSON.stringify({ error: 'Invalid PIN (4-6 digits required)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ============================================================
    // 2. FIND USER BY PIN (SCOPED TO TENANT)
    // ============================================================
    console.log('🔎 Looking for user with PIN within organization...');
    let userQuery = supabaseAdmin
      .from('users')
      .select('id, name, role, active, organization_id')
      .eq('pin', pin)
      .eq('active', true);

    if (targetOrgId) {
      userQuery = userQuery.eq('organization_id', targetOrgId);
    }

    const { data: users, error: userError } = await userQuery.limit(2);

    if (userError || !users || users.length === 0) {
      console.log('❌ PIN not found in target organization');
      return new Response(
        JSON.stringify({ error: 'Invalid PIN or unauthorized organization' }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (!targetOrgId && users.length > 1) {
      console.warn('⚠️ PIN ambiguity: multiple active users match this PIN across tenants');
      return new Response(
        JSON.stringify({ error: 'Ambiguous PIN. Organization ID must be provided to authenticate.' }),
        { status: 409, headers: corsHeaders }
      );
    }

    const user = users[0];
    console.log('✅ User found:', user.id, 'Role:', user.role, 'Org:', user.organization_id);

    // ============================================================
    // 3. GET GEOLOCATION
    // ============================================================
    let geolocation = null;
    if (ipAddress !== '127.0.0.1') {
      geolocation = await getGeolocation(ipAddress);
      console.log('📍 Geolocation:', geolocation?.city, geolocation?.country);
    }

    // ============================================================
    // 4. DETECT SECURITY ANOMALIES
    // ============================================================
    let requiresTwoFA = false;
    let anomalies: any = {};

    try {
      console.log('🔒 Running anomaly detection...');
      const { data: result, error } = await supabaseAdmin.rpc(
        'detect_security_anomalies',
        {
          p_user_id: user.id,
          p_org_id: user.organization_id,
          p_new_ip: ipAddress,
          p_new_fingerprint: fingerprint,
          p_new_location: geolocation
        }
      );

      if (error) {
        console.error('⚠️ Anomaly detection error:', error.message);
      } else if (result) {
        requiresTwoFA = result.requires_2fa || false;
        anomalies = result.anomalies || {};
        console.log('✅ Anomaly check complete:', { requires_2fa: requiresTwoFA, anomalies });
      }
    } catch (error: any) {
      console.error('⚠️ Anomaly detection exception:', error?.message || error);
    }

    // ============================================================
    // 5. IF 2FA REQUIRED, RETURN 403
    // ============================================================
    if (requiresTwoFA) {
      console.log('🔐 2FA required due to anomalies');
      return new Response(
        JSON.stringify({
          requires_2fa: true,
          message: 'Security anomaly detected. Please verify with Google OAuth.',
          anomalies: anomalies
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // ============================================================
    // 6. REGISTER LOGIN SESSION
    // ============================================================
    let sessionId = null;
    try {
      console.log('📝 Registering login session...');
      const { data: sessionResult, error: sessionError } = await supabaseAdmin.rpc(
        'register_login_session',
        {
          p_user_id: user.id,
          p_org_id: user.organization_id,
          p_device_id: null,
          p_ip_address: ipAddress,
          p_fingerprint: fingerprint,
          p_geolocation: geolocation,
          p_auth_method: 'pin',
          p_anomalies: anomalies,
          p_requires_2fa: false
        }
      );

      if (sessionError) {
        console.error('⚠️ Session registration error:', sessionError.message);
      } else if (sessionResult) {
        sessionId = sessionResult.session_id;
        console.log('✅ Session registered:', sessionId);
      }
    } catch (error: any) {
      console.error('⚠️ Session registration exception:', error?.message || error);
    }

    // ============================================================
    // 7. GENERATE JWT
    // ============================================================
    console.log('🔑 Generating JWT...');
    const accessToken = await generateJWT(
      user,
      sessionId || 'temp-session-' + Date.now(),
      null,
      false,
      anomalies,
      jwtSecret
    );

    console.log('✅ Auth successful for user:', user.id);

    // ============================================================
    // 8. RETURN SUCCESS RESPONSE
    // ============================================================
    return new Response(
      JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 24 * 60 * 60,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          org_id: user.organization_id
        },
        session: {
          id: sessionId,
          requires_2fa: false
        }
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Unexpected error:', error?.message || error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message || String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});