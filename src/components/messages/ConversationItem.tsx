import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Conversation } from "@/types/messages";
import { getFullName } from "@/lib/nameUtils";

interface ConversationItemProps {
    conversation: Conversation;
    isSelected: boolean;
    onClick: () => void;
}

export const ConversationItem = ({ conversation, isSelected, onClick }: ConversationItemProps) => {
    // Get full participant names for tooltip on group chats
    const getParticipantNames = () => {
        if (!conversation.isGroup || !conversation.participants) return null;
        return conversation.participants
            .map(p => getFullName(p.first_name, p.last_name) || 'Unknown')
            .join(', ');
    };

    const participantNames = getParticipantNames();

    return (
        <div
            onClick={onClick}
            className={`p-4 border-b border-border cursor-pointer hover:bg-secondary transition-colors ${isSelected ? "bg-secondary" : ""
                }`}
        >
            <div className="flex items-start space-x-3 group">
                <div className="relative">
                    <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.avatarUrl || undefined} alt={conversation.name} />
                        <AvatarFallback className="bg-gold text-navy font-semibold">
                            {conversation.avatar}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {conversation.isGroup && participantNames ? (
                                <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <h4 className="font-semibold truncate cursor-default">{conversation.name}</h4>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                            <p className="text-sm">{participantNames}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ) : (
                                <h4 className="font-semibold truncate">{conversation.name}</h4>
                            )}
                            {conversation.user_is_admin && (
                                <Badge
                                    variant="destructive"
                                    className="text-xs flex-shrink-0"
                                >
                                    Admin
                                </Badge>
                            )}
                            {conversation.user_role && (
                                <Badge
                                    variant={conversation.user_role === 'employer' ? 'default' : conversation.user_role === 'mentor' ? 'secondary' : 'outline'}
                                    className="text-xs flex-shrink-0"
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
                                                            className="w-4 h-4 object-contain"
                                                        />
                                                    ) : badge.icon ? (
                                                        <span className="text-sm">{badge.icon}</span>
                                                    ) : null}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="text-xs">
                                                    <p className="font-semibold">{badge.name}</p>
                                                    {badge.description && <p className="text-xs mt-1">{badge.description}</p>}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{conversation.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">{conversation.role}</p>
                    <p className={`text-sm line-clamp-2 ${conversation.unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {conversation.lastMessage}
                    </p>
                </div>
                {conversation.unread && (
                    <Badge
                        variant="secondary"
                        className="bg-gold text-navy px-2 py-0 h-5 flex items-center motion-safe:animate-pulse transition-transform group-hover:scale-105"
                        title={`${conversation.unreadCount ?? 1} unread`}
                    >
                        {conversation.unreadCount ?? 1}
                    </Badge>
                )}
            </div>
        </div>
    );
};
