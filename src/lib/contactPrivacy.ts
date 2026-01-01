import { supabase } from "@/integrations/supabase/client";
import { isValidUUID } from "@/lib/validation";
import { buildConnectionFilter } from "@/lib/secureQuery";

interface ContactPrivacyCheck {
    canViewEmail: boolean;
    canViewPhone: boolean;
}

interface ProfileData {
    id: string;
    name?: string | null;
    biography?: string | null;
    location?: string | null;
    degree?: string | null;
    about?: string | null;
    skills?: string[] | null;
    avatar_url?: string | null;
    email?: string | null;
    phone?: string | null;
    university?: string | null;
    sport?: string | null;
    athletic_accomplishments?: string | null;
    academic_accomplishments?: string | null;
    contact_privacy?: string | null;
    [key: string]: unknown;
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

/**
 * Sanitize profile data based on contact privacy settings
 */
export async function sanitizeProfileForViewer(
    profile: ProfileData,
    currentUserId: string
): Promise<ProfileData> {
    if (!profile) return profile;

    const privacy = await checkContactPrivacy(
        profile.id,
        currentUserId,
        profile.contact_privacy || 'connections'
    );

    return {
        ...profile,
        email: privacy.canViewEmail ? profile.email : null,
        phone: privacy.canViewPhone ? profile.phone : null
    };
}
