import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isPasswordExposed } from "@/lib/passwordSecurity";
import { checkRateLimit, recordAttempt, clearRateLimit, formatRemainingTime } from "@/lib/rateLimit";
import { formatPhoneNumber } from "@/lib/phoneMask";
import { signInSchema, signUpSchema } from "@/lib/authSchemas";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [sport, setSport] = useState("");
  const [userType, setUserType] = useState<"athlete" | "mentor" | "employer">("athlete");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Determine default tab from query params (e.g., ?tab=signup)
  const tabParam = searchParams.get("tab");
  const referralTokenParam = searchParams.get("ref");
  const defaultTab = tabParam === "signup" || referralTokenParam ? "signup" : "signin";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [referralToken, setReferralToken] = useState<string | null>(referralTokenParam);

  useEffect(() => {
    const token = searchParams.get("ref");
    setReferralToken(token);
    if (token) {
      setActiveTab("signup");
    }
  }, [searchParams]);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/home");
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/home");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Rate limiting check for sign-up (more lenient than sign-in)
    const rateLimitKey = `signup:${email.toLowerCase()}`;
    const rateLimitStatus = checkRateLimit(rateLimitKey, { maxAttempts: 3, windowMs: 60 * 60 * 1000 }); // 3 attempts per hour

    if (rateLimitStatus.isLimited) {
      setLoading(false);
      toast({
        title: "Too Many Attempts",
        description: `Please wait ${formatRemainingTime(rateLimitStatus.remainingTime!)} before trying again.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Validate input with zod schema
      const validationResult = signUpSchema.safeParse({
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        phone,
        university,
        sport,
        userType,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      // Record the signup attempt
      recordAttempt(rateLimitKey, { maxAttempts: 3, windowMs: 60 * 60 * 1000 });

      // SECURITY: Check if password has been exposed in known data breaches
      // This prevents credential stuffing attacks
      const isExposed = await isPasswordExposed(password);
      if (isExposed) {
        throw new Error(
          "This password has been exposed in known data breaches. For your security, please choose a different password."
        );
      }

      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            university,
            sport,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Get the newly created user from the signup response
      const user = data?.user;
      if (user) {
        // Assign the selected user type role using the secure function
        const { error: roleError } = await supabase
          .rpc('assign_user_role', {
            p_user_id: user.id,
            p_role: userType
          });

        if (roleError) {
          console.error("Error assigning role:", roleError);
          toast({
            title: "Warning",
            description: "Account created but role assignment failed. Please contact support.",
            variant: "destructive"
          });
        }

        // Check if email is in preapproved_emails table and auto-approve
        // Using RPC function to bypass RLS restrictions for unauthenticated users
        const { data: isAutoApproved, error: autoApproveError } = await supabase
          .rpc('auto_approve_if_preapproved', {
            p_user_id: user.id,
            p_email: email
          });

        if (autoApproveError) {
          console.error("Error checking/approving preapproved user:", autoApproveError);
        }

        const wasAutoApproved = isAutoApproved === true;

        if (referralToken) {
          const { error: referralError } = await supabase.functions.invoke('referral-joined', {
            body: { token: referralToken, userId: user.id, userEmail: email }
          });

          if (referralError) {
            console.error("Error linking referral token:", referralError);
            toast({
              title: "Referral not linked",
              description: "We could not attach your invite. Please retry from the referral link.",
              variant: "destructive",
            });
          } else {
            setReferralToken(null);
          }
        }

        toast({
          title: "Success!",
          description: wasAutoApproved
            ? "Account created and approved! You can now sign in after verifying your email."
            : "Account created. Please wait for admin approval to access the platform.",
        });
      } else {
        console.error("Error: No user returned from signup");
        toast({
          title: "Success!",
          description: "Account created. Please wait for admin approval to access the platform.",
        });
      }

      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setUniversity("");
      setSport("");
      setUserType("athlete");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Skip rate limiting on localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (!isLocalhost) {
      // Rate limiting check
      const rateLimitKey = `signin:${email.toLowerCase()}`;
      const rateLimitStatus = checkRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });

      if (rateLimitStatus.isLimited) {
        setLoading(false);
        toast({
          title: "Too Many Attempts",
          description: `Please wait ${formatRemainingTime(rateLimitStatus.remainingTime!)} before trying again.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Validate input with zod schema
      const validationResult = signInSchema.safeParse({
        email,
        password,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        setLoading(false);
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);

        let description = error.message;

        // Record failed attempt only if not on localhost
        if (!isLocalhost) {
          const rateLimitKey = `signin:${email.toLowerCase()}`;
          const attemptResult = recordAttempt(rateLimitKey);

          if (attemptResult.attemptsRemaining !== undefined && attemptResult.attemptsRemaining <= 2) {
            description += ` (${attemptResult.attemptsRemaining} attempt${attemptResult.attemptsRemaining !== 1 ? 's' : ''} remaining)`;
          }
        }

        toast({
          title: "Error",
          description,
          variant: "destructive",
        });
        return;
      }

      // Clear rate limit on successful login (only if not localhost)
      if (!isLocalhost) {
        const rateLimitKey = `signin:${email.toLowerCase()}`;
        clearRateLimit(rateLimitKey);
      }
      setLoading(false);

      // SERVER-SIDE VERIFICATION: Check approval status via server function
      // This prevents API manipulation or session replay bypassing frontend checks
      const { data: approvalData, error: approvalError } = await supabase
        .rpc('check_user_approval');

      if (approvalError || !approvalData || !approvalData[0]) {
        await supabase.auth.signOut();
        toast({
          title: "Error",
          description: "Failed to verify account status. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const { is_approved, approval_status } = approvalData[0];

      if (!is_approved) {
        await supabase.auth.signOut();

        if (approval_status === "pending") {
          toast({
            title: "Pending Approval",
            description: "Your account is pending admin approval. Please wait.",
            variant: "destructive",
          });
        } else if (approval_status === "rejected") {
          toast({
            title: "Access Denied",
            description: "Your account registration was not approved.",
            variant: "destructive",
          });
        }
        return;
      }

      // FALLBACK: Also check via direct profile query as additional security layer
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("approval_status")
          .eq("id", user.id)
          .single();

        if (profile?.approval_status !== "approved") {
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "Your account status does not permit access.",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during sign in",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in or create an account to continue</CardDescription>
          {referralToken && (
            <p className="text-xs text-emerald-600 mt-2">Referral link applied to this signup.</p>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email <span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password <span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">First Name <span style={{ color: "red" }}>*</span></Label>
                    <Input
                      id="signup-firstname"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Last Name <span style={{ color: "red" }}>*</span></Label>
                    <Input
                      id="signup-lastname"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email <span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone <span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                    maxLength={14}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-university">University <span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="signup-university"
                    type="text"
                    placeholder="University Name"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-sport">Sport <span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="signup-sport"
                    type="text"
                    placeholder="e.g., Basketball, Soccer, Track"
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-usertype">I am a <span style={{ color: "red" }}>*</span></Label>
                  <div className="flex gap-2">
                    {(['athlete', 'mentor', 'employer'] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={userType === type ? "default" : "outline"}
                        className="flex-1 capitalize"
                        onClick={() => setUserType(type)}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password <span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password <span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Your account will require admin approval before you can access the platform.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
