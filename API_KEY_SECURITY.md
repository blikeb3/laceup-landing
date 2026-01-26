# API Key Security Guide

This document outlines the security practices for managing API keys and secrets in the LaceUp application.

## Overview

| Key Type | Location | Exposed to Client? | Example |
|----------|----------|-------------------|---------|
| Public Supabase Keys | `.env` (VITE_ prefix) | ✅ Yes (by design) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Service Role Keys | Supabase Edge Functions | ❌ No | `SUPABASE_SERVICE_ROLE_KEY` |
| Third-party API Keys | Supabase Edge Functions | ❌ No | `BREVO_API_KEY`, `OPENAI_API_KEY` |

## ✅ Safe for Frontend (VITE_ Variables)

The following variables are **intentionally exposed** to the client bundle. Vite only exposes variables with the `VITE_` prefix.

```env
# These are PUBLIC keys - safe for client-side use
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-anon-key
```

**Why are these safe?**
- Supabase's anon/publishable key is designed for client-side use
- It has limited permissions controlled by Row Level Security (RLS) policies
- It cannot bypass RLS or perform admin operations

## ❌ Never Expose (Server-Side Only)

The following secrets must **NEVER** be:
- Committed to version control
- Exposed in frontend code
- Stored in any `.env` file in the repository
- Hardcoded in source files

### Sensitive Keys

| Secret | Service | Purpose |
|--------|---------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Full admin access, bypasses RLS |
| `BREVO_API_KEY` | Brevo | Email sending service |
| `BREVO_REFERRAL_TEMPLATE_ID` | Brevo | Email template configuration |
| `BREVO_SENDER_EMAIL` | Brevo | Sender email address |
| `BREVO_SENDER_NAME` | Brevo | Sender display name |
| `OPENAI_API_KEY` | OpenAI | AI/LLM services (if used) |
| `STRIPE_SECRET_KEY` | Stripe | Payment processing (if used) |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook verification (if used) |
| `ELEVENLABS_API_KEY` | ElevenLabs | Voice services (if used) |

## Server-Side API Architecture

All third-party API calls that require secret keys are made through **Supabase Edge Functions**:

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Frontend App   │────▶│  Supabase Edge      │────▶│  Third-party    │
│  (React/Vite)   │     │  Functions          │     │  APIs           │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Secrets Store  │
                        │  (Encrypted)    │
                        └─────────────────┘
```

### Current Edge Functions

1. **`send-referral`** - Sends referral invite emails via Brevo
2. **`referral-joined`** - Notifies when a referral signs up
3. **`notify-job-application`** - Sends job application notifications

## Managing Secrets in Supabase

### Adding Secrets

1. Go to **Supabase Dashboard** → **Edge Functions** → **Manage secrets**
2. Click **Add new secret**
3. Enter the key name (e.g., `BREVO_API_KEY`)
4. Enter the secret value
5. Click **Save**

### CLI Method

```bash
# Set a secret
supabase secrets set BREVO_API_KEY=your-secret-key-here

# Set multiple secrets from a file
supabase secrets set --env-file ./path/to/secrets.env

# List all secrets (names only, values are hidden)
supabase secrets list
```

### Accessing Secrets in Edge Functions

```typescript
// In your Edge Function (e.g., supabase/functions/send-email/index.ts)
Deno.serve(async (req) => {
  // Access secrets via Deno.env
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Use the secret to call third-party APIs
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ /* email data */ }),
  });
  
  return new Response(JSON.stringify({ success: true }));
});
```

## .gitignore Configuration

Ensure these patterns are in `.gitignore`:

```gitignore
# Environment variables - never commit secrets
.env
.env.local
.env.*.local
*.env

# Supabase local secrets
supabase/.env
```

## Security Checklist

- [x] `.env` is in `.gitignore`
- [x] Only `VITE_` prefixed variables in frontend `.env`
- [x] Service role key only in Supabase secrets
- [x] Third-party API keys in Supabase Edge Functions secrets
- [x] All sensitive API calls go through Edge Functions
- [x] RLS policies protect database access
- [x] No hardcoded secrets in source code

## What To Do If Keys Are Exposed

If you accidentally commit or expose a secret:

1. **Immediately rotate the key** in the respective service dashboard
2. Update the new key in Supabase Edge Functions secrets
3. Check git history and consider using `git filter-branch` or BFG Repo-Cleaner
4. Review access logs for any unauthorized usage
5. Consider the key fully compromised and act accordingly

## Database-Stored API Keys

If you need to store API keys in the database (e.g., for user-specific integrations):

### Schema Design

```sql
-- Store encrypted API keys with restricted access
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  -- Encrypted using pgcrypto or application-level encryption
  encrypted_key BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  
  UNIQUE(user_id, service)
);

-- RLS: Only service role can read keys (for backend use)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can see metadata but NOT the encrypted key
CREATE POLICY "Users can view their own key metadata"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Only backend service role can read actual keys
CREATE POLICY "Service role reads keys"
  ON api_keys FOR SELECT
  TO service_role
  USING (true);
```

### Encryption Best Practices

1. Use strong encryption (AES-256)
2. Store encryption keys in environment secrets, not in code
3. Use separate encryption keys per environment
4. Implement key rotation procedures

## References

- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
