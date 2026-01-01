import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useFileUpload } from "@/hooks/useFileUpload";
import {
  ConversationList,
  ChatHeader,
  MessageBubble,
  MessageInput,
  QuickPrompts,
  NewConversationView,
  DayDivider,
  SystemMessage
} from "@/components/messages";
import { isValidUUID } from "@/lib/validation";
import { secureLog } from "@/lib/secureLog";
import { ConversationParticipant } from "@/types/messages";
import { getInitials } from "@/lib/nameUtils";

const Messages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const {
    filteredConversations,
    loading,
    searchQuery,
    setSearchQuery,
    isSearching,
    conversations,
    refetch,
    renameGroupChat,
    markConversationAsReadLocally
  } = useConversations(currentUserId);

  const existingConv = conversations.find(c => c.id === selectedConversation);

  const [partnerProfile, setPartnerProfile] = useState<ConversationParticipant | null>(null);

  // Fetch partner profile for newly created 1:1 conversations
  useEffect(() => {
    if (!selectedConversation || selectedConversation.startsWith('thread:') || !isValidUUID(selectedConversation)) {
      setPartnerProfile(null);
      return;
    }

    // Check if this is a new 1:1 conversation (not in the list)
    const existingConv = conversations.find(c => c.id === selectedConversation);
    if (existingConv) {
      setPartnerProfile(null);
      return;
    }

    // Fetch the partner's profile for a new 1:1 conversation
    const fetchPartnerProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, university, degree')
          .eq('id', selectedConversation)
          .single();

        if (profile) {
          setPartnerProfile(profile);
        }
      } catch (error) {
        secureLog.error('Failed to fetch partner profile', error);
      }
    };

    fetchPartnerProfile();
  }, [selectedConversation, conversations]);

  // Create a placeholder for newly created conversations not yet in the list
  const selectedConv = existingConv || (selectedConversation?.startsWith('thread:') ? {
    id: selectedConversation,
    threadId: selectedConversation.replace('thread:', ''),
    name: 'Group Chat',
    avatar: 'GC',
    avatarUrl: null,
    role: 'Loading...',
    connectionType: 'peer' as const,
    lastMessage: '',
    time: '',
    isConnected: true,
    userId: '',
    isGroup: true,
    participants: []
  } : (selectedConversation && isValidUUID(selectedConversation) ? (partnerProfile ? {
    id: selectedConversation,
    name: `${partnerProfile.first_name || ''} ${partnerProfile.last_name || ''}`.trim() || 'Unknown User',
    avatar: getInitials(partnerProfile.first_name, partnerProfile.last_name),
    avatarUrl: partnerProfile.avatar_url,
    role: partnerProfile.university || 'LaceUP Member',
    connectionType: 'peer' as const,
    lastMessage: '',
    time: '',
    isConnected: true,
    userId: selectedConversation,
    isGroup: false,
    participants: [partnerProfile]
  } : {
    // Temporary placeholder while loading profile
    id: selectedConversation,
    name: 'Loading...',
    avatar: '?',
    avatarUrl: null,
    role: 'Loading...',
    connectionType: 'peer' as const,
    lastMessage: '',
    time: '',
    isConnected: true,
    userId: selectedConversation,
    isGroup: false,
    participants: []
  }) : null));

  const { messages, loadingMessages, sendMessage, deleteMessage, threadId, markConversationAsRead, refetchMessages } = useMessages(
    currentUserId,
    selectedConversation,
    selectedConv?.isGroup
  );

  const {
    selectedFile,
    filePreview,
    uploading,
    fileInputRef,
    handleFileSelect,
    uploadFile,
    clearFileSelection,
    openFilePicker
  } = useFileUpload();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Handle userId from URL params or auto-select first conversation
  useEffect(() => {
    const userIdFromParams = searchParams.get('userId');

    if (userIdFromParams && conversations.length > 0 && isValidUUID(userIdFromParams)) {
      // Check if this user exists in conversations
      const targetConversation = conversations.find(c => c.id === userIdFromParams || c.userId === userIdFromParams);
      if (targetConversation) {
        setSelectedConversation(targetConversation.id);
        setShowConversationList(false);
        setShowNewConversation(false);
        searchParams.delete('userId');
        setSearchParams(searchParams, { replace: true });
        return;
      }
    }

    // Auto-select first conversation if none selected and not composing
    if (conversations.length > 0 && !selectedConversation && !showNewConversation) {
      setSelectedConversation(conversations[0].id);
      setShowConversationList(false);
    }
  }, [conversations, selectedConversation, searchParams, setSearchParams, showNewConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ensure scroll to latest when opening a conversation (after messages load)
  useEffect(() => {
    if (!selectedConversation) return;
    if (!loadingMessages) {
      // Delay to allow DOM to paint before scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [selectedConversation, loadingMessages]);

  const handleSelectConversation = async (id: string) => {
    setSelectedConversation(id);
    setShowQuickPrompts(true);
    setShowConversationList(false);
    setShowNewConversation(false);
    // Optimistically mark as read in local state immediately
    markConversationAsReadLocally(id);
    // Then persist to database (fire and forget - local state already updated)
    markConversationAsRead();
  };

  const handleComposeClick = () => {
    setShowNewConversation(true);
    setShowConversationList(false);
    setSelectedConversation(null);
  };

  const handleConversationCreated = async (conversationId: string) => {
    console.log("Conversation created, selecting:", conversationId);
    setShowNewConversation(false);
    setShowConversationList(false);
    setShowQuickPrompts(true);

    // Optimistically select immediately for snappy UX
    setSelectedConversation(conversationId);
    // Optimistically mark as read in local state
    markConversationAsReadLocally(conversationId);
    // Persist to database
    markConversationAsRead();
    // Background refresh to populate the list entry
    refetch();
  };

  const handleBackFromNewConversation = () => {
    setShowNewConversation(false);
    setShowConversationList(true);
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    }
  };

  // Start a direct message with a user from a group chat
  const handleStartDirectMessage = (userId: string) => {
    if (!userId || !isValidUUID(userId)) return;

    // Check if there's already a 1:1 conversation with this user
    const existingDM = conversations.find(c => !c.isGroup && c.userId === userId);

    if (existingDM) {
      // Select the existing conversation
      handleSelectConversation(existingDM.id);
    } else {
      // Treat the userId as a new conversation - same flow as NewConversationView
      handleConversationCreated(userId);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !selectedFile) || !currentUserId) return;

    let imageUrl: string | null = null;
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    // Upload file if selected
    if (selectedFile) {
      const fileData = await uploadFile(currentUserId);
      if (fileData) {
        if (fileData.type.startsWith('image/')) {
          imageUrl = fileData.url;
        } else {
          fileUrl = fileData.url;
          fileName = fileData.name;
        }
      }
    }

    const content = messageText || (imageUrl ? '[Image]' : (fileUrl ? '[File]' : ''));
    const result = await sendMessage(content, imageUrl, fileUrl, fileName);

    if (result.success) {
      setMessageText("");
      clearFileSelection();
      setShowQuickPrompts(false);
      // Ensure conversation list reflects latest state
      refetch();
    }
  };

  const handleQuickPrompt = async (type: "mentorship" | "opportunity") => {
    const promptText = type === "mentorship"
      ? "Hi! I'd love to request your mentorship. I'm really interested in learning from your experience and would appreciate any guidance you could provide."
      : "Hi! I saw your recent opportunity post and I'm very interested in discussing it further. I believe my skills and background would be a great fit.";

    const result = await sendMessage(promptText);
    if (result.success) {
      setShowQuickPrompts(false);
    }
  };

  const handleDeleteConversation = async () => {
    setSelectedConversation(null);
    const updatedConversations = await refetch();
    // Select the first conversation from the updated list
    if (updatedConversations && updatedConversations.length > 0) {
      setSelectedConversation(updatedConversations[0].id);
      setShowConversationList(false);
    } else {
      setShowConversationList(true);
    }
  };

  const handleDeleteMessagesBefore = async (beforeDate: Date) => {
    // Hide all messages before this date for the current user only
    // (messages stay in DB for other users)
    // Use local date string for comparison to avoid timezone issues
    const toLocalDateKey = (dt: Date) => {
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const beforeDateKey = toLocalDateKey(beforeDate);

    if (!currentUserId) {
      secureLog.warn("No current user ID for hiding messages");
      return;
    }

    secureLog.debug("Hiding messages", { beforeDateKey });

    const messagesToHide = messages.filter(msg => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = msg.created_at || (msg as any).createdAt || null;
      const msgDateKey = created ? toLocalDateKey(new Date(created)) : null;
      if (!created) return false;
      return msgDateKey ? msgDateKey < beforeDateKey : false;
    });

    if (messagesToHide.length === 0) {
      secureLog.debug("No messages found to hide");
      return;
    }

    // Hide them by inserting into user_hidden_messages table
    const hiddenRecords = messagesToHide.map(msg => ({
      user_id: currentUserId,
      message_id: msg.id
    }));

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("user_hidden_messages")
        .upsert(hiddenRecords, { onConflict: "user_id,message_id" });

      if (error) throw error;

      secureLog.info("Messages hidden successfully", { count: messagesToHide.length });

      // Immediately reload messages and conversation list
      await refetchMessages();
      await refetch();
    } catch (e) {
      secureLog.error("Failed to hide messages", e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Card className="h-[calc(100vh-10rem)] flex items-center justify-center">
          <LoadingSpinner text="Loading conversations..." />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <Card className="h-[calc(100vh-10rem)] flex overflow-hidden">
        {/* Conversations List */}
        <ConversationList
          conversations={filteredConversations}
          selectedConversation={selectedConversation}
          searchQuery={searchQuery}
          isSearching={isSearching}
          onSearchChange={setSearchQuery}
          onSelectConversation={handleSelectConversation}
          onComposeClick={handleComposeClick}
          className={`${showConversationList ? 'flex' : 'hidden'} md:flex w-full md:w-fit md:max-w-[30rem] border-r border-border flex-col`}
        />

        {/* New Conversation View */}
        {showNewConversation && (
          <NewConversationView
            currentUserId={currentUserId}
            onBack={handleBackFromNewConversation}
            onConversationCreated={handleConversationCreated}
            className={`${!showConversationList || showNewConversation ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}
          />
        )}

        {/* Chat Window */}
        {!showNewConversation && selectedConv ? (
          <div className={`${!showConversationList ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}>
            <ChatHeader
              conversation={selectedConv}
              onBack={async () => {
                // Clear unread when leaving this chat view
                if (selectedConversation) {
                  markConversationAsReadLocally(selectedConversation);
                }
                markConversationAsRead();
                setShowConversationList(true);
              }}
              showBackButton
              onDeleteConversation={handleDeleteConversation}
              onRenameGroup={selectedConv.isGroup ? renameGroupChat : undefined}
              onStartDirectMessage={selectedConv.isGroup ? handleStartDirectMessage : undefined}
            />

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner text="Loading messages..." />
                  </div>
                ) : (
                  <>
                    {showQuickPrompts && messages.length <= 1 && selectedConv && !selectedConv.isGroup && (
                      <QuickPrompts
                        conversation={selectedConv}
                        onSelectPrompt={handleQuickPrompt}
                      />
                    )}

                    {/* Render messages with day dividers when the date changes */}
                    {(() => {
                      const elements: JSX.Element[] = [];
                      let lastDayKey: string | null = null;

                      // Use local date string for comparison to avoid timezone issues
                      const toLocalDateKey = (dt: Date) => {
                        const year = dt.getFullYear();
                        const month = String(dt.getMonth() + 1).padStart(2, '0');
                        const day = String(dt.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      };

                      for (const m of messages) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const created = m.created_at || (m as any).createdAt || null;
                        const dateObj = created ? new Date(created) : null;
                        const dayKey = dateObj ? toLocalDateKey(dateObj) : null;

                        if (dayKey && dayKey !== lastDayKey) {
                          elements.push(
                            <DayDivider
                              key={`day-${dayKey}`}
                              date={dateObj!}
                              onDeleteBefore={currentUserId ? handleDeleteMessagesBefore : undefined}
                            />
                          );
                          lastDayKey = dayKey;
                        }

                        elements.push(
                          m.isSystemMessage ? (
                            <SystemMessage key={m.id} message={m} />
                          ) : (
                            <MessageBubble
                              key={m.id}
                              message={m}
                              onDelete={deleteMessage}
                              recipientAvatarUrl={selectedConv?.avatarUrl}
                              recipientInitials={selectedConv?.avatar}
                            />
                          )
                        );
                      }

                      return elements;
                    })()}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>

            <MessageInput
              messageText={messageText}
              onMessageChange={setMessageText}
              onSend={handleSend}
              onFileClick={openFilePicker}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              filePreview={filePreview}
              onClearFile={clearFileSelection}
              uploading={uploading}
              showEmojiPicker={showEmojiPicker}
              onEmojiPickerChange={setShowEmojiPicker}
              onEmojiSelect={handleEmojiSelect}
            />
          </div>
        ) : !showNewConversation && (
          <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Messages;
