import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const WARNING_TIME = 5 * 60 * 1000; // warn 5 minutes before logout

export const useSessionTimeout = () => {
  const { toast } = useToast();

  const timeoutRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  const warningShownRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    warningShownRef.current = false;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    toast({
      title: "Session Expired",
      description: "You've been logged out due to 24 hours of inactivity.",
      variant: "destructive",
    });
  }, [toast]);

  const showWarning = useCallback(() => {
    if (warningShownRef.current) return;
    warningShownRef.current = true;
    toast({
      title: "Session Expiring Soon",
      description: "You'll be logged out in 5 minutes due to inactivity.",
      duration: 10000,
    });
  }, [toast]);

  const resetTimer = useCallback(() => {
    clearTimers();

    // Warn 5 minutes before logout
    warningTimeoutRef.current = window.setTimeout(() => {
      showWarning();
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Logout after 24 hours
    timeoutRef.current = window.setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [clearTimers, logout, showWarning]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];

    const attach = () => {
      events.forEach((e) => document.addEventListener(e, resetTimer, true));
    };

    const detach = () => {
      events.forEach((e) => document.removeEventListener(e, resetTimer, true));
    };

    let detachAndClear: null | (() => void) = null;

    const start = () => {
      resetTimer();
      attach();
      detachAndClear = () => {
        detach();
        clearTimers();
      };
    };

    // Start immediately if already logged in
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) start();
    });

    // Keep in sync with auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // Logged out / expired / refresh failed
        if (detachAndClear) detachAndClear();
        detachAndClear = null;
        return;
      }
      // Logged in (or refreshed)
      if (!detachAndClear) start();
    });

    return () => {
      subscription.unsubscribe();
      if (detachAndClear) detachAndClear();
    };
  }, [resetTimer, clearTimers]);

  return { resetTimer };
};
