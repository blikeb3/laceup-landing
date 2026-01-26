import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Target, UserCheck, UserMinus, Mail, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ReferralDialog } from "@/components/ReferralDialog";
import { getFullName, getInitials } from "@/lib/nameUtils";
import { fetchMultipleUserRoles } from "@/lib/roleUtils";
import { Input } from "@/components/ui/input";
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
  type RoleFilter = "all" | "athlete" | "mentor" | "employer";
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");  

  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [suggestionsSearchQuery, setSuggestionsSearchQuery] = useState<string>("");
  
  // Infinite scroll state
  const [hasSuggestionsMore, setHasSuggestionsMore] = useState(true);
  const [hasConnectionsMore, setHasConnectionsMore] = useState(true);
  const [hasGroupsMore, setHasGroupsMore] = useState(true);
  const [loadingSuggestionsMore, setLoadingSuggestionsMore] = useState(false);
  const [loadingConnectionsMore, setLoadingConnectionsMore] = useState(false);
  const [loadingGroupsMore, setLoadingGroupsMore] = useState(false);
  
  const loadingSuggestionsRef = useRef(false);
  const loadingConnectionsRef = useRef(false);
  const loadingGroupsRef = useRef(false);
  const suggestionsLoadMoreRef = useRef<HTMLDivElement>(null);
  const connectionsLoadMoreRef = useRef<HTMLDivElement>(null);
  const groupsLoadMoreRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  
  const PAGE_SIZE = 12;

  // Check URL parameters for search query
  const searchParams = new URLSearchParams(location.search);
  const urlSearchQuery = searchParams.get('search');
  
  // Check if we should default to connections tab
  const defaultTab = (location.hash === "#connections" || urlSearchQuery) ? "connections" : "suggestions";

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

  // Fetch pending connection requests on mount
  useEffect(() => {
    const fetchPendingRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("connection_requests")
        .select("receiver_id")
        .eq("requester_id", user.id)
        .eq("status", "pending");

      if (!error && data) {
        const pending = new Set(data.map(req => req.receiver_id));
        setPendingRequests(pending);
      }
    };

    fetchPendingRequests();
  }, []);

  // Handle URL search parameter
  useEffect(() => {
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
  }, [urlSearchQuery]);

  const fetchSuggestions = useCallback(async (userId: string, currentProfile: { university?: string; sport?: string; skills?: string[] }, reset: boolean = true) => {
    if (!reset && loadingSuggestionsRef.current) return;
    
    try {
      if (!reset) {
        loadingSuggestionsRef.current = true;
        setLoadingSuggestionsMore(true);
      }
      
      // Get existing connections
      const { data: existingConnections } = await supabase
        .from("connections")
        .select("connected_user_id")
        .eq("user_id", userId);

      const connectedIds = existingConnections?.map(c => c.connected_user_id) || [];

      // Fetch profiles with matching criteria
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("approval_status", "approved")
        .neq("id", userId);

      // Filter out existing connections
      if (connectedIds.length > 0) {
        query = query.not("id", "in", `(${connectedIds.join(",")})`);
      }

      const { data, error, count } = await query;

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
      const topSuggestions = scored;

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

      // Paginate the sorted results
      const from = reset ? 0 : suggestions.length;
      const to = from + PAGE_SIZE - 1;
      const paginatedSuggestions = suggestionsWithRoles.slice(from, to + 1);
      
      if (reset) {
        setSuggestions(paginatedSuggestions);
      } else {
        setSuggestions(prev => [...prev, ...paginatedSuggestions]);
      }
      
      setHasSuggestionsMore(to + 1 < suggestionsWithRoles.length);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      if (!reset) {
        loadingSuggestionsRef.current = false;
        setLoadingSuggestionsMore(false);
      }
    }
  }, [suggestions.length]);

  const fetchConnections = useCallback(async (userId: string, reset: boolean = true) => {
    if (!reset && loadingConnectionsRef.current) return;
    
    try {
      if (!reset) {
        loadingConnectionsRef.current = true;
        setLoadingConnectionsMore(true);
      }
      
      const from = reset ? 0 : connections.length;
      const to = from + PAGE_SIZE - 1;
      
      const { data: connectionData, error: connectionsError } = await supabase
        .from("connections")
        .select("connected_user_id")
        .eq("user_id", userId)
        .range(from, to);

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

        if (reset) {
          setConnections(connectionsWithRoles);
        } else {
          setConnections(prev => [...prev, ...connectionsWithRoles]);
        }
        
        setHasConnectionsMore((connectionData?.length || 0) === PAGE_SIZE);
      } else {
        setHasConnectionsMore(false);
        if (reset) setConnections([]);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      if (!reset) {
        loadingConnectionsRef.current = false;
        setLoadingConnectionsMore(false);
      }
    }
  }, [connections.length]);

  const fetchGroups = useCallback(async (userId: string, reset: boolean = true) => {
    if (!reset && loadingGroupsRef.current) return;
    
    try {
      if (!reset) {
        loadingGroupsRef.current = true;
        setLoadingGroupsMore(true);
      }
      
      const from = reset ? 0 : groups.length;
      const to = from + PAGE_SIZE - 1;
      
      // Fetch all active groups
      const { data: allGroups, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .eq("is_active", true)
        .range(from, to);

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

      if (reset) {
        setGroups(groupsWithMeta);
      } else {
        setGroups(prev => [...prev, ...groupsWithMeta]);
      }
      
      setHasGroupsMore((allGroups || []).length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      if (!reset) {
        loadingGroupsRef.current = false;
        setLoadingGroupsMore(false);
      }
    }
  }, [groups.length]);

  const handleConnect = async (profileId: string) => {
    try {
      // Check if request is already pending
      if (pendingRequests.has(profileId)) {
        // Cancel the pending request
        const { error: deleteError } = await supabase
          .from("connection_requests")
          .delete()
          .eq("requester_id", currentUserId)
          .eq("receiver_id", profileId)
          .eq("status", "pending");

        if (deleteError) throw deleteError;

        toast({
          title: "Request Cancelled",
          description: "Your connection request has been cancelled.",
        });

        setPendingRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(profileId);
          return newSet;
        });
      } else {
        // Check if a pending request already exists in the database
        const { data: existingRequest } = await supabase
          .from("connection_requests")
          .select("id")
          .eq("requester_id", currentUserId)
          .eq("receiver_id", profileId)
          .eq("status", "pending")
          .single();

        if (existingRequest) {
          // Request already pending, just update state
          setPendingRequests(prev => new Set(prev).add(profileId));
          return;
        }

        // Create a new connection request
        const { error: requestError } = await supabase
          .from("connection_requests")
          .insert({
            requester_id: currentUserId,
            receiver_id: profileId,
            status: "pending",
          });

        if (requestError) throw requestError;

        toast({
          title: "Request Sent!",
          description: "Your connection request has been sent.",
        });

        setPendingRequests(prev => new Set(prev).add(profileId));

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

          await notifyConnectionRequest(profileId, currentUserName, currentUserId);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to manage connection request",
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

  // Load more handlers - removed, using IntersectionObserver directly

  // Infinite scroll observers
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasSuggestionsMore && !loadingSuggestionsMore) {
          supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return;
            
            const { data: currentProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .single();
              
            if (currentProfile) {
              await fetchSuggestions(user.id, currentProfile, false);
            }
          });
        }
      },
      { threshold: 0.1 }
    );

    if (suggestionsLoadMoreRef.current) {
      observer.observe(suggestionsLoadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasSuggestionsMore, loadingSuggestionsMore, fetchSuggestions]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasConnectionsMore && !loadingConnectionsMore && currentUserId) {
          fetchConnections(currentUserId, false);
        }
      },
      { threshold: 0.1 }
    );

    if (connectionsLoadMoreRef.current) {
      observer.observe(connectionsLoadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasConnectionsMore, loadingConnectionsMore, currentUserId, fetchConnections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasGroupsMore && !loadingGroupsMore && currentUserId) {
          fetchGroups(currentUserId, false);
        }
      },
      { threshold: 0.1 }
    );

    if (groupsLoadMoreRef.current) {
      observer.observe(groupsLoadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasGroupsMore, loadingGroupsMore, currentUserId, fetchGroups]);

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
          {/* Search Bar for Connections */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
  <div className="relative flex-1 w-full">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="text"
      placeholder="Search your connections..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-9"
    />
  </div>

  <select
    value={roleFilter}
    onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
    className="h-10 w-full sm:w-[180px] rounded-md border bg-background px-3 text-sm"
  >
    <option value="all">All</option>
    <option value="athlete">Athletes</option>
    <option value="mentor">Mentors</option>
    <option value="employer">Employers</option>
  </select>

  {(searchQuery || roleFilter !== "all") && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setSearchQuery("");
        setRoleFilter("all");
      }}
      className="gap-2"
    >
      <X className="h-4 w-4" />
      Clear
    </Button>
  )}
