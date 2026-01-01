import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Briefcase, ArrowLeft, UserPlus, UserMinus, MessageSquare, Loader2, ThumbsUp, Edit2, Trash2, Users, Trophy, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { sanitizeProfileForViewer } from "@/lib/contactPrivacy";
import { trackProfileView } from "@/hooks/useUserAnalytics";
import { getDisplayName, getInitials } from "@/lib/nameUtils";
import { formatDateLong } from "@/lib/dateFormat";
import { EndorsementDialog } from "@/components/EndorsementDialog";
import { formatDistanceToNow } from "date-fns";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchUserRoles } from "@/lib/roleUtils";
import { UserBadge, ProfileInfo } from "@/types/posts";

interface JobExperience {
  id?: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  currentlyWorking?: boolean;
  description?: string;
}

interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  biography?: string | null;
  location?: string | null;
  degree?: string | null;
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
      setProfile({ ...(sanitizedProfile as Profile), job_experiences: sortedJobs });

      // Fetch user role
      const { baseRole, hasAdminRole } = await fetchUserRoles(userId);

      setUserIsAdmin(hasAdminRole);
      setUserRole(baseRole);

      // Track profile view
      await trackProfileView(userId, user.id);

      // Check if already connected
      const { data: connectionData } = await supabase
        .from("connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("connected_user_id", userId)
        .maybeSingle();

      setIsConnected(!!connectionData);

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
      const { error } = await supabase
        .from("connections")
        .insert({
          user_id: currentUserId,
          connected_user_id: userId,
        });

      if (error) throw error;

      setIsConnected(true);
      toast({
        title: "Connected!",
        description: `You are now connected with ${getDisplayName(profile?.first_name, profile?.last_name, "this user")}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect",
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
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("user_id", currentUserId)
        .eq("connected_user_id", userId);

      if (error) throw error;

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
            <AvatarImage src={profile.avatar_url || undefined} alt={getDisplayName(profile.first_name, profile.last_name)} />
            <AvatarFallback className="bg-gold text-navy text-3xl sm:text-5xl font-bold">
              {getInitials(profile.first_name, profile.last_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
              <div className="flex-1">
                {/* Name + Roles + Badges on same line */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <h1 className="text-2xl sm:text-3xl font-heading font-bold">{getDisplayName(profile.first_name, profile.last_name)}</h1>
                  {userIsAdmin && (
                    <Badge
                      variant="destructive"
                      className="text-xs sm:text-sm px-2 py-0.5 h-6 sm:h-8"
                    >
                      Admin
                    </Badge>
                  )}
                  {userRole && (
                    <Badge
                      variant={userRole === 'employer' ? 'default' : userRole === 'mentor' ? 'secondary' : 'outline'}
                      className="text-xs sm:text-sm px-2 py-0.5 h-6 sm:h-8"
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
              {profile.degree && (
                <span className="flex items-center text-sm">
                  <Briefcase className="h-4 w-4 mr-1" />
                  {profile.degree}
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
                          <AvatarFallback className="bg-gold text-navy text-xs">
                            {getInitials(
                              endorsement.profiles?.first_name,
                              endorsement.profiles?.last_name
                            )}
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

          {/* Mutual Connections */}
          {mutualConnections.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Mutual Connections
              </h3>
              <div className="space-y-3">
                {mutualConnections.map((connection) => (
                  <Link
                    key={connection.id}
                    to={`/profile/${connection.id}`}
                    className="flex items-center space-x-3 hover:bg-secondary p-2 rounded-lg transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={connection.avatar_url || undefined}
                        alt={getDisplayName(connection.first_name, connection.last_name)}
                      />
                      <AvatarFallback className="bg-gold text-navy text-sm font-bold">
                        {getInitials(connection.first_name, connection.last_name)}
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
                {mutualConnectionsCount > 6 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{mutualConnectionsCount - 6} more mutual connection{mutualConnectionsCount - 6 !== 1 ? 's' : ''}
                  </p>
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
