-- ============================================================
-- User avatar support
-- Date: 2026-04-09
-- Goal: allow profile photos for users (managed by admin UI)
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_path text;

CREATE INDEX IF NOT EXISTS idx_users_avatar_path ON public.users(avatar_path);
