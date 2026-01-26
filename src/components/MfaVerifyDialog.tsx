import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MfaVerifyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onVerify: (code: string) => Promise<{ success: boolean; error?: string }>;
    onUseBackupCode?: (code: string) => Promise<{ success: boolean; error?: string }>;
    loading?: boolean;
}

export function MfaVerifyDialog({
    open,
    onOpenChange,
    onVerify,
    onUseBackupCode,
    loading = false,
}: MfaVerifyDialogProps) {
    const [verificationCode, setVerificationCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [showBackupCode, setShowBackupCode] = useState(false);
    const [backupCode, setBackupCode] = useState("");

    const handleVerify = async () => {
        if (verificationCode.length !== 6) {
            setError("Please enter a 6-digit code");
            return;
        }

        setVerifying(true);
        setError(null);

        const result = await onVerify(verificationCode);

        if (!result.success) {
            setError(result.error || "Invalid code. Please try again.");
            setVerificationCode("");
        } else {
            // Success is handled by parent component (Auth.tsx)
            // It will close this dialog and navigate
        }

        setVerifying(false);
    };

    const handleBackupCodeSubmit = async () => {
        if (!backupCode || !onUseBackupCode) return;

        setVerifying(true);
        setError(null);

        const result = await onUseBackupCode(backupCode);

        if (!result.success) {
            setError(result.error || "Invalid backup code");
            setBackupCode("");
        }

        setVerifying(false);
    };

    const handleCancel = () => {
        setVerificationCode("");
        setBackupCode("");
        setError(null);
        setShowBackupCode(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Two-Factor Authentication
                    </DialogTitle>
                    <DialogDescription>
                        {showBackupCode
                            ? "Enter one of your backup codes"
                            : "Enter the 6-digit code from your authenticator app"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!showBackupCode ? (
                        <>
                            <div className="flex flex-col items-center space-y-4">
                                <Label>Verification Code:</Label>
                                <InputOTP
                                    maxLength={6}
                                    value={verificationCode}
                                    onChange={(value) => {
                                        setVerificationCode(value);
                                        setError(null);
                                    }}
                                    disabled={verifying || loading}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>

                                {error && (
                                    <Alert variant="destructive" className="w-full">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Button
                                    onClick={handleVerify}
                                    disabled={verificationCode.length !== 6 || verifying || loading}
                                    className="w-full"
                                >
                                    {verifying || loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify"
                                    )}
                                </Button>

                                {onUseBackupCode && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => setShowBackupCode(true)}
                                        disabled={verifying || loading}
                                        className="w-full text-sm"
                                    >
                                        Use backup code instead
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={verifying || loading}
                                    className="w-full"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <Alert>
                                    <AlertDescription className="text-sm">
                                        Backup codes are 8 characters long (e.g., ABCD-1234). Each
                                        code can only be used once.
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-2">
                                    <Label htmlFor="backup-code">Backup Code:</Label>
                                    <Input
                                        id="backup-code"
                                        type="text"
                                        placeholder="XXXX-XXXX"
                                        value={backupCode}
                                        onChange={(e) => {
                                            setBackupCode(e.target.value.toUpperCase());
                                            setError(null);
                                        }}
                                        disabled={verifying || loading}
                                        maxLength={9}
                                        className="font-mono text-center text-lg"
                                    />
                                </div>

                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Button
                                    onClick={handleBackupCodeSubmit}
                                    disabled={!backupCode || verifying || loading}
                                    className="w-full"
                                >
                                    {verifying || loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify Backup Code"
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setShowBackupCode(false);
                                        setBackupCode("");
                                        setError(null);
                                    }}
                                    disabled={verifying || loading}
                                    className="w-full text-sm"
                                >
                                    Use authenticator code instead
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={verifying || loading}
                                    className="w-full"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
