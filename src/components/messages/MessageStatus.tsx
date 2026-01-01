import { Check } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Message } from "@/types/messages";

interface MessageStatusProps {
    message: Message;
    recipientAvatarUrl?: string | null;
    recipientInitials?: string;
}

export const MessageStatus = ({ message, recipientAvatarUrl, recipientInitials }: MessageStatusProps) => {
    if (!message.isOwn || message.isSystemMessage) return null;

    const isRead = message.read_at !== null && message.read_at !== undefined;

    return (
        <span className="ml-1 inline-flex items-center" title={isRead ? "Seen" : "Sent"}>
            {isRead ? (
                <Avatar className="h-4 w-4">
                    <AvatarImage src={recipientAvatarUrl || undefined} />
                    <AvatarFallback className="text-[8px] bg-gold text-navy">
                        {recipientInitials || "?"}
                    </AvatarFallback>
                </Avatar>
            ) : (
                <Check className="h-3.5 w-3.5" />
            )}
        </span>
    );
};

interface TypingIndicatorProps {
    names: string[];
}

export const TypingIndicator = ({ names }: TypingIndicatorProps) => {
    if (names.length === 0) return null;

    const displayText = names.length === 1
        ? `${names[0]} is typing...`
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are typing...`;

    return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground italic">
            <span>{displayText}</span>
            <span className="flex gap-1">
                <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
        </div>
    );
};
