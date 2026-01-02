import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MentionInput, MentionInputRef } from "@/components/MentionInput";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Image, Video, Calendar, X, Loader2, UserPlus, FileText, Users, Eye, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserAnalytics, formatCount } from "@/hooks/useUserAnalytics";
import { getFullName, getInitials } from "@/lib/nameUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchUserRoles, fetchMultipleUserRoles } from "@/lib/roleUtils";
import { Post, RawPost, PostInsert, UserBadge, PostComment } from "@/types/posts";
import { notifyConnectionRequest, notifyConnectionAccepted } from "@/lib/notificationHelpers";

interface SuggestedProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  university: string | null;
  sport: string | null;
  skills: string[] | null;
  user_role?: string | null;
  user_is_admin?: boolean;
  user_badges?: UserBadge[];
}

interface Resource {
  id: string;
  title: string;
  category: string;
  url: string;
  logo_url: string | null;
  is_featured?: boolean;
}

interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  university?: string | null;
  avatar_url?: string | null;
  sport?: string | null;
  skills?: string[] | null;
}

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postContent, setPostContent] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [selectedMediaFiles, setSelectedMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [currentUserBadges, setCurrentUserBadges] = useState<UserBadge[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'bookmarks' ? 'bookmarks' : 'feed';
  const initialFilter = searchParams.get('filter') || 'all';
  const [activeTab, setActiveTab] = useState<'feed' | 'drafts' | 'bookmarks'>(initialTab);
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedProfile[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [sharedPost, setSharedPost] = useState<Post | null>(null);
  const postTextRef = useRef<MentionInputRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    fetchPosts(true, filter);
  };

  // Use real analytics
  const { postsCount, connectionsCount, profileViewsCount, profileViews7d, profileViews30d } = useUserAnalytics(currentUser?.id);

  // Refs to keep stable values for callbacks used in effects
  const postsRef = useRef<Post[]>(posts);
  const loadingMoreRef = useRef<boolean>(false);
  const suggestionsInitializedRef = useRef(false);

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile as Profile);

      // Fetch user roles (can have multiple)
      const { baseRole, hasAdminRole } = await fetchUserRoles(user.id);

      setCurrentUserIsAdmin(hasAdminRole);
      setCurrentUserRole(baseRole);

      // Fetch user badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', user.id);

      setCurrentUserBadges(badgesData || []);

      return profile as Profile;
    }
    return null;
  }, []);

  // Use a ref to track current filter for pagination
  const activeFilterRef = useRef(activeFilter);
  useEffect(() => {
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  const fetchPosts = useCallback(async (reset: boolean = false, filter?: string, userId?: string) => {
    // Allow reset fetches to proceed even if loading (reset takes priority)
    if (loadingMoreRef.current && !reset) return;

    // Use passed filter or fall back to current filter ref for pagination
    const currentFilter = filter ?? activeFilterRef.current;
    // Use passed userId or fall back to currentUser state
    const effectiveUserId = userId || currentUser?.id;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const pageSize = 10;
    const from = reset ? 0 : postsRef.current.length;

    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(first_name, last_name, avatar_url),
        post_likes(id, user_id),
        post_comments(id, user_id, content, created_at, profiles!post_comments_user_id_fkey(first_name, last_name, avatar_url)),
        post_bookmarks(id, user_id),
        post_shares(id),
        post_media(id, media_url, media_type, display_order)
      `)
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString());

    // Filter by connections
    if (currentFilter === 'connections' && effectiveUserId) {
      const { data: connections } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', effectiveUserId);

      const connectedUserIds = connections?.map(c => c.connected_user_id) || [];
      if (connectedUserIds.length > 0) {
        query = query.in('user_id', connectedUserIds);
      } else {
        // If no connections, return empty result
        setPosts([]);
        setHasMore(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setInitialLoading(false);
        return;
      }
    }
    // Filter by current user's posts
    else if (currentFilter === 'my-posts' && effectiveUserId) {
      query = query.eq('user_id', effectiveUserId);
    }

    const { data, error } = await query
      .order('published_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load posts',
        variant: 'destructive',
      });
      setInitialLoading(false);
    } else {
      // Fetch user roles and badges for all post authors
      const userIds = [...new Set((data || []).map((post: RawPost) => post.user_id))];

      // Fetch roles for all users at once
      const rolesMap = await fetchMultipleUserRoles(userIds);

      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .in('user_id', userIds);

      const badgesMap = new Map();
      badgesData?.forEach(badge => {
        if (!badgesMap.has(badge.user_id)) {
          badgesMap.set(badge.user_id, []);
        }
        badgesMap.get(badge.user_id).push(badge);
      });

      // Transform data to add user_role, user_is_admin, and user_badges to each post
      const transformedData = (data || []).map((post: RawPost) => {
        const userRoles = rolesMap.get(post.user_id) || { baseRole: null, hasAdminRole: false };
        return {
          ...post,
          user_is_admin: userRoles.hasAdminRole,
          user_role: userRoles.baseRole,
          user_badges: badgesMap.get(post.user_id) ?? []
        };
      });

      if (reset) {
        setPosts(transformedData as Post[]);
        setInitialLoading(false);
      } else {
        setPosts(prev => [...prev, ...transformedData as Post[]]);
      }
      setHasMore((data?.length || 0) === pageSize);
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [toast, currentUser?.id]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    if (showComposer && postTextRef.current) {
      postTextRef.current.focus();
    }
  }, [showComposer]);

  const fetchSuggestions = useCallback(async (userId: string, currentProfile: Profile) => {
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
        .select("id, first_name, last_name, avatar_url, university, sport, skills")
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

      // Sort by score and take top suggestions
      scored.sort((a, b) => b.score - a.score);
      const topSuggestions = scored.slice(0, 3);

      // Fetch roles for suggested profiles
      const suggestionIds = topSuggestions.map(s => s.id);
      const rolesMap = await fetchMultipleUserRoles(suggestionIds);

      // Fetch badges for suggested profiles
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

      // Transform suggestions to include roles and badges
      const withRolesAndBadges = topSuggestions.map(profile => {
        const userRoles = rolesMap.get(profile.id) || { baseRole: null, hasAdminRole: false };
        return {
          ...profile,
          user_role: userRoles.baseRole,
          user_is_admin: userRoles.hasAdminRole,
          user_badges: badgesMap.get(profile.id) || []
        };
      });

      setSuggestions(withRolesAndBadges);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }, []);

  const handleConnect = async (profileId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if they already have a connection to us (meaning they sent a request first)
      const { data: existingConnection } = await supabase
        .from("connections")
        .select("id")
        .eq("user_id", profileId)
        .eq("connected_user_id", user.id)
        .single();

      const { error } = await supabase
        .from("connections")
        .insert({
          user_id: user.id,
          connected_user_id: profileId,
        });

      if (error) throw error;

      toast({
        title: "Connection sent!",
        description: "Your connection request has been sent.",
      });

      setSuggestions(prev => prev.filter(s => s.id !== profileId));

      // Send notification
      if (currentUser) {
        const currentUserName = getFullName(currentUser.first_name, currentUser.last_name);

        // If they already connected to us, notify them we accepted
        // Otherwise, notify them of the new connection request
        if (existingConnection) {
          await notifyConnectionAccepted(profileId, currentUserName, user.id);
        } else {
          await notifyConnectionRequest(profileId, currentUserName, user.id);
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

  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('id, title, category, url, logo_url, is_featured, created_at')
        .eq('is_active', true);

      if (error) throw error;

      // Fetch click counts for resources
      const { data: clicksData } = await supabase
        .from('resource_clicks')
        .select('resource_id');

      const clickCounts = clicksData?.reduce((acc, click) => {
        acc[click.resource_id] = (acc[click.resource_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Add click counts and sort by is_featured, clicks, then created_at
      const resourcesWithClicks = (data || [])
        .map(resource => ({
          ...resource,
          click_count: clickCounts[resource.id] || 0,
        }))
        .sort((a, b) => {
          // First sort by is_featured (true comes first)
          if (a.is_featured !== b.is_featured) {
            return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
          }
          // Then sort by click count (highest first)
          if (a.click_count !== b.click_count) {
            return b.click_count - a.click_count;
          }
          // Finally sort by created_at (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 4);

      setResources(resourcesWithClicks);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  }, []);

  // Fetch a single shared post by ID
  const fetchSharedPost = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey(first_name, last_name, avatar_url),
          post_likes(id, user_id),
          post_comments(id, user_id, content, created_at, profiles!post_comments_user_id_fkey(first_name, last_name, avatar_url)),
          post_bookmarks(id, user_id),
          post_shares(id),
          post_media(id, media_url, media_type, display_order)
        `)
        .eq('id', postId)
        .eq('is_published', true)
        .single();

      if (error || !data) {
        console.error('Error fetching shared post:', error);
        return null;
      }

      // Fetch user role and badges for the post author
      const { baseRole, hasAdminRole } = await fetchUserRoles(data.user_id);

      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', data.user_id);

      // Fetch roles and badges for comment authors
      const commentUserIds = [...new Set((data.post_comments || []).map((comment: { user_id: string }) => comment.user_id))];
      const commentRolesMap = await fetchMultipleUserRoles(commentUserIds);

      const { data: commentBadgesData } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .in('user_id', commentUserIds);

      const commentBadgesMap = new Map();
      commentBadgesData?.forEach(badge => {
        if (!commentBadgesMap.has(badge.user_id)) {
          commentBadgesMap.set(badge.user_id, []);
        }
        commentBadgesMap.get(badge.user_id).push(badge);
      });

      // Transform comments to include user_role, user_is_admin, and user_badges
      const transformedComments = (data.post_comments || []).map((comment: PostComment) => {
        const userRoles = commentRolesMap.get(comment.user_id) || { baseRole: null, hasAdminRole: false };
        return {
          ...comment,
          user_role: userRoles.baseRole,
          user_is_admin: userRoles.hasAdminRole,
          user_badges: commentBadgesMap.get(comment.user_id) || []
        };
      });

      return {
        ...data,
        user_role: baseRole,
        user_is_admin: hasAdminRole,
        user_badges: badgesData || [],
        post_comments: transformedComments
      } as Post;
    } catch (error) {
      console.error('Error fetching shared post:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const userProfile = await fetchCurrentUser();

      // Check if there's a shared post to fetch
      const sharedPostId = searchParams.get('post');
      if (sharedPostId) {
        const post = await fetchSharedPost(sharedPostId);
        if (post) {
          setSharedPost(post);
          setHighlightedPostId(sharedPostId);
          // Clear highlight after animation
          setTimeout(() => {
            setHighlightedPostId(null);
            setSearchParams(prev => {
              const newParams = new URLSearchParams(prev);
              newParams.delete('post');
              return newParams;
            });
          }, 10000);
        }
      }

      // Handle initial tab and filter from URL
      const tabParam = searchParams.get('tab');
      const filterParam = searchParams.get('filter');

      if (tabParam === 'bookmarks') {
        fetchBookmarks();
      } else {
        fetchPosts(true, filterParam || 'all', userProfile?.id);
      }

      fetchResources();
    };
    init();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCurrentUser, fetchResources, fetchPosts, fetchSharedPost, searchParams, setSearchParams]);

  useEffect(() => {
    if (currentUser?.id && !suggestionsInitializedRef.current) {
      suggestionsInitializedRef.current = true;
      fetchSuggestions(currentUser.id, currentUser);
    }
  }, [currentUser, fetchSuggestions]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchPosts(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchPosts]);

  const fetchDrafts = async () => {
    setLoadingDrafts(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingDrafts(false);
      return;
    }

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(first_name, last_name, avatar_url),
        post_likes(id, user_id),
        post_comments(id, user_id, content, created_at, profiles!post_comments_user_id_fkey(first_name, last_name)),
        post_bookmarks(id, user_id),
        post_shares(id)
      `)
      .eq('user_id', user.id)
      .eq('is_published', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching drafts:', error);
    } else {
      setDrafts((data as unknown as Post[]) || []);
    }
    setLoadingDrafts(false);
  };

  const fetchBookmarks = async () => {
    setLoadingBookmarks(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingBookmarks(false);
      return;
    }

    const { data, error } = await supabase
      .from('post_bookmarks')
      .select(`
        post_id,
        posts!inner(
          *,
          profiles!posts_user_id_fkey(first_name, last_name, avatar_url),
          post_likes(id, user_id),
          post_comments(id, user_id, content, created_at, profiles!post_comments_user_id_fkey(first_name, last_name, avatar_url)),
          post_bookmarks(id, user_id),
          post_shares(id),
          post_media(id, media_url, media_type, display_order)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarks:', error);
    } else {
      const bookmarkedPosts = data?.map((item: { posts: RawPost }) => item.posts) || [];

      // Fetch user roles and badges for bookmarked posts
      const userIds = [...new Set(bookmarkedPosts.map((post: RawPost) => post.user_id))];

      // Fetch roles for all users at once
      const rolesMap = await fetchMultipleUserRoles(userIds);

      // Fetch badges for all users
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .in('user_id', userIds);

      const badgesMap = new Map();
      badgesData?.forEach(badge => {
        if (!badgesMap.has(badge.user_id)) {
          badgesMap.set(badge.user_id, []);
        }
        badgesMap.get(badge.user_id).push(badge);
      });

      const transformedBookmarks = bookmarkedPosts.map((post: RawPost) => {
        const userRoles = rolesMap.get(post.user_id) || { baseRole: null, hasAdminRole: false };
        return {
          ...post,
          user_is_admin: userRoles.hasAdminRole,
          user_role: userRoles.baseRole,
          user_badges: badgesMap.get(post.user_id) ?? []
        };
      });

      setBookmarks(transformedBookmarks as Post[]);
    }
    setLoadingBookmarks(false);
    setInitialLoading(false);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles: File[] = [];
      const newPreviews: string[] = [];

      for (let i = 0; i < Math.min(files.length, 10 - selectedMediaFiles.length); i++) {
        const file = files[i];

        if (file.size > 50 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 50MB`,
            variant: "destructive",
          });
          continue;
        }

        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }

      if (selectedMediaFiles.length + newFiles.length > 10) {
        toast({
          title: "Too many files",
          description: "Maximum 10 files per post",
          variant: "destructive",
        });
      }

      setSelectedMediaFiles([...selectedMediaFiles, ...newFiles]);
      setMediaPreviews([...mediaPreviews, ...newPreviews]);
    }

    // Reset input
    e.target.value = '';
  };

  const removeMediaFile = (index: number) => {
    const newFiles = selectedMediaFiles.filter((_, i) => i !== index);
    const newPreviews = mediaPreviews.filter((_, i) => i !== index);
    setSelectedMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
  };

  const uploadMedia = async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('post-media')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handlePost = async (saveAsDraft: boolean = false) => {
    if (!postContent.trim() && selectedMediaFiles.length === 0) {
      toast({
        title: "Empty post",
        description: "Please add some content or media",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let mediaUrl = null;
      let mediaType = null;

      // For backward compatibility, keep single media_url if only one file
      if (selectedMediaFiles.length === 1) {
        mediaUrl = await uploadMedia(selectedMediaFiles[0], user.id);
        mediaType = selectedMediaFiles[0].type.startsWith('video/') ? 'video' : 'image';
      }

      // Get processed content with mention IDs
      const processedContent = postTextRef.current?.getProcessedContent() || postContent;

      const postData: PostInsert = {
        user_id: user.id,
        content: processedContent,
        media_url: mediaUrl,
        media_type: mediaType,
        is_published: !saveAsDraft,
        published_at: saveAsDraft ? null : new Date().toISOString(),
      };

      if (scheduledDate && !saveAsDraft) {
        postData.scheduled_at = scheduledDate;
        postData.published_at = scheduledDate;
        postData.is_published = new Date(scheduledDate) <= new Date();
      }

      const { data: insertedPost, error } = await supabase
        .from('posts')
        .insert([postData])
        .select('id');

      if (error) throw error;

      // Upload all media files to post_media table
      if (insertedPost && insertedPost.length > 0) {
        const postId = insertedPost[0].id;

        // For multiple files, upload all to post_media
        if (selectedMediaFiles.length > 0) {
          const mediaPromises = selectedMediaFiles.map(async (file, index) => {
            const url = await uploadMedia(file, user.id);
            const type = file.type.startsWith('video/') ? 'video' : 'image';
            return {
              post_id: postId,
              media_url: url,
              media_type: type,
              display_order: index
            };
          });

          const postMediaRecords = await Promise.all(mediaPromises);

          if (postMediaRecords.length > 0) {
            await supabase
              .from('post_media')
              .insert(postMediaRecords);
          }
        } else if (mediaUrl) {
          // Backward compatibility: single media_url
          await supabase
            .from('post_media')
            .insert([{
              post_id: postId,
              media_url: mediaUrl,
              media_type: mediaType,
              display_order: 0
            }]);
        }
      }

      toast({
        title: saveAsDraft
          ? "Draft saved"
          : scheduledDate && new Date(scheduledDate) > new Date()
            ? "Post scheduled"
            : "Post created",
        description: saveAsDraft
          ? "Your post has been saved as a draft"
          : scheduledDate && new Date(scheduledDate) > new Date()
            ? `Your post will be published on ${format(new Date(scheduledDate), 'PPpp')}`
            : "Your post has been published",
      });

      setPostContent("");
      setSelectedMediaFiles([]);
      setMediaPreviews([]);
      setScheduledDate("");
      setShowComposer(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (saveAsDraft) {
        await fetchDrafts();
      } else {
        await fetchPosts(true);
      }
    } catch (error: unknown) {
      console.error('Error creating post:', error);
      let message = 'Failed to create post';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearMedia = () => {
    setSelectedMediaFiles([]);
    setMediaPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Hidden on mobile, shown on large screens */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-16 h-16">
                <AvatarImage src={currentUser?.avatar_url || undefined} alt={getFullName(currentUser?.first_name, currentUser?.last_name)} />
                <AvatarFallback className="bg-gold text-navy text-xl font-bold">
                  {getInitials(currentUser?.first_name, currentUser?.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="font-semibold">{getFullName(currentUser?.first_name, currentUser?.last_name) || 'User'}</h3>
                  {currentUserIsAdmin && (
                    <Badge
                      variant="destructive"
                      className="text-xs px-1.5 py-0.5"
                    >
                      Admin
                    </Badge>
                  )}
                  {currentUserRole && (
                    <Badge
                      variant={currentUserRole === 'employer' ? 'default' : currentUserRole === 'mentor' ? 'secondary' : 'outline'}
                      className="text-xs px-1.5 py-0.5"
                    >
                      {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
                    </Badge>
                  )}
                  {currentUserBadges.map((userBadge) => {
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
                                  className="w-6 h-6 object-contain"
                                />
                              ) : badge.icon ? (
                                <span className="text-lg">{badge.icon}</span>
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
                <p className="text-sm text-muted-foreground">{currentUser?.university}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <FileText className="h-3 w-3 text-gold" />
                  <p className="font-bold">{formatCount(postsCount)}</p>
                </div>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-3 w-3 text-foreground" />
                  <p className="font-bold">{formatCount(connectionsCount)}</p>
                </div>
                <p className="text-xs text-muted-foreground">Connections</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3 text-foreground" />
                  <p className="font-bold">{formatCount(profileViewsCount)}</p>
                </div>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">LaceHub Resources</h4>
              <Link to="/lace-hub">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {resources.length === 0 ? (
                <p className="text-muted-foreground text-xs col-span-2">No resources available</p>
              ) : (
                resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-3 rounded border hover:bg-secondary cursor-pointer transition-colors"
                  >
                    <div className="w-16 h-16 flex items-center justify-center">
                      {resource.logo_url ? (
                        <img
                          src={resource.logo_url}
                          alt={resource.title}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl">📄</span>
                      )}
                    </div>
                    <span className="text-center text-xs font-medium line-clamp-2">{resource.title}</span>
                  </a>
                ))
              )}
            </div>
          </Card>
        </aside>

        {/* Main Feed */}
        <main className="lg:col-span-6">
          {/* Tabs for Feed, Drafts, and Bookmarks */}
          <div className="top-16 z-10 bg-background pb-4 -mx-4 px-4 lg:top-20 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button
                  variant={activeTab === 'feed' ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab('feed');
                    // Fetch posts if they haven't been loaded yet
                    if (posts.length === 0 && !loadingMore) {
                      fetchPosts(true);
                    }
                  }}
                  className={activeTab === 'feed' ? "bg-gold text-navy hover:bg-gold-light" : ""}
                >
                  Feed
                </Button>
                <Button
                  variant={activeTab === 'drafts' ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab('drafts');
                    fetchDrafts();
                  }}
                  className={activeTab === 'drafts' ? "bg-gold text-navy hover:bg-gold-light" : ""}
                >
                  Drafts
                </Button>
                <Button
                  variant={activeTab === 'bookmarks' ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab('bookmarks');
                    fetchBookmarks();
                  }}
                  className={activeTab === 'bookmarks' ? "bg-gold text-navy hover:bg-gold-light" : ""}
                >
                  Bookmarks
                </Button>
              </div>

              {activeTab === 'feed' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      {activeFilter === 'all' && 'All Posts'}
                      {activeFilter === 'my-posts' && 'My Posts'}
                      {activeFilter === 'connections' && 'Connections'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter Posts</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                      {activeFilter === 'all' && '✓ '}All Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFilterChange('my-posts')}>
                      {activeFilter === 'my-posts' && '✓ '}My Posts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFilterChange('connections')}>
                      {activeFilter === 'connections' && '✓ '}My Connections
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Post Composer */}
          {activeTab === 'feed' && (
            <Card className="p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={currentUser?.avatar_url || undefined} alt={getFullName(currentUser?.first_name, currentUser?.last_name)} />
                  <AvatarFallback className="bg-gold text-navy font-semibold">
                    {getInitials(currentUser?.first_name, currentUser?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {!showComposer ? (
                    <input
                      type="text"
                      placeholder="Create a post — share a win, a question, or a resource"
                      className="w-full rounded-full py-2 px-4 border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                      onFocus={() => setShowComposer(true)}
                    />
                  ) : (
                    <div>
                      <MentionInput
                        ref={postTextRef}
                        placeholder="What's on your mind? Use #hashtags or @mention connections"
                        value={postContent}
                        onChange={setPostContent}
                        className="mb-3"
                        rows={4}
                        currentUserId={currentUser?.id}
                      />

                      {mediaPreviews.length > 0 && (
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          {mediaPreviews.map((preview, index) => (
                            <div key={index} className="relative">
                              {selectedMediaFiles[index]?.type.startsWith('video/') ? (
                                <video src={preview} className="w-full h-24 rounded-lg object-cover" />
                              ) : (
                                <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 rounded-lg object-cover" />
                              )}
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={() => removeMediaFile(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 rounded">
                                {index + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex space-x-3 text-muted-foreground">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleMediaSelect}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload" title="Add up to 10 images">
                            <Image className="h-5 w-5 cursor-pointer hover:text-gold" />
                          </label>

                          <input
                            type="file"
                            accept="video/*"
                            multiple
                            onChange={handleMediaSelect}
                            className="hidden"
                            id="video-upload"
                          />
                          <label htmlFor="video-upload" title="Add up to 10 videos">
                            <Video className="h-5 w-5 cursor-pointer hover:text-gold" />
                          </label>

                          <Dialog>
                            <Calendar
                              className="h-5 w-5 cursor-pointer hover:text-gold"
                              onClick={() => document.getElementById('schedule-trigger')?.click()}
                            />
                          </Dialog>
                        </div>
                      </div>

                      {selectedMediaFiles.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {selectedMediaFiles.length} file(s) selected (max 10)
                        </p>
                      )}

                      <div className="mb-3">
                        <label className="text-sm text-muted-foreground mb-1 block">
                          Schedule post (optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={(() => {
                            const now = new Date();
                            const year = now.getFullYear();
                            const month = String(now.getMonth() + 1).padStart(2, '0');
                            const day = String(now.getDate()).padStart(2, '0');
                            const hours = String(now.getHours()).padStart(2, '0');
                            const minutes = String(now.getMinutes()).padStart(2, '0');
                            return `${year}-${month}-${day}T${hours}:${minutes}`;
                          })()}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowComposer(false);
                            clearMedia();
                            setScheduledDate("");
                          }}
                          disabled={isUploading}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePost(true)}
                          disabled={isUploading || (!postContent.trim() && selectedMediaFiles.length === 0)}
                        >
                          Save Draft
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gold hover:bg-gold-light text-navy"
                          onClick={() => handlePost(false)}
                          disabled={isUploading || (!postContent.trim() && selectedMediaFiles.length === 0)}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Posting...
                            </>
                          ) : scheduledDate && new Date(scheduledDate) > new Date() ? (
                            'Schedule'
                          ) : (
                            'Post'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Posts, Drafts, or Bookmarks */}
          {activeTab === 'drafts' ? (
            loadingDrafts ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gold" />
                <p className="text-muted-foreground mt-2">Loading drafts...</p>
              </Card>
            ) : drafts.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No drafts yet.</p>
              </Card>
            ) : (
              <>
                {drafts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onUpdate={() => {
                      fetchDrafts();
                      fetchPosts(true);
                    }}
                    currentUserId={currentUser?.id}
                    isDraft={true}
                  />
                ))}
              </>
            )
          ) : activeTab === 'bookmarks' ? (
            loadingBookmarks ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gold" />
                <p className="text-muted-foreground mt-2">Loading bookmarks...</p>
              </Card>
            ) : bookmarks.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No bookmarks yet. Bookmark posts to see them here!</p>
              </Card>
            ) : (
              <>
                {bookmarks.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onUpdate={() => {
                      fetchBookmarks();
                      fetchPosts(true);
                    }}
                    currentUserId={currentUser?.id}
                  />
                ))}
              </>
            )
          ) : (
            <>
              {/* Shared Post - displayed at top when accessed via share link */}
              {sharedPost && (
                <div className="mb-4">
                  <PostCard
                    post={sharedPost}
                    onUpdate={() => {
                      fetchSharedPost(sharedPost.id).then(post => {
                        if (post) setSharedPost(post);
                      });
                      fetchPosts(true);
                    }}
                    currentUserId={currentUser?.id}
                    isHighlighted={highlightedPostId === sharedPost.id}
                  />
                </div>
              )}

              {initialLoading ? (
                <Card className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gold" />
                  <p className="text-muted-foreground mt-2">Loading posts...</p>
                </Card>
              ) : posts.length === 0 && !sharedPost ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
                </Card>
              ) : (
                <>
                  {posts.filter(post => post.id !== sharedPost?.id).map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onUpdate={() => fetchPosts(true)}
                      currentUserId={currentUser?.id}
                      isHighlighted={highlightedPostId === post.id}
                    />
                  ))}

                  {hasMore && (
                    <div ref={loadMoreRef} className="py-8 text-center">
                      {loadingMore && (
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gold" />
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>

        {/* Right Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <Card className="p-4">
            <h4 className="font-semibold mb-3">Analytics</h4>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{formatCount(profileViews7d)}</p>
                <p className="text-xs text-muted-foreground">Views (7d)</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCount(profileViews30d)}</p>
                <p className="text-xs text-muted-foreground">Views (30d)</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Suggested Connections</h4>
              <Link to="/my-hub">
                <Button variant="ghost" size="sm" className="text-xs">
                  See More
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No suggestions available</p>
              ) : (
                suggestions.map((profile) => (
                  <div key={profile.id} className="flex items-center gap-3 p-2 rounded hover:bg-secondary transition-colors">
                    <Link to={`/profile/${profile.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile.avatar_url || undefined} alt={getFullName(profile.first_name, profile.last_name)} />
                        <AvatarFallback className="bg-gold text-navy text-sm font-semibold">
                          {getInitials(profile.first_name, profile.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          <p className="font-medium text-sm truncate">{getFullName(profile.first_name, profile.last_name) || 'User'}</p>
                          {profile.user_is_admin && (
                            <Badge
                              variant="destructive"
                              className="text-xs px-1 py-0 h-5"
                            >
                              Admin
                            </Badge>
                          )}
                          {profile.user_role && (
                            <Badge
                              variant={profile.user_role === 'employer' ? 'default' : profile.user_role === 'mentor' ? 'secondary' : 'outline'}
                              className="text-xs px-1 py-0 h-5"
                            >
                              {profile.user_role.charAt(0).toUpperCase() + profile.user_role.slice(1)}
                            </Badge>
                          )}
                          {profile.user_badges && profile.user_badges.length > 0 && (
                            <TooltipProvider>
                              {profile.user_badges.map((userBadge) => {
                                const badge = userBadge.badges;
                                if (!badge) return null;
                                return (
                                  <Tooltip key={userBadge.id} delayDuration={100}>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-help">
                                        {badge.image_url ? (
                                          <img
                                            src={badge.image_url}
                                            alt={badge.name}
                                            className="w-4 h-4 object-contain"
                                          />
                                        ) : badge.icon ? (
                                          <span className="text-sm">{badge.icon}</span>
                                        ) : null}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      <div className="font-semibold">{badge.name}</div>
                                      {badge.description && <div className="text-xs mt-1">{badge.description}</div>}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </TooltipProvider>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{profile.university}</p>
                      </div>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnect(profile.id);
                      }}
                      className="shrink-0"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default Home;
