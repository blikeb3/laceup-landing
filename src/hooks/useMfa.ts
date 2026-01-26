import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    listMfaFactors,
    enrollTotpFactor,
    verifyTotpEnrollment,
    unenrollMfaFactor,
    MfaFactor,
} from "@/lib/mfaHelpers";

export interface UseMfaReturn {
    factors: MfaFactor[];
    loading: boolean;
    error: string | null;
    hasMfaEnabled: boolean;
    enrollFactor: (friendlyName?: string) => Promise<{
        success: boolean;
        qrCode?: string;
        secret?: string;
        factorId?: string;
        error?: string;
    }>;
    verifyEnrollment: (factorId: string, code: string, skipRefresh?: boolean) => Promise<{
        success: boolean;
        error?: string;
    }>;
    removeFactor: (factorId: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    refreshFactors: () => Promise<void>;
}

/**
 * Custom hook for managing MFA state and operations
 */
export function useMfa(): UseMfaReturn {
    const [factors, setFactors] = useState<MfaFactor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasMfaEnabled = factors.some(
        (factor) => factor.status === "verified"
    );

    const refreshFactors = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setFactors([]);
                return;
            }

            const result = await listMfaFactors();

            if (result.success) {
                setFactors(result.totpFactors as MfaFactor[]);
            } else {
                setError(result.error || "Failed to load MFA factors");
            }
        } catch (err) {
            console.error("Error refreshing MFA factors:", err);
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshFactors();
    }, [refreshFactors]);

    const enrollFactor = useCallback(
        async (friendlyName: string = "Authenticator App") => {
            try {
                setError(null);
                const result = await enrollTotpFactor(friendlyName);

                if (result.success && result.factor) {
                    return {
                        success: true,
                        qrCode: result.qrCode,
                        secret: result.secret,
                        factorId: result.factor.id,
                    };
                }

                setError(result.error || "Failed to enroll");
                return {
                    success: false,
                    error: result.error,
                };
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to enroll MFA";
                setError(errorMessage);
                return {
                    success: false,
                    error: errorMessage,
                };
            }
        },
        []
    );

    const verifyEnrollment = useCallback(
        async (factorId: string, code: string, skipRefresh: boolean = false) => {
            try {
                setError(null);
                const result = await verifyTotpEnrollment(factorId, code);

                if (result.success) {
                    // Only refresh if not skipped (to allow backup codes dialog to show first)
                    if (!skipRefresh) {
                        await refreshFactors();
                    }
                    return { success: true };
                }

                setError(result.error || "Verification failed");
                return {
                    success: false,
                    error: result.error,
                };
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Verification failed";
                setError(errorMessage);
                return {
                    success: false,
                    error: errorMessage,
                };
            }
        },
        [refreshFactors]
    );

    const removeFactor = useCallback(
        async (factorId: string) => {
            try {
                setError(null);
                const result = await unenrollMfaFactor(factorId);

                if (result.success) {
                    await refreshFactors();
                    return { success: true };
                }

                setError(result.error || "Failed to remove factor");
                return {
                    success: false,
                    error: result.error,
                };
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to remove factor";
                setError(errorMessage);
                return {
                    success: false,
                    error: errorMessage,
                };
            }
        },
        [refreshFactors]
    );

    return {
        factors,
        loading,
        error,
        hasMfaEnabled,
        enrollFactor,
        verifyEnrollment,
        removeFactor,
        refreshFactors,
    };
}
