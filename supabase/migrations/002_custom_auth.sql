-- Prime Trade Capitals custom auth (no Supabase Auth dependency)
-- Run after 001_schema.sql
--
-- This table stores your own username/password auth records and user state.
-- The frontend syncs these records directly using the anon key.
-- NOTE: This is convenient for static hosting but not hardened for hostile traffic.

CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'pbkdf2',
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'personal',
  referral_id TEXT NOT NULL DEFAULT '',
  sponsor_username TEXT,
  referral_earnings NUMERIC(18, 2) NOT NULL DEFAULT 0,
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  active_plan_id TEXT,
  active_plan_deposit NUMERIC(18, 2),
  active_plan_ends TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'user',
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  kyc_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  connected_wallets JSONB NOT NULL DEFAULT '[]'::jsonb,
  stock_holdings JSONB NOT NULL DEFAULT '[]'::jsonb,
  copy_investments JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_bot_investments JSONB NOT NULL DEFAULT '[]'::jsonb,
  roi_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_username_lower
  ON public.app_users (lower(username));

CREATE OR REPLACE FUNCTION public.app_users_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_users_set_updated_at ON public.app_users;
CREATE TRIGGER app_users_set_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW
  EXECUTE FUNCTION public.app_users_set_updated_at();

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Custom auth full access" ON public.app_users;
CREATE POLICY "Custom auth full access"
  ON public.app_users
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.app_users TO anon, authenticated;
