import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getDisplayName, getInitials } from "@/lib/nameUtils";

interface MentionUser {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    sport: string | null;
    university: string | null;
}

export interface MentionData {
    userId: string;
    displayName: string;
}

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onMentionsChange?: (mentions: Map<string, MentionData>) => void;
    placeholder?: string;
    className?: string;
    rows?: number;
    currentUserId?: string;
}

export interface MentionInputRef {
    focus: () => void;
    getProcessedContent: () => string;
}

// Helper to convert display text with @Name to stored format @[id:Name]
export const processMentionsForStorage = (
    text: string,
    mentions: Map<string, MentionData>
): string => {
    let processed = text;
    // Sort by displayName length descending to avoid partial replacements
    const sortedMentions = Array.from(mentions.values()).sort(
        (a, b) => b.displayName.length - a.displayName.length
    );

    for (const mention of sortedMentions) {
        // Replace @DisplayName with @[userId:DisplayName]
        const regex = new RegExp(`@${escapeRegExp(mention.displayName)}(?=\\s|$|[.,!?])`, 'g');
        processed = processed.replace(regex, `@[${mention.userId}:${mention.displayName}]`);
    }
    return processed;
};

// Helper to escape special regex characters
const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(({
    value,
    onChange,
    onMentionsChange,
    placeholder,
    className,
    rows = 4,
    currentUserId,
}, ref) => {
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [mentions, setMentions] = useState<Map<string, MentionData>>(new Map());
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Expose methods to parent components
    useImperativeHandle(ref, () => ({
        focus: () => {
            textareaRef.current?.focus();
        },
        getProcessedContent: () => {
            return processMentionsForStorage(value, mentions);
        }
    }), [value, mentions]);

    // Clear mentions when value is cleared (e.g., after posting)
    useEffect(() => {
        if (value === "") {
            setMentions(new Map());
        }
    }, [value]);

    // Notify parent when mentions change
    useEffect(() => {
        onMentionsChange?.(mentions);
    }, [mentions, onMentionsChange]);

    // Fetch connected users for mentions
    const fetchConnections = useCallback(async (query: string) => {
        if (!currentUserId || query.length < 1) {
            setMentionResults([]);
            return;
        }

        setIsLoading(true);
        try {
            // Get connected user IDs
            const { data: connections } = await supabase
                .from("connections")
                .select("connected_user_id")
                .eq("user_id", currentUserId);

            const connectedIds = connections?.map((c) => c.connected_user_id) || [];

            if (connectedIds.length === 0) {
                setMentionResults([]);
                setIsLoading(false);
                return;
            }

            // Search connected users by name
            const searchTerm = `%${query}%`;
            const { data: users, error } = await supabase
                .from("profiles")
                .select("id, first_name, last_name, avatar_url, sport, university")
                .in("id", connectedIds)
                .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
                .neq("approval_status", "rejected")
                .limit(5);

            if (error) {
                console.error("Error fetching mentions:", error);
                setMentionResults([]);
            } else {
                setMentionResults(users || []);
            }
        } catch (err) {
            console.error("Error fetching mentions:", err);
            setMentionResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId]);

    // Debounced search
    useEffect(() => {
        if (!showMentions || mentionQuery.length < 1) {
            setMentionResults([]);
            return;
        }

        const timer = setTimeout(() => {
            fetchConnections(mentionQuery);
        }, 200);

        return () => clearTimeout(timer);
    }, [mentionQuery, showMentions, fetchConnections]);

    // Handle text change and detect @ mentions
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPosition = e.target.selectionStart;

        onChange(newValue);

        // Find the @ symbol before cursor
        const textBeforeCursor = newValue.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");

        if (lastAtIndex !== -1) {
            // Check if @ is at start or preceded by whitespace
            const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
            const isValidMentionStart = /\s/.test(charBeforeAt) || lastAtIndex === 0;

            if (isValidMentionStart) {
                const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
                // Check if there's no space after @ (still typing the mention)
                if (!/\s/.test(textAfterAt)) {
                    setShowMentions(true);
                    setMentionQuery(textAfterAt);
                    setMentionStartIndex(lastAtIndex);
                    setSelectedIndex(0);
                    return;
                }
            }
        }

        setShowMentions(false);
        setMentionQuery("");
        setMentionStartIndex(-1);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showMentions || mentionResults.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < mentionResults.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                break;
            case "Enter":
            case "Tab":
                if (mentionResults[selectedIndex]) {
                    e.preventDefault();
                    selectMention(mentionResults[selectedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                setShowMentions(false);
                setMentionQuery("");
                break;
        }
    };

    // Insert mention into text (clean format)
    const selectMention = (user: MentionUser) => {
        if (mentionStartIndex === -1) return;

        const displayName = getDisplayName(user.first_name, user.last_name);
        const cursorPosition = textareaRef.current?.selectionStart || value.length;

        // Replace @query with just @DisplayName (clean display)
        const beforeMention = value.slice(0, mentionStartIndex);
        const afterMention = value.slice(cursorPosition);
        const mentionText = `@${displayName} `;

        const newValue = beforeMention + mentionText + afterMention;
        onChange(newValue);

        // Track this mention for later processing
        setMentions(prev => {
            const updated = new Map(prev);
            updated.set(user.id, { userId: user.id, displayName });
            return updated;
        });

        // Reset mention state
        setShowMentions(false);
        setMentionQuery("");
        setMentionStartIndex(-1);
        setMentionResults([]);

        // Focus textarea and set cursor position
        setTimeout(() => {
            if (textareaRef.current) {
                const newCursorPos = beforeMention.length + mentionText.length;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                textareaRef.current &&
                !textareaRef.current.contains(event.target as Node)
            ) {
                setShowMentions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Clear mentions when value is cleared (e.g., after posting)
    useEffect(() => {
        if (value === "") {
            setMentions(new Map());
        }
    }, [value]);

    return (
        <div className="relative">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={className}
                rows={rows}
            />

            {/* Mention dropdown */}
            {showMentions && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-full max-w-sm bg-popover border border-border rounded-md shadow-lg overflow-hidden"
                >
                    {isLoading ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            Searching...
                        </div>
                    ) : mentionResults.length > 0 ? (
                        <ul className="max-h-48 overflow-y-auto">
                            {mentionResults.map((user, index) => (
                                <li
                                    key={user.id}
                                    onClick={() => selectMention(user)}
                                    className={cn(
                                        "flex items-center gap-3 p-2 cursor-pointer transition-colors",
                                        index === selectedIndex
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-accent/50"
                                    )}
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatar_url || undefined} />
                                        <AvatarFallback className="bg-gold/20 text-gold text-xs">
                                            {getInitials(user.first_name, user.last_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            {getDisplayName(user.first_name, user.last_name)}
                                        </p>
                                        {(user.sport || user.university) && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {[user.sport, user.university].filter(Boolean).join(" • ")}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : mentionQuery.length > 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            No connections found matching "{mentionQuery}"
                        </div>
                    ) : (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            Type to search your connections
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

MentionInput.displayName = "MentionInput";
