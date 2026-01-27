import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { getDisplayName, getInitials } from "@/lib/nameUtils";
import { formatDistanceToNow } from "date-fns";
import { Check, X, Users } from "lucide-react";
import { Link } from "react-router-dom";
import laceupLogo from "@/assets/laceupLogo.png";

interface ConnectionRequest {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  requester?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    university: string | null;
    skills: string[] | null;
  };
}

interface PendingRequestsProps {
  embedded?: boolean;
}

export const PendingRequests = ({ embedded = false }: PendingRequestsProps) => {
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const { data: requestsData, error } = await supabase
        .from("connection_requests")
        .select("*")
        .eq("receiver_id", currentUserId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch requester profiles separately
      if (requestsData && requestsData.length > 0) {
        const requesterIds = requestsData.map(req => req.requester_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url, university, skills")
          .in("id", requesterIds);

        // Map profiles to requests
        const requestsWithProfiles = requestsData.map(req => ({
          ...req,
          requester: profilesData?.find(p => p.id === req.requester_id)
        }));

        setPendingRequests(requestsWithProfiles as ConnectionRequest[]);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      toast({
        title: "Error",
        description: "Failed to load pending requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUserId, toast]);

  useEffect(() => {
    if (currentUserId) {
      fetchPendingRequests();
    }
  }, [currentUserId, fetchPendingRequests]);

  const handleAccept = async (requestId: string, requesterId: string) => {
    try {
      setProcessingId(requestId);

      // Remove the request once accepted to avoid future duplicates
      const { error: deleteRequestError } = await supabase
        .from("connection_requests")
        .delete()
        .eq("id", requestId);

      if (deleteRequestError) throw deleteRequestError;

      // Create mutual connection
      const { error: conn1Error } = await supabase
        .from("connections")
        .insert({
          user_id: currentUserId,
          connected_user_id: requesterId,
        })
        .select()
        .single();

      if (conn1Error && conn1Error.code !== "23505") { // 23505 is unique constraint
        throw conn1Error;
      }

      const { error: conn2Error } = await supabase
        .from("connections")
        .insert({
          user_id: requesterId,
          connected_user_id: currentUserId,
        })
        .select()
        .single();

      if (conn2Error && conn2Error.code !== "23505") {
        throw conn2Error;
      }

      // Send notification to requester
      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", currentUserId)
        .single();

      if (currentUserProfile) {
        const userName = getDisplayName(
          currentUserProfile.first_name,
          currentUserProfile.last_name
        );

        // Create notification for accepted request
        await supabase
          .from("notifications")
          .insert({
            user_id: requesterId,
            type: "connection_accepted",
            title: "Connection Accepted",
            message: `${userName} accepted your connection request`,
            link: `/profile/${currentUserId}`,
            metadata: { accepterId: currentUserId, accepterName: userName },
          });
      }

      toast({
        title: "Request Accepted",
        description: "You are now connected with this user",
      });

      // Remove from pending list and refresh
      setPendingRequests((prev) =>
        prev.filter((req) => req.id !== requestId)
      );
    } catch (error) {
      console.error("Error accepting request:", error);
      toast({
        title: "Error",
        description: "Failed to accept connection request",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setProcessingId(requestId);

      // Delete the rejected request to clear the unique constraint
      const { error } = await supabase
        .from("connection_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "The connection request has been declined and removed.",
      });

      // Remove from pending list
      setPendingRequests((prev) =>
        prev.filter((req) => req.id !== requestId)
      );
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject connection request",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (!currentUserId) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LoadingSpinner fullPage text="Loading..." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LoadingSpinner fullPage text="Loading pending requests..." />
      </div>
    );
  }

  const wrapperClass = embedded
    ? "max-w-5xl mx-auto px-0 py-0"
    : "max-w-4xl mx-auto px-4 py-8 pt-24";

  const headerClass = embedded ? "mb-6" : "mb-8";

  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div className={headerClass}>
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-8 w-8 text-gold" />
          <h1 className="text-3xl font-bold">Connection Requests</h1>
        </div>
        <p className="text-muted-foreground">
          Manage pending connection requests from other users
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No pending requests</h2>
          <p className="text-muted-foreground mb-4">
            You don't have any pending connection requests at the moment
          </p>
          <Link to="/my-hub">
            <Button>Explore Users</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary Badge */}
          <div className="flex items-center gap-2 mb-6">
            <Badge variant="secondary" className="text-base px-3 py-1">
              {pendingRequests.length} pending request{
                pendingRequests.length !== 1 ? "s" : ""
              }
            </Badge>
          </div>

          {/* Requests List */}
          {pendingRequests.map((request) => (
            <Card
              key={request.id}
              className="p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Requester Avatar and Info */}
                <Link
                  to={`/profile/${request.requester_id}`}
                  className="flex items-start gap-4 flex-1 hover:opacity-75 transition-opacity"
                >
                  <Avatar className="h-16 w-16 flex-shrink-0">
                    <AvatarImage
                      src={request.requester?.avatar_url || undefined}
                      alt={getDisplayName(
                        request.requester?.first_name,
                        request.requester?.last_name
                      )}
                    />
                    <AvatarFallback className="p-0 overflow-hidden bg-gold">
                      {request.requester ? (
                        <span className="text-navy font-bold text-lg">
                          {getInitials(
                            request.requester?.first_name,
                            request.requester?.last_name
                          )}
                        </span>
                      ) : (
                        <img
                          src={laceupLogo}
                          alt="LaceUP logo"
                          className="h-full w-full object-contain"
                          draggable={false}
                        />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {getDisplayName(
                        request.requester?.first_name,
                        request.requester?.last_name,
                        "Unknown User"
                      )}
                    </h3>
                    {request.requester?.university && (
                      <p className="text-sm text-muted-foreground">
                        {request.requester.university}
                      </p>
                    )}
                    {request.requester?.skills && request.requester.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {request.requester.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {request.requester.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{request.requester.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </Link>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() =>
                      handleAccept(request.id, request.requester_id)
                    }
                    disabled={processingId === request.id}
                    size="sm"
                    className="flex-1 sm:flex-none bg-gold hover:bg-gold/90 text-navy"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
