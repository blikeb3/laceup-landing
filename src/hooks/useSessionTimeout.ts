import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before logout

export const useSessionTimeout = () => {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    toast({
      title: "Session Expired",
      description: "You've been logged out due to inactivity.",
      variant: "destructive",
    });
  }, [toast]);

  const showWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true;
      toast({
        title: "Session Expiring Soon",
        description: "You'll be logged out in 2 minutes due to inactivity. Move your mouse or click to stay logged in.",
        duration: 10000,
      });
    }
  }, [toast]);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Reset warning flag
    warningShownRef.current = false;

    // Set warning timer (2 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Set logout timer (15 minutes)
    timeoutRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [logout, showWarning]);

  useEffect(() => {
    let cleanup: void | (() => void);

    const setup = async () => {
      const events = ["mousedown","mousemove","keypress","scroll","touchstart","click"];

      const attach = () => events.forEach((e) => document.addEventListener(e, resetTimer, true));
      const detach = () => events.forEach((e) => document.removeEventListener(e, resetTimer, true));

      const clearTimers = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      };

      const start = () => {
        resetTimer();
        attach();
        return () => {
          detach();
          clearTimers();
        };
      };

      // start if already authed
      const { data: { session } } = await supabase.auth.getSession();
      if (session) cleanup = start();

      // respond to later sign-in/out
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session2) => {
        if (!session2) {
          if (cleanup) cleanup();
          cleanup = undefined;
          return;
        }
        if (!cleanup) cleanup = start();
      });

      return () => {
        subscription.unsubscribe();
        if (cleanup) cleanup();
      };
    };

    let unsub: any;
    setup().then((fn) => (unsub = fn));

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [resetTimer]);

  return { resetTimer };
};
