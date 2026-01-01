import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { EMOJI_CATEGORIES } from "@/constants/emojis";

interface EmojiPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEmojiSelect: (emoji: string) => void;
}

export const EmojiPicker = ({ open, onOpenChange, onEmojiSelect }: EmojiPickerProps) => {
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Smile className="h-5 w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" side="top" align="start">
                <div className="space-y-3">
                    {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                        <div key={category}>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{category}</p>
                            <div className="flex flex-wrap gap-1">
                                {emojis.map((emoji, index) => (
                                    <button
                                        key={index}
                                        onClick={() => onEmojiSelect(emoji)}
                                        className="text-xl hover:bg-secondary rounded p-1 transition-colors"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
};