</div>

          {(() => {
            const filteredConnections = connections.filter((connection) => {
  const search = searchQuery.trim().toLowerCase();

  // Role filtering
  if (roleFilter !== "all") {
    const role = (connection.user_role ?? "").toLowerCase();
    if (role !== roleFilter) return false;
  }

  // Text filtering
  if (!search) return true;

  const fullName = getFullName(connection.first_name, connection.last_name).toLowerCase();
  return (
    fullName.includes(search) ||
    (connection.university ?? "").toLowerCase().includes(search) ||
    (connection.sport ?? "").toLowerCase().includes(search)
  );
});


            return filteredConnections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {connections.length === 0 ? (
                    <>
                      <p className="text-muted-foreground">You don't have any connections yet.</p>
                      <p className="text-sm text-muted-foreground mt-2">Check out the Suggested Connections tab to find people to connect with!</p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">No connections found for "{searchQuery}"</p>
                      <p className="text-sm text-muted-foreground mt-2">Try adjusting your search terms.</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredConnections.map((connection) => (
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

                          {connection.user_role && (
                            <Badge
                              className="text-xs px-1.5 py-0.5 bg-navy text-gold border-navy"
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
            );
          })()}
          
          {/* Infinite scroll trigger for connections */}
          {hasConnectionsMore && (
            <div ref={connectionsLoadMoreRef} className="py-8 text-center">
              {loadingConnectionsMore && <LoadingSpinner />}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          {/* Search Bar for Suggestions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
  <div className="relative flex-1 w-full">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="text"
      placeholder="Search suggested connections..."
      value={suggestionsSearchQuery}
      onChange={(e) => setSuggestionsSearchQuery(e.target.value)}
      className="pl-9"
    />
  </div>

  <select
    value={roleFilter}
    onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
    className="h-10 w-full sm:w-[180px] rounded-md border bg-background px-3 text-sm"
  >
    <option value="all">All</option>
    <option value="athlete">Athletes</option>
    <option value="mentor">Mentors</option>
    <option value="employer">Employers</option>
  </select>

  {(suggestionsSearchQuery || roleFilter !== "all") && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setSuggestionsSearchQuery("");
        setRoleFilter("all");
      }}
      className="gap-2"
    >
      <X className="h-4 w-4" />
      Clear
    </Button>
  )}
</div>


          {(() => {
            const filteredSuggestions = suggestions.filter((profile) => {
  const search = suggestionsSearchQuery.trim().toLowerCase();

  // Role filtering
  if (roleFilter !== "all") {
    const role = (profile.user_role ?? "").toLowerCase();
    if (role !== roleFilter) return false;
  }

  // Text filtering
  if (!search) return true;

  const fullName = getFullName(profile.first_name, profile.last_name).toLowerCase();
  return (
    fullName.includes(search) ||
    (profile.university ?? "").toLowerCase().includes(search) ||
    (profile.sport ?? "").toLowerCase().includes(search)
  );
});


            return filteredSuggestions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {suggestions.length === 0 ? (
                    <p className="text-muted-foreground">No suggestions available at the moment.</p>
                  ) : (
                    <>
                      <p className="text-muted-foreground">No suggestions found for "{suggestionsSearchQuery}"</p>
                      <p className="text-sm text-muted-foreground mt-2">Try adjusting your search terms.</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSuggestions.map((profile) => (
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

                          {profile.user_role && (
                            <Badge
                              className="text-xs px-1.5 py-0.5 bg-navy text-gold border-navy"
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
                        variant={pendingRequests.has(profile.id) ? "outline" : "default"}
                        className={pendingRequests.has(profile.id) ? "flex-1 text-amber-600 border-amber-600 hover:bg-amber-50" : "flex-1"}
                      >
                        {pendingRequests.has(profile.id) ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Pending
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            );
          })()}
          
          {/* Infinite scroll trigger for suggestions */}
          {hasSuggestionsMore && (
            <div ref={suggestionsLoadMoreRef} className="py-8 text-center">
              {loadingSuggestionsMore && <LoadingSpinner />}
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
          
          {/* Infinite scroll trigger for groups */}
          {hasGroupsMore && (
            <div ref={groupsLoadMoreRef} className="py-8 text-center">
              {loadingGroupsMore && <LoadingSpinner />}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ReferralDialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen} />
    </div>
  );
};

export default MyHub;
