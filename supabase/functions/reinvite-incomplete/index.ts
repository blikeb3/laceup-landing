// Edge function: reinvite-incomplete
// Re-invites users whose accounts are stuck unconfirmed (their original
// signup confirmation email was never delivered). Generates a fresh
// confirmation link per user and sends it via Brevo, recording each send
// in public.signup_reminders.
//
// Caller must be an authenticated admin (user_roles.role = 'admin').
//
// Body (all optional):
//   dryRun            boolean  default TRUE — no emails, no writes; reports what would happen
//   limit             number   default 50   — max users processed this run
//   excludeEmails     string[] default []   — emails to skip (e.g. internal test accounts)
//   minAccountAgeHours number  default 24   — skip accounts younger than this
//   maxReminders      number   default 3    — skip users already reminded this many times
//   cooldownDays      number   default 7    — skip users reminded within this window
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "no-reply@laceup.com";
const BREVO_SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") || "LaceUp";
// Optional: where the confirmation link should land after verification.
// Must be on the auth redirect allow-list. When unset, GoTrue's configured
// Site URL is used.
const REINVITE_REDIRECT_URL = Deno.env.get("REINVITE_REDIRECT_URL");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase service role configuration for reinvite-incomplete");
}

if (!BREVO_API_KEY) {
  throw new Error("Missing BREVO_API_KEY for reinvite-incomplete function");
}

const badRequest = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ok = (data: Record<string, unknown> = {}) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const reinviteHtml = (firstName: string, actionLink: string) => `<!doctype html>
<html><body style="font-family: Arial, Helvetica, sans-serif; color: #0A2849; max-width: 560px; margin: 0 auto;">
  <h2>Finish setting up your LaceUP account</h2>
  <p>Hi${firstName ? ` ${escapeHtml(firstName)}` : ""},</p>
  <p>You signed up for LaceUP, but our confirmation email never reached you &mdash; that was our fault, and it's fixed now.</p>
  <p>Your account is still waiting for you. Click below to confirm your email and pick up where you left off:</p>
  <p style="margin: 24px 0;">
    <a href="${actionLink}"
       style="background: #E8B555; color: #0A2849; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Confirm my account
    </a>
  </p>
  <p style="font-size: 13px; color: #555;">This link expires after a short time. If it has expired, visit the sign-in page and choose &ldquo;Resend confirmation email.&rdquo;</p>
  <p style="font-size: 13px; color: #555;">If you didn't sign up for LaceUP, you can safely ignore this email.</p>
</body></html>`;

