import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Target, UserCheck, UserMinus, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ReferralDialog } from "@/components/ReferralDialog";
import { getFullName, getInitials } from "@/lib/nameUtils";
import { fetchMultipleUserRoles } from "@/lib/roleUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserBadge } from "@/types/posts";
import { notifyConnectionRequest, notifyConnectionAccepted } from "@/lib/notificationHelpers";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string;
  university: string;
  sport: string;
  skills: string[];
  about: string;
  user_role?: string | null;
  user_is_admin?: boolean;
  user_badges?: UserBadge[];
}

interface Connection {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  university: string | null;
  sport: string | null;
  user_role?: string | null;
  user_is_admin?: boolean;
  user_badges?: UserBadge[];
}

interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  member_count?: number;
  is_member?: boolean;
}

const MyHub = () => {
  const location = useLocation();
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const { toast } = useToast();

  // Check if we should default to connections tab
  const defaultTab = location.hash === "#connections" ? "connections" : "suggestions";

  const loadHubData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Fetch current user's profile for matching
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (currentProfile) {
        await Promise.all([
          fetchSuggestions(user.id, currentProfile),
          fetchConnections(user.id),
          fetchGroups(user.id),
        ]);
      }
    } catch (error) {
      console.error("Error loading hub data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  const fetchSuggestions = async (userId: string, currentProfile: { university?: string; sport?: string; skills?: string[] }) => {
    try {
      // Get existing connections
      const { data: existingConnections } = await supabase
        .from("connections")
        .select("connected_user_id")
        .eq("user_id", userId);

      const connectedIds = existingConnections?.map(c => c.connected_user_id) || [];

      // Fetch profiles with matching criteria
      let query = supabase
        .from("profiles")
        .select("*")
        .eq("approval_status", "approved")
        .neq("id", userId);

      // Filter out existing connections
      if (connectedIds.length > 0) {
        query = query.not("id", "in", `(${connectedIds.join(",")})`);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      // Score and sort suggestions based on matching criteria
      const scored = (data || []).map(profile => {
        let score = 0;
        // Same university
        if (profile.university === currentProfile.university) score += 3;
        // Same sport
        if (profile.sport === currentProfile.sport) score += 3;
        // Matching skills
        const commonSkills = profile.skills?.filter(s =>
          currentProfile.skills?.includes(s)
        ).length || 0;
        score += commonSkills * 2;

        return { ...profile, score };
      });

      // Check for accepted referrals and boost scores
      const profileIds = scored.map(p => p.id);
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('referrer_user_id, id')
        .in('referrer_user_id', profileIds)
        .eq('status', 'accepted');

      // Count accepted referrals per user
      const referralCounts = new Map<string, number>();
      referralsData?.forEach(referral => {
        const count = referralCounts.get(referral.referrer_user_id) || 0;
        referralCounts.set(referral.referrer_user_id, count + 1);
      });

      // Boost score for users with at least 1 accepted referral
      scored.forEach(profile => {
        const acceptedReferrals = referralCounts.get(profile.id) || 0;
        if (acceptedReferrals > 0) {
          profile.score += 3; // Boost score by 3 for having accepted referrals
        }
      });

      // Sort by score and take top suggestions
      scored.sort((a, b) => b.score - a.score);
      const topSuggestions = scored.slice(0, 12);

      // Fetch roles and badges for suggestions
      const suggestionIds = topSuggestions.map(s => s.id);
      const rolesMap = await fetchMultipleUserRoles(suggestionIds);

      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .in('user_id', suggestionIds);

      const badgesMap = new Map();
      badgesData?.forEach(badge => {
        if (!badgesMap.has(badge.user_id)) {
          badgesMap.set(badge.user_id, []);
        }
        badgesMap.get(badge.user_id).push(badge);
      });

      const suggestionsWithRoles = topSuggestions.map(s => {
        const userRoles = rolesMap.get(s.id) || { baseRole: null, hasAdminRole: false };
        return {
          ...s,
          user_role: userRoles.baseRole,
          user_is_admin: userRoles.hasAdminRole,
          user_badges: badgesMap.get(s.id) ?? []
        };
      });

      setSuggestions(suggestionsWithRoles);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const fetchConnections = async (userId: string) => {
    try {
      const { data: connectionData, error: connectionsError } = await supabase
        .from("connections")
        .select("connected_user_id")
        .eq("user_id", userId);

      if (connectionsError) throw connectionsError;

      if (connectionData && connectionData.length > 0) {
        const { data: connectionProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url, university, sport")
          .in("id", connectionData.map(c => c.connected_user_id));

        if (profilesError) throw profilesError;

        // Fetch roles and badges for connections
        const connectionIds = connectionData.map(c => c.connected_user_id);
        const rolesMap = await fetchMultipleUserRoles(connectionIds);

        const { data: badgesData } = await supabase
          .from('user_badges')
          .select('*, badges(*)')
          .in('user_id', connectionIds);

        const badgesMap = new Map();
        badgesData?.forEach(badge => {
          if (!badgesMap.has(badge.user_id)) {
            badgesMap.set(badge.user_id, []);
          }
          badgesMap.get(badge.user_id).push(badge);
        });

        const connectionsWithRoles = (connectionProfiles || []).map(c => {
          const userRoles = rolesMap.get(c.id) || { baseRole: null, hasAdminRole: false };
          return {
            ...c,
            user_role: userRoles.baseRole,
            user_is_admin: userRoles.hasAdminRole,
            user_badges: badgesMap.get(c.id) ?? []
          };
        });

        setConnections(connectionsWithRoles);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const fetchGroups = async (userId: string) => {
    try {
      // Fetch all active groups
      const { data: allGroups, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .eq("is_active", true);

      if (groupsError) throw groupsError;

      // Fetch user's group memberships
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);

      const memberGroupIds = memberships?.map(m => m.group_id) || [];

      // Fetch member counts for all groups
      const { data: memberCounts } = await supabase
        .from("group_members")
        .select("group_id");

      const counts = memberCounts?.reduce((acc, m) => {
        acc[m.group_id] = (acc[m.group_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const groupsWithMeta = (allGroups || []).map(group => ({
        ...group,
        member_count: counts[group.id] || 0,
        is_member: memberGroupIds.includes(group.id),
      }));

      setGroups(groupsWithMeta);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const handleConnect = async (profileId: string) => {
    try {
      // Check if they already have a connection to us (meaning they sent a request first)
      const { data: existingConnection } = await supabase
        .from("connections")
        .select("id")
        .eq("user_id", profileId)
        .eq("connected_user_id", currentUserId)
        .single();

      const { error } = await supabase
        .from("connections")
        .insert({
          user_id: currentUserId,
          connected_user_id: profileId,
        });

      if (error) throw error;

      toast({
        title: "Connection sent!",
        description: "Your connection request has been sent.",
      });

      setSuggestions(prev => prev.filter(s => s.id !== profileId));

      // Refresh connections list
      await fetchConnections(currentUserId);

      // Send notification
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', currentUserId)
        .single();

      if (currentUserProfile) {
        const currentUserName = getFullName(
          currentUserProfile.first_name,
          currentUserProfile.last_name
        );

        // If they already connected to us, notify them we accepted
        // Otherwise, notify them of the new connection request
        if (existingConnection) {
          await notifyConnectionAccepted(profileId, currentUserName, currentUserId);
        } else {
          await notifyConnectionRequest(profileId, currentUserName, currentUserId);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("user_id", currentUserId)
        .eq("connected_user_id", profileId);

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: "You have been disconnected from this user.",
      });

      setConnections(prev => prev.filter(c => c.id !== profileId));
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect",
        variant: "destructive",
      });
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: currentUserId,
        });

      if (error) throw error;

      toast({
        title: "Joined group!",
        description: "You've successfully joined the group.",
      });

      setGroups(prev => prev.map(g =>
        g.id === groupId
          ? { ...g, is_member: true, member_count: (g.member_count || 0) + 1 }
          : g
      ));
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join group",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <LoadingSpinner fullPage text="Loading your hub..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">Network</h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Connect with athletes and mentors who share your journey. <br />Looking for career opportunities? Check out the{" "}
            <Link to="/opportunities" className="text-primary hover:underline font-medium">
              Opportunities Board
            </Link>
            .
          </p>
        </div>
        <Button
          onClick={() => setReferralDialogOpen(true)}
          size="lg"
          className="gap-2 self-start sm:self-auto bg-gold hover:bg-gold-light text-navy"
        >
          <Mail className="h-5 w-5" />
          Earn Rewards
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="connections" className="gap-2">
            <UserCheck className="h-4 w-4" />
            My Connections
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Suggested Connections
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">You don't have any connections yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Check out the Suggested Connections tab to find people to connect with!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {connections.map((connection) => (
                <Card key={connection.id}>
                  <CardHeader>
                    <Link to={`/profile/${connection.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={connection.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(connection.first_name, connection.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <CardTitle className="text-lg hover:text-primary transition-colors">{getFullName(connection.first_name, connection.last_name) || 'User'}</CardTitle>
                          {connection.user_is_admin && (
                            <Badge
                              variant="destructive"
                              className="text-xs px-1.5 py-0.5"
                            >
                              Admin
                            </Badge>
                          )}
                          {connection.user_role && (
                            <Badge
                              variant={connection.user_role === 'employer' ? 'default' : connection.user_role === 'mentor' ? 'secondary' : 'outline'}
                              className="text-xs px-1.5 py-0.5"
                            >
                              {connection.user_role.charAt(0).toUpperCase() + connection.user_role.slice(1)}
                            </Badge>
                          )}
                          {connection.user_badges && connection.user_badges.map((userBadge) => {
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
                                          className="w-5 h-5 object-contain"
                                        />
                                      ) : badge.icon ? (
                                        <span className="text-base">{badge.icon}</span>
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
                        <CardDescription className="text-sm">
                          {connection.university}
                        </CardDescription>
                      </div>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {connection.sport && (
                      <Badge variant="secondary">{connection.sport}</Badge>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1"
                      >
                        <Link to={`/profile/${connection.id}`}>View Profile</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(connection.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No suggestions available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((profile) => (
                <Card key={profile.id}>
                  <CardHeader>
                    <Link to={`/profile/${profile.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback>
                          {getInitials(profile.first_name, profile.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <CardTitle className="text-lg hover:text-primary transition-colors">{getFullName(profile.first_name, profile.last_name) || 'User'}</CardTitle>
                          {profile.user_is_admin && (
                            <Badge
                              variant="destructive"
                              className="text-xs px-1.5 py-0.5"
                            >
                              Admin
                            </Badge>
                          )}
                          {profile.user_role && (
                            <Badge
                              variant={profile.user_role === 'employer' ? 'default' : profile.user_role === 'mentor' ? 'secondary' : 'outline'}
                              className="text-xs px-1.5 py-0.5"
                            >
                              {profile.user_role.charAt(0).toUpperCase() + profile.user_role.slice(1)}
                            </Badge>
                          )}
                          {profile.user_badges && profile.user_badges.map((userBadge) => {
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
                                          className="w-5 h-5 object-contain"
                                        />
                                      ) : badge.icon ? (
                                        <span className="text-base">{badge.icon}</span>
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
                        <CardDescription className="text-sm">
                          {profile.university}
                        </CardDescription>
                      </div>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {profile.sport && (
                        <Badge variant="secondary">{profile.sport}</Badge>
                      )}
                      {profile.skills?.slice(0, 2).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="mr-1">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    {profile.about && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {profile.about}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        asChild
                        className="flex-1"
                      >
                        <Link to={`/profile/${profile.id}`}>View Profile</Link>
                      </Button>
                      <Button
                        onClick={() => handleConnect(profile.id)}
                        className="flex-1"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No groups available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <Badge variant="outline" className="capitalize">
                        {group.category}
                      </Badge>
                    </div>
                    <CardDescription>{group.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{group.member_count} members</span>
                    </div>
                    <Button
                      onClick={() => handleJoinGroup(group.id)}
                      disabled={group.is_member}
                      className="w-full"
                      variant={group.is_member ? "secondary" : "default"}
                    >
                      {group.is_member ? "Joined" : "Join Group"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ReferralDialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen} />
    </div>
  );
};

export default MyHub;
