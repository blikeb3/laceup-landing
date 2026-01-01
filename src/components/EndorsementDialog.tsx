import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface EndorsementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endorsedUserId: string;
  endorsedUserName: string;
  existingEndorsement?: {
    id: string;
    comment: string | null;
  } | null;
  onSuccess: () => void;
}

export const EndorsementDialog = ({
  open,
  onOpenChange,
  endorsedUserId,
  endorsedUserName,
  existingEndorsement,
  onSuccess,
}: EndorsementDialogProps) => {
  const [comment, setComment] = useState(existingEndorsement?.comment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (existingEndorsement) {
        // Update existing endorsement
        const { error } = await supabase
          .from("endorsements")
          .update({ comment: comment.trim() || null })
          .eq("id", existingEndorsement.id);

        if (error) throw error;

        toast({
          title: "Endorsement updated",
          description: "Your endorsement has been updated successfully.",
        });
      } else {
        // Create new endorsement
        const { error } = await supabase
          .from("endorsements")
          .insert({
            endorser_id: user.id,
            endorsed_user_id: endorsedUserId,
            comment: comment.trim() || null,
          });

        if (error) throw error;

        toast({
          title: "Endorsement added",
          description: `You've endorsed ${endorsedUserName}.`,
        });
      }

      onSuccess();
      onOpenChange(false);
      setComment("");
    } catch (error: unknown) {
      console.error("Error saving endorsement:", error);
      let message = "Failed to save endorsement";
      if (error instanceof Error) message = error.message;
      else if (typeof error === "string") message = error;
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingEndorsement ? "Edit Endorsement" : "Endorse"} {endorsedUserName}
          </DialogTitle>
          <DialogDescription>
            {existingEndorsement
              ? "Update your endorsement comment (optional)."
              : "Add an optional comment to your endorsement."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            placeholder="Add a comment about why you're endorsing this person (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={500}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {comment.length}/500 characters
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setComment(existingEndorsement?.comment || "");
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gold hover:bg-gold-light text-navy"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : existingEndorsement ? (
              "Update"
            ) : (
              "Endorse"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
