-- Support chat between portal users and admins (custom auth)

CREATE TABLE IF NOT EXISTS public.support_chat_messages (
  id UUID PRIMARY KEY,
  thread_user_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  body TEXT NOT NULL,
  read_by_admin BOOLEAN NOT NULL DEFAULT false,
  read_by_user BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_chat_thread
  ON public.support_chat_messages (thread_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_support_chat_unread_admin
  ON public.support_chat_messages (read_by_admin)
  WHERE sender_role = 'user' AND read_by_admin = false;

ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support chat full access" ON public.support_chat_messages;
CREATE POLICY "Support chat full access"
  ON public.support_chat_messages
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.support_chat_messages TO anon, authenticated;
