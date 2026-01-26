import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, ShieldCheck, Smartphone, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMfa } from "@/hooks/useMfa";
import { MfaSetupDialog } from "@/components/MfaSetupDialog";
import { MfaVerifyDialog } from "@/components/MfaVerifyDialog";
import { BackupCodesDialog } from "@/components/BackupCodesDialog";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent, createMfaChallenge, verifyMfaCode } from "@/lib/mfaHelpers";
import { formatDistanceToNow } from "date-fns";

interface SecuritySettingsProps {
    userId: string;
    userEmail: string;
}

export function SecuritySettings({ userId, userEmail }: SecuritySettingsProps) {
    const { toast } = useToast();
    const { factors, loading, hasMfaEnabled, enrollFactor, verifyEnrollment, removeFactor, refreshFactors } = useMfa();

    const [showSetupDialog, setShowSetupDialog] = useState(false);
    const [setupData, setSetupData] = useState<{
        qrCode: string | null;
        secret: string | null;
        factorId: string | null;
    }>({
        qrCode: null,
        secret: null,
        factorId: null,
    });
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [factorToRemove, setFactorToRemove] = useState<string | null>(null);
    const [verificationChallengeId, setVerificationChallengeId] = useState<string | null>(null);
    const [removing, setRemoving] = useState(false);

    const handleEnableMfa = async () => {
        const result = await enrollFactor("Authenticator App");

        if (result.success && result.qrCode && result.secret && result.factorId) {
            setSetupData({
                qrCode: result.qrCode,
                secret: result.secret,
                factorId: result.factorId,
            });
            setShowSetupDialog(true);
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to start 2FA setup",
                variant: "destructive",
            });
        }
    };

    const handleVerifyEnrollment = async (code: string) => {
        if (!setupData.factorId) {
            return { success: false, error: "No factor ID" };
        }

        // Skip refresh to prevent re-render that would close the dialog before backup codes are shown
        const result = await verifyEnrollment(setupData.factorId, code, true);

        if (result.success) {
            // Log security event
            await logSecurityEvent(userId, "mfa_enabled");

            // Don't refresh factors here - let the dialog handle the backup codes step first
            // The dialog will close and then we can refresh
            return { success: true };
        }

        return result;
    };

    const handleRemoveFactor = async () => {
        if (!factorToRemove) return;

        setRemoving(true);

        const result = await removeFactor(factorToRemove);

        if (result.success) {
            // Log security event
            await logSecurityEvent(userId, "mfa_disabled");

            toast({
                title: "2FA Disabled",
                description: "Two-factor authentication has been removed from your account",
            });
            setShowRemoveDialog(false);
            setShowVerifyDialog(false);
            setFactorToRemove(null);
            setVerificationChallengeId(null);
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to remove authenticator",
                variant: "destructive",
            });
        }

        setRemoving(false);
    };

    const openRemoveDialog = async (factorId: string) => {
        // Check current AAL level
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        // If already at AAL2, can remove directly
        if (aalData?.currentLevel === 'aal2') {
            setFactorToRemove(factorId);
            setShowRemoveDialog(true);
        } else {
            // Need to verify MFA first to reach AAL2
            const challengeResult = await createMfaChallenge(factorId);

            if (challengeResult.success && challengeResult.challengeId) {
                setFactorToRemove(factorId);
                setVerificationChallengeId(challengeResult.challengeId);
                setShowVerifyDialog(true);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to initiate verification. Please try again.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleVerifyBeforeRemove = async (code: string) => {
        if (!factorToRemove || !verificationChallengeId) {
            return {
                success: false,
                error: "Verification not initialized",
            };
        }

        const result = await verifyMfaCode(factorToRemove, verificationChallengeId, code);

        if (result.success) {
            // Now at AAL2, can show the confirmation dialog
            setShowVerifyDialog(false);
            setShowRemoveDialog(true);
            return { success: true };
        }

        return result;
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Security Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Security Settings
                    </CardTitle>
                    <CardDescription>
                        Manage your account security and two-factor authentication
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Two-Factor Authentication Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col items-start justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="font-semibold flex items-center gap-2">
                                    {hasMfaEnabled ? (
                                        <>
                                            <ShieldCheck className="h-4 w-4 text-green-500" />
                                            Two-Factor Authentication
                                            <Badge variant="default" className="bg-green-500">
                                                Enabled
                                            </Badge>
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="h-4 w-4" />
                                            Two-Factor Authentication
                                            <Badge variant="secondary">Disabled</Badge>
                                        </>
                                    )}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {hasMfaEnabled
                                        ? "Your account is protected with an authenticator app"
                                        : "Add an extra layer of security to your account"}
                                </p>
                            </div>

                            {!hasMfaEnabled && (
                                <Button onClick={handleEnableMfa} size="sm">
                                    <Smartphone className="h-4 w-4 mr-2" />
                                    Enable 2FA
                                </Button>
                            )}
                        </div>

                        {!hasMfaEnabled && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Protect your account with two-factor authentication. You'll need
                                    an authenticator app like Google Authenticator or Authy.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* List of enrolled factors */}
                        {factors.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Enrolled Devices:</h4>
                                {factors.map((factor) => (
                                    <div
                                        key={factor.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {factor.friendly_name || "Authenticator App"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {factor.status === "verified" ? "Active" : "Pending"} •
                                                    Added {formatDistanceToNow(new Date(factor.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openRemoveDialog(factor.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Additional Security Info */}
                    <div className="pt-4 border-t space-y-2">
                        <h4 className="text-sm font-medium">Security Tips:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>Never share your backup codes with anyone</li>
                            <li>Store backup codes in a secure location</li>
                            <li>Use a strong, unique password for your account</li>
                            <li>Keep your authenticator app up to date</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* MFA Setup Dialog */}
            <MfaSetupDialog
                open={showSetupDialog}
                onOpenChange={(open) => {
                    setShowSetupDialog(open);
                    // When dialog closes, refresh factors to update the UI
                    if (!open) {
                        refreshFactors();
                    }
                }}
                qrCode={setupData.qrCode}
                secret={setupData.secret}
                factorId={setupData.factorId}
                onVerify={handleVerifyEnrollment}
                userId={userId}
                userEmail={userEmail}
            />

            {/* Verify MFA Before Removal Dialog */}
            <MfaVerifyDialog
                open={showVerifyDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowVerifyDialog(false);
                        setFactorToRemove(null);
                        setVerificationChallengeId(null);
                    }
                }}
                onVerify={handleVerifyBeforeRemove}
                loading={false}
            />

            {/* Remove Factor Confirmation Dialog */}
            <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove two-factor authentication from your account. Your
                            account will be less secure. You can re-enable it at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveFactor}
                            disabled={removing}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {removing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                "Disable 2FA"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
