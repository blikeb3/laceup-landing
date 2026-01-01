import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, CheckCircle, Circle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type FeedbackStatus = Database["public"]["Enums"]["feedback_status"];

interface Feedback {
  id: string;
  user_id: string;
  message: string;
  context_url: string;
  created_at: string;
  status: FeedbackStatus;
  user_email?: string;
  user_name?: string;
}

interface AdminFeedbackProps {
  onFeedbackStatusChanged?: () => void;
}

const STATUS_CONFIG = {
  NEW: {
    label: "New",
    color: "bg-blue-100 text-blue-800",
    icon: Circle,
    next: "REVIEWED" as const,
  },
  REVIEWED: {
    label: "Reviewed",
    color: "bg-yellow-100 text-yellow-800",
    icon: CheckCircle,
    next: "RESOLVED" as const,
  },
  RESOLVED: {
    label: "Resolved",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
    next: null,
  },
};

export const AdminFeedback = ({ onFeedbackStatusChanged }: AdminFeedbackProps) => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<FeedbackStatus[]>([
    "NEW",
  ]);
  const [filteredFeedback, setFilteredFeedback] = useState<Feedback[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user info for each feedback
      const feedbackWithUserInfo = await Promise.all(
        (data || []).map(async (feedback) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, first_name, last_name")
            .eq("id", feedback.user_id)
            .single();

          return {
            ...feedback,
            user_email: profile?.email,
            user_name: profile
              ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
              : "Unknown",
          };
        })
      );

      setFeedbackList(feedbackWithUserInfo);
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: FeedbackStatus) => {
    try {
      setUpdatingId(feedbackId);
      const { error } = await supabase
        .from("feedback")
        .update({ status: newStatus })
        .eq("id", feedbackId);

      if (error) throw error;

      // Update local state
      setFeedbackList((prev) =>
        prev.map((fb) =>
          fb.id === feedbackId ? { ...fb, status: newStatus } : fb
        )
      );

      // Update selected feedback if dialog is open
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback({ ...selectedFeedback, status: newStatus });
      }

      // Notify parent component about status change
      onFeedbackStatusChanged?.();

      toast({
        title: "Success",
        description: `Feedback marked as ${STATUS_CONFIG[newStatus].label}`,
      });
    } catch (error) {
      console.error("Error updating feedback status:", error);
      toast({
        title: "Error",
        description: "Failed to update feedback status",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleStatus = (status: FeedbackStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  useEffect(() => {
    const filtered = feedbackList.filter(
      (feedback) =>
        (feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feedback.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feedback.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feedback.context_url.toLowerCase().includes(searchTerm.toLowerCase())) &&
        selectedStatuses.includes(feedback.status)
    );

    setFilteredFeedback(filtered);
  }, [searchTerm, feedbackList, selectedStatuses]);

  const statusCounts = {
    NEW: feedbackList.filter((fb) => fb.status === "NEW").length,
    REVIEWED: feedbackList.filter((fb) => fb.status === "REVIEWED").length,
    RESOLVED: feedbackList.filter((fb) => fb.status === "RESOLVED").length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          User Feedback
        </CardTitle>
        <CardDescription>
          Manage and track user feedback across all pages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Input
            placeholder="Search feedback by message, contact email, user name, or URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />

          <div className="flex flex-wrap gap-2 ml-auto">
            {(["NEW", "REVIEWED", "RESOLVED"] as FeedbackStatus[]).map((status) => (
              <Button
                key={status}
                variant={selectedStatuses.includes(status) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(status)}
                className={
                  selectedStatuses.includes(status)
                    ? ""
                    : "opacity-60 hover:opacity-100"
                }
              >
                <Circle className="h-3 w-3 mr-2 fill-current" />
                {STATUS_CONFIG[status].label} ({statusCounts[status]})
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? "No feedback matches your search"
              : "No feedback with selected status"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Page URL</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.map((feedback) => {
                  const config = STATUS_CONFIG[feedback.status];
                  const StatusIcon = config.icon;
                  return (
                    <TableRow 
                      key={feedback.id}
                      onClick={() => {
                        setSelectedFeedback(feedback);
                        setFeedbackDialogOpen(true);
                      }}
                      className="cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        {feedback.user_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {feedback.user_email}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-sm">{feedback.message}</div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <a
                          href={feedback.context_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-blue-600 hover:underline truncate block"
                        >
                          {feedback.context_url}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(feedback.created_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${config.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </div>
                          {config.next && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(feedback.id, config.next!);
                              }}
                              disabled={updatingId === feedback.id}
                              className="text-xs h-7 px-2"
                            >
                              {updatingId === feedback.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "→"
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {selectedFeedback && (
        <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Feedback Details</DialogTitle>
              <DialogDescription>
                View and manage this user feedback
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">User Name</label>
                <p className="text-base mt-1">{selectedFeedback.user_name}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">Contact Email</label>
                <p className="text-base mt-1">{selectedFeedback.user_email}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">Page URL</label>
                <a
                  href={selectedFeedback.context_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-blue-600 hover:underline mt-1 block break-all"
                >
                  {selectedFeedback.context_url}
                </a>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">Submitted</label>
                <p className="text-base mt-1">
                  {formatDistanceToNow(new Date(selectedFeedback.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={STATUS_CONFIG[selectedFeedback.status].color}>
                    {STATUS_CONFIG[selectedFeedback.status].label}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">Message</label>
                <div className="border rounded-lg p-4 mt-1 bg-secondary/50 whitespace-pre-wrap break-words">
                  {selectedFeedback.message}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setFeedbackDialogOpen(false)}
                >
                  Close
                </Button>
                {STATUS_CONFIG[selectedFeedback.status].next && (
                  <Button
                    onClick={() => {
                      handleStatusChange(
                        selectedFeedback.id,
                        STATUS_CONFIG[selectedFeedback.status].next!
                      );
                    }}
                    disabled={updatingId === selectedFeedback.id}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updatingId === selectedFeedback.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Mark as {STATUS_CONFIG[STATUS_CONFIG[selectedFeedback.status].next!].label}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
