import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFeedback } from "@/hooks/useFeedback";

export const FloatingFeedbackButton = () => {
  const [open, setOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const { submitFeedback, isLoading } = useFeedback();
  const location = useLocation();

  // Hide on auth and admin pages
  if (location.pathname === "/auth" || location.pathname === "/admin") {
    return null;
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFeedbackText("");
    }
    setOpen(newOpen);
  };

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      return;
    }

    const contextUrl = window.location.href;
    const success = await submitFeedback(feedbackText, contextUrl);

    if (success) {
      setFeedbackText("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          title="Submit Feedback"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Submit Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send us your feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts and suggestions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Tell us what you think..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="min-h-[120px] resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!feedbackText.trim() || isLoading}
            >
              {isLoading ? "Sending..." : "Send Feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
