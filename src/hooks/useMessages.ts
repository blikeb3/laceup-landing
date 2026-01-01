import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Message } from "@/types/messages";
import { formatTime } from "@/lib/formatTime";
import { isValidUUID } from "@/lib/validation";
import { getFullName } from "@/lib/nameUtils";
import { build1to1Filter } from "@/lib/secureQuery";
import { secureLog } from "@/lib/secureLog";

// ============ Helper Types ============
interface DbMessage {
    id: string;
    sender_id: string;
    receiver_id?: string;
    thread_id?: string;
    content: string;
    created_at: string;
    image_url?: string | null;
    file_url?: string | null;
    file_name?: string | null;
    read_at?: string | null;
    is_system_message?: boolean;
    system_message_type?: string;
    status?: string;
}

// ============ Helper Functions ============

/** Load profile names for a list of user IDs */
async function loadProfileMap(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();

    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

    return new Map(
        profiles?.map(p => [p.id, getFullName(p.first_name, p.last_name)]) || []
    );
}

/** Load set of hidden message IDs for a user */
async function loadHiddenMessageIds(userId: string): Promise<Set<string>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hiddenMsgs } = await (supabase.from("user_hidden_messages") as any)
        .select("message_id")
        .eq("user_id", userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Set((hiddenMsgs || []).map((h: any) => h.message_id));
}

/** Convert a database message to the Message interface */
function formatMessage(
    msg: DbMessage,
    currentUserId: string,
    profileMap: Map<string, string>,
    isGroup: boolean
): Message {
    const isOwn = msg.sender_id === currentUserId;
    const isSystem = msg.is_system_message || false;

    let sender: string;
    if (isOwn) {
        sender = "You";
    } else if (isSystem) {
        sender = "System";
    } else {
        sender = profileMap.get(msg.sender_id) || "Unknown";
    }

    return {
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: isGroup ? undefined : msg.receiver_id,
        thread_id: isGroup ? msg.thread_id : undefined,
        sender,
        text: msg.content,
        time: formatTime(new Date(msg.created_at)),
        isOwn,
        created_at: msg.created_at,
        read_at: msg.read_at ?? null,
        image_url: msg.image_url,
        file_url: msg.file_url,
        file_name: msg.file_name,
        isSystemMessage: isSystem,
        systemMessageType: msg.system_message_type as Message["systemMessageType"],
        status: (msg.status as Message["status"]) || "sent"
    };
}

