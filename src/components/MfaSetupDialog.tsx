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
import { Input } from "@/components/ui/input";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Smartphone, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateBackupCodes, storeBackupCodes, downloadBackupCodes, cleanupUnverifiedFactors } from "@/lib/mfaHelpers";

interface MfaSetupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    qrCode: string | null;
    secret: string | null;
    factorId: string | null;
    onVerify: (code: string) => Promise<{ success: boolean; error?: string }>;
    userId: string;
    userEmail: string;
}

export function MfaSetupDialog({
    open,
    onOpenChange,
    qrCode,
    secret,
    factorId,
    onVerify,
    userId,
    userEmail,
}: MfaSetupDialogProps) {
    const [step, setStep] = useState<"scan" | "verify" | "backup">("scan");
    const [verificationCode, setVerificationCode] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [secretCopied, setSecretCopied] = useState(false);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [backupCodesDownloaded, setBackupCodesDownloaded] = useState(false);
    const { toast } = useToast();

    const handleCopySecret = () => {
        if (secret) {
            navigator.clipboard.writeText(secret);
            setSecretCopied(true);
            toast({
                title: "Secret copied",
                description: "The setup key has been copied to your clipboard",
            });
            setTimeout(() => setSecretCopied(false), 2000);
        }
    };

    const handleVerify = async () => {
        if (!factorId || verificationCode.length !== 6) {
            setError("Please enter a 6-digit code");
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const result = await onVerify(verificationCode);

            if (result.success) {
                // Generate backup codes
                const codes = generateBackupCodes(10);

                if (codes.length === 0) {
                    throw new Error("Failed to generate backup codes");
                }

                setBackupCodes(codes);

                // Store backup codes in database (don't block on this)
                storeBackupCodes(userId, codes).catch((err) => {
                    console.error("Failed to store backup codes:", err);
                });

                toast({
                    title: "2FA Enabled!",
                    description: "Now save your backup codes",
                });

                // Transition to backup step
                setStep("backup");
            } else {
                setError(result.error || "Invalid code. Please try again.");
            }
        } catch (err) {
            console.error("Error during MFA verification:", err);
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setVerifying(false);
        }
    };

    const handleDownloadBackupCodes = () => {
        downloadBackupCodes(backupCodes, userEmail);
        setBackupCodesDownloaded(true);
    };

    const handleComplete = () => {
        setStep("scan");
        setVerificationCode("");
        setError(null);
        setBackupCodes([]);
        setBackupCodesDownloaded(false);
        onOpenChange(false);
    };

    // Prevent closing the dialog during backup step until codes are downloaded
    const handleOpenChange = async (newOpen: boolean) => {
        // If trying to close during backup step and codes not downloaded, prevent it
        if (!newOpen && step === "backup" && !backupCodesDownloaded) {
            toast({
                title: "Please download your backup codes",
                description: "You need to save your backup codes before closing this dialog.",
                variant: "destructive",
            });
            return;
        }

        // If closing before completing setup (scan or verify step), clean up the unverified factor
        if (!newOpen && step !== "backup") {
            // Clean up any unverified factors in the background
            cleanupUnverifiedFactors().catch(console.error);
        }

        // If closing from any other step, reset state
        if (!newOpen) {
            setStep("scan");
            setVerificationCode("");
            setError(null);
            setBackupCodes([]);
            setBackupCodesDownloaded(false);
        }

        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        {step === "scan" && "Set Up Two-Factor Authentication"}
                        {step === "verify" && "Verify Your Code"}
                        {step === "backup" && "Save Your Backup Codes"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "scan" &&
                            "Scan the QR code with your authenticator app"}
                        {step === "verify" &&
                            "Enter the 6-digit code from your authenticator app"}
                        {step === "backup" &&
                            "Store these codes safely. Each can only be used once."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {step === "scan" && (
                        <>
                            <div className="flex flex-col items-center space-y-4">
                                {qrCode ? (
                                    <div className="bg-white p-4 rounded-lg border-2 border-border">
                                        <img
                                            src={qrCode}
                                            alt="QR Code"
                                            className="w-48 h-48"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-48 h-48 bg-muted animate-pulse rounded-lg" />
                                )}

                                <Alert>
                                    <AlertDescription className="text-sm">
                                        Download an authenticator app like:
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                            <li>Google Authenticator</li>
                                            <li>Microsoft Authenticator</li>
                                            <li>Authy</li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>

                                <div className="w-full space-y-2">
                                    <Label>Or enter this setup key manually:</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={secret || ""}
                                            readOnly
                                            className="font-mono text-xs"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={handleCopySecret}
                                        >
                                            {secretCopied ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => setStep("verify")}
                                className="w-full"
                                disabled={!qrCode}
                            >
                                Next: Verify Code
                            </Button>
                        </>
                    )}

                    {step === "verify" && (
                        <>
                            <div className="flex flex-col items-center space-y-4">
                                <Label>Enter 6-digit code from your app:</Label>
                                <InputOTP
                                    maxLength={6}
                                    value={verificationCode}
                                    onChange={setVerificationCode}
                                    disabled={verifying}
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
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setStep("scan");
                                        setVerificationCode("");
                                        setError(null);
                                    }}
                                    disabled={verifying}
                                    className="w-full"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleVerify}
                                    disabled={verificationCode.length !== 6 || verifying}
                                    className="w-full"
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify & Enable 2FA"
                                    )}
                                </Button>
                            </div>
                        </>
                    )}

                    {step === "backup" && (
                        <>
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Important:</strong> Save these codes in a secure place.
                                    You'll need them to access your account if you lose your
                                    authenticator device.
                                </AlertDescription>
                            </Alert>

                            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2 max-h-60 overflow-y-auto">
                                {backupCodes.map((code, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span className="text-muted-foreground w-6">
                                            {index + 1}.
                                        </span>
                                        <span className="font-semibold">{code}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Button
                                    onClick={handleDownloadBackupCodes}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {backupCodesDownloaded ? (
                                        <>
                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                            Downloaded
                                        </>
                                    ) : (
                                        "Download Backup Codes"
                                    )}
                                </Button>

                                <Button
                                    onClick={handleComplete}
                                    className="w-full"
                                    disabled={!backupCodesDownloaded}
                                >
                                    {backupCodesDownloaded
                                        ? "Complete Setup"
                                        : "Download codes to continue"}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
