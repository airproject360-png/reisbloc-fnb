-- ============================================================
-- Secure audit logging and login session tracking
-- Date: 2026-04-09
-- Goal: keep audit_logs immutable/admin-readable and persist login_sessions with device/IP context
-- ============================================================

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL;

ALTER TABLE public.login_sessions
  ADD COLUMN IF NOT EXISTS mac_address character varying;

CREATE INDEX IF NOT EXISTS idx_audit_device ON public.audit_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_org ON public.login_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON public.login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_device ON public.login_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_mac ON public.login_sessions(mac_address);
CREATE INDEX IF NOT EXISTS idx_login_sessions_created ON public.login_sessions(created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs in their organization" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs in their organization"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "Admins can view login sessions in their organization" ON public.login_sessions;
CREATE POLICY "Admins can view login sessions in their organization"
ON public.login_sessions
FOR SELECT
TO authenticated
USING (
  organization_id = public.current_user_org_id()
  AND public.current_user_role() = 'admin'
);

CREATE OR REPLACE FUNCTION public.record_audit_log(
  p_org_id uuid,
  p_user_id uuid,
  p_action text,
  p_table_name text,
  p_record_id text,
  p_changes jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_device_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    table_name,
    record_id,
    changes,
    ip_address,
    device_id
  ) VALUES (
    p_org_id,
    p_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_changes,
    p_ip_address,
    p_device_id
  )
  RETURNING id INTO new_log_id;

  RETURN new_log_id;
END;
$$;

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
  access_token text;
BEGIN
  new_session_id := gen_random_uuid();
  access_token := encode(gen_random_bytes(32), 'hex');

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
    access_token,
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
    access_token,
    NOW() + INTERVAL '24 hours'
  );

  RETURN json_build_object(
    'session_id', new_session_id,
    'access_token', access_token,
    'requires_2fa', p_requires_2fa,
    'expires_at', NOW() + INTERVAL '24 hours'
  );
END;
$$;
