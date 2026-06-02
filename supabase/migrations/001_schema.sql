-- Prime Trade Capitals — full schema (run once on a fresh Supabase project)
-- Order: 001_schema.sql → storage_policies.sql → seed.sql

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'stock', 'ai_bot', 'copy_trade');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('personal', 'corporate', 'managed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend transaction_type on databases created before stock / bot / copy types existed
DO $$ BEGIN ALTER TYPE transaction_type ADD VALUE 'stock'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE transaction_type ADD VALUE 'ai_bot'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE transaction_type ADD VALUE 'copy_trade'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  min_deposit NUMERIC(18, 2) NOT NULL,
  max_deposit NUMERIC(18, 2) NOT NULL,
  duration_days INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  country TEXT,
  account_type account_type NOT NULL DEFAULT 'personal',
  kyc_status kyc_status NOT NULL DEFAULT 'pending',
  active_plan_id UUID REFERENCES investment_plans(id) ON DELETE SET NULL,
  active_plan_deposit NUMERIC(18, 2),
  active_plan_ends TIMESTAMPTZ,
  balance NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  profit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  referral_earnings NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (referral_earnings >= 0),
  sponsor_username TEXT,
  role user_role NOT NULL DEFAULT 'user',
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES investment_plans(id),
  deposit_amount NUMERIC(18, 2) NOT NULL CHECK (deposit_amount > 0),
  status subscription_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  status transaction_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  reference_note TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  review_status document_review_status NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_name TEXT,
  investment_plan TEXT,
  amount NUMERIC(18, 2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'roi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill columns when re-running against an older schema
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type account_type NOT NULL DEFAULT 'personal';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_plan_deposit NUMERIC(18, 2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_plan_ends TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profit NUMERIC(18, 2) NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_earnings NUMERIC(18, 2) NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sponsor_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Admin helper (created early so storage_policies.sql can run even if later steps fail)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_sponsor ON profiles (lower(sponsor_username));
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_subscriptions_user ON plan_subscriptions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user ON kyc_documents (user_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_roi_history_user_created ON roi_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages (created_at DESC);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '')
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Admin transaction RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_transaction(tx_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO tx FROM transactions WHERE id = tx_id FOR UPDATE;
  IF tx IS NULL THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF tx.status != 'pending' THEN RAISE EXCEPTION 'Transaction not pending'; END IF;

  IF tx.type = 'deposit' THEN
    UPDATE profiles
    SET balance = balance + tx.amount, updated_at = now()
    WHERE id = tx.user_id;
  ELSIF tx.type = 'withdrawal' THEN
    IF tx.amount > (SELECT balance FROM profiles WHERE id = tx.user_id) THEN
      RAISE EXCEPTION 'Insufficient user balance';
    END IF;
    UPDATE profiles
    SET balance = balance - tx.amount, updated_at = now()
    WHERE id = tx.user_id;
  END IF;

  UPDATE transactions
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_transaction(tx_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO tx FROM transactions WHERE id = tx_id FOR UPDATE;
  IF tx IS NULL THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF tx.status != 'pending' THEN RAISE EXCEPTION 'Transaction not pending'; END IF;

  UPDATE transactions
  SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = tx_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Drop policies so this file can be re-run safely
DROP POLICY IF EXISTS "Plans are public" ON investment_plans;
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users read own subscriptions" ON plan_subscriptions;
DROP POLICY IF EXISTS "Users insert own subscriptions" ON plan_subscriptions;
DROP POLICY IF EXISTS "Admins read all subscriptions" ON plan_subscriptions;
DROP POLICY IF EXISTS "Users read own transactions" ON transactions;
DROP POLICY IF EXISTS "Users insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins read all transactions" ON transactions;
DROP POLICY IF EXISTS "Users read own kyc" ON kyc_documents;
DROP POLICY IF EXISTS "Users insert own kyc" ON kyc_documents;
DROP POLICY IF EXISTS "Admins read all kyc" ON kyc_documents;
DROP POLICY IF EXISTS "Admins update kyc review" ON kyc_documents;
DROP POLICY IF EXISTS "Users read own roi" ON roi_history;
DROP POLICY IF EXISTS "Admins manage roi" ON roi_history;
DROP POLICY IF EXISTS "Public insert contact" ON contact_messages;
DROP POLICY IF EXISTS "Admins read contact" ON contact_messages;

CREATE POLICY "Plans are public"
  ON investment_plans FOR SELECT
  USING (true);

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Users read own subscriptions"
  ON plan_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own subscriptions"
  ON plan_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all subscriptions"
  ON plan_subscriptions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users read own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all transactions"
  ON transactions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users read own kyc"
  ON kyc_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own kyc"
  ON kyc_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all kyc"
  ON kyc_documents FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins update kyc review"
  ON kyc_documents FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Users read own roi"
  ON roi_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roi"
  ON roi_history FOR ALL
  USING (public.is_admin());

CREATE POLICY "Public insert contact"
  ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read contact"
  ON contact_messages FOR SELECT
  USING (public.is_admin());

-- Grant API roles (RLS still applies)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON investment_plans TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT ON plan_subscriptions TO authenticated;
GRANT SELECT, INSERT ON transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON kyc_documents TO authenticated;
GRANT SELECT ON roi_history TO authenticated;
GRANT INSERT ON contact_messages TO anon, authenticated;
GRANT SELECT ON contact_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_transaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_transaction(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage (bucket + admin read policy; user policies in storage_policies.sql)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admins read all KYC files" ON storage.objects;
CREATE POLICY "Admins read all KYC files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.is_admin()
  );
