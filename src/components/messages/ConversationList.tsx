import { Search, PenSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Conversation } from "@/types/messages";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
    conversations: Conversation[];
    selectedConversation: string | null;
    searchQuery: string;
    isSearching: boolean;
    onSearchChange: (query: string) => void;
    onSelectConversation: (id: string) => void;
    onComposeClick?: () => void;
    className?: string;
}

export const ConversationList = ({
    conversations,
    selectedConversation,
    searchQuery,
    isSearching,
    onSearchChange,
    onSelectConversation,
    onComposeClick,
    className
}: ConversationListProps) => {
    return (
        <div className={className}>
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-heading font-bold">Messages</h2>
                    {onComposeClick && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onComposeClick}
                            title="New message"
                        >
                            <PenSquare className="h-5 w-5" />
                        </Button>
                    )}
                </div>
                <div className="relative">
                    {isSearching ? (
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent"></div>
                        </div>
                    ) : (
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                        placeholder="Search messages"
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                {conversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        {searchQuery.trim() ? (
                            <>
                                <p>No messages found</p>
                                <p className="text-xs mt-2">Try a different search term</p>
                            </>
                        ) : (
                            <>
                                <p>No conversations yet</p>
                                <p className="text-xs mt-2">Connect with others to start messaging</p>
                            </>
                        )}
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            isSelected={selectedConversation === conv.id}
                            onClick={() => onSelectConversation(conv.id)}
                        />
                    ))
                )}
            </ScrollArea>
        </div >
    );
};
