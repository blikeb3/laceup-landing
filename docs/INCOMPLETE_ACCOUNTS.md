# Incomplete Accounts — Re-invite Runbook

Ticket: "Investigate Incomplete Accounts" (Linear, Authentications & Accounts).

## Background

Between January and July 2026, signup confirmation emails silently failed while
Brevo was out of credits. Supabase recorded the send attempt
(`confirmation_sent_at` set) but the email never went out, leaving accounts
stuck unconfirmed — the user can't log in, and their email is "taken" so they
can't re-register. Investigation on 2026-07-30 found **42 unconfirmed accounts
out of 185 total** (23%), all with profiles already created by the signup
trigger.

## Components

| Piece | Where | Purpose |
|---|---|---|
| `signup_reminders` table | `supabase/migrations/20260731_add_signup_reminders.sql` | Tracks who was re-invited, how many times, and when (admin-readable, service-role writable) |
| `reinvite-incomplete` edge function | `supabase/functions/reinvite-incomplete/` | Generates a fresh confirmation link per stuck user and emails it via Brevo |
| Self-service resend | `/auth` sign-in tab | "Resend confirmation email" button calling `supabase.auth.resend` — users can unstick themselves |

## Running a re-invite batch

Invoke with the project's **secret API key** (Dashboard → Settings → API keys →
`sb_secret_...`), or as a signed-in admin user:

```sh
# Dry run first (default) — reports what would happen, sends nothing
curl -X POST "https://xnbbgmkywspodwdrlzhq.supabase.co/functions/v1/reinvite-incomplete" \
  -H "Authorization: Bearer $SB_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"excludeEmails": ["support@laceupnetowrk.com"]}'

# Real send: dryRun must be explicitly false
curl -X POST "https://xnbbgmkywspodwdrlzhq.supabase.co/functions/v1/reinvite-incomplete" \
  -H "Authorization: Bearer $SB_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "excludeEmails": ["support@laceupnetowrk.com"]}'
```

Options (all optional): `dryRun` (default **true**), `limit` (50),
`excludeEmails` ([]), `minAccountAgeHours` (24), `maxReminders` (3),
`cooldownDays` (7).

The response lists per-email results (`sent` / `would_send` / `skipped` +
reason / `error`). Sends are stamped in `signup_reminders`, so re-running is
safe: the cooldown and max-reminder guards prevent double-sending.

## Email content

The email is sent through Brevo's transactional API with inline HTML (no
template setup required). Subject: "Finish setting up your LaceUP account".
The confirmation link is a fresh Supabase `signup`-type action link — the
originals expired long ago. Optional secret `REINVITE_REDIRECT_URL` controls
where the link lands after verification (must be on the auth redirect
allow-list); when unset, the project's Site URL is used.

## Future automation (per Johnathan)

Schedule the function (Supabase Dashboard → Integrations → Cron, or pg_cron
calling it via `net.http_post`) daily with `{"dryRun": false}`. The built-in
guards (min age 24h, 7-day cooldown, max 3 reminders) make it idempotent and
spam-safe. Not enabled yet — run manually until the email copy is approved.

## Monitoring

- Stuck-account count: `SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NULL;`
- Reminder history: `SELECT * FROM signup_reminders ORDER BY last_reminded_at DESC;`
- Set a Brevo low-credit alert (Brevo dashboard) — the root cause was silent credit exhaustion.
