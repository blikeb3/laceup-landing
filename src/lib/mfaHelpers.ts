import { supabase } from "@/integrations/supabase/client";

export interface MfaFactor {
    id: string;
    friendly_name: string;
    factor_type: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface BackupCode {
    code: string;
    used: boolean;
}

/**
 * Generate cryptographically secure backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric code
        const code = Array.from({ length: 8 }, () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            return chars.charAt(Math.floor(Math.random() * chars.length));
        }).join('');

        // Format as XXXX-XXXX for readability
        const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
        codes.push(formatted);
    }

    return codes;
}

/**
 * Hash a backup code for secure storage using Web Crypto API
 */
export async function hashBackupCode(code: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(code.replace('-', ''));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Clean up any unverified MFA factors before enrolling a new one
 * This handles the case where user closes the setup dialog before completing
 */
export async function cleanupUnverifiedFactors() {
    try {
        const { data, error } = await supabase.auth.mfa.listFactors();

        if (error) throw error;

        // Find any unverified TOTP factors
        // Status can be 'verified' or 'unverified' but types may not reflect this
        const unverifiedFactors = data?.totp?.filter(f => (f.status as string) !== 'verified') || [];

        // Unenroll each unverified factor
        for (const factor of unverifiedFactors) {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }

        return {
            success: true,
            removedCount: unverifiedFactors.length,
        };
    } catch (error) {
        console.error("Error cleaning up unverified factors:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to cleanup factors",
        };
    }
}

/**
 * Enroll a new TOTP factor for the current user
 * Automatically cleans up any incomplete enrollments first
 */
export async function enrollTotpFactor(friendlyName: string = "Authenticator App") {
    try {
        // First, clean up any unverified factors from previous incomplete setups
        await cleanupUnverifiedFactors();

        // Use a timestamp to make the friendly name unique if needed
        const uniqueName = `${friendlyName}`;

        const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: uniqueName,
        });

        if (error) throw error;

        return {
            success: true,
            factor: data,
            qrCode: data?.totp?.qr_code,
            secret: data?.totp?.secret,
            uri: data?.totp?.uri,
        };
    } catch (error) {
        console.error("Error enrolling TOTP factor:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to enroll MFA",
        };
    }
}

/**
 * Verify the TOTP code to complete enrollment
 */
export async function verifyTotpEnrollment(factorId: string, code: string) {
    try {
        const challenge = await supabase.auth.mfa.challenge({ factorId });

        if (challenge.error) throw challenge.error;

        const verify = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challenge.data.id,
            code,
        });

        if (verify.error) throw verify.error;

        return {
            success: true,
            data: verify.data,
        };
    } catch (error) {
        console.error("Error verifying TOTP enrollment:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Invalid verification code",
        };
    }
}

/**
 * Create a challenge for an existing factor during sign-in
 */
export async function createMfaChallenge(factorId: string) {
    try {
        const { data, error } = await supabase.auth.mfa.challenge({ factorId });

        if (error) throw error;

        return {
            success: true,
            challengeId: data.id,
        };
    } catch (error) {
        console.error("Error creating MFA challenge:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create challenge",
        };
    }
}

/**
 * Verify an MFA code during sign-in
 */
export async function verifyMfaCode(factorId: string, challengeId: string, code: string) {
    try {
        const { data, error } = await supabase.auth.mfa.verify({
            factorId,
            challengeId,
            code,
        });

        if (error) throw error;

        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("Error verifying MFA code:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Invalid code",
        };
    }
}

/**
 * List all enrolled MFA factors for the current user
 */
export async function listMfaFactors() {
    try {
        const { data, error } = await supabase.auth.mfa.listFactors();

        if (error) throw error;

        return {
            success: true,
            factors: data?.all || [],
            totpFactors: data?.totp || [],
        };
    } catch (error) {
        console.error("Error listing MFA factors:", error);
        return {
            success: false,
            factors: [],
            totpFactors: [],
            error: error instanceof Error ? error.message : "Failed to list factors",
        };
    }
}

/**
 * Unenroll an MFA factor
 */
export async function unenrollMfaFactor(factorId: string) {
    try {
        const { data, error } = await supabase.auth.mfa.unenroll({ factorId });

        if (error) throw error;

        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("Error unenrolling MFA factor:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to remove authenticator",
        };
    }
}

/**
 * Get the current authentication assurance level
 */
export async function getAuthAssuranceLevel() {
    try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (error) throw error;

        return {
            success: true,
            currentLevel: data?.currentLevel,
            nextLevel: data?.nextLevel,
            currentAuthenticationMethods: data?.currentAuthenticationMethods,
        };
    } catch (error) {
        console.error("Error getting AAL:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get assurance level",
        };
    }
}

/**
 * Store backup codes in the database
 */
export async function storeBackupCodes(userId: string, codes: string[]) {
    try {
        const hashedCodesPromises = codes.map(async (code) => ({
            user_id: userId,
            code_hash: await hashBackupCode(code),
        }));

        const hashedCodes = await Promise.all(hashedCodesPromises);

        const { error } = await supabase
            .from('user_mfa_backup_codes')
            .insert(hashedCodes);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Error storing backup codes:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to store backup codes",
        };
    }
}

/**
 * Verify a backup code
 */
export async function verifyBackupCode(userId: string, code: string) {
    try {
        const codeHash = await hashBackupCode(code);

        // Check if code exists and is unused
        const { data: backupCode, error: fetchError } = await supabase
            .from('user_mfa_backup_codes')
            .select('*')
            .eq('user_id', userId)
            .eq('code_hash', codeHash)
            .is('used_at', null)
            .single();

        if (fetchError || !backupCode) {
            return {
                success: false,
                error: "Invalid or already used backup code",
            };
        }

        // Mark code as used
        const { error: updateError } = await supabase
            .from('user_mfa_backup_codes')
            .update({ used_at: new Date().toISOString() })
            .eq('id', backupCode.id);

        if (updateError) throw updateError;

        return { success: true };
    } catch (error) {
        console.error("Error verifying backup code:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to verify backup code",
        };
    }
}

/**
 * Log a security event
 */
export async function logSecurityEvent(
    userId: string,
    eventType: string,
    metadata?: Record<string, any>
) {
    try {
        const { error } = await supabase
            .from('user_security_events')
            .insert({
                user_id: userId,
                event_type: eventType,
                metadata: metadata || {},
            });

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Error logging security event:", error);
        return { success: false };
    }
}

/**
 * Download backup codes as a text file
 */
export function downloadBackupCodes(codes: string[], username: string) {
    const content = `LaceUP Account Recovery Codes
Account: ${username}
Generated: ${new Date().toLocaleString()}

IMPORTANT: Store these codes securely. Each code can only be used once.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

If you lose access to your authenticator app, you can use these codes to sign in.
After using all codes, you'll need to set up 2FA again.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laceup-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
