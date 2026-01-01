import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const verifyApproval = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("approval_status")
          .eq("id", userId)
          .single();

        if (mounted) {
          setIsApproved(profile?.approval_status === "approved");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking approval status:", error);
        if (mounted) {
          setIsApproved(false);
          setLoading(false);
        }
      }
    };

    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        if (session?.user) {
          verifyApproval(session.user.id);
        } else {
          setLoading(false);
        }
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setSession(session);
          if (session?.user) {
            verifyApproval(session.user.id);
          } else {
            setIsApproved(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (isApproved === false) {
    // Sign out unapproved users and redirect to auth
    supabase.auth.signOut();
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
