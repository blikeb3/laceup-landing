import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const useFeedback = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const submitFeedback = async (message: string, contextUrl: string) => {
    try {
      setIsLoading(true);

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Insert feedback
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        message,
        context_url: contextUrl,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Thank you for your feedback!",
      });

      return true;
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to submit feedback",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { submitFeedback, isLoading };
};
