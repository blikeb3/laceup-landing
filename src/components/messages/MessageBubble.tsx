import { useState } from "react";
import { FileText, Download, Trash2, MoreVertical, Check } from "lucide-react";
import { Message } from "@/types/messages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
    message: Message;
    onDelete?: (messageId: string) => Promise<boolean>;
    /** Avatar URL of the recipient (for showing read status) */
    recipientAvatarUrl?: string | null;
    /** Initials of the recipient (fallback for avatar) */
    recipientInitials?: string;
}

const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return <FileText className="h-8 w-8" />;
};

/**
 * Validates and sanitizes a URL to prevent security issues
 * Returns null if the URL is potentially dangerous
 */
const sanitizeUrl = (url: string): string | null => {
    try {
        // Prepend https:// for www. URLs
        const fullUrl = url.startsWith('www.') ? `https://${url}` : url;

        const parsed = new URL(fullUrl);

        // Only allow http and https protocols
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }

        // Return the sanitized URL (this also normalizes it)
        return parsed.href;
    } catch {
        // Invalid URL
        return null;
    }
};

/**
 * Converts URLs in text to clickable links
 */
const linkifyText = (text: string, isOwn: boolean) => {
    // URL regex pattern that matches http, https, and www URLs
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlPattern);

    return parts.map((part, index) => {
        if (urlPattern.test(part)) {
            // Reset the regex lastIndex since we're reusing it
            urlPattern.lastIndex = 0;

            // Sanitize the URL before using it
            const sanitizedHref = sanitizeUrl(part);

            // If URL is invalid or potentially dangerous, render as plain text
            if (!sanitizedHref) {
                return part;
            }

            return (
                <a
                    key={index}
                    href={sanitizedHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline hover:opacity-80 ${isOwn ? "text-navy" : "text-gold"}`}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

export const MessageBubble = ({ message, onDelete, recipientAvatarUrl, recipientInitials }: MessageBubbleProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const displayText = message.text && message.text !== '[Image]' && message.text !== '[File]' ? message.text : null;

    const isRead = message.read_at !== null && message.read_at !== undefined;

    const handleDelete = async () => {
        if (!onDelete) return;
        setIsDeleting(true);
        await onDelete(message.id);
        setIsDeleting(false);
        setShowDeleteDialog(false);
    };

    return (
        <>
            <div className={`flex ${message.isOwn ? "justify-end" : "justify-start"} group`}>
                <div className="flex items-center gap-1">
                    {/* Delete menu - only show for own messages */}
                    {message.isOwn && onDelete && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setShowDeleteDialog(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete message
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <div
                        className={`max-w-md rounded-2xl px-4 py-2 ${message.isOwn
                            ? "bg-gold text-navy"
                            : "bg-secondary text-foreground"
                            }`}
                    >
                        {!message.isOwn && (
                            <p className="text-xs font-semibold mb-1">{message.sender}</p>
                        )}
                        {message.image_url && (
                            <img
                                src={message.image_url}
                                alt="Attached"
                                className="rounded-lg max-w-full h-auto mb-2 cursor-pointer hover:opacity-90"
                                onClick={() => window.open(message.image_url!, '_blank')}
                            />
                        )}
                        {message.file_url && message.file_name && (
                            <a
                                href={message.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 p-3 rounded-lg mb-2 hover:opacity-80 transition-opacity ${message.isOwn ? "bg-navy/10" : "bg-background/50"
                                    }`}
                            >
                                {getFileIcon(message.file_name)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{message.file_name}</p>
                                    <p className="text-xs opacity-70">Click to download</p>
                                </div>
                                <Download className="h-4 w-4 flex-shrink-0" />
                            </a>
                        )}
                        {displayText && (
                            <p className="text-sm whitespace-pre-wrap break-words">{linkifyText(displayText, message.isOwn)}</p>
                        )}
                        {message.isQuickPrompt && (
                            <div className="mt-2 pt-2 border-t border-navy/20">
                                <p className="text-xs font-semibold">
                                    {message.promptType === "mentorship" ? "📚 Mentorship Request" : "💼 Opportunity Inquiry"}
                                </p>
                            </div>
                        )}
                        <p className={`text-xs mt-1 flex items-center justify-end gap-1 ${message.isOwn ? "text-navy/70" : "text-muted-foreground"}`}>
                            {message.time}
                            {message.isOwn && (
                                <span className="ml-1 inline-flex items-center">
                                    {isRead ? (
                                        <Avatar className="h-4 w-4" title="Seen">
                                            <AvatarImage src={recipientAvatarUrl || undefined} />
                                            <AvatarFallback className="text-[8px] bg-gold text-navy">
                                                {recipientInitials || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <span title="Sent">
                                            <Check className="h-3.5 w-3.5" />
                                        </span>
                                    )}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete message?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your message.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
