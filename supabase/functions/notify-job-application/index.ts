// Edge function: notify-job-application
// Sends an email notification to the job poster when someone applies to their opportunity
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_TEMPLATE_ID = Deno.env.get("BREVO_JOB_APPLICATION_TEMPLATE_ID");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "no-reply@laceup.com";
const BREVO_SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") || "LaceUp";

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase service role configuration for notify-job-application");
}

if (!BREVO_API_KEY) {
    throw new Error("Missing BREVO_API_KEY for notify-job-application function");
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

interface ApplicationNotificationRequest {
    opportunityId: string;
    applicantId: string;
    applicantName?: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const body = await req.json().catch(() => null);
        const opportunityId = typeof body?.opportunityId === "string" ? body.opportunityId.trim() : "";
        const applicantId = typeof body?.applicantId === "string" ? body.applicantId.trim() : "";
        const applicantName = typeof body?.applicantName === "string" ? body.applicantName.trim() : "";

        if (!opportunityId || !applicantId) {
            return badRequest("Missing opportunityId or applicantId.");
        }

        // Fetch opportunity details
        const { data: opportunity, error: oppError } = await supabase
            .from("opportunities")
            .select("id, title, company_name, type, posted_by")
            .eq("id", opportunityId)
            .single();

        if (oppError || !opportunity) {
            console.error("notify-job-application: fetch opportunity error", oppError);
            return badRequest("Opportunity not found.", 404);
        }

        // Fetch the poster's profile to get their email
        const { data: posterProfile, error: posterError } = await supabase
            .from("profiles")
            .select("id, email, first_name, last_name")
            .eq("id", opportunity.posted_by)
            .maybeSingle();

        if (posterError || !posterProfile || !posterProfile.email) {
            console.error("notify-job-application: fetch poster profile error", posterError);
            return badRequest("Poster email not found.", 404);
        }

        // Fetch applicant's profile for more details
        const { data: applicantProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, email, university")
            .eq("id", applicantId)
            .maybeSingle();

        const applicantFullName = applicantName ||
            (applicantProfile
                ? `${applicantProfile.first_name || ""} ${applicantProfile.last_name || ""}`.trim()
                : "A LaceUp member") || "A LaceUp member";

        const posterFirstName = posterProfile.first_name || "";
        const posterFullName = `${posterProfile.first_name || ""} ${posterProfile.last_name || ""}`.trim() || "there";

        // Prepare email content
        const opportunityType = opportunity.type === "job" ? "Job" :
            opportunity.type === "internship" ? "Internship" : "Mentorship";

        const emailSubject = `New Application for ${escapeHtml(opportunity.title)}`;

        const brevoPayload: Record<string, unknown> = {
            to: [{ email: posterProfile.email, name: posterFullName }],
            sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
        };

        if (BREVO_TEMPLATE_ID) {
            // Send using Brevo template
            brevoPayload.templateId = Number(BREVO_TEMPLATE_ID);
            brevoPayload.params = {
                posterName: posterFullName,
                posterFirstName: posterFirstName,
                applicantName: applicantFullName,
                applicantEmail: applicantProfile?.email || "Not provided",
                applicantUniversity: applicantProfile?.university || "Not specified",
                opportunityTitle: opportunity.title,
                opportunityType: opportunityType,
                companyName: opportunity.company_name,
                dashboardUrl: "https://laceupnetwork.com/opportunities",
            };
        } else {
            // Send with HTML content (fallback if no template)
            brevoPayload.subject = emailSubject;
            brevoPayload.htmlContent = `<!doctype html>
<html><body>
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #0A2849; padding: 20px; text-align: center;">
    <h1 style="color: #E8B555; margin: 0;">LaceUp Network</h1>
  </div>
  <div style="padding: 30px; background-color: #ffffff;">
    <h2 style="color: #0A2849;">New Application Received!</h2>
    <p>Hi ${escapeHtml(posterFullName)},</p>
    <p>Great news! <strong>${escapeHtml(applicantFullName)}</strong> has applied to your ${opportunityType.toLowerCase()} posting:</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Position:</strong> ${escapeHtml(opportunity.title)}</p>
      <p style="margin: 5px 0 0 0;"><strong>Company:</strong> ${escapeHtml(opportunity.company_name)}</p>
    </div>
    <h3 style="color: #0A2849;">Applicant Details:</h3>
    <ul style="color: #333;">
      <li><strong>Name:</strong> ${escapeHtml(applicantFullName)}</li>
      ${applicantProfile?.email ? `<li><strong>Email:</strong> ${escapeHtml(applicantProfile.email)}</li>` : ""}
      ${applicantProfile?.university ? `<li><strong>University:</strong> ${escapeHtml(applicantProfile.university)}</li>` : ""}
    </ul>
    <p>Log in to your LaceUp dashboard to view the full application and resume.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://laceupnetwork.com/opportunities" 
         style="background-color: #E8B555; color: #0A2849; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View Application
      </a>
    </div>
  </div>
  <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
    <p style="margin: 0;">© ${new Date().getFullYear()} LaceUp Network. All rights reserved.</p>
  </div>
</div>
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

        if (!brevoResponse.ok) {
            const brevoJson = await brevoResponse.json().catch(() => ({}));
            console.error("notify-job-application: brevo error", brevoJson);
            return badRequest("Could not send notification email.", 502);
        }

        console.log(`notify-job-application: sent to ${posterProfile.email} for opportunity "${opportunity.title}"`);

        return ok({ message: "Notification sent" });
    } catch (error) {
        console.error("notify-job-application: unexpected error", error);
        return badRequest("Unexpected error sending notification.", 500);
    }
});
