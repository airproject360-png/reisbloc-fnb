-- ============================================================
-- Drop legacy login session RPC overload
-- Date: 2026-04-09
-- Goal: keep a single canonical register_login_session signature
-- ============================================================

DROP FUNCTION IF EXISTS public.register_login_session(
  uuid,
  uuid,
  uuid,
  character varying,
  text,
  jsonb,
  character varying,
  jsonb,
  boolean
);
