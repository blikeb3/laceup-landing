import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCheck, Bell, Heart, MessageCircle, Users, Share2, Zap, Briefcase, Mail, Trash2, ArrowRight } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/types/notifications";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TabKey = "all" | "my-post" | "mentions" | "jobs";

interface JobRecommendation {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  type: string;
  career_interest: string | null;
  created_at: string | null;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [expandedTabs, setExpandedTabs] = useState<Record<TabKey, boolean>>({
    all: false,
    "my-post": false,
    mentions: false,
    jobs: false,
  });
  const [jobRecommendations, setJobRecommendations] = useState<JobRecommendation[]>([]);

  const fetchJobRecommendations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profile }, { data: opportunities }] = await Promise.all([
      supabase
        .from("profiles")
        .select("skills, sport")
        .eq("id", user.id)
        .single(),
      supabase
        .from("opportunities")
        .select("id, title, company_name, location, type, career_interest, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(18),
    ]);

    const skillTerms = Array.isArray(profile?.skills)
      ? profile.skills.map((s: string) => s.toLowerCase())
      : [];
    const sportTerm = typeof profile?.sport === "string" ? profile.sport.toLowerCase() : "";

    const ranked = (opportunities || [])
      .map((job) => {
        const interest = (job.career_interest || "").toLowerCase();
        let score = 0;
        if (sportTerm && interest.includes(sportTerm)) score += 2;
        if (skillTerms.some((skill) => interest.includes(skill))) score += 3;
        return { ...job, score };
      })
      .sort((a, b) => b.score - a.score || new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime())
      .slice(0, 6);

    setJobRecommendations(ranked);
  }, []);

  useEffect(() => {
    fetchJobRecommendations();
  }, [fetchJobRecommendations]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "post_like":
        return { icon: Heart, color: "text-red-500", bgColor: "bg-red-50" };
      case "post_comment":
      case "post_mention":
        return { icon: MessageCircle, color: "text-blue-500", bgColor: "bg-blue-50" };
      case "message":
        return { icon: Mail, color: "text-green-500", bgColor: "bg-green-50" };
      case "connection_request":
      case "connection_accepted":
        return { icon: Users, color: "text-purple-500", bgColor: "bg-purple-50" };
      case "endorsement":
        return { icon: Zap, color: "text-yellow-500", bgColor: "bg-yellow-50" };
      case "opportunity":
        return { icon: Briefcase, color: "text-indigo-500", bgColor: "bg-indigo-50" };
      case "post_publish":
        return { icon: Share2, color: "text-orange-500", bgColor: "bg-orange-50" };
      default:
        return { icon: Bell, color: "text-gray-500", bgColor: "bg-gray-50" };
    }
  };

  const getNotificationType = (type: string) => {
    const typeMap: Record<string, string> = {
      post_like: "Like",
      post_comment: "Comment",
      post_mention: "Mention",
      message: "Message",
      connection_request: "Connection Request",
      connection_accepted: "Connection Accepted",
      endorsement: "Endorsement",
      opportunity: "Opportunity",
      post_publish: "Post Published",
    };
    return typeMap[type] || "Notification";
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  const handleDeleteClick = (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (notificationToDelete) deleteNotification(notificationToDelete);
    setDeleteConfirmOpen(false);
    setNotificationToDelete(null);
  };

  const toggleLearnMore = (tab: TabKey) => {
    setExpandedTabs((prev) => ({ ...prev, [tab]: !prev[tab] }));
  };

  const getVisibleNotifications = (items: Notification[], tab: TabKey) => {
    return expandedTabs[tab] ? items : items.slice(0, 3);
  };

  const allNotifications = notifications;
  const myPostNotifications = notifications.filter((n) =>
    ["post_like", "post_comment", "post_publish"].includes(n.type)
  );
  const mentionNotifications = notifications.filter((n) => n.type === "post_mention");
  const jobNotifications = notifications.filter((n) => n.type === "opportunity");

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const { icon: IconComponent, color, bgColor } = getNotificationIcon(notification.type);
    const typeLabel = getNotificationType(notification.type);

    return (
      <div
        className={`p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
          !notification.read ? "bg-blue-50 border-blue-200" : "bg-white"
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
            <IconComponent className={`h-6 w-6 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
                  <Badge variant="outline" className="text-xs flex-shrink-0">{typeLabel}</Badge>
                  {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notification.id);
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Mark as read"
              >
                <Check className="h-4 w-4 text-gray-600" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(notification.id);
              }}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NotificationSection = ({ items, tab }: { items: Notification[]; tab: TabKey }) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center">
            <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No notifications in this section yet.</p>
          </CardContent>
        </Card>
      );
    }

    const visibleItems = getVisibleNotifications(items, tab);

    return (
      <div className="space-y-3">
        {visibleItems.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} />
        ))}

        {items.length > 3 && (
          <div className="pt-2">
            <Button variant="outline" onClick={() => toggleLearnMore(tab)}>
              {expandedTabs[tab] ? "Show less" : `Learn more (${items.length - 3} more)`}
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <LoadingSpinner fullPage text="Loading notifications..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Track updates, mentions, and recommended jobs.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsRead()}
            size="lg"
            className="gap-2 self-start sm:self-auto bg-gold hover:bg-gold-light text-navy"
          >
            <CheckCheck className="h-5 w-5" />
            Mark All as Read
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="all" className="gap-2">
            <Bell className="h-4 w-4" />
            All
            <Badge variant="secondary">{allNotifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="my-post" className="gap-2">
            <Share2 className="h-4 w-4" />
            My post
            <Badge variant="secondary">{myPostNotifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="mentions" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Mentions
            <Badge variant="secondary">{mentionNotifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Jobs
            <Badge variant="secondary">{jobNotifications.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <NotificationSection items={allNotifications} tab="all" />
        </TabsContent>

        <TabsContent value="my-post" className="space-y-4">
          <NotificationSection items={myPostNotifications} tab="my-post" />
        </TabsContent>

        <TabsContent value="mentions" className="space-y-4">
          <NotificationSection items={mentionNotifications} tab="mentions" />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <NotificationSection items={jobNotifications} tab="jobs" />

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Recommended Jobs
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/opportunities")}>
                  See all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {jobRecommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No job recommendations right now.</p>
              ) : (
                <div className="space-y-2">
                  {jobRecommendations.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => navigate(`/opportunities?id=${job.id}`)}
                      className="w-full text-left border rounded-md p-3 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{job.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.company_name}
                            {job.location ? ` • ${job.location}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">{job.type}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;
