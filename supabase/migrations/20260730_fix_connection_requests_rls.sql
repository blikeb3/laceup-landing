-- Migration: Fix connection_requests RLS policy bug
-- Created: 2026-07-30
-- Description: Remove the four "deny_unauthenticated" policies on connection_requests.
--
-- WHY: Postgres combines multiple PERMISSIVE policies with OR. The
-- deny_unauthenticated_* policies used USING/WITH CHECK (auth.uid() IS NOT NULL),
-- which does not "deny" anything — it GRANTS every authenticated user
-- SELECT/INSERT/UPDATE/DELETE on ALL rows, overriding the narrower per-user
-- policies. Any logged-in user could read or delete other users' connection
-- requests, and insert requests with a spoofed requester_id.
--
-- Dropping them is sufficient: RLS is default-deny, and the remaining policies
-- (connection_requests_view/insert/update/delete_policy and the admin policies)
-- all require auth.uid() to match requester_id/receiver_id or an admin role.
-- Unauthenticated users have auth.uid() = NULL, which matches no policy,
-- so they remain blocked without a dedicated "deny" policy.

DROP POLICY IF EXISTS connection_requests_deny_unauthenticated_select ON connection_requests;
DROP POLICY IF EXISTS connection_requests_deny_unauthenticated_insert ON connection_requests;
DROP POLICY IF EXISTS connection_requests_deny_unauthenticated_update ON connection_requests;
DROP POLICY IF EXISTS connection_requests_deny_unauthenticated_delete ON connection_requests;

-- Verification (run after applying):
--   SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE tablename = 'connection_requests';
-- Expected: only the admin_* policies and the view/insert/update/delete_policy rows remain.
