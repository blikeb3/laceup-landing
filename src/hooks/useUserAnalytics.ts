import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserAnalytics {
  postsCount: number;
  connectionsCount: number;
  profileViewsCount: number;
  profileViews7d: number;
  profileViews30d: number;
  loading: boolean;
}

export const useUserAnalytics = (userId?: string) => {
  const [analytics, setAnalytics] = useState<UserAnalytics>({
    postsCount: 0,
    connectionsCount: 0,
    profileViewsCount: 0,
    profileViews7d: 0,
    profileViews30d: 0,
    loading: true,
  });

  const fetchAnalytics = useCallback(async () => {
    if (!userId) {
      setAnalytics(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Calculate date thresholds
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch posts count
      const { count: postsCount, error: postsError } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_published", true);

      if (postsError) console.error("Error fetching posts count:", postsError);

      // Fetch connections count (both directions)
      const { count: connectionsCount, error: connectionsError } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (connectionsError) console.error("Error fetching connections count:", connectionsError);

      // Fetch total profile views count
      const { count: profileViewsCount, error: viewsError } = await supabase
        .from("profile_views")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId);

      if (viewsError) console.error("Error fetching profile views:", viewsError);

      // Fetch profile views in last 7 days
      const { count: views7d, error: views7dError } = await supabase
        .from("profile_views")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId)
        .gte("viewed_at", sevenDaysAgo);

      if (views7dError) console.error("Error fetching 7-day views:", views7dError);

      // Fetch profile views in last 30 days
      const { count: views30d, error: views30dError } = await supabase
        .from("profile_views")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId)
        .gte("viewed_at", thirtyDaysAgo);

      if (views30dError) console.error("Error fetching 30-day views:", views30dError);

      setAnalytics({
        postsCount: postsCount || 0,
        connectionsCount: connectionsCount || 0,
        profileViewsCount: profileViewsCount || 0,
        profileViews7d: views7d || 0,
        profileViews30d: views30d || 0,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalytics(prev => ({ ...prev, loading: false }));
    }
  }, [userId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { ...analytics, refetch: fetchAnalytics };
};

// Function to track a profile view
export const trackProfileView = async (profileId: string, viewerId: string) => {
  // Don't track if viewing own profile
  if (profileId === viewerId) return;

  try {
    const { error } = await supabase
      .from("profile_views")
      .insert({
        profile_id: profileId,
        viewer_id: viewerId,
      });

    if (error) {
      console.error("Error tracking profile view:", error);
    }
  } catch (error) {
    console.error("Error tracking profile view:", error);
  }
};

// Format large numbers (e.g., 1234 -> "1.2k")
export const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}m`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};
