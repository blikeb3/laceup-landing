-- Migration: Add signup_reminders tracking table
-- Created: 2026-07-31
-- Ticket: Investigate Incomplete Accounts
--
-- Tracks re-invite emails sent to users whose accounts are stuck unconfirmed
-- (signup confirmation emails failed while Brevo was out of credits).
-- Written to exclusively by the reinvite-incomplete edge function (service
-- role); readable by admins for support/auditing.

CREATE TABLE IF NOT EXISTS public.signup_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminded_at timestamptz,
  last_provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_reminders_last_reminded_at
  ON public.signup_reminders (last_reminded_at);

ALTER TABLE public.signup_reminders ENABLE ROW LEVEL SECURITY;

-- Admins can read reminder history; nobody else needs access.
-- The edge function writes with the service role, which bypasses RLS.
DROP POLICY IF EXISTS signup_reminders_admin_select ON public.signup_reminders;
CREATE POLICY signup_reminders_admin_select
  ON public.signup_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

GRANT SELECT ON public.signup_reminders TO authenticated;
GRANT ALL ON public.signup_reminders TO service_role;
