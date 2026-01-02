import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, X, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFullName, getInitials } from "@/lib/nameUtils";
import { ConversationParticipant } from "@/types/messages";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchMultipleUserRoles } from "@/lib/roleUtils";

interface BadgeType {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    image_url: string | null;
    color_bg: string | null;
    color_text: string | null;
    is_active: boolean;
}

interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    created_at: string;
    badges: BadgeType | null;
}

type EnrichedParticipant = ConversationParticipant & {
    user_role?: string | null;
    user_is_admin?: boolean;
    user_badges?: UserBadge[];
};

interface NewConversationViewProps {
    currentUserId: string | null;
    onBack: () => void;
    onConversationCreated: (conversationId: string) => void;
    className?: string;
}

export const NewConversationView = ({
    currentUserId,
    onBack,
    onConversationCreated,
    className,
}: NewConversationViewProps) => {
    const [connections, setConnections] = useState<EnrichedParticipant[]>([]);
    const [filteredConnections, setFilteredConnections] = useState<EnrichedParticipant[]>([]);
    const [selectedRecipients, setSelectedRecipients] = useState<EnrichedParticipant[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchConnections = useCallback(async () => {
        if (!currentUserId) return;
        setLoading(true);

        try {
            const { data: connectionData, error: connectionsError } = await supabase
                .from("connections")
                .select("connected_user_id")
                .eq("user_id", currentUserId);

            if (connectionsError) throw connectionsError;

            if (connectionData && connectionData.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from("profiles")
                    .select("id, first_name, last_name, avatar_url, university")
                    .in("id", connectionData.map(c => c.connected_user_id));

                if (profilesError) throw profilesError;

                const profileList = profiles || [];
                const userIds = profileList.map(p => p.id);

                const [rolesMap, { data: badgesData }] = await Promise.all([
                    fetchMultipleUserRoles(userIds),
                    supabase
                        .from('user_badges')
                        .select(`
                            id,
                            user_id,
                            badge_id,
                            created_at,
                            badges(id, name, description, icon, image_url, color_bg, color_text, is_active)
                        `)
                        .in('user_id', userIds)
                ]);

                const badgesMap = new Map<string, UserBadge[]>();
                badgesData?.forEach((ub) => {
                    if (!badgesMap.has(ub.user_id)) {
                        badgesMap.set(ub.user_id, []);
                    }
                    badgesMap.get(ub.user_id)!.push(ub as UserBadge);
                });

                const enriched = profileList.map((p) => {
                    const roles = rolesMap.get(p.id);
                    return {
                        ...p,
                        user_role: roles?.baseRole ?? null,
                        user_is_admin: roles?.hasAdminRole ?? false,
                        user_badges: badgesMap.get(p.id) || []
                    } as EnrichedParticipant;
                });

                setConnections(enriched);
                setFilteredConnections(enriched);
            } else {
                setConnections([]);
                setFilteredConnections([]);
            }
        } catch (error) {
            console.error("Error fetching connections:", error);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    // Filter connections based on search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredConnections(connections.filter(c => !selectedRecipients.some(s => s.id === c.id)));
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredConnections(
                connections.filter(c => {
                    const fullName = getFullName(c.first_name, c.last_name).toLowerCase();
                    const isNotSelected = !selectedRecipients.some(s => s.id === c.id);
                    return isNotSelected && (fullName.includes(query) || c.university?.toLowerCase().includes(query));
                })
            );
        }
    }, [searchQuery, connections, selectedRecipients]);

    const handleSelectRecipient = (connection: ConversationParticipant) => {
        setSelectedRecipients(prev => [...prev, connection]);
        setSearchQuery("");
    };

    const handleRemoveRecipient = (connectionId: string) => {
        setSelectedRecipients(prev => prev.filter(c => c.id !== connectionId));
    };

    const handleStartConversation = async () => {
        if (selectedRecipients.length === 0 || !currentUserId) return;

        setCreating(true);
        try {
            const isGroup = selectedRecipients.length > 1;

            if (!isGroup) {
                // For 1:1, just navigate to the user's profile ID
                // The messages system will handle it as a direct message
                onConversationCreated(selectedRecipients[0].id);
                return;
            }

            // For group messages, check if thread already exists with these exact participants
            const participantIds = [currentUserId, ...selectedRecipients.map(r => r.id)].sort();

            // Batch fetch all of my threads and their members in a single query
            const { data: myThreads } = await supabase
                .from("group_message_members")
                .select("thread_id")
                .eq("user_id", currentUserId);

            const threadIds = [...new Set(myThreads?.map(t => t.thread_id) || [])];
            if (threadIds.length > 0) {
                const { data: allMembers } = await supabase
                    .from("group_message_members")
                    .select("thread_id, user_id")
                    .in("thread_id", threadIds);

                const membersByThread = new Map<string, string[]>();
                (allMembers || []).forEach(m => {
                    const arr = membersByThread.get(m.thread_id) || [];
                    arr.push(m.user_id);
                    membersByThread.set(m.thread_id, arr);
                });

                for (const tid of threadIds) {
                    const memberIds = (membersByThread.get(tid) || []).sort();
                    if (memberIds.length === participantIds.length &&
                        memberIds.every((id, i) => id === participantIds[i])) {
                        onConversationCreated(`thread:${tid}`);
                        return;
                    }
                }
            }

            // Create new thread
            const threadId = crypto.randomUUID();

            // Bulk insert all members (including current user) in one request
            const allMembers = [currentUserId, ...selectedRecipients.map(r => r.id)].map(userId => ({
                thread_id: threadId,
                user_id: userId,
            }));

            const { error: membersError } = await supabase
                .from("group_message_members")
                .insert(allMembers);

            if (membersError) throw membersError;

            // Create the initial message to establish the thread
            const threadName = selectedRecipients.map(r => getFullName(r.first_name, r.last_name)).join(", ");
            const { error: msgError } = await supabase
                .from("group_messages")
                .insert({
                    thread_id: threadId,
                    sender_id: currentUserId,
                    content: `Started a group conversation with ${threadName}`,
                });

            if (msgError) throw msgError;

            console.log("Group conversation created successfully, thread ID:", threadId);
            onConversationCreated(`thread:${threadId}`);
        } catch (error) {
            console.error("Error creating conversation:", error);
            // Show error to user
            alert(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className={className}>
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-lg font-semibold">New Message</h2>
                </div>
            </div>

            {/* Recipients Section */}
            <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium">To:</span>
                    <div className="flex-1 flex flex-wrap gap-2">
                        {selectedRecipients.map(recipient => (
                            <Badge
                                key={recipient.id}
                                variant="secondary"
                                className="flex items-center gap-1 pl-1 pr-2 py-1"
                            >
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={recipient.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px]">
                                        {getInitials(recipient.first_name, recipient.last_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{getFullName(recipient.first_name, recipient.last_name)}</span>
                                <button
                                    onClick={() => handleRemoveRecipient(recipient.id)}
                                    className="ml-1 hover:text-destructive"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search connections..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Connections List */}
            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Loading connections...</p>
                    </div>
                ) : filteredConnections.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        {connections.length === 0 ? (
                            <>
                                <p>No connections found</p>
                                <p className="text-xs mt-2">Connect with others first to start messaging</p>
                            </>
                        ) : searchQuery ? (
                            <p className="text-sm">No matching connections</p>
                        ) : (
                            <p className="text-sm">All connections selected</p>
                        )}
                    </div>
                ) : (
                    <div className="p-2">
                        {filteredConnections.map(connection => (
                            <button
                                key={connection.id}
                                onClick={() => handleSelectRecipient(connection)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={connection.avatar_url || undefined} />
                                    <AvatarFallback>
                                        {getInitials(connection.first_name, connection.last_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1 mb-0.5">
                                        <p className="font-medium truncate">
                                            {getFullName(connection.first_name, connection.last_name)}
                                        </p>
                                        {connection.user_is_admin && (
                                            <Badge
                                                variant="destructive"
                                                className="text-[10px] px-1 py-0 flex-shrink-0"
                                            >
                                                Admin
                                            </Badge>
                                        )}
                                        {connection.user_role && (
                                            <Badge
                                                className="text-[10px] px-1 py-0 flex-shrink-0 bg-navy text-gold border-navy"
                                            >
                                                {connection.user_role.charAt(0).toUpperCase() + connection.user_role.slice(1)}
                                            </Badge>
                                        )}
                                        {connection.user_badges && connection.user_badges.length > 0 && (
                                            <TooltipProvider>
                                                {connection.user_badges.map((userBadge) => {
                                                    const badge = userBadge.badges;
                                                    if (!badge) return null;
                                                    return (
                                                        <Tooltip key={userBadge.id} delayDuration={100}>
                                                            <TooltipTrigger asChild>
                                                                <div className="cursor-help">
                                                                    {badge.image_url ? (
                                                                        <img
                                                                            src={badge.image_url}
                                                                            alt={badge.name}
                                                                            className="w-4 h-4 object-contain"
                                                                        />
                                                                    ) : badge.icon ? (
                                                                        <span className="text-sm">{badge.icon}</span>
                                                                    ) : null}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="text-xs">
                                                                <div className="font-semibold">{badge.name}</div>
                                                                {badge.description && <div className="text-xs mt-1">{badge.description}</div>}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </TooltipProvider>
                                        )}
                                    </div>
                                    {connection.university && (
                                        <p className="text-sm text-muted-foreground truncate">
                                            {connection.university}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Start Conversation Button */}
            {selectedRecipients.length > 0 && (
                <div className="p-4 border-t border-border">
                    <Button
                        onClick={handleStartConversation}
                        disabled={creating}
                        className="w-full"
                    >
                        {creating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                Start {selectedRecipients.length > 1 ? "Group " : ""}Conversation
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
};
