import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Conversation, ConversationParticipant } from "@/types/messages";
import { getFullName, getInitials, formatGroupDisplayName } from "@/lib/nameUtils";
import { formatMessageTime } from "@/lib/formatTime";
import { isValidUUID, sanitizeSearchQuery } from "@/lib/validation";
import { buildSenderReceiverFilter, buildUserMessagesFilter } from "@/lib/secureQuery";
import { secureLog } from "@/lib/secureLog";

export const useConversations = (currentUserId: string | null) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Set<string>>(new Set());
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();

    // Search through all messages when search query changes
    useEffect(() => {
        if (!currentUserId || !searchQuery.trim()) {
            setSearchResults(new Set());
            setIsSearching(false);
            return;
        }

        const searchMessages = async () => {
            setIsSearching(true);
            if (!isValidUUID(currentUserId)) {
                setIsSearching(false);
                return;
            }

            try {
                const sanitizedQuery = sanitizeSearchQuery(searchQuery);

                // Search in regular messages
                const { data: matchingMessages } = await supabase
                    .from("messages")
                    .select("sender_id, receiver_id")
                    .or(buildSenderReceiverFilter(currentUserId))
                    .ilike("content", `%${sanitizedQuery}%`);

                const conversationIds = new Set<string>();
                matchingMessages?.forEach(msg => {
                    if (msg.sender_id === currentUserId) {
                        conversationIds.add(msg.receiver_id);
                    } else {
                        conversationIds.add(msg.sender_id);
                    }
                });

                // Also search in group messages
                try {
                    const { data: matchingGroupMessages } = await supabase
                        .from("group_messages")
                        .select("thread_id")
                        .ilike("content", `%${sanitizedQuery}%`);

                    matchingGroupMessages?.forEach(msg => {
                        conversationIds.add(`thread:${msg.thread_id}`);
                    });
                } catch {
                    // Group messages table may not exist yet
                }

                setSearchResults(conversationIds);
            } catch (error) {
                console.error("Error searching messages:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchMessages, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, currentUserId]);

    const loadConversations = useCallback(async () => {
        if (!currentUserId) return;

        try {
            // Fast path: fetch conversation summaries via RPC in one call
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: summaries } = await (supabase as any)
                    .rpc('get_conversation_summaries', { user_uuid: currentUserId });

                if (summaries && Array.isArray(summaries)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const conversationsData: Conversation[] = summaries.map((s: any) => {
                        const initials = getInitials(
                            (s.name || '').split(' ')[0] || null,
                            (s.name || '').split(' ')[1] || null
                        );

                        const connectionType: 'mentor' | 'employer' | 'peer' =
                            s.role_type === 'mentor' ? 'mentor' :
                                s.role_type === 'employer' ? 'employer' : 'peer';

                        // For groups, extract threadId from the id if it starts with 'thread:'
                        const isGroup = !!s.is_group;
                        let threadId = s.thread_id || undefined;
                        if (isGroup && !threadId && typeof s.id === 'string' && s.id.startsWith('thread:')) {
                            threadId = s.id.replace('thread:', '');
                        }

                        return {
                            id: s.id,
                            threadId,
                            name: s.name || 'Unknown',
                            avatar: initials,
                            avatarUrl: s.avatar_url || null,
                            role: s.role || 'LaceUP Member',
                            user_role: s.user_role || undefined,
                            user_is_admin: s.user_is_admin || false,
                            user_badges: s.user_badges || [],
                            connectionType,
                            lastMessage: s.last_message || 'No messages yet',
                            time: s.last_message_date ? formatMessageTime(new Date(s.last_message_date)) : '',
                            lastMessageDate: s.last_message_date || null,
                            isConnected: true,
                            userId: s.user_id || '',
                            isGroup,
                            participants: undefined,
                            unreadCount: s.unread_count || 0,
                            unread: (s.unread_count || 0) > 0,
                        };
                    });

                    conversationsData.sort((a, b) => {
                        const dateA = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
                        const dateB = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
                        return dateB - dateA;
                    });

                    // Fetch badges for all 1-1 conversations from RPC
                    const oneToOneUserIds = conversationsData
                        .filter(c => !c.isGroup)
                        .map(c => c.userId)
                        .filter(id => isValidUUID(id));

                    if (oneToOneUserIds.length > 0) {
                        const { data: userRolesData } = await supabase
                            .from('user_roles')
                            .select('user_id, role')
                            .in('user_id', oneToOneUserIds);

                        // Handle multiple roles per user
                        const rolesMap = new Map<string, string[]>();
                        userRolesData?.forEach(r => {
                            if (!rolesMap.has(r.user_id)) {
                                rolesMap.set(r.user_id, []);
                            }
                            rolesMap.get(r.user_id)?.push(r.role);
                        });

                        const { data: userBadgesData } = await supabase
                            .from('user_badges')
                            .select('*, badges(*)')
                            .in('user_id', oneToOneUserIds);

                        const badgesMap = new Map();
                        userBadgesData?.forEach(badge => {
                            if (!badgesMap.has(badge.user_id)) {
                                badgesMap.set(badge.user_id, []);
                            }
                            badgesMap.get(badge.user_id).push(badge);
                        });

                        // Update conversations with roles and badges
                        conversationsData.forEach(conv => {
                            if (!conv.isGroup && conv.userId) {
                                const userRoles = rolesMap.get(conv.userId) || [];
                                const hasAdminRole = userRoles.includes('admin');
                                const baseRoles = userRoles.filter(r => r !== 'admin');

                                conv.user_role = baseRoles.length > 0 ? baseRoles[0] : undefined;
                                conv.user_is_admin = hasAdminRole;
                                conv.user_badges = badgesMap.get(conv.userId) || [];
                            }
                        });
                    }

                    // Fetch participant info for group conversations to format names properly
                    const groupConversations = conversationsData.filter(c => c.isGroup && c.threadId);
                    if (groupConversations.length > 0) {
                        const threadIds = groupConversations.map(c => c.threadId!);

                        // Fetch all members for these threads
                        const { data: allMembers } = await supabase
                            .from("group_message_members")
                            .select("thread_id, user_id")
                            .in("thread_id", threadIds);

                        const otherMemberIdsByThread = new Map<string, string[]>();
                        const uniqueOtherIds = new Set<string>();
                        (allMembers || []).forEach(m => {
                            if (m.user_id === currentUserId) return;
                            const arr = otherMemberIdsByThread.get(m.thread_id) || [];
                            arr.push(m.user_id);
                            otherMemberIdsByThread.set(m.thread_id, arr);
                            uniqueOtherIds.add(m.user_id);
                        });

                        // Fetch profiles for all unique other members
                        const { data: profiles } = await supabase
                            .from("profiles")
                            .select("id, first_name, last_name, avatar_url, university")
                            .in("id", Array.from(uniqueOtherIds));
                        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

                        // Fetch the latest thread_name from group_messages for each thread
                        const { data: latestMessages } = await supabase
                            .from("group_messages")
                            .select("thread_id, thread_name")
                            .in("thread_id", threadIds)
                            .order("created_at", { ascending: false });

                        const threadNameMap = new Map<string, string | null>();
                        (latestMessages || []).forEach(msg => {
                            // Only set if not already set (first one is the latest)
                            if (!threadNameMap.has(msg.thread_id)) {
                                threadNameMap.set(msg.thread_id, msg.thread_name);
                            }
                        });

                        // Update group conversation names with formatted display name
                        groupConversations.forEach(conv => {
                            if (!conv.threadId) return;
                            const otherIds = otherMemberIdsByThread.get(conv.threadId) || [];
                            const participantProfiles: ConversationParticipant[] = otherIds
                                .map(id => profilesMap.get(id))
                                .filter(Boolean) as ConversationParticipant[];

                            const customThreadName = threadNameMap.get(conv.threadId);
                            conv.name = formatGroupDisplayName(participantProfiles, customThreadName);
                            conv.participants = participantProfiles;
                            conv.role = `Group - ${participantProfiles.length + 1} members`;
                        });
                    }

                    // Supplement RPC results with connections that have no messages
                    // This ensures newly created 1:1 conversations appear in the list
                    const { data: connections } = await supabase
                        .from("connections")
                        .select("connected_user_id")
                        .eq("user_id", currentUserId);

                    if (connections && connections.length > 0) {
                        const existingUserIds = new Set(conversationsData.filter(c => !c.isGroup).map(c => c.userId));
                        const missingUserIds = connections
                            .map(c => c.connected_user_id)
                            .filter(id => !existingUserIds.has(id));

                        if (missingUserIds.length > 0) {
                            const { data: profiles } = await supabase
                                .from("profiles")
                                .select("id, first_name, last_name, avatar_url, university")
                                .in("id", missingUserIds);

                            const { data: userRoles } = await supabase
                                .from("user_roles")
                                .select("user_id, role")
                                .in("user_id", missingUserIds);

                            // Handle multiple roles per user
                            const roleMap = new Map<string, string[]>();
                            userRoles?.forEach(r => {
                                if (!roleMap.has(r.user_id)) {
                                    roleMap.set(r.user_id, []);
                                }
                                roleMap.get(r.user_id)?.push(r.role);
                            });

                            // Fetch badges for missing users
                            const { data: userBadgesData } = await supabase
                                .from('user_badges')
                                .select('*, badges(*)')
                                .in('user_id', missingUserIds);

                            const badgesMap = new Map();
                            userBadgesData?.forEach(badge => {
                                if (!badgesMap.has(badge.user_id)) {
                                    badgesMap.set(badge.user_id, []);
                                }
                                badgesMap.get(badge.user_id).push(badge);
                            });

                            (profiles || []).forEach(profile => {
                                const userRoles = roleMap.get(profile.id) || [];
                                const hasAdminRole = userRoles.includes('admin');
                                const baseRoles = userRoles.filter(r => r !== 'admin');
                                const userRole = baseRoles[0];
                                const userIsAdmin = hasAdminRole;
                                const baseRole = userRole === 'admin' ? null : userRole;
                                const connectionType: 'mentor' | 'employer' | 'peer' =
                                    userRole === 'mentor' ? 'mentor' :
                                        userRole === 'employer' ? 'employer' : 'peer';

                                conversationsData.push({
                                    id: profile.id,
                                    name: getFullName(profile.first_name, profile.last_name) || 'Unknown User',
                                    avatar: getInitials(profile.first_name, profile.last_name),
                                    avatarUrl: profile.avatar_url,
                                    role: profile.university || 'LaceUP Member',
                                    user_role: baseRole,
                                    user_is_admin: userIsAdmin,
                                    user_badges: badgesMap.get(profile.id) || [],
                                    connectionType,
                                    lastMessage: 'No messages yet',
                                    time: '',
                                    lastMessageDate: null,
                                    isConnected: true,
                                    userId: profile.id,
                                    isGroup: false,
                                    participants: undefined,
                                    unreadCount: 0,
                                    unread: false,
                                });
                            });
                        }
                    }

                    // Deduplicate conversations by ID before setting state
                    const uniqueConversations = Array.from(
                        new Map(conversationsData.map(conv => [conv.id, conv])).values()
                    );

                    setConversations(uniqueConversations);
                    return uniqueConversations;
                }
            } catch (rpcError) {
                // Fall back to existing multi-query approach
                console.log('RPC get_conversation_summaries failed, using fallback', rpcError);
            }
            // Preload unread counts for 1:1 messages
            const unreadMap = new Map<string, number>();
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: unreadRows } = await (supabase as any)
                    .from("messages")
                    .select("sender_id")
                    .eq("receiver_id", currentUserId)
                    .is("read_at", null);

                (unreadRows || []).forEach(row => {
                    unreadMap.set(row.sender_id, (unreadMap.get(row.sender_id) || 0) + 1);
                });
            } catch (e) {
                console.log("Unread preload failed (messages)", e);
            }

            const conversationsData: Conversation[] = [];

            // Hidden conversations already loaded above

            // Load group message threads (batched)
            try {
                const { data: myThreads, error: threadError } = await supabase
                    .from("group_message_members")
                    .select("thread_id")
                    .eq("user_id", currentUserId);

                if (!threadError && myThreads && myThreads.length > 0) {
                    const threadIds = [...new Set(myThreads.map(t => t.thread_id))];

                    // Fetch all members for these threads
                    const { data: allMembers } = await supabase
                        .from("group_message_members")
                        .select("thread_id, user_id")
                        .in("thread_id", threadIds);

                    const otherMemberIdsByThread = new Map<string, string[]>();
                    const uniqueOtherIds = new Set<string>();
                    (allMembers || []).forEach(m => {
                        if (m.user_id === currentUserId) return;
                        const arr = otherMemberIdsByThread.get(m.thread_id) || [];
                        arr.push(m.user_id);
                        otherMemberIdsByThread.set(m.thread_id, arr);
                        uniqueOtherIds.add(m.user_id);
                    });

                    // Fetch profiles and roles for all unique other members once
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("id, first_name, last_name, avatar_url, university")
                        .in("id", Array.from(uniqueOtherIds));
                    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

                    const { data: userRoles } = await supabase
                        .from("user_roles")
                        .select("user_id, role")
                        .in("user_id", Array.from(uniqueOtherIds));

                    // Handle multiple roles per user
                    const roleMap = new Map<string, string[]>();
                    userRoles?.forEach(r => {
                        if (!roleMap.has(r.user_id)) {
                            roleMap.set(r.user_id, []);
                        }
                        roleMap.get(r.user_id)?.push(r.role);
                    });

                    // Fetch badges for all unique other members
                    const { data: userBadgesData } = await supabase
                        .from('user_badges')
                        .select('*, badges(*)')
                        .in('user_id', Array.from(uniqueOtherIds));

                    const badgesMap = new Map();
                    userBadgesData?.forEach(badge => {
                        if (!badgesMap.has(badge.user_id)) {
                            badgesMap.set(badge.user_id, []);
                        }
                        badgesMap.get(badge.user_id).push(badge);
                    });

                    // Fetch last messages for all threads in one go
                    const { data: lastMsgsBatch } = await supabase
                        .from("group_messages")
                        .select("thread_id, content, created_at, thread_name")
                        .in("thread_id", threadIds)
                        .order("created_at", { ascending: false });
                    const lastMsgMap = new Map<string, { content: string; created_at: string; thread_name: string | null }>();
                    (lastMsgsBatch || []).forEach(msg => {
                        if (!lastMsgMap.has(msg.thread_id)) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            lastMsgMap.set(msg.thread_id, { content: msg.content, created_at: msg.created_at, thread_name: (msg as any).thread_name ?? null });
                        }
                    });

                    // Compute group unread counts in batch if possible
                    try {
                        const { data: groupMsgs } = await supabase
                            .from("group_messages")
                            .select("id, thread_id, sender_id")
                            .in("thread_id", threadIds);

                        const perThreadOthers = new Map<string, { ids: string[]; count: number }>();
                        (groupMsgs || []).forEach(m => {
                            if (m.sender_id === currentUserId) return;
                            const arr = perThreadOthers.get(m.thread_id) || { ids: [], count: 0 };
                            arr.ids.push(m.id);
                            arr.count += 1;
                            perThreadOthers.set(m.thread_id, arr);
                        });

                        const allIds = Array.from(perThreadOthers.values()).flatMap(v => v.ids);
                        let readsByUser = new Set<string>();
                        if (allIds.length > 0) {
                            try {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const { data: reads } = await (supabase as any)
                                    .from("group_message_reads")
                                    .select("message_id")
                                    .eq("user_id", currentUserId)
                                    .in("message_id", allIds);
                                readsByUser = new Set((reads || []).map(r => r.message_id));
                            } catch (e) {
                                // table may not exist
                            }
                        }

                        // We'll attach counts below when pushing conversations
                        const unreadByThread = new Map<string, number>();
                        perThreadOthers.forEach((val, tid) => {
                            const count = val.ids.filter(id => !readsByUser.has(id)).length;
                            unreadByThread.set(tid, count);
                        });

                        // Build conversation objects
                        for (const tid of threadIds) {
                            const otherIds = otherMemberIdsByThread.get(tid) || [];
                            if (otherIds.length === 0) continue;

                            const participantProfiles: ConversationParticipant[] = otherIds.map(id => profilesMap.get(id)).filter(Boolean) as ConversationParticipant[];
                            const isGroup = participantProfiles.length > 1;

                            let displayName: string;
                            let avatarInitials: string;
                            let avatarUrl: string | null = null;
                            let connectionType: "mentor" | "employer" | "peer" = "peer";
                            let roleDisplay = "LaceUP Member";

                            const lastMessage = lastMsgMap.get(tid);

                            if (isGroup) {
                                displayName = formatGroupDisplayName(participantProfiles, lastMessage?.thread_name);
                                avatarInitials = participantProfiles.length > 0
                                    ? getInitials(participantProfiles[0].first_name, participantProfiles[0].last_name)
                                    : "GR";
                                roleDisplay = `Group - ${participantProfiles.length + 1} members`;
                            } else {
                                const profile = participantProfiles[0];
                                displayName = getFullName(profile?.first_name, profile?.last_name) || "Unknown";
                                avatarInitials = getInitials(profile?.first_name, profile?.last_name);
                                avatarUrl = profile?.avatar_url || null;

                                const userRoles = profile ? (roleMap.get(profile.id) || []) : [];
                                const userIsAdmin = userRoles.includes('admin');
                                const baseRole = userRoles.find(r => r !== 'admin');

                                if (baseRole === "mentor") connectionType = "mentor";
                                else if (baseRole === "employer") connectionType = "employer";

                                roleDisplay = profile?.university ||
                                    (baseRole === "mentor" ? "Mentor" :
                                        baseRole === "employer" ? "Employer" :
                                            baseRole === "athlete" ? "Student Athlete" : "LaceUP Member");

                                conversationsData.push({
                                    id: `thread:${tid}`,
                                    threadId: tid,
                                    name: displayName,
                                    avatar: avatarInitials,
                                    avatarUrl,
                                    role: roleDisplay,
                                    user_role: baseRole,
                                    user_is_admin: userIsAdmin,
                                    user_badges: profile ? (badgesMap.get(profile.id) || []) : [],
                                    connectionType,
                                    lastMessage: lastMessage?.content || "No messages yet",
                                    time: lastMessage ? formatMessageTime(new Date(lastMessage.created_at!)) : "",
                                    lastMessageDate: lastMessage?.created_at || null,
                                    isConnected: true,
                                    userId: participantProfiles[0]?.id || "",
                                    isGroup,
                                    participants: participantProfiles,
                                    unreadCount: (unreadByThread.get(tid) || 0),
                                    unread: (unreadByThread.get(tid) || 0) > 0,
                                });
                                continue;
                            }

                            conversationsData.push({
                                id: `thread:${tid}`,
                                threadId: tid,
                                name: displayName,
                                avatar: avatarInitials,
                                avatarUrl,
                                role: roleDisplay,
                                user_role: undefined,
                                user_is_admin: false,
                                user_badges: [],
                                connectionType,
                                lastMessage: lastMessage?.content || "No messages yet",
                                time: lastMessage ? formatMessageTime(new Date(lastMessage.created_at!)) : "",
                                lastMessageDate: lastMessage?.created_at || null,
                                isConnected: true,
                                userId: participantProfiles[0]?.id || "",
                                isGroup,
                                participants: participantProfiles,
                                unreadCount: (unreadByThread.get(tid) || 0),
                                unread: (unreadByThread.get(tid) || 0) > 0,
                            });
                        }
                    } catch (e) {
                        console.log("Group unread compute failed", e);
                    }
                }
            } catch (groupError) {
                console.log("Group messages not available:", groupError);
            }

            // Load 1:1 conversations from connections
            const { data: connections } = await supabase
                .from("connections")
                .select("connected_user_id")
                .eq("user_id", currentUserId);

            if (connections && connections.length > 0) {
                const connectedUserIds = connections.map(c => c.connected_user_id);

                // Filter out users who already have a group thread
                const existingThreadUserIds = new Set(
                    conversationsData
                        .filter(c => !c.isGroup)
                        .flatMap(c => c.participants?.map(p => p.id) || [c.userId])
                );

                const newUserIds = connectedUserIds.filter(id => !existingThreadUserIds.has(id));

                if (newUserIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("*")
                        .in("id", newUserIds);

                    const { data: userRoles } = await supabase
                        .from("user_roles")
                        .select("user_id, role")
                        .in("user_id", newUserIds);

                    // Handle multiple roles per user
                    const roleMap = new Map<string, string[]>();
                    userRoles?.forEach(r => {
                        if (!roleMap.has(r.user_id)) {
                            roleMap.set(r.user_id, []);
                        }
                        roleMap.get(r.user_id)?.push(r.role);
                    });

                    // Fetch badges for all new users
                    const { data: userBadgesData } = await supabase
                        .from('user_badges')
                        .select('*, badges(*)')
                        .in('user_id', newUserIds);

                    const badgesMap = new Map();
                    userBadgesData?.forEach(badge => {
                        if (!badgesMap.has(badge.user_id)) {
                            badgesMap.set(badge.user_id, []);
                        }
                        badgesMap.get(badge.user_id).push(badge);
                    });

                    const validProfiles = (profiles || []).filter(p => isValidUUID(p.id));

                    if (validProfiles.length > 0) {
                        // Get last messages for these connections
                        const validNewUserIds = newUserIds.filter(id => isValidUUID(id));

                        if (validNewUserIds.length > 0) {
                            const { data: allMessages } = await supabase
                                .from("messages")
                                .select("id, sender_id, receiver_id, content, created_at")
                                .or(buildUserMessagesFilter(currentUserId, validNewUserIds))
                                .order("created_at", { ascending: false });

                            const lastMessageMap = new Map<string, typeof allMessages extends (infer T)[] ? T : never>();
                            allMessages?.forEach(msg => {
                                const partnerId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
                                if (!lastMessageMap.has(partnerId)) {
                                    lastMessageMap.set(partnerId, msg);
                                }
                            });

                            for (const profile of validProfiles) {
                                const lastMessage = lastMessageMap.get(profile.id);
                                const initials = getInitials(profile.first_name, profile.last_name);
                                const userRoles = roleMap.get(profile.id) || [];
                                const userIsAdmin = userRoles.includes('admin');
                                const baseRole = userRoles.find(r => r !== 'admin');

                                let connectionType: "mentor" | "employer" | "peer" = "peer";
                                if (baseRole === "mentor") connectionType = "mentor";
                                else if (baseRole === "employer") connectionType = "employer";

                                const roleDisplay = profile.degree ||
                                    (baseRole === "mentor" ? "Mentor" :
                                        baseRole === "employer" ? "Employer" :
                                            baseRole === "athlete" ? "Student Athlete" : "LaceUP Member");

                                conversationsData.push({
                                    id: profile.id,
                                    name: getFullName(profile.first_name, profile.last_name) || "Unknown User",
                                    avatar: initials,
                                    avatarUrl: profile.avatar_url,
                                    role: roleDisplay,
                                    user_role: baseRole,
                                    user_is_admin: userIsAdmin,
                                    user_badges: badgesMap.get(profile.id) || [],
                                    connectionType,
                                    lastMessage: lastMessage?.content || "No messages yet",
                                    time: lastMessage ? formatMessageTime(new Date(lastMessage.created_at!)) : "",
                                    lastMessageDate: lastMessage?.created_at || null,
                                    isConnected: true,
                                    userId: profile.id,
                                    isGroup: false,
                                    unreadCount: unreadMap.get(profile.id) || 0,
                                    unread: (unreadMap.get(profile.id) || 0) > 0,
                                });
                            }
                        }
                    }
                }
            }

            // Sort by most recent activity (newest first)
            conversationsData.sort((a, b) => {
                const dateA = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
                const dateB = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
                return dateB - dateA; // Descending order (newest first)
            });

            // Deduplicate conversations by ID before setting state
            const uniqueConversations = Array.from(
                new Map(conversationsData.map(conv => [conv.id, conv])).values()
            );

            setConversations(uniqueConversations);
            return uniqueConversations;
        } catch (error) {
            secureLog.error("Failed to load conversations", error);
            toast({
                title: "Error",
                description: "Failed to load conversations",
                variant: "destructive"
            });
            return [];
        } finally {
            setLoading(false);
        }
    }, [currentUserId, toast]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Real-time subscriptions for message updates
    useEffect(() => {
        if (!currentUserId) return;

        // Subscribe to 1:1 messages
        const messagesChannel = supabase
            .channel('conversations-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                async (payload) => {
                    const newMsg = payload.new as { sender_id: string; receiver_id: string; content: string; created_at: string };

                    // Only update if this message involves the current user
                    if (newMsg.sender_id !== currentUserId && newMsg.receiver_id !== currentUserId) {
                        return;
                    }

                    // Update conversation list
                    const partnerId = newMsg.sender_id === currentUserId ? newMsg.receiver_id : newMsg.sender_id;

                    setConversations(prev => {
                        const existingIndex = prev.findIndex(c => c.id === partnerId);

                        if (existingIndex >= 0) {
                            // Update existing conversation
                            const updated = [...prev];
                            updated[existingIndex] = {
                                ...updated[existingIndex],
                                lastMessage: newMsg.content,
                                time: formatMessageTime(new Date(newMsg.created_at)),
                                lastMessageDate: newMsg.created_at,
                                // Increment unread if this is from partner to current user
                                unreadCount: updated[existingIndex].unreadCount || 0,
                                unread: updated[existingIndex].unread || false
                            };

                            if (newMsg.sender_id !== currentUserId) {
                                const currCount = updated[existingIndex].unreadCount || 0;
                                updated[existingIndex].unreadCount = currCount + 1;
                                updated[existingIndex].unread = (updated[existingIndex].unreadCount || 0) > 0;
                            }

                            // Re-sort by most recent
                            updated.sort((a, b) => {
                                const dateA = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
                                const dateB = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
                                return dateB - dateA;
                            });

                            return updated;
                        }

                        return prev;
                    });

                    // If conversation doesn't exist, reload all conversations
                    setConversations(prev => {
                        if (!prev.find(c => c.id === partnerId)) {
                            loadConversations();
                        }
                        return prev;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages'
                },
                async (payload) => {
                    const updated = payload.new as { sender_id: string; receiver_id: string; content: string; created_at: string };
                    if (!updated) return;
                    if (updated.sender_id !== currentUserId && updated.receiver_id !== currentUserId) return;
                    // Recompute list to ensure lastMessage/time stay correct
                    await loadConversations();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages'
                },
                async (payload) => {
                    const oldMsg = payload.old as { sender_id: string; receiver_id: string };
                    if (!oldMsg) return;
                    // Only refresh if deletion involves current user
                    if (oldMsg.sender_id !== currentUserId && oldMsg.receiver_id !== currentUserId) return;
                    // Simple approach: refetch conversations to update lastMessage/time
                    await loadConversations();
                }
            )
            .subscribe();

        // Subscribe to group messages
        const groupMessagesChannel = supabase
            .channel('conversations-group-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'group_messages'
                },
                async (payload) => {
                    const newMsg = payload.new as { thread_id: string; sender_id: string; content: string; created_at: string };

                    // Skip incrementing unread for own messages
                    const isOwnMessage = newMsg.sender_id === currentUserId;

                    setConversations(prev => {
                        const conversationId = `thread:${newMsg.thread_id}`;
                        const existingIndex = prev.findIndex(c => c.id === conversationId);

                        if (existingIndex >= 0) {
                            // Update existing group conversation
                            const updated = [...prev];
                            const existingConv = updated[existingIndex];
                            updated[existingIndex] = {
                                ...existingConv,
                                lastMessage: newMsg.content,
                                time: formatMessageTime(new Date(newMsg.created_at)),
                                lastMessageDate: newMsg.created_at,
                                // Increment unread count for incoming messages (not own)
                                unreadCount: isOwnMessage ? existingConv.unreadCount : (existingConv.unreadCount || 0) + 1,
                                unread: isOwnMessage ? existingConv.unread : true
                            };

                            // Re-sort by most recent
                            updated.sort((a, b) => {
                                const dateA = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
                                const dateB = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
                                return dateB - dateA;
                            });

                            return updated;
                        }

                        return prev;
                    });

                    // If conversation doesn't exist, reload all conversations
                    setConversations(prev => {
                        const conversationId = `thread:${newMsg.thread_id}`;
                        if (!prev.find(c => c.id === conversationId)) {
                            loadConversations();
                        }
                        return prev;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'group_messages'
                },
                async () => {
                    // Thread name or message content updated; refresh list
                    await loadConversations();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'group_messages'
                },
                async () => {
                    // For group deletions, just refetch to recompute last message
                    await loadConversations();
                }
            )
            .subscribe();

        // Subscribe to group membership changes (join/leave)
        const membershipChannel = supabase
            .channel('conversations-members')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'group_message_members',
                    filter: `user_id=eq.${currentUserId}`
                },
                async () => {
                    await loadConversations();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'group_message_members',
                    filter: `user_id=eq.${currentUserId}`
                },
                async () => {
                    await loadConversations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messagesChannel);
            supabase.removeChannel(groupMessagesChannel);
            supabase.removeChannel(membershipChannel);
        };
    }, [currentUserId, loadConversations]);

    const filteredConversations = conversations.filter((conv) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            conv.name.toLowerCase().includes(query) ||
            conv.role.toLowerCase().includes(query) ||
            searchResults.has(conv.id) ||
            (conv.threadId && searchResults.has(`thread:${conv.threadId}`))
        );
    });

    // Function to optimistically mark a conversation as read in local state
    const markConversationAsReadLocally = useCallback((conversationId: string) => {
        setConversations(prev => prev.map(conv => {
            if (conv.id === conversationId) {
                return {
                    ...conv,
                    unread: false,
                    unreadCount: 0
                };
            }
            return conv;
        }));
    }, []);

    // Function to rename a group chat
    const renameGroupChat = useCallback(async (threadId: string, newName: string): Promise<boolean> => {
        if (!currentUserId || !threadId) return false;

        // Validate threadId is a valid UUID to prevent injection
        if (!isValidUUID(threadId)) {
            secureLog.error('Invalid threadId provided to renameGroupChat');
            return false;
        }

        try {
            // Sanitize name: trim, limit length, remove potentially dangerous characters
            const trimmedName = newName.trim().slice(0, 100).replace(/[<>"'`]/g, '');

            // Insert a system message with the new thread name
            // This ensures the thread_name is always persisted with a message record
            const { error: insertError } = await supabase
                .from('group_messages')
                .insert({
                    thread_id: threadId,
                    sender_id: currentUserId,
                    content: trimmedName ? `Group renamed to "${trimmedName}"` : 'Group name reset to default',
                    thread_name: trimmedName || null,
                    is_system_message: true,
                    system_message_type: 'group_renamed'
                });

            if (insertError) {
                throw insertError;
            }

            // Also update all existing messages to have the new thread_name for consistency
            await supabase
                .from('group_messages')
                .update({ thread_name: trimmedName || null })
                .eq('thread_id', threadId);

            // Update local state immediately for better UX
            setConversations(prev => prev.map(conv => {
                if (conv.threadId === threadId) {
                    // Find participants to recompute the display name
                    const displayName = trimmedName || formatGroupDisplayName(conv.participants || [], null);
                    return {
                        ...conv,
                        name: displayName,
                        customName: trimmedName || null
                    };
                }
                return conv;
            }));

            toast({
                title: "Group renamed",
                description: trimmedName ? `Group name changed to "${trimmedName}"` : "Group name reset to default",
            });

            return true;
        } catch (error) {
            secureLog.error('Failed to rename group chat', error);
            toast({
                title: "Error",
                description: "Failed to rename group. Please try again.",
                variant: "destructive",
            });
            return false;
        }
    }, [currentUserId, toast]);

    return {
        conversations,
        filteredConversations,
        loading,
        searchQuery,
        setSearchQuery,
        isSearching,
        refetch: loadConversations,
        renameGroupChat,
        markConversationAsReadLocally
    };
};