interface ReinviteResult {
  email: string;
  status: "sent" | "would_send" | "skipped" | "error";
  reason?: string;
  linkType?: "signup" | "magiclink";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Client bound to the caller's JWT — used only to identify the caller
  const callerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });

  // Pure service-role client for admin operations and reminder writes
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Authorized callers: the service role key directly (ops/cron), or a
    // signed-in user holding the admin role.
    const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const isServiceRoleCall = bearer.length > 0 && bearer === SUPABASE_SERVICE_ROLE_KEY;

    if (!isServiceRoleCall) {
      const { data: authData, error: authError } = await callerClient.auth.getUser();
      if (authError || !authData?.user) {
        return badRequest("Unauthorized", 401);
      }

      const { data: adminRole } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .eq("role", "admin")
        .limit(1);

      if (!adminRole || adminRole.length === 0) {
        return badRequest("Admin access required", 403);
      }
    }

    const body = (await req.json().catch(() => ({}))) ?? {};
    const dryRun = body.dryRun !== false; // default true: must send dryRun:false to actually email
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 500);
    const minAccountAgeHours = Number.isFinite(Number(body.minAccountAgeHours))
      ? Number(body.minAccountAgeHours)
      : 24;
    const maxReminders = Number.isFinite(Number(body.maxReminders)) ? Number(body.maxReminders) : 3;
    const cooldownDays = Number.isFinite(Number(body.cooldownDays)) ? Number(body.cooldownDays) : 7;
    const excludeEmails = new Set(
      (Array.isArray(body.excludeEmails) ? body.excludeEmails : [])
        .filter((e: unknown): e is string => typeof e === "string")
        .map((e: string) => e.trim().toLowerCase()),
    );

    // 1. Collect all unconfirmed users via the admin API
    const unconfirmed: { id: string; email: string; created_at: string; first_name: string }[] = [];
    let page = 1;
    while (true) {
      const { data: pageData, error: listError } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (listError) {
        console.error("reinvite-incomplete: listUsers error", listError);
        return badRequest("Unable to list users.", 500);
      }
      for (const u of pageData.users) {
        if (!u.email_confirmed_at && u.email) {
          unconfirmed.push({
            id: u.id,
            email: u.email.toLowerCase(),
            created_at: u.created_at,
            first_name: (u.user_metadata?.first_name as string) ?? "",
          });
        }
      }
      if (pageData.users.length < 1000) break;
      page += 1;
    }

    // 2. Load reminder history for skip rules
    const { data: reminderRows } = await admin
      .from("signup_reminders")
      .select("user_id, reminder_count, last_reminded_at")
      .in("user_id", unconfirmed.map((u) => u.id));
    const reminders = new Map((reminderRows ?? []).map((r) => [r.user_id, r]));

    const now = Date.now();
    const minAgeCutoff = now - minAccountAgeHours * 60 * 60 * 1000;
    const cooldownCutoff = now - cooldownDays * 24 * 60 * 60 * 1000;

    const results: ReinviteResult[] = [];
    const eligible: typeof unconfirmed = [];

    for (const u of unconfirmed) {
      const reminder = reminders.get(u.id);
      if (excludeEmails.has(u.email)) {
        results.push({ email: u.email, status: "skipped", reason: "excluded" });
      } else if (new Date(u.created_at).getTime() > minAgeCutoff) {
        results.push({ email: u.email, status: "skipped", reason: "account_too_new" });
      } else if (reminder && reminder.reminder_count >= maxReminders) {
        results.push({ email: u.email, status: "skipped", reason: "max_reminders_reached" });
      } else if (
        reminder?.last_reminded_at &&
        new Date(reminder.last_reminded_at).getTime() > cooldownCutoff
      ) {
        results.push({ email: u.email, status: "skipped", reason: "cooldown" });
      } else if (eligible.length >= limit) {
        results.push({ email: u.email, status: "skipped", reason: "over_limit" });
      } else {
        eligible.push(u);
      }
    }

    // 3. Generate a fresh confirmation link and (unless dry run) email it
    for (const u of eligible) {
      // "signup" regenerates the email-confirmation link for an unconfirmed
      // user; fall back to a magic link (verifying it also proves email
      // ownership, which confirms the account).
      let actionLink: string | null = null;
      let linkType: "signup" | "magiclink" = "signup";

      const linkOptions = REINVITE_REDIRECT_URL ? { redirectTo: REINVITE_REDIRECT_URL } : undefined;

      const signupLink = await admin.auth.admin.generateLink({
        type: "signup",
        email: u.email,
        password: crypto.randomUUID(), // ignored for existing users; required by the API shape
        options: linkOptions,
      });

      if (!signupLink.error && signupLink.data?.properties?.action_link) {
        actionLink = signupLink.data.properties.action_link;
      } else {
        const magicLink = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: u.email,
          options: linkOptions,
        });
        if (!magicLink.error && magicLink.data?.properties?.action_link) {
          actionLink = magicLink.data.properties.action_link;
          linkType = "magiclink";
        } else {
          console.error("reinvite-incomplete: generateLink failed", u.id, signupLink.error, magicLink.error);
          results.push({ email: u.email, status: "error", reason: "link_generation_failed" });
          continue;
        }
      }

      if (dryRun) {
        results.push({ email: u.email, status: "would_send", linkType });
        continue;
      }

      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          to: [{ email: u.email, name: u.first_name || u.email }],
          sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
          subject: "Finish setting up your LaceUP account",
          htmlContent: reinviteHtml(u.first_name, actionLink),
        }),
      });

      if (!brevoResponse.ok) {
        const brevoError = await brevoResponse.json().catch(() => ({}));
        console.error("reinvite-incomplete: brevo error", u.id, brevoError);
        results.push({ email: u.email, status: "error", reason: "brevo_send_failed" });
        continue;
      }

      const brevoJson = await brevoResponse.json().catch(() => ({ messageId: null }));
      const providerMessageId = typeof brevoJson?.messageId === "string" ? brevoJson.messageId : null;

      const existing = reminders.get(u.id);
      const stamp = existing
        ? admin
            .from("signup_reminders")
            .update({
              reminder_count: existing.reminder_count + 1,
              last_reminded_at: new Date().toISOString(),
              last_provider_message_id: providerMessageId,
            })
            .eq("user_id", u.id)
        : admin.from("signup_reminders").insert({
            user_id: u.id,
            email: u.email,
            reminder_count: 1,
            last_reminded_at: new Date().toISOString(),
            last_provider_message_id: providerMessageId,
          });
      const { error: stampError } = await stamp;
      if (stampError) {
        console.error("reinvite-incomplete: reminder stamp error", u.id, stampError);
      }

      results.push({ email: u.email, status: "sent", linkType });
    }

    const summary = {
      dryRun,
      totalUnconfirmed: unconfirmed.length,
      sent: results.filter((r) => r.status === "sent").length,
      wouldSend: results.filter((r) => r.status === "would_send").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };

    return ok(summary);
  } catch (error) {
    console.error("reinvite-incomplete: unexpected error", error);
    return badRequest("Unexpected error processing re-invites.", 500);
  }
});
