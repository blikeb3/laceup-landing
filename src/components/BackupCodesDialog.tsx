import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { downloadBackupCodes } from "@/lib/mfaHelpers";

interface BackupCodesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    backupCodes: string[];
    userEmail: string;
}

export function BackupCodesDialog({
    open,
    onOpenChange,
    backupCodes,
    userEmail,
}: BackupCodesDialogProps) {
    const [downloaded, setDownloaded] = useState(false);

    const handleDownload = () => {
        downloadBackupCodes(backupCodes, userEmail);
        setDownloaded(true);
    };

    const handleClose = () => {
        setDownloaded(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Your Backup Codes</DialogTitle>
                    <DialogDescription>
                        Save these codes in a secure place. Each can only be used once.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Important:</strong> You'll need these codes to access your
                            account if you lose your authenticator device. Store them safely!
                        </AlertDescription>
                    </Alert>

                    <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2 max-h-60 overflow-y-auto">
                        {backupCodes.map((code, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className="text-muted-foreground w-6">{index + 1}.</span>
                                <span className="font-semibold">{code}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Button onClick={handleDownload} variant="outline" className="w-full">
                            {downloaded ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                    Downloaded
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Backup Codes
                                </>
                            )}
                        </Button>

                        <Button onClick={handleClose} className="w-full">
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
