import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmojiPicker } from "./EmojiPicker";

interface MessageInputProps {
    messageText: string;
    onMessageChange: (text: string) => void;
    onSend: () => void;
    onFileClick: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    selectedFile: File | null;
    filePreview: string | null;
    onClearFile: () => void;
    uploading: boolean;
    showEmojiPicker: boolean;
    onEmojiPickerChange: (open: boolean) => void;
    onEmojiSelect: (emoji: string) => void;
}

export const MessageInput = ({
    messageText,
    onMessageChange,
    onSend,
    onFileClick,
    fileInputRef,
    onFileSelect,
    selectedFile,
    filePreview,
    onClearFile,
    uploading,
    showEmojiPicker,
    onEmojiPickerChange,
    onEmojiSelect
}: MessageInputProps) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            onSend();
        }
    };

    return (
        <div className="p-4 border-t border-border">
            {/* File Preview */}
            {(filePreview || selectedFile) && (
                <div className="mb-3 relative inline-block">
                    {filePreview ? (
                        <img
                            src={filePreview}
                            alt="Preview"
                            className="rounded-lg max-h-32 border-2 border-border"
                        />
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg bg-secondary">
                            <Paperclip className="h-4 w-4" />
                            <span className="text-sm">{selectedFile?.name}</span>
                            <span className="text-xs text-muted-foreground">
                                ({(selectedFile!.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                    )}
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={onClearFile}
                    >
                        ✕
                    </Button>
                </div>
            )}

            <div className="flex items-center space-x-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={onFileSelect}
                    className="hidden"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onFileClick}
                    disabled={uploading}
                >
                    <Paperclip className="h-5 w-5" />
                </Button>
                <EmojiPicker
                    open={showEmojiPicker}
                    onOpenChange={onEmojiPickerChange}
                    onEmojiSelect={onEmojiSelect}
                />
                <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => onMessageChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={uploading}
                />
                <Button
                    onClick={onSend}
                    className="bg-gold hover:bg-gold-light text-navy"
                    disabled={uploading || (!messageText.trim() && !selectedFile)}
                >
                    {uploading ? (
                        <LoadingSpinner />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    );
};
