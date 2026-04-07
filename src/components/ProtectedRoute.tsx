import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const [isRejected, setIsRejected] = useState(false);
  const [checkingRejection, setCheckingRejection] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let mounted = true;

    if (!user) {
      setIsRejected(false);
      setCheckingRejection(false);
      return;
    }

    setCheckingRejection(true);

    const checkRejectedStatus = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("approval_status")
          .eq("id", user.id)
          .single();

        if (mounted) {
          // Only block if explicitly rejected
          setIsRejected(profile?.approval_status === "rejected");
          setCheckingRejection(false);
        }
      } catch (error) {
        console.error("Error checking account status:", error);
        if (mounted) {
          setIsRejected(false);
          setCheckingRejection(false);
        }
      }
    };

    checkRejectedStatus();

    return () => { mounted = false; };
  }, [user?.id, authLoading]);

  if (authLoading || checkingRejection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isRejected) {
    // Sign out rejected users and redirect to auth
    supabase.auth.signOut();
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
