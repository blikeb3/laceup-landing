import { GraduationCap, Briefcase, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation } from "@/types/messages";

interface QuickPromptsProps {
    conversation: Conversation;
    onSelectPrompt: (type: "mentorship" | "opportunity") => void;
}

export const QuickPrompts = ({ conversation, onSelectPrompt }: QuickPromptsProps) => {
    return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="text-center mb-4">
                <h4 className="font-semibold text-lg mb-2">Start the conversation</h4>
                <p className="text-sm text-muted-foreground">Use a quick prompt or write your own message</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
                {conversation.connectionType === "mentor" && (
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => onSelectPrompt("mentorship")}
                    >
                        <GraduationCap className="h-4 w-4" />
                        Request Mentorship
                    </Button>
                )}
                {conversation.connectionType === "employer" && (
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => onSelectPrompt("opportunity")}
                    >
                        <Briefcase className="h-4 w-4" />
                        Discuss Opportunity
                    </Button>
                )}
                {conversation.connectionType === "peer" && (
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => onSelectPrompt("mentorship")}
                    >
                        <Star className="h-4 w-4" />
                        Connect & Collaborate
                    </Button>
                )}
            </div>
        </div>
    );
};
