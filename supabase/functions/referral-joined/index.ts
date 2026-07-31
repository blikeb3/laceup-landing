// Edge function: referral-joined
// Marks a referral as accepted when a signup with a valid token occurs
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase service role configuration for referral-joined");
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const userEmail = typeof body?.userEmail === "string" ? body.userEmail.trim().toLowerCase() : "";

    if (!token) {
      return badRequest("Missing referral token.");
    }

    if (!userId) {
      return badRequest("Missing user ID.", 400);
    }

    if (!userEmail) {
      return badRequest("Missing user email.", 400);
    }

    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .select("id, referrer_user_id, referred_email, status, accepted_at")
      .eq("token", token)
      .limit(1)
      .maybeSingle();

    if (referralError) {
      console.error("referral-joined: fetch error", referralError);
      return badRequest("Unable to validate referral token.", 500);
    }

    if (!referral) {
      return badRequest("Referral token is invalid.", 404);
    }

    if (referral.status === "accepted" && referral.accepted_at) {
      return ok({ message: "Referral already accepted." });
    }

    if (referral.referred_email && referral.referred_email.toLowerCase() !== userEmail) {
      return badRequest("Referral email does not match your account email.", 403);
    }

    const { data: updated, error: updateError } = await supabase
      .from("referrals")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_user_id: userId,
      })
      .eq("id", referral.id)
      .eq("status", "sent")
      .select("id")
      .single();

    if (updateError) {
      console.error("referral-joined: update error", updateError);
      return badRequest("Unable to complete referral acceptance.", 500);
    }

    if (!updated) {
      return badRequest("Referral already processed.", 409);
    }

    // Check if referrer now has 3+ accepted referrals and award Team Builder badge
    try {
      const { count: acceptedCount } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_user_id", referral.referrer_user_id)
        .eq("status", "accepted");

      if (acceptedCount && acceptedCount >= 3) {
        // Get Team Builder badge ID
        const { data: teamBuilderBadge } = await supabase
          .from("badges")
          .select("id")
          .eq("name", "Team Builder")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (teamBuilderBadge) {
          // Assign badge to referrer (ignore if already assigned)
          const { error: badgeError } = await supabase
            .from("user_badges")
            .insert({
              user_id: referral.referrer_user_id,
              badge_id: teamBuilderBadge.id,
            })
            .select()
            .maybeSingle();

          // Ignore duplicate key errors (badge already assigned)
          if (badgeError && !badgeError.message?.includes("duplicate key")) {
            console.error("referral-joined: badge assignment error", badgeError);
          }
        }
      }
    } catch (badgeError) {
      // Log but don't fail the request if badge assignment fails
      console.error("referral-joined: error checking/assigning Team Builder badge", badgeError);
    }

    return ok({ message: "Referral marked as accepted." });
  } catch (error) {
    console.error("referral-joined: unexpected error", error);
    return badRequest("Unexpected error marking referral.", 500);
  }
});
