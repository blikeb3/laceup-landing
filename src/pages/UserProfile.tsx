import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Briefcase, ArrowLeft, UserPlus, UserMinus, MessageSquare, Loader2, ThumbsUp, Edit2, Trash2, Users, Trophy, GraduationCap, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { sanitizeProfileForViewer } from "@/lib/contactPrivacy";
import { trackProfileView } from "@/hooks/useUserAnalytics";
import { getDisplayName, getInitials } from "@/lib/nameUtils";
import { formatDateLong } from "@/lib/dateFormat";
import { EndorsementDialog } from "@/components/EndorsementDialog";
import { formatDistanceToNow } from "date-fns";
import laceupLogo from "@/assets/laceupLogo.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchUserRoles } from "@/lib/roleUtils";
import { BadgeType, UserBadge, ProfileInfo } from "@/types/posts";
import { notifyConnectionRequest, notifyConnectionAccepted } from "@/lib/notificationHelpers";

interface JobExperience {
  id?: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  currentlyWorking?: boolean;
  description?: string;
}

interface Degree {
  id?: string;
  degree: string;
  field: string;
  institution: string;
  year: string;
}

interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  biography?: string | null;
  location?: string | null;
  degree?: string | null;
  degrees?: Degree[] | null;
  about?: string | null;
  skills?: string[] | null;
  avatar_url?: string | null;
  email?: string | null;
  phone?: string | null;
  university?: string | null;
  sport?: string | null;
  athletic_accomplishments?: string | null;
  academic_accomplishments?: string | null;
  job_experiences?: JobExperience[] | null;
}

interface Endorsement {
  id: string;
  endorser_id: string;
  endorsed_user_id: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profiles: ProfileInfo | null;
}

interface MutualConnection {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  university: string | null;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [mutualConnectionsCount, setMutualConnectionsCount] = useState(0);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [myEndorsement, setMyEndorsement] = useState<Endorsement | null>(null);
  const [endorsementDialogOpen, setEndorsementDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEndorsement, setDeletingEndorsement] = useState(false);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [mutualConnections, setMutualConnections] = useState<MutualConnection[]>([]);
  const [allConnections, setAllConnections] = useState<MutualConnection[]>([]);
  const [allConnectionsCount, setAllConnectionsCount] = useState(0);
  const [connectionsModalOpen, setConnectionsModalOpen] = useState(false);
  const [pendingRequestStatus, setPendingRequestStatus] = useState<"none" | "sent" | "received">("none");
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  const sortJobExperiences = (jobs: JobExperience[] = []) => {
    return [...jobs].sort((a, b) => {
      const endA = a.currentlyWorking ? "9999-12-31" : a.endDate || a.startDate || "";
      const endB = b.currentlyWorking ? "9999-12-31" : b.endDate || b.startDate || "";
      if (endA === endB) {
        return (b.startDate || "").localeCompare(a.startDate || "");
      }
      return endB.localeCompare(endA);
    });
  };

  const sortDegrees = (degrees: Degree[] = []) => {
    return [...degrees].sort((a, b) => {
      // Extract year for comparison - handle ranges like "2020-2024" by taking the end year
      const getYear = (yearStr: string) => {
        if (!yearStr) return 0;
        const match = yearStr.match(/(\d{4})(?:-\d{4})?$/);
        return match ? parseInt(match[1]) : 0;
      };
      const yearA = getYear(a.year);
      const yearB = getYear(b.year);
      // Sort descending (most recent first)
      return yearB - yearA;
    });
  };

  const formatJobDateRange = (job: JobExperience) => {
    const start = formatDateLong(job.startDate) || "Start date not set";
    const end = job.currentlyWorking
      ? "Present"
      : (formatDateLong(job.endDate) || "End date not set");
    return `${start} - ${end}`;
  };

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setCurrentUserId(user.id);

      // Check if viewing own profile
      if (user.id === userId) {
        setIsOwnProfile(true);
        navigate("/profile");
        return;
      }

