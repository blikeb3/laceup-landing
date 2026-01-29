import { supabase } from "@/integrations/supabase/client";

/**
 * Initiates password reset by sending a reset link to the user's email
 * Uses Supabase's built-in password reset flow
 */
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return {
        success: false,
        message: error.message || "Failed to send password reset email",
      };
    }

    return {
      success: true,
      message: "Password reset link sent to your email. Please check your inbox.",
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    };
  }
};

/**
 * Updates the user's password using the recovery token from email link
 * The token is automatically captured from URL by Supabase
 */
export const updatePasswordWithToken = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { success: false, message: error.message || "Failed to update password" };
    }

    // ✅ important: clear recovery session / avoid weird signed-in state
    await supabase.auth.signOut();

    return { success: true, message: "Password has been successfully updated" };
  } catch (error) {
    console.error("Password update error:", error);
    return { success: false, message: "An unexpected error occurred while updating your password" };
  }
};


/**
 * Validates that a recovery session exists (user clicked reset link)
 */
export const verifyRecoverySession = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if session has recovery flag set by Supabase
    if (session) {
      // Session exists, which means user clicked the reset link
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error verifying recovery session:", error);
    return false;
  }
};

/**
 * Validates password strength requirements
 */
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*...)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
