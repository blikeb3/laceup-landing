import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { updatePasswordWithToken, validatePasswordStrength } from "@/lib/passwordReset";
import { getSecureAuthErrorMessage } from "@/lib/errorMessages";
import { PasswordRequirements } from "@/components/PasswordRequirements";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionValid, setSessionValid] = useState(false);


 useEffect(() => {
  let mounted = true;

  const verify = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!mounted) return;
      setSessionValid(!!data.session);
    } catch (e: any) {
      if (!mounted) return;
      setSessionValid(false);
      setError(e?.message ?? "Failed to verify your session.");
    } finally {
      if (!mounted) return;
      setChecking(false);
    }
  };

  verify();

  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    // This is the key to fixing the “null session on mount” race
    if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
      setSessionValid(!!session);
      setChecking(false);
    }
  });

  return () => {
    mounted = false;
    sub?.subscription?.unsubscribe();
  };
}, []);


  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    if (newPassword) {
      const validation = validatePasswordStrength(newPassword);
      setPasswordErrors(validation.errors);
    } else {
      setPasswordErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation checks
    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      setError("Password does not meet security requirements");
      return;
    }

    setLoading(true);

    const result = await updatePasswordWithToken(password);

    if (result.success) {
      setResetSuccess(true);
      toast({
        title: "Success",
        description: result.message,
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } else {
      // Use secure error message
      const secureMessage = getSecureAuthErrorMessage(result.message);
      setError(secureMessage);
      toast({
        title: "Error",
        description: secureMessage,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <p className="text-center text-slate-400">Verifying your recovery link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-white">Invalid Recovery Link</CardTitle>
            <CardDescription className="text-slate-400">
              Your recovery link has expired or is invalid
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <p className="text-center text-slate-300 mb-6">
                Recovery links expire after 24 hours. Please request a new password reset link.
              </p>
              <Button
                onClick={() => navigate("/forgot-password")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Request New Recovery Link
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-white">Password Reset Successful</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <p className="text-center text-slate-300 mb-6">
                Your password has been successfully reset. You can now login with your new password.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">Reset Your Password</CardTitle>
          <CardDescription className="text-slate-400">
            Enter your new password to regain access to your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={loading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  disabled={!password}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Requirements */}
              <PasswordRequirements password={password} />
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  disabled={!confirmPassword}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <div className="flex items-center gap-2 text-sm text-red-400 mt-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Passwords do not match</span>
                </div>
              )}

              {confirmPassword && password === confirmPassword && password && (
                <div className="flex items-center gap-2 text-sm text-green-400 mt-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Passwords match</span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-md">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={
                loading ||
                !password ||
                !confirmPassword ||
                password !== confirmPassword ||
                passwordErrors.length > 0
              }
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </Button>

            <Button
              type="button"
              onClick={() => navigate("/auth")}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={loading}
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