      // Fetch the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError || !profileData) {
        toast({
          title: "Profile not found",
          description: "The user profile you're looking for doesn't exist.",
          variant: "destructive",
        });
        navigate("/home");
        return;
      }

      // Sanitize profile based on privacy settings
      const sanitizedProfile = await sanitizeProfileForViewer(profileData, user.id);
      const rawJobs = (profileData.job_experiences as unknown) || [];
      const parsedJobs: JobExperience[] = Array.isArray(rawJobs)
        ? rawJobs.map((j) => ({
          company: "",
          position: "",
          startDate: "",
          endDate: "",
          currentlyWorking: false,
          description: "",
          ...(j as Partial<JobExperience>),
        }))
        : [];
      const sortedJobs = sortJobExperiences(parsedJobs);

      const rawDegrees = (profileData.degrees as unknown) || [];
      const parsedDegrees: Degree[] = Array.isArray(rawDegrees)
        ? rawDegrees.map((d: any) => ({
          degree: d.degree || '',
          field: d.field || '',
          institution: d.institution || '',
          year: d.year || '',
          ...(d.id && { id: d.id }),
        }))
        : [];

      setProfile({ ...(sanitizedProfile as Profile), job_experiences: sortedJobs, degrees: parsedDegrees });

      // Fetch user role
      const { baseRole, hasAdminRole } = await fetchUserRoles(userId);

      setUserIsAdmin(hasAdminRole);
      setUserRole(baseRole);

      // Track profile view
      await trackProfileView(userId, user.id);

      // Check connection status (connected, pending sent, pending received, or none)
      const { data: sentRequest } = await supabase
        .from("connection_requests")
        .select("id, status")
        .eq("requester_id", user.id)
        .eq("receiver_id", userId)
        .maybeSingle();

      const { data: receivedRequest } = await supabase
        .from("connection_requests")
        .select("id, status")
        .eq("requester_id", userId)
        .eq("receiver_id", user.id)
        .maybeSingle();

      // Check if already connected
      const { data: connectionData } = await supabase
        .from("connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("connected_user_id", userId)
        .maybeSingle();

      // Determine connection state
      setIsConnected(!!connectionData);
      if (sentRequest && sentRequest.status === "pending") {
        setPendingRequestStatus("sent");
        setPendingRequestId(sentRequest.id);
      } else if (receivedRequest && receivedRequest.status === "pending") {
        setPendingRequestStatus("received");
        setPendingRequestId(receivedRequest.id);
      } else {
        setPendingRequestStatus("none");
        setPendingRequestId(null);
      }

      // Calculate mutual connections
      const { data: myConnections } = await supabase
        .from("connections")
        .select("connected_user_id")
        .eq("user_id", user.id);

      const { data: theirConnections } = await supabase
        .from("connections")
        .select("connected_user_id")
        .eq("user_id", userId);

      if (myConnections && theirConnections) {
        const myConnectionIds = new Set(myConnections.map(c => c.connected_user_id));
        const mutualCount = theirConnections.filter(c => myConnectionIds.has(c.connected_user_id)).length;
        setMutualConnectionsCount(mutualCount);

        // Fetch mutual connections with profile details
        const mutualConnectionIds = theirConnections
          .filter(c => myConnectionIds.has(c.connected_user_id))
          .map(c => c.connected_user_id);

        if (mutualConnectionIds.length > 0) {
          const { data: mutualProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, university')
            .in('id', mutualConnectionIds)
            .limit(6); // Show first 6 mutual connections

          setMutualConnections(mutualProfiles || []);
        }

        // Fetch all connections for the profile
        setAllConnectionsCount(theirConnections.length);
        const allConnectionIds = theirConnections.map(c => c.connected_user_id);
        if (allConnectionIds.length > 0) {
          const { data: allProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, university')
            .in('id', allConnectionIds)
            .order('first_name', { ascending: true });

          setAllConnections(allProfiles || []);
        }
      }

      // Fetch user badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', userId);

      setUserBadges(badgesData || []);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, navigate, toast]);

  const fetchEndorsements = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("endorsements")
        .select(`
          *,
          profiles!endorsements_endorser_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq("endorsed_user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEndorsements((data as Endorsement[]) || []);

      // Check if current user has endorsed this profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const myEndorsementData = data?.find(e => e.endorser_id === user.id);
        setMyEndorsement(myEndorsementData || null);
      }
    } catch (error) {
      console.error("Error fetching endorsements:", error);
    }
  }, [userId]);

  useEffect(() => {
    // Set loading state to true when userId changes
    setLoading(true);
    fetchProfile();
    fetchEndorsements();
  }, [fetchProfile, fetchEndorsements]);

  const handleDeleteEndorsement = async () => {
    if (!myEndorsement) return;

    try {
      setDeletingEndorsement(true);
      const { error } = await supabase
        .from("endorsements")
        .delete()
        .eq("id", myEndorsement.id);

      if (error) throw error;

      toast({
        title: "Endorsement removed",
        description: "Your endorsement has been removed.",
      });

      setMyEndorsement(null);
      await fetchEndorsements();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting endorsement:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete endorsement",
        variant: "destructive",
      });
    } finally {
      setDeletingEndorsement(false);
    }
  };

  const handleConnect = async () => {
    if (!userId || !currentUserId) return;

    try {
      setConnectionLoading(true);

      // Check if request is already pending
      if (pendingRequestStatus === "sent" && pendingRequestId) {
        // Cancel the pending request
        const { error: deleteError } = await supabase
          .from("connection_requests")
          .delete()
          .eq("id", pendingRequestId);

        if (deleteError) throw deleteError;

        toast({
          title: "Request Cancelled",
          description: "Your connection request has been cancelled.",
        });

        setPendingRequestStatus("none");
        setPendingRequestId(null);
      } else {
        // Check if a pending request already exists in the database
        const { data: existingRequest } = await supabase
          .from("connection_requests")
          .select("id")
          .eq("requester_id", currentUserId)
          .eq("receiver_id", userId)
          .eq("status", "pending")
          .single();

        if (existingRequest) {
          // Request already pending, just update state
          setPendingRequestStatus("sent");
          setPendingRequestId(existingRequest.id);
          return;
        }

        // Create a new connection request
        const { error: requestError } = await supabase
          .from("connection_requests")
          .insert({
            requester_id: currentUserId,
            receiver_id: userId,
            status: "pending",
          });

        if (requestError) throw requestError;

        setPendingRequestStatus("sent");
        
        toast({
          title: "Request Sent",
          description: `Your connection request has been sent to ${getDisplayName(profile?.first_name, profile?.last_name, "this user")}.`,
        });

        // Send notification to recipient
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', currentUserId)
          .single();

        if (currentUserProfile) {
          const currentUserName = getDisplayName(
            currentUserProfile.first_name,
            currentUserProfile.last_name
          );

          await notifyConnectionRequest(userId, currentUserName, currentUserId);
        }
      }
    } catch (error) {
      console.error("Error managing connection request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to manage connection request",
        variant: "destructive",
      });
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!userId || !currentUserId || !pendingRequestId) return;

    try {
      setConnectionLoading(true);

      // Remove the request once accepted to avoid future duplicates
      const { error: deleteRequestError } = await supabase
        .from("connection_requests")
        .delete()
        .eq("id", pendingRequestId);

      if (deleteRequestError) throw deleteRequestError;

      // Create mutual connections
      const { error: conn1Error } = await supabase
        .from("connections")
        .insert({
          user_id: currentUserId,
          connected_user_id: userId,
        })
        .select()
        .single();

      if (conn1Error && conn1Error.code !== "23505") {
        throw conn1Error;
      }

      const { error: conn2Error } = await supabase
        .from("connections")
        .insert({
          user_id: userId,
          connected_user_id: currentUserId,
        })
        .select()
        .single();

      if (conn2Error && conn2Error.code !== "23505") {
        throw conn2Error;
      }

      setIsConnected(true);
      setPendingRequestStatus("none");
      setPendingRequestId(null);

      toast({
        title: "Request Accepted",
        description: `You are now connected with ${getDisplayName(profile?.first_name, profile?.last_name, "this user")}.`,
      });

      // Send notification to requester
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', currentUserId)
        .single();

      if (currentUserProfile) {
        const currentUserName = getDisplayName(
          currentUserProfile.first_name,
          currentUserProfile.last_name
        );

        await notifyConnectionAccepted(userId, currentUserName, currentUserId);
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept connection request",
        variant: "destructive",
      });
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!pendingRequestId) return;

    try {
      setConnectionLoading(true);

      const { error } = await supabase
        .from("connection_requests")
        .delete()
        .eq("id", pendingRequestId);

      if (error) throw error;

      setPendingRequestStatus("none");
      setPendingRequestId(null);

      toast({
        title: "Request Rejected",
        description: "The connection request has been declined and removed.",
      });
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject connection request",
        variant: "destructive",
      });
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequestId) return;

    try {
      setConnectionLoading(true);

      const { error } = await supabase
        .from("connection_requests")
        .delete()
        .eq("id", pendingRequestId);

      if (error) throw error;

      setPendingRequestStatus("none");
      setPendingRequestId(null);

      toast({
        title: "Request Cancelled",
        description: "Your connection request has been cancelled.",
      });
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel connection request",
        variant: "destructive",
      });
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!userId || !currentUserId) return;

    try {
      setConnectionLoading(true);
      
      // Delete both directions of the connection
      const { error: error1 } = await supabase
        .from("connections")
        .delete()
        .eq("user_id", currentUserId)
        .eq("connected_user_id", userId);

      const { error: error2 } = await supabase
        .from("connections")
        .delete()
        .eq("user_id", userId)
        .eq("connected_user_id", currentUserId);

      if (error1 || error2) throw error1 || error2;

      setIsConnected(false);
      toast({
        title: "Disconnected",
        description: `You have disconnected from ${getDisplayName(profile?.first_name, profile?.last_name, "this user")}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect",
        variant: "destructive",
      });
    } finally {
      setConnectionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LoadingSpinner fullPage text="Loading profile..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-8 pt-24 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const skillsArray = Array.isArray(profile.skills) ? profile.skills : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Header Card */}
      <Card className="p-4 sm:p-8 mb-6 animate-slide-up">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32">
            <AvatarImage
              src={profile.avatar_url || undefined}
              alt={getDisplayName(profile.first_name, profile.last_name)}
            />
            <AvatarFallback className="p-0 overflow-hidden">
              <img
                src={laceupLogo}
                alt="LaceUP logo"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </AvatarFallback>
          </Avatar>


          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
              <div className="flex-1">
                {/* Name + Roles + Badges on same line */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <h1 className="text-2xl sm:text-3xl font-heading font-bold">{getDisplayName(profile.first_name, profile.last_name)}</h1>

                  {userRole && (
                    <Badge
                      className="text-xs sm:text-sm px-2 py-0.5 h-6 sm:h-8 bg-navy text-gold border-navy"
                    >
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </Badge>
                  )}
                  {userBadges.map((userBadge) => {
                    const badge = userBadge.badges;
                    if (!badge) return null;

                    return (
                      <TooltipProvider key={userBadge.id}>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              {badge.image_url ? (
                                <img
                                  src={badge.image_url}
                                  alt={badge.name}
                                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                                />
                              ) : badge.icon ? (
                                <span className="text-2xl sm:text-3xl">{badge.icon}</span>
                              ) : null}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-semibold">{badge.name}</p>
                              {badge.description && <p className="text-xs mt-1">{badge.description}</p>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>

                {/* Additional Info */}
                <p className="text-base sm:text-lg text-muted-foreground mb-4">
                  {profile.biography}
                </p>
              </div>
              <div className="flex gap-2">
                {isConnected ? (
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={connectionLoading}
                  >
                    {connectionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4 mr-2" />
                    )}
                    Disconnect
                  </Button>
                ) : pendingRequestStatus === "sent" ? (
                  <Button
                    variant="outline"
                    onClick={handleConnect}
                    disabled={connectionLoading}
                    className="text-amber-600 border-amber-600 hover:bg-amber-50"
                  >
                    {connectionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Pending
                  </Button>
                ) : pendingRequestStatus === "received" ? (
                  <>
                    <Button
                      className="bg-gold hover:bg-gold-light text-navy"
                      onClick={handleAcceptRequest}
                      disabled={connectionLoading}
                    >
                      {connectionLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRejectRequest}
                      disabled={connectionLoading}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button
                    className="bg-gold hover:bg-gold-light text-navy"
                    onClick={handleConnect}
                    disabled={connectionLoading}
                  >
                    {connectionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Connect
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link to={`/messages?userId=${userId}`}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-muted-foreground">
              {profile.email && (
                <span className="flex items-center text-sm">
                  ✉️ Contact Email: {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="flex items-center text-sm">
                  📞 {profile.phone}
                </span>
              )}
              {profile.location && (
                <span className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-1" />
                  {profile.location}
                </span>
              )}
            </div>

            {/* University & Sport */}
            {(profile.university || profile.sport) && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {profile.university && (
                  <Badge variant="secondary">{profile.university}</Badge>
                )}
                {profile.sport && (
                  <Badge variant="outline">{profile.sport}</Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - About & Skills */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Section */}
          {profile.about && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4">About</h2>
              <p className="text-foreground leading-relaxed whitespace-pre-line">{profile.about}</p>
            </Card>
          )}

          {/* Skills Section */}
          {skillsArray.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skillsArray.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">{skill}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Athletic Accomplishments */}
          {profile.athletic_accomplishments && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Athletic Accomplishments
              </h2>
              <p className="text-foreground leading-relaxed whitespace-pre-line">{profile.athletic_accomplishments}</p>
            </Card>
          )}

          {/* Academic Accomplishments */}
          {profile.academic_accomplishments && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Academic Accomplishments
              </h2>
              <p className="text-foreground leading-relaxed whitespace-pre-line">{profile.academic_accomplishments}</p>
            </Card>
          )}

          {/* Education */}
          {profile.degrees && profile.degrees.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Education
              </h2>
              <div className="space-y-4">
                {sortDegrees(profile.degrees).map((degree, index) => (
                  <div key={index} className="pb-4 border-b last:border-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {degree.degree} {degree.field && `in ${degree.field}`}
                        </h3>
                        {degree.institution && (
                          <p className="text-sm text-muted-foreground">{degree.institution}</p>
                        )}
                      </div>
                      {degree.year && (
                        <span className="text-sm text-muted-foreground">{degree.year}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {profile.job_experiences && profile.job_experiences.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" /> Job Experience
              </h2>
              <div className="space-y-4">
                {profile.job_experiences.map((job, index) => {
                  return (
                    <div key={`${job.id || index}`} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-base">{job.position || "Role not specified"}</p>
                          <p className="text-sm text-muted-foreground">{job.company || "Company not specified"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{formatJobDateRange(job)}</p>
                      </div>
                      {job.description && (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{job.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Endorsements & Connections */}
        <div className="space-y-6">
          {/* Endorsements Section */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold flex items-center">
                <ThumbsUp className="h-4 w-4 mr-2" />
                Endorsements ({endorsements.length})
              </h3>
              {!isOwnProfile && (
                <TooltipProvider>
                  <div className="flex gap-2">
                    {myEndorsement ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setEndorsementDialogOpen(true)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setDeleteDialogOpen(true)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove</p>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <Button
                        className="bg-gold hover:bg-gold-light text-navy"
                        size="sm"
                        onClick={() => setEndorsementDialogOpen(true)}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Endorse
                      </Button>
                    )}
                  </div>
                </TooltipProvider>
              )}
            </div>

            {endorsements.length > 0 ? (
              <div className="space-y-4">
                {endorsements.map((endorsement) => (
                  <div
                    key={endorsement.id}
                    className="border-b last:border-b-0 pb-4 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <Link to={`/profile/${endorsement.endorser_id}`} className="flex-shrink-0">
                        <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity">
                          <AvatarImage
                            src={endorsement.profiles?.avatar_url || undefined}
                            alt={getDisplayName(
                              endorsement.profiles?.first_name,
                              endorsement.profiles?.last_name
                            )}
                          />
                          <AvatarFallback className="p-0 overflow-hidden">
                            <img
                              src={laceupLogo}
                              alt="LaceUP logo"
                              className="h-full w-full object-contain"
                              draggable={false}
                            />
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/profile/${endorsement.endorser_id}`}
                            className="font-semibold text-sm hover:text-gold transition-colors"
                          >
                            {getDisplayName(
                              endorsement.profiles?.first_name,
                              endorsement.profiles?.last_name
                            )}
                          </Link>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(endorsement.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        {endorsement.comment && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                            {endorsement.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                {isOwnProfile
                  ? "No endorsements yet."
                  : "No endorsements yet. Be the first to endorse!"}
              </p>
            )}
          </Card>

          {/* Connections */}
          {allConnectionsCount > 0 && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Connections ({allConnectionsCount})
                  </h3>
                  {mutualConnectionsCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {mutualConnectionsCount} mutual connection{mutualConnectionsCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                {allConnectionsCount > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConnectionsModalOpen(true)}
                    className="text-xs"
                  >
                    View All
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {(() => {
                  // Prioritize mutual connections first, then other connections
                  const mutualFirst = allConnections.sort((a, b) => {
                    const aIsMutual = mutualConnections.some(mc => mc.id === a.id);
                    const bIsMutual = mutualConnections.some(mc => mc.id === b.id);
                    if (aIsMutual === bIsMutual) return 0;
                    return aIsMutual ? -1 : 1;
                  }).slice(0, 6);

                  return mutualFirst.map((connection) => {
                    const isMutual = mutualConnections.some(mc => mc.id === connection.id);
                    return (
                      <Link
                        key={connection.id}
                        to={`/profile/${connection.id}`}
                        className={`flex items-center space-x-3 hover:bg-secondary p-2 rounded-lg transition-colors ${
                          isMutual ? 'border-l-2 border-gold pl-3' : ''
                        }`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={connection.avatar_url || undefined}
                            alt={getDisplayName(connection.first_name, connection.last_name)}
                          />
                          <AvatarFallback className="p-0 overflow-hidden">
                            <img
                              src={laceupLogo}
                              alt="LaceUP logo"
                              className="h-full w-full object-contain"
                              draggable={false}
                            />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm hover:text-gold transition-colors truncate">
                            {getDisplayName(connection.first_name, connection.last_name) || 'User'}
                          </p>
                          {connection.university && (
                            <p className="text-xs text-muted-foreground truncate">
                              {connection.university}
                            </p>
                          )}
                        </div>
                        {isMutual && (
                          <Badge variant="outline" className="text-xs bg-gold/10 text-gold border-gold/20 flex-shrink-0">
                            Mutual
                          </Badge>
                        )}
                      </Link>
                    );
                  });
                })()}
                {allConnectionsCount > 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConnectionsModalOpen(true)}
                    className="w-full mt-2"
                  >
                    View all {allConnectionsCount} connections
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Endorsement Dialog */}
      <EndorsementDialog
        open={endorsementDialogOpen}
        onOpenChange={setEndorsementDialogOpen}
        endorsedUserId={userId || ""}
        endorsedUserName={getDisplayName(profile.first_name, profile.last_name)}
        existingEndorsement={myEndorsement}
        onSuccess={fetchEndorsements}
      />

      {/* Connections Modal */}
      <Dialog open={connectionsModalOpen} onOpenChange={setConnectionsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Connections ({allConnectionsCount})
            </DialogTitle>
            <DialogDescription>
              {getDisplayName(profile?.first_name, profile?.last_name)}'s network
            </DialogDescription>
          </DialogHeader>
          
          {/* Mutual Connections Section */}
          {mutualConnections.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center text-gold">
                <Badge variant="outline" className="bg-gold/10 text-gold border-gold/20 mr-2">
                  {mutualConnections.length}
                </Badge>
                Mutual Connections
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mutualConnections.map((connection) => (
                  <Link
                    key={connection.id}
                    to={`/profile/${connection.id}`}
                    onClick={() => setConnectionsModalOpen(false)}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors border-2 border-gold/20 bg-gold/5"
                  >
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage
                        src={connection.avatar_url || undefined}
                        alt={getDisplayName(connection.first_name, connection.last_name)}
                      />
                      <AvatarFallback className="p-0 overflow-hidden">
                        <img
                          src={laceupLogo}
                          alt="LaceUP logo"
                          className="h-full w-full object-contain"
                          draggable={false}
                        />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm hover:text-gold transition-colors truncate">
                        {getDisplayName(connection.first_name, connection.last_name) || 'User'}
                      </p>
                      {connection.university && (
                        <p className="text-xs text-muted-foreground truncate">
                          {connection.university}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Other Connections Section */}
          {allConnections.length > mutualConnections.length && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm">
                Other Connections ({allConnections.length - mutualConnections.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allConnections
                  .filter(c => !mutualConnections.some(mc => mc.id === c.id))
                  .map((connection) => (
                    <Link
                      key={connection.id}
                      to={`/profile/${connection.id}`}
                      onClick={() => setConnectionsModalOpen(false)}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors border border-border"
                    >
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        <AvatarImage
                          src={connection.avatar_url || undefined}
                          alt={getDisplayName(connection.first_name, connection.last_name)}
                        />
                        <AvatarFallback className="p-0 overflow-hidden">
                          <img
                            src={laceupLogo}
                            alt="LaceUP logo"
                            className="h-full w-full object-contain"
                            draggable={false}
                          />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm hover:text-gold transition-colors truncate">
                          {getDisplayName(connection.first_name, connection.last_name) || 'User'}
                        </p>
                        {connection.university && (
                          <p className="text-xs text-muted-foreground truncate">
                            {connection.university}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Endorsement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your endorsement for{" "}
              {getDisplayName(profile.first_name, profile.last_name)}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingEndorsement}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEndorsement}
              disabled={deletingEndorsement}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingEndorsement ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserProfile;
