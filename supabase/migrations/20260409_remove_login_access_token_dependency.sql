-- ============================================================
-- Remove unused login access token generation
-- Date: 2026-04-09
-- Goal: avoid gen_random_bytes dependency and keep login session audit deterministic
-- ============================================================

ALTER TABLE public.login_sessions
  DROP COLUMN IF EXISTS access_token;

CREATE OR REPLACE FUNCTION public.register_login_session(
  p_user_id uuid,
  p_org_id uuid,
  p_device_id uuid,
  p_mac_address character varying,
  p_ip_address character varying,
  p_fingerprint text,
  p_geolocation jsonb,
  p_auth_method character varying,
  p_browser character varying DEFAULT NULL,
  p_os character varying DEFAULT NULL,
  p_anomalies jsonb DEFAULT '{}'::jsonb,
  p_requires_2fa boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_session_id uuid;
BEGIN
  new_session_id := gen_random_uuid();

  INSERT INTO public.login_sessions (
    id,
    organization_id,
    user_id,
    device_id,
    mac_address,
    ip_address,
    device_fingerprint,
    geolocation,
    browser,
    os,
    auth_method,
    anomalies,
    requires_2fa,
    two_fa_verified,
    expires_at
  ) VALUES (
    new_session_id,
    p_org_id,
    p_user_id,
    p_device_id,
    p_mac_address,
    p_ip_address,
    p_fingerprint,
    p_geolocation,
    p_browser,
    p_os,
    p_auth_method,
    p_anomalies,
    p_requires_2fa,
    NOT p_requires_2fa,
    NOW() + INTERVAL '24 hours'
  );

  RETURN json_build_object(
    'session_id', new_session_id,
    'requires_2fa', p_requires_2fa,
    'expires_at', NOW() + INTERVAL '24 hours'
  );
END;
$$;
