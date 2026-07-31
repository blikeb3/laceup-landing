// Edge function: send-referral
// Sends a Brevo email invite and records the referral event
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_TEMPLATE_ID = Deno.env.get("BREVO_REFERRAL_TEMPLATE_ID");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "no-reply@laceup.com";
const BREVO_SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") || "LaceUp";
const REFERRAL_SIGNUP_URL = Deno.env.get("REFERRAL_SIGNUP_URL");
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase service role configuration for send-referral");
}

if (!BREVO_API_KEY) {
  throw new Error("Missing BREVO_API_KEY for send-referral function");
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return badRequest("Unauthorized", 401);
    }

    const body = await req.json().catch(() => null);
    const rawEmail = body?.email ?? body?.inviteeEmail;
    const rawMessage = body?.message ?? "";
    const rawInvitedName = body?.invitedName ?? body?.inviteeName;

    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
    const invitedName = typeof rawInvitedName === "string" ? rawInvitedName.trim() : "";

    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    if (!email || !emailRegex.test(email)) {
      return badRequest("Please provide a valid email address.");
    }

    if (message.length > 500) {
      return badRequest("Personal message must be 500 characters or fewer.");
    }

    if (invitedName.length > 120) {
      return badRequest("Name must be 120 characters or fewer.");
    }

    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const { count: sentCount, error: countError } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_user_id", authData.user.id)
      .gte("created_at", twentyFourHoursAgo);

    if (countError) {
      console.error("send-referral: count error", countError);
      return badRequest("Unable to process invites right now.", 500);
    }

    if ((sentCount ?? 0) >= 20) {
      return badRequest("Daily invite limit reached. Please try again tomorrow.", 429);
    }

    const { data: existing, error: existingError } = await supabase
      .from("referrals")
      .select("id, status")
      .eq("referrer_user_id", authData.user.id)
      .eq("referred_email", email)
      .limit(1);

    if (existingError) {
      console.error("send-referral: fetch existing error", existingError);
      return badRequest("Unable to process invites right now.", 500);
    }

    if (existing && existing.length > 0) {
      return badRequest("You already invited this email.", 409);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", authData.user.id)
      .maybeSingle();

    const dbReferrerName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    
    // Use provided name if available, otherwise use database value, fallback to generic
    const finalReferrerName = dbReferrerName || "A LaceUp member";

    const token = crypto.randomUUID();

    const signupUrlBase =
      REFERRAL_SIGNUP_URL?.replace(/\/$/, "") || `${req.headers.get("origin") ?? "https://laceupnetwork.com"}/auth?tab=signup`;
    const separator = signupUrlBase.includes("?") ? "&" : "?";
    const ctaUrl = `${signupUrlBase}${separator}ref=${encodeURIComponent(token)}`;

    const { data: inserted, error: insertError } = await supabase
      .from("referrals")
      .insert({
        referrer_user_id: authData.user.id,
        referred_email: email,
        invited_name: invitedName || null,
        message: message || null,
        token,
        status: "sent",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("send-referral: insert error", insertError);
      return badRequest("Could not save invite.", 500);
    }

    const brevoPayload: Record<string, unknown> = {
      to: [{ email, name: invitedName || email }],
      sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
      headers: { "X-Referral-Token": token },
    };

    if (BREVO_TEMPLATE_ID) {
      brevoPayload.templateId = Number(BREVO_TEMPLATE_ID);
      brevoPayload.params = {
        referrerName: finalReferrerName,
        personalMessage: message || "",
        invitedName: invitedName || email,
        ctaUrl,
      };
    } else {
      brevoPayload.subject = `${finalReferrerName} invited you to LaceUp`;
      const safeMessage = message ? `<p>Personal note:</p><blockquote>${escapeHtml(message)}</blockquote>` : "";
      brevoPayload.htmlContent = `<!doctype html>
        <html><body>
        <p>${escapeHtml(finalReferrerName)} invited you to join LaceUp.</p>
        ${safeMessage}
        <p><a href="${ctaUrl}">Join LaceUp</a></p>
        </body></html>`;
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify(brevoPayload),
    });

    const brevoJson = await brevoResponse.json().catch(() => ({ messageId: null }));
    const providerMessageId =
      typeof brevoJson?.messageId === "string"
        ? brevoJson.messageId
        : Array.isArray((brevoJson as Record<string, unknown>)?.messageIds)
          ? (brevoJson as Record<string, unknown> & { messageIds?: string[] }).messageIds?.[0]
          : undefined;

    if (!brevoResponse.ok) {
      await supabase
        .from("referrals")
        .update({ status: "bounced" })
        .eq("id", inserted.id);

      console.error("send-referral: brevo error", brevoJson);
      return badRequest("Brevo could not send this invite. Please try again.", 502);
    }

    const { error: updateError } = await supabase
      .from("referrals")
      .update({ provider_message_id: providerMessageId || null, sent_at: new Date().toISOString() })
      .eq("id", inserted.id);

    if (updateError) {
      console.error("send-referral: update after send error", updateError);
    }

    return ok({ message: "Invite sent", token });
  } catch (error) {
    console.error("send-referral: unexpected error", error);
    return badRequest("Unexpected error sending invite.", 500);
  }
});
