import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, User, Trash2, LogOut, Pencil, Check, X, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Conversation } from "@/types/messages";
import { isValidUUID } from "@/lib/validation";
import { build1to1Filter } from "@/lib/secureQuery";
import { secureLog } from "@/lib/secureLog";
import { getFullName, getInitials } from "@/lib/nameUtils";

interface ChatHeaderProps {
    conversation: Conversation;
    onBack?: () => void;
    showBackButton?: boolean;
    onDeleteConversation?: () => void;
    onRenameGroup?: (threadId: string, newName: string) => Promise<boolean>;
    onStartDirectMessage?: (userId: string) => void;
}

export const ChatHeader = ({ conversation, onBack, showBackButton, onDeleteConversation, onRenameGroup, onStartDirectMessage }: ChatHeaderProps) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showMembersDialog, setShowMembersDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(conversation.name);
    const [isSavingName, setIsSavingName] = useState(false);

    const handleViewProfile = () => {
        navigate(`/profile/${conversation.userId}`);
    };

    const handleStartEditing = () => {
        setEditedName(conversation.name);
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setEditedName(conversation.name);
        setIsEditing(false);
    };

    const handleSaveName = async () => {
        if (!conversation.threadId || !onRenameGroup) return;

        setIsSavingName(true);
        const success = await onRenameGroup(conversation.threadId, editedName);
        setIsSavingName(false);

        if (success) {
            setIsEditing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            handleCancelEditing();
        }
    };

    const handleDeleteConversation = async () => {
        setIsDeleting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            if (conversation.isGroup && conversation.threadId) {
                // For group chats: Leave the group by removing membership
                const { error } = await supabase
                    .from('group_message_members')
                    .delete()
                    .eq('thread_id', conversation.threadId)
                    .eq('user_id', user.id);

                if (error) throw error;

                toast({
                    title: "Left group",
                    description: "You have left the group conversation.",
                });
            } else {
                // For 1:1 messages: Hide all messages in this conversation for this user
                if (!isValidUUID(user.id) || !isValidUUID(conversation.userId)) {
                    throw new Error("Invalid user ID");
                }

                // Get all messages in this conversation
                const { data: conversationMessages } = await supabase
                    .from('messages')
                    .select('id')
                    .or(build1to1Filter(user.id, conversation.userId));

                if (conversationMessages && conversationMessages.length > 0) {
                    // Hide all messages for this user
                    const hiddenRecords = conversationMessages.map(msg => ({
                        user_id: user.id,
                        message_id: msg.id
                    }));

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error: hideErr } = await (supabase.from('user_hidden_messages') as any)
                        .upsert(hiddenRecords, { onConflict: 'user_id,message_id' });

                    if (hideErr) throw hideErr;
                }

                toast({
                    title: "Conversation removed",
                    description: "This conversation has been hidden from your list.",
                });
            }

            setShowDeleteDialog(false);
            onDeleteConversation?.();
        } catch (error) {
            secureLog.error('Failed to delete conversation', error);
            toast({
                title: "Error",
                description: conversation.isGroup
                    ? "Failed to leave the group. Please try again."
                    : "Failed to delete the conversation. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {showBackButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden mr-2"
                            onClick={onBack}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </Button>
                    )}
                    <div className="relative">
                        {!conversation.isGroup ? (
                            <button onClick={handleViewProfile} className="cursor-pointer">
                                <Avatar className="w-10 h-10 hover:opacity-80 transition-opacity">
                                    <AvatarImage src={conversation.avatarUrl || undefined} alt={conversation.name} />
                                    <AvatarFallback className="bg-gold text-navy font-semibold">
                                        {conversation.avatar}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        ) : (
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={conversation.avatarUrl || undefined} alt={conversation.name} />
                                <AvatarFallback className="bg-gold text-navy font-semibold">
                                    {conversation.avatar}
                                </AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                    <div>
                        {/* Name + Role + Badges on same line */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {!conversation.isGroup ? (
                                <button onClick={handleViewProfile} className="font-semibold hover:text-gold transition-colors cursor-pointer">
                                    {conversation.name}
                                </button>
                            ) : isEditing ? (
                                <div className="flex items-center gap-1">
                                    <Input
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="h-7 w-40 text-sm font-semibold"
                                        placeholder="Group name"
                                        autoFocus
                                        disabled={isSavingName}
                                        maxLength={100}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={handleSaveName}
                                        disabled={isSavingName}
                                    >
                                        <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={handleCancelEditing}
                                        disabled={isSavingName}
                                    >
                                        <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <h3 className="font-semibold">{conversation.name}</h3>
                                    {onRenameGroup && (
                                        <TooltipProvider>
                                            <Tooltip delayDuration={100}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={handleStartEditing}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Rename group</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                            )}

                            {conversation.user_role && (
                                <Badge
                                    className="text-xs bg-navy text-gold border-navy"
                                >
                                    {conversation.user_role.charAt(0).toUpperCase() + conversation.user_role.slice(1)}
                                </Badge>
                            )}
                            {conversation.user_badges && conversation.user_badges.map((userBadge) => {
                                const badge = userBadge.badges;
                                if (!badge) return null;

                                return (
                                    <TooltipProvider key={userBadge.id}>
                                        <Tooltip delayDuration={100}>
                                            <TooltipTrigger asChild>
                                                <div className="cursor-help">
                                                    {badge.image_url ? (
                                                        <img
                                                            src={badge.image_url}
                                                            alt={badge.name}
                                                            className="w-5 h-5 object-contain"
                                                        />
                                                    ) : badge.icon ? (
                                                        <span className="text-base">{badge.icon}</span>
                                                    ) : null}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="text-sm">
                                                    <p className="font-semibold">{badge.name}</p>
                                                    {badge.description && <p className="text-xs mt-1">{badge.description}</p>}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                        </div>

                        {/* Status / Member count */}
                        <div className="text-xs text-muted-foreground mt-1">
                            {conversation.isGroup && conversation.participants && conversation.participants.length > 0 ? (
                                <TooltipProvider>
                                    <Tooltip delayDuration={100}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => setShowMembersDialog(true)}
                                                className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                                            >
                                                <Users className="h-3 w-3" />
                                                <span>{conversation.role}</span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Click to view members</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ) : (
                                <p>{conversation.role}</p>
                            )}
                        </div>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!conversation.isGroup && (
                            <DropdownMenuItem onClick={handleViewProfile}>
                                <User className="h-4 w-4 mr-2" />
                                View Profile
                            </DropdownMenuItem>
                        )}
                        {!conversation.isGroup && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-destructive"
                        >
                            {conversation.isGroup ? (
                                <>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Leave Group
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Conversation
                                </>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {conversation.isGroup ? "Leave Group" : "Delete Conversation"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {conversation.isGroup
                                ? `Are you sure you want to leave "${conversation.name}"? You will no longer receive messages from this group and it will be removed from your conversations.`
                                : `Are you sure you want to delete this conversation with ${conversation.name}? This will permanently delete all messages and cannot be undone.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConversation}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting
                                ? (conversation.isGroup ? "Leaving..." : "Deleting...")
                                : (conversation.isGroup ? "Leave Group" : "Delete")
                            }
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Members Dialog for Group Chats */}
            <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
                <DialogContent
                    className="sm:max-w-md"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Group Members
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px] pr-4">
                        <div className="space-y-3">
                            {conversation.participants?.map((participant) => (
                                <div
                                    key={participant.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={participant.avatar_url || undefined} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {getInitials(participant.first_name, participant.last_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {getFullName(participant.first_name, participant.last_name)}
                                            </p>
                                            {participant.university && (
                                                <p className="text-xs text-muted-foreground">
                                                    {participant.university}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <TooltipProvider>
                                            <Tooltip delayDuration={100}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => {
                                                            setShowMembersDialog(false);
                                                            navigate(`/profile/${participant.id}`);
                                                        }}
                                                    >
                                                        <User className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>View Profile</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {onStartDirectMessage && (
                                            <TooltipProvider>
                                                <Tooltip delayDuration={100}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => {
                                                                setShowMembersDialog(false);
                                                                onStartDirectMessage(participant.id);
                                                            }}
                                                        >
                                                            <MessageSquare className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Send Message</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(!conversation.participants || conversation.participants.length === 0) && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No members found
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
};