export const useMessages = (
    currentUserId: string | null,
    selectedConversation: string | null,
    isGroupConversation?: boolean
) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [threadId, setThreadId] = useState<string | null>(null);
    const { toast } = useToast();

    // Shared message loading logic
    const loadMessagesInternal = useCallback(async (): Promise<{ messages: Message[]; threadId: string | null } | null> => {
        if (!currentUserId || !selectedConversation) return null;

        const hiddenMessageIds = await loadHiddenMessageIds(currentUserId);

        if (selectedConversation.startsWith("thread:")) {
            const tid = selectedConversation.replace("thread:", "");

            const { data: groupMsgs, error } = await supabase
                .from("group_messages")
                .select("*")
                .eq("thread_id", tid)
                .order("created_at", { ascending: true });

            if (error) throw error;

            const visibleMsgs = (groupMsgs || []).filter(m => !hiddenMessageIds.has(m.id));
            const senderIds = [...new Set(visibleMsgs.map(m => m.sender_id))];
            const profileMap = await loadProfileMap(senderIds);

            return {
                messages: visibleMsgs.map(msg => formatMessage(msg as DbMessage, currentUserId, profileMap, true)),
                threadId: tid
            };
        } else {
            if (!isValidUUID(currentUserId) || !isValidUUID(selectedConversation)) {
                console.error("Invalid user IDs provided");
                return null;
            }

            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .or(build1to1Filter(currentUserId, selectedConversation))
                .order("created_at", { ascending: true });

            if (error) throw error;

            const visibleData = (data || []).filter(m => !hiddenMessageIds.has(m.id));
            const senderIds = [...new Set(visibleData.map(m => m.sender_id))];
            const profileMap = await loadProfileMap(senderIds);

            return {
                messages: visibleData.map(msg => formatMessage(msg as DbMessage, currentUserId, profileMap, false)),
                threadId: null
            };
        }
    }, [currentUserId, selectedConversation]);

    const markConversationAsRead = useCallback(async () => {
        if (!currentUserId || !selectedConversation) return;
        const readTimestamp = new Date().toISOString();
        try {
            if (selectedConversation.startsWith("thread:")) {
                // Group read tracking (requires group_message_reads table)
                const tid = selectedConversation.replace("thread:", "");
                // Fetch unread group messages (not sent by current user)
                const { data: groupMsgs } = await supabase
                    .from("group_messages")
                    .select("id, sender_id")
                    .eq("thread_id", tid);

                const toMark = (groupMsgs || []).filter(m => m.sender_id !== currentUserId).map(m => ({
                    message_id: m.id,
                    user_id: currentUserId,
                    read_at: readTimestamp
                }));

                if (toMark.length > 0) {
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const { error } = await (supabase.from("group_message_reads") as any).upsert(toMark, { onConflict: "message_id,user_id" });
                        if (error) {
                            console.log("group_message_reads upsert failed", error);
                        }
                        // Also update message status to 'read'
                        try {
                            await supabase
                                .from("group_messages")
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                .update({ status: "read" } as any)
                                .in("id", toMark.map(m => m.message_id))
                                .neq("sender_id", currentUserId);
                        } catch (e) {
                            console.log("Failed to update group message status", e);
                        }
                    } catch (e) {
                        // Table may not exist or RLS prevents write; fail silently
                        console.log("group_message_reads upsert error", e);
                    }
                }
            } else {
                // 1:1 messages: set read_at for all unread incoming messages from partner
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase.from("messages") as any)
                    .update({ read_at: readTimestamp, status: "read" })
                    .eq("receiver_id", currentUserId)
                    .eq("sender_id", selectedConversation)
                    .is("read_at", null);

                if (error) {
                    console.error("markConversationAsRead DB error:", error);
                    throw error;
                }

                // Update local state to reflect the read status
                setMessages(prev => prev.map(msg => {
                    // Only update messages that I received (from the partner) that were unread
                    if (msg.sender_id === selectedConversation && !msg.read_at) {
                        return { ...msg, read_at: readTimestamp, status: "read" as const };
                    }
                    return msg;
                }));
            }
        } catch (e) {
            console.log("markConversationAsRead failed", e);
        }
    }, [currentUserId, selectedConversation]);

    // Load messages for selected conversation
    useEffect(() => {
        if (!currentUserId || !selectedConversation) return;

        setMessages([]);
        setLoadingMessages(true);

        const loadMessages = async () => {
            try {
                const result = await loadMessagesInternal();
                if (result) {
                    setMessages(result.messages);
                    setThreadId(result.threadId);
                }
                await markConversationAsRead();
            } catch (error) {
                console.error("Error loading messages:", error);
                toast({
                    title: "Error",
                    description: "Failed to load messages",
                    variant: "destructive"
                });
            } finally {
                setLoadingMessages(false);
            }
        };

        loadMessages();

        // Subscribe to new messages
        const channelName = `messages-${selectedConversation}`;
        let channel: ReturnType<typeof supabase.channel>;

        if (selectedConversation.startsWith("thread:")) {
            const tid = selectedConversation.replace("thread:", "");
            channel = supabase
                .channel(channelName)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "group_messages",
                        filter: `thread_id=eq.${tid}`
                    },
                    async (payload) => {
                        const newMsg = payload.new as DbMessage & { is_system_message?: boolean; system_message_type?: string };

                        // For non-system messages, skip if sender is current user
                        if (!newMsg.is_system_message && newMsg.sender_id === currentUserId) return;

                        // Get sender name
                        const profileMap = newMsg.is_system_message
                            ? new Map<string, string>()
                            : await loadProfileMap([newMsg.sender_id]);

                        const formattedMessage = formatMessage(newMsg, currentUserId, profileMap, true);
                        setMessages(prev => [...prev, formattedMessage]);

                        // Attempt to mark as read immediately when viewing this thread (skip system messages)
                        if (!newMsg.is_system_message) {
                            try {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const { error } = await (supabase.from("group_message_reads") as any).upsert({
                                    message_id: newMsg.id,
                                    user_id: currentUserId,
                                    read_at: new Date().toISOString()
                                }, { onConflict: "message_id,user_id" });
                                if (error) {
                                    console.log("Failed to mark message as read", error);
                                }
                            } catch (e) {
                                // Table may not exist or RLS prevents write; ignore
                                console.log("Failed to mark message as read:", e);
                            }
                        }
                    }
                )
                .subscribe();
        } else if (isValidUUID(selectedConversation)) {
            channel = supabase
                .channel(channelName)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "messages"
                    },
                    async (payload) => {
                        const newMsg = payload.new as DbMessage;

                        const isRelevant = (
                            (newMsg.sender_id === currentUserId && newMsg.receiver_id === selectedConversation) ||
                            (newMsg.sender_id === selectedConversation && newMsg.receiver_id === currentUserId)
                        );

                        if (!isRelevant || newMsg.sender_id === currentUserId) return;

                        const profileMap = await loadProfileMap([newMsg.sender_id]);
                        const formattedMessage = formatMessage(newMsg, currentUserId, profileMap, false);
                        setMessages(prev => [...prev, formattedMessage]);

                        // Mark this specific message as read since we're viewing the conversation
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            await (supabase.from("messages") as any)
                                .update({ read_at: new Date().toISOString(), status: "read" })
                                .eq("id", newMsg.id)
                                .is("read_at", null);
                        } catch (e) {
                            console.log("read_at update failed", e);
                        }
                    }
                )
                .subscribe();
        }

        // Subscribe to hidden messages changes to reload when messages are hidden
        const hiddenChannel = supabase
            .channel(`hidden-messages-${currentUserId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "user_hidden_messages",
                    filter: `user_id=eq.${currentUserId}`
                },
                async () => {
                    // Reload messages when one is hidden
                    await loadMessages();
                }
            )
            .subscribe();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
            supabase.removeChannel(hiddenChannel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserId, selectedConversation, toast]);

    const sendMessage = async (
        content: string,
        imageUrl?: string | null,
        fileUrl?: string | null,
        fileName?: string | null
    ): Promise<{ success: boolean; messageId?: string }> => {
        if (!currentUserId || !selectedConversation) {
            return { success: false };
        }

        const tempId = `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: tempId,
            sender_id: currentUserId,
            receiver_id: selectedConversation.startsWith("thread:") ? undefined : selectedConversation,
            thread_id: threadId || undefined,
            sender: "You",
            text: content,
            time: formatTime(new Date()),
            isOwn: true,
            created_at: new Date().toISOString(),
            image_url: imageUrl || null,
            file_url: fileUrl || null,
            file_name: fileName || null
        };

        // Optimistically add message
        setMessages(prev => [...prev, tempMessage]);

        try {
            let data: { id: string; created_at: string } | null = null;
            let error: Error | null = null;

            if (selectedConversation.startsWith("thread:") && threadId) {
                // Send to group thread
                const result = await supabase
                    .from("group_messages")
                    .insert({
                        thread_id: threadId,
                        sender_id: currentUserId,
                        content: content || (imageUrl ? "[Image]" : (fileUrl ? "[File]" : "")),
                        image_url: imageUrl || null,
                        file_url: fileUrl || null,
                        file_name: fileName || null
                    })
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            } else {
                // Send 1:1 message
                if (!isValidUUID(selectedConversation)) {
                    throw new Error("Invalid recipient ID");
                }

                const result = await supabase
                    .from("messages")
                    .insert({
                        sender_id: currentUserId,
                        receiver_id: selectedConversation,
                        content: content || (imageUrl ? "[Image]" : (fileUrl ? "[File]" : "")),
                        image_url: imageUrl || null,
                        file_url: fileUrl || null,
                        file_name: fileName || null
                    })
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            // Replace temp message with actual message
            if (data) {
                setMessages(prev => prev.map(msg =>
                    msg.id === tempId ? {
                        ...tempMessage,
                        id: data.id,
                        created_at: data.created_at!
                    } : msg
                ));
            }

            return { success: true, messageId: data?.id };
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            toast({
                title: "Error",
                description: "Failed to send message",
                variant: "destructive"
            });
            return { success: false };
        }
    };

    const deleteMessage = async (messageId: string): Promise<boolean> => {
        if (!currentUserId) return false;

        try {
            // Check if it's a group message or regular message
            const message = messages.find(m => m.id === messageId);
            if (!message) return false;

            // Only allow deleting own messages
            if (message.sender_id !== currentUserId) {
                toast({
                    title: "Error",
                    description: "You can only delete your own messages",
                    variant: "destructive"
                });
                return false;
            }

            if (message.thread_id) {
                // Delete from group_messages
                const { error } = await supabase
                    .from("group_messages")
                    .delete()
                    .eq("id", messageId)
                    .eq("sender_id", currentUserId);

                if (error) throw error;
            } else {
                // Delete from messages
                const { error } = await supabase
                    .from("messages")
                    .delete()
                    .eq("id", messageId)
                    .eq("sender_id", currentUserId);

                if (error) throw error;
            }

            // Remove from local state
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
            return true;
        } catch (error) {
            console.error("Error deleting message:", error);
            toast({
                title: "Error",
                description: "Failed to delete message",
                variant: "destructive"
            });
            return false;
        }
    };

    const refetchMessages = useCallback(async () => {
        if (!currentUserId || !selectedConversation) return;

        setLoadingMessages(true);
        try {
            const result = await loadMessagesInternal();
            if (result) {
                setMessages(result.messages);
                setThreadId(result.threadId);
            }
        } catch (error) {
            console.error("Error refetching messages:", error);
        } finally {
            setLoadingMessages(false);
        }
    }, [currentUserId, selectedConversation, loadMessagesInternal]);

    return {
        messages,
        loadingMessages,
        sendMessage,
        deleteMessage,
        threadId,
        markConversationAsRead,
        refetchMessages
    };
};

