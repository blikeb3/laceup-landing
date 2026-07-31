import { supabase } from "@/integrations/supabase/client";
import { isValidUUID } from "@/lib/validation";
import { buildConnectionFilter } from "@/lib/secureQuery";

interface ContactPrivacyCheck {
    canViewEmail: boolean;
    canViewPhone: boolean;
}

/**
 * Check if the current user can view another user's contact information
 * based on privacy settings
 */
export async function checkContactPrivacy(
    targetUserId: string,
    currentUserId: string,
    contactPrivacy: string = 'connections'
): Promise<ContactPrivacyCheck> {
    // User can always see their own contact info
    if (targetUserId === currentUserId) {
        return { canViewEmail: true, canViewPhone: true };
    }

    // If privacy is set to public, everyone can see
    if (contactPrivacy === 'public') {
        return { canViewEmail: true, canViewPhone: true };
    }

    // If privacy is set to private, only owner can see
    if (contactPrivacy === 'private') {
        return { canViewEmail: false, canViewPhone: false };
    }

    // Default is 'connections' - check if users are connected
    // Validate UUIDs to prevent SQL injection
    if (!isValidUUID(currentUserId) || !isValidUUID(targetUserId)) {
        return { canViewEmail: false, canViewPhone: false };
    }

    const { data: connection } = await supabase
        .from('connections')
        .select('id')
        .or(buildConnectionFilter(currentUserId, targetUserId))
        .maybeSingle();

    const areConnected = !!connection;

    return {
        canViewEmail: areConnected,
        canViewPhone: areConnected
    };
}

// Every profiles column except email and phone — contact info is fetched
// separately, and only after the privacy check passes
const PROFILE_COLUMNS_WITHOUT_CONTACT =
    'id, first_name, last_name, avatar_url, resume_url, university, sport, location, about, biography, ' +
    'athletic_accomplishments, academic_accomplishments, skills, degrees, job_experiences, ' +
    'approval_status, contact_privacy, created_at, updated_at';

/**
 * Fetch another user's profile without contact info, then fetch email/phone
 * in a second query only if the viewer is permitted to see them — so private
 * contact data never leaves the server for viewers who can't see it.
 */
export async function fetchProfileWithContactPrivacy(targetUserId: string, currentUserId: string) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS_WITHOUT_CONTACT)
        .eq('id', targetUserId)
        .single();

    if (error || !profile) {
        return { data: null, error };
    }

    let email: string | null = null;
    let phone: string | null = null;

    const privacy = await checkContactPrivacy(
        targetUserId,
        currentUserId,
        profile.contact_privacy || 'connections'
    );

    if (privacy.canViewEmail || privacy.canViewPhone) {
        const { data: contact } = await supabase
            .from('profiles')
            .select('email, phone')
            .eq('id', targetUserId)
            .single();

        email = privacy.canViewEmail ? contact?.email ?? null : null;
        phone = privacy.canViewPhone ? contact?.phone ?? null : null;
    }

    return { data: { ...profile, email, phone }, error: null };
}

