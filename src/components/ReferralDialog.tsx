import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TeamBuilderBadge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  color_bg: string | null;
  color_text: string | null;
}

export const ReferralDialog = ({ open, onOpenChange }: ReferralDialogProps) => {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [sendingReferral, setSendingReferral] = useState(false);
  const [acceptedReferralsCount, setAcceptedReferralsCount] = useState(0);
  const [teamBuilderBadge, setTeamBuilderBadge] = useState<TeamBuilderBadge | null>(null);
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");

  useEffect(() => {
    if (open) {
      fetchUserData();
      fetchAcceptedReferrals();
      fetchTeamBuilderBadge();
    }
  }, [open]);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    if (data) {
      setUserFirstName(data.first_name || "");
      setUserLastName(data.last_name || "");
    }
  };

  const fetchTeamBuilderBadge = async () => {
    const { data } = await supabase
      .from('badges')
      .select('id, name, description, icon, image_url, color_bg, color_text')
      .eq('name', 'Team Builder')
      .eq('is_active', true)
      .single();

    if (data) {
      setTeamBuilderBadge(data);
    }
  };

  const fetchAcceptedReferrals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_user_id', user.id)
      .eq('status', 'accepted');

    setAcceptedReferralsCount(count || 0);
  };

  const handleSendReferral = async () => {
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const trimmedEmail = inviteEmail.trim().toLowerCase();
    const trimmedName = inviteName.trim();

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid teammate email.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName.length > 120) {
      toast({
        title: "Name too long",
        description: "Keep the invitee name under 120 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingReferral(true);
      const referrerName = [userFirstName, userLastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      const { data, error } = await supabase.functions.invoke('send-referral', {
        body: {
          email: trimmedEmail,
          invitedName: trimmedName || undefined,
          referrerName: referrerName || undefined,
        },
      });

      if (error) {
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        throw new Error(errorMsg);
      }

      // Check if response contains an error field
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Invite sent",
        description: "We emailed your teammate.",
      });
      setInviteEmail("");
      setInviteName("");
      onOpenChange(false);
    } catch (error) {
      console.error('Referral send error:', error);
      let message = 'Could not send invite right now.';
      
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        message = String((error as Record<string, unknown>).message);
      } else if (typeof error === 'string') {
        message = error;
      }
      
      toast({ 
        title: "Send failed", 
        description: message,
        variant: "destructive" 
      });
    } finally {
      setSendingReferral(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Earn Rewards</DialogTitle>
          <DialogDescription>
            Send an invite email to your teammate to earn rewards when they join!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row h-auto sm:h-auto -mx-6">
          {/* Left Column */}
          <div className="w-full sm:w-1/2 bg-muted/50 p-8 flex flex-col items-center justify-start sm:border-r pt-12">
            <img src="/laceup-logo-with-branding.png" alt="LaceUP - Wealth Beyond The Field" className="h-72 w-auto mb-8" />
            
            {teamBuilderBadge && (
              <div className="mb-12 w-full flex justify-center">
                <div className={`px-8 py-4 rounded flex items-center gap-6 ${teamBuilderBadge.color_bg || 'bg-amber-100'}`}>
                  {teamBuilderBadge.image_url ? (
                    <img
                      src={teamBuilderBadge.image_url}
                      alt={teamBuilderBadge.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                  ) : teamBuilderBadge.icon ? (
                    <span className="text-4xl">{teamBuilderBadge.icon}</span>
                  ) : null}
                  <span className={`text-lg font-medium ${teamBuilderBadge.color_text || 'text-amber-800'}`}>
                    {teamBuilderBadge.name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="w-full sm:w-1/2 p-8 flex flex-col justify-between">
            <div>
              
              {/* Horizontal Progress Bar */}
              <div className="mb-8 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground">{acceptedReferralsCount} teammate{acceptedReferralsCount !== 1 ? 's' : ''} joined</span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full bg-gold transition-all duration-300"
                    style={{ width: `${Math.min((acceptedReferralsCount / 5) * 100, 100)}%` }}
                  />
                  <div className="absolute inset-0 flex justify-between px-1">
                    <div className={`w-0.5 h-full ${acceptedReferralsCount >= 0 ? 'bg-gold' : 'bg-muted-foreground/30'}`} />
                    <div className={`w-0.5 h-full ${acceptedReferralsCount >= 1 ? 'bg-gold' : 'bg-muted-foreground/30'}`} />
                    <div className={`w-0.5 h-full ${acceptedReferralsCount >= 2 ? 'bg-gold' : 'bg-muted-foreground/30'}`} />
                    <div className={`w-0.5 h-full ${acceptedReferralsCount >= 3 ? 'bg-gold' : 'bg-muted-foreground/30'}`} />
                    <div className={`w-0.5 h-full ${acceptedReferralsCount >= 4 ? 'bg-gold' : 'bg-muted-foreground/30'}`} />
                    <div className={`w-0.5 h-full ${acceptedReferralsCount >= 5 ? 'bg-gold' : 'bg-muted-foreground/30'}`} />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>

              {/* Rewards List */}
              <div className="mb-8 text-sm space-y-3 w-full">
                <p className="font-medium text-foreground mb-4">Rewards</p>
                <ul className="space-y-3">
                  <li className={`flex items-center gap-2 ${acceptedReferralsCount >= 1 ? 'text-gold font-medium' : ''}`}>
                    <span className={`w-3 h-3 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${acceptedReferralsCount >= 1 ? 'bg-gold text-navy' : 'bg-muted'}`}>
                      {acceptedReferralsCount >= 1 ? '✓' : '1'}
                    </span>
                    <span className="text-xs">Profile boost</span>
                  </li>
                  <li className={`flex items-center gap-2 ${acceptedReferralsCount >= 3 ? 'text-gold font-medium' : ''}`}>
                    <span className={`w-3 h-3 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${acceptedReferralsCount >= 3 ? 'bg-gold text-navy' : 'bg-muted'}`}>
                      {acceptedReferralsCount >= 3 ? '✓' : '3'}
                    </span>
                    <span className="text-xs">Team Builder badge</span>
                  </li>
                  <li className={`flex items-center gap-2 ${acceptedReferralsCount >= 5 ? 'text-gold font-medium' : ''}`}>
                    <span className={`w-3 h-3 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${acceptedReferralsCount >= 5 ? 'bg-gold text-navy' : 'bg-muted'}`}>
                      {acceptedReferralsCount >= 5 ? '✓' : '5'}
                    </span>
                    <span className="text-xs">Premium Access</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="referral-email">Teammate Email</Label>
                  <Input
                    id="referral-email"
                    type="email"
                    placeholder="teammate@school.edu"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral-name">Teammate Name (Optional)</Label>
                  <Input
                    id="referral-name"
                    type="text"
                    placeholder="Add their name"
                    value={inviteName}
                    maxLength={120}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sendingReferral}>
                Cancel
              </Button>
              <Button onClick={handleSendReferral} disabled={sendingReferral}>
                {sendingReferral ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send invite"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDialog;
