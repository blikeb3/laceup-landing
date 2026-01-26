import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateLong } from "@/lib/dateFormat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageSquare, Network, CheckCircle, Briefcase, Plus, Pencil, Trash2, Upload, Link, Loader2, UserCog, UserCheck, UserX, BarChart3 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { getFullName } from "@/lib/nameUtils";
import { AdminFeedback } from "@/components/AdminFeedback";
import { AdminUsers } from "@/components/AdminUsers";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  university: string | null;
  sport: string | null;
  created_at: string;
  user_role?: string | null;
}

interface Analytics {
  totalUsers: number;
  totalMessages: number;
  totalConnections: number;
}

interface RoleChangeRequest {
  id: string;
  user_id: string;
  current_role: string;
  requested_role: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  content_type: string;
  is_active: boolean;
  is_featured?: boolean;
  created_at: string;
  click_count?: number;
  logo_url?: string | null;
}

const resourceSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z.string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  url: z.string()
    .trim()
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  category: z.string().min(1, "Category is required"),
  content_type: z.string().min(1, "Content type is required"),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>({
    title: "",
    description: "",
    url: "",
    category: "financial_literacy",
    content_type: "article",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ResourceFormData | 'file', string>>>({});
  const [inputType, setInputType] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    totalMessages: 0,
    totalConnections: 0,
  });
  const [roleChangeRequests, setRoleChangeRequests] = useState<RoleChangeRequest[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [selectedRoleChangeRequest, setSelectedRoleChangeRequest] = useState<RoleChangeRequest | null>(null);
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    const { data: allProfilesData } = await supabase
      .from("profiles")
      .select("*");

    setAllProfiles(allProfilesData || []);

    const { data: messages } = await supabase
      .from("messages")
      .select("id", { count: "exact" });

    const { data: connections } = await supabase
      .from("connections")
      .select("id", { count: "exact" });

    // Fetch new feedback count
    const { data: newFeedback } = await supabase
      .from("feedback")
      .select("id", { count: "exact" })
      .eq("status", "NEW");

    setNewFeedbackCount(newFeedback?.length || 0);

    setAnalytics({
      totalUsers: allProfilesData?.length || 0,
      totalMessages: messages?.length || 0,
      totalConnections: connections?.length || 0,
    });
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const { data: resourcesData, error: resourcesError } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (resourcesError) throw resourcesError;

      // Fetch click counts for each resource
      const { data: clicksData } = await supabase
        .from("resource_clicks")
        .select("resource_id");

      const clickCounts = clicksData?.reduce((acc, click) => {
        acc[click.resource_id] = (acc[click.resource_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const resourcesWithClicks = (resourcesData || []).map(resource => ({
        ...resource,
        click_count: clickCounts[resource.id] || 0,
      }));

      setResources(resourcesWithClicks);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast({
        title: "Error",
        description: "Failed to load resources",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchRoleChangeRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("role_change_requests")
        .select(`
          *,
          profiles!role_change_requests_user_id_fkey(first_name, last_name, email)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRoleChangeRequests((data as RoleChangeRequest[]) || []);
    } catch (error) {
      console.error("Error fetching role change requests:", error);
      toast({
        title: "Error",
        description: "Failed to load role change requests",
        variant: "destructive",
      });
    }
  }, [toast]);

  const checkAdminAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/home");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (roleError || !roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate("/home");
        return;
      }

      setIsAdmin(true);
      fetchDashboardData();
      fetchResources();
      fetchRoleChangeRequests();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/home");
    } finally {
      setLoading(false);
    }
  }, [navigate, toast, fetchResources, fetchDashboardData, fetchRoleChangeRequests]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const validateForm = (data: ResourceFormData, file: File | null, type: 'url' | 'file'): boolean => {
    try {
      resourceSchema.parse(data);
      const errors: Partial<Record<keyof ResourceFormData | 'file', string>> = {};

      // Validate URL or file is provided
      if (type === 'url') {
        if (!data.url || data.url.trim() === '') {
          errors.url = "URL is required";
        } else {
          try {
            new URL(data.url);
          } catch {
            errors.url = "Must be a valid URL";
          }
        }
      } else {
        if (!file && !editingResource?.url) {
          errors.file = "Please select a file to upload";
        }
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return false;
      }

      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof ResourceFormData | 'file', string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as keyof ResourceFormData] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSaveResource = async () => {
    if (!validateForm(formData, selectedFile, inputType)) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let finalUrl = formData.url || '';
      let logoUrl: string | null = null;

      // Upload file if selected
      if (inputType === 'file' && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `resources/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resource-files')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('resource-files')
          .getPublicUrl(filePath);

        finalUrl = urlData.publicUrl;
      }

      // Upload logo if selected
      if (selectedLogoFile) {
        const logoExt = selectedLogoFile.name.split('.').pop();
        const logoFileName = `logos/${Date.now()}-${Math.random().toString(36).substring(2)}.${logoExt}`;

        const { error: logoUploadError } = await supabase.storage
          .from('resource-files')
          .upload(logoFileName, selectedLogoFile);

        if (logoUploadError) throw logoUploadError;

        const { data: logoUrlData } = supabase.storage
          .from('resource-files')
          .getPublicUrl(logoFileName);

        logoUrl = logoUrlData.publicUrl;
      }

      if (editingResource) {
        const { error } = await supabase
          .from("resources")
          .update({
            title: formData.title,
            description: formData.description,
            url: finalUrl || editingResource.url,
            category: formData.category,
            content_type: formData.content_type,
            ...(logoUrl && { logo_url: logoUrl }),
          })
          .eq("id", editingResource.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Resource updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("resources")
          .insert({
            title: formData.title,
            description: formData.description,
            url: finalUrl,
            category: formData.category,
            content_type: formData.content_type,
            created_by: user.id,
            ...(logoUrl && { logo_url: logoUrl }),
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Resource created successfully",
        });
      }

      setIsResourceDialogOpen(false);
      resetForm();
      fetchResources();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save resource",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", resourceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resource deleted successfully",
      });

      fetchResources();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete resource",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (resourceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("resources")
        .update({ is_active: !currentStatus })
        .eq("id", resourceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Resource ${!currentStatus ? "activated" : "deactivated"}`,
      });

      fetchResources();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update resource",
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (resourceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("resources")
        .update({ is_featured: !currentStatus })
        .eq("id", resourceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Resource ${!currentStatus ? "featured" : "unfeatured"}`,
      });

      fetchResources();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update resource",
        variant: "destructive",
      });
    }
  };

  const handleRoleChangeDecision = async (requestId: string, decision: 'approved' | 'rejected', userId: string, requestedRole: string) => {
    setProcessingRequestId(requestId);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not authenticated");

      // Update the request status using a database function
      // This function handles the RLS policy and role updates
      const { data, error: updateError } = await supabase.rpc('approve_role_change_request', {
        p_request_id: requestId,
        p_admin_id: adminUser.id,
        p_decision: decision
      });

      if (updateError) throw updateError;

      if (data && data[0] && !data[0].success) {
        throw new Error(data[0].message);
      }

      // The function handles the role update if approved, so we don't need to call assign_user_role
      // separately. The following code is kept for reference but is now handled by the function.

      toast({
        title: decision === 'approved' ? "Request Approved" : "Request Denied",
        description: decision === 'approved'
          ? "The user's role has been updated successfully"
          : "The role change request has been denied",
      });

      fetchRoleChangeRequests();
    } catch (error) {
      console.error("Error processing role change request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description,
      url: resource.url,
      category: resource.category,
      content_type: resource.content_type,
    });
    setFormErrors({});
    setIsResourceDialogOpen(true);
  };

  const resetForm = () => {
    setEditingResource(null);
    setFormData({
      title: "",
      description: "",
      url: "",
      category: "financial_literacy",
      content_type: "article",
    });
    setFormErrors({});
    setInputType('url');
    setSelectedFile(null);
    setSelectedLogoFile(null);
  };

  const getCategoryLabel = (category: string) => {
    return category.split("_").map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  // Sanitize resource content to prevent XSS if admin account is compromised
  const sanitizeResourceText = (text: string): string => {
    // Remove any potentially dangerous HTML tags and attributes
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [], // No HTML tags allowed in titles/descriptions
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true, // Keep text content
    }).trim();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage users, resources, and monitor platform activity</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalConnections}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="role-changes" className="space-y-6">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          <TabsTrigger value="role-changes" className="flex-1 sm:flex-none">
            <UserCog className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Role Changes</span>
            <span className="sm:hidden">Roles</span>
            {roleChangeRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {roleChangeRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="user-badges" className="flex-1 sm:flex-none">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">User Badges</span>
            <span className="sm:hidden">Badges</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex-1 sm:flex-none">
            <Briefcase className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">LaceHub Resources</span>
            <span className="sm:hidden">Resources</span>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex-1 sm:flex-none">
            <MessageSquare className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">User Feedback</span>
            <span className="sm:hidden">Feedback</span>
            {newFeedbackCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {newFeedbackCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="role-changes">
          <Card>
            <CardHeader>
              <CardTitle>Pending Role Change Requests</CardTitle>
              <CardDescription>Review and approve user role change requests</CardDescription>
            </CardHeader>
            <CardContent>
              {roleChangeRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending role change requests</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Current Role</TableHead>
                        <TableHead>Requested Role</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roleChangeRequests.map((request) => (
                        <TableRow
                          key={request.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedRoleChangeRequest(request);
                            setRoleChangeDialogOpen(true);
                          }}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {getFullName(request.profiles?.first_name, request.profiles?.last_name) || "—"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {request.profiles?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {request.current_role.charAt(0).toUpperCase() + request.current_role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={request.requested_role === 'employer' ? 'default' : request.requested_role === 'mentor' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {request.requested_role.charAt(0).toUpperCase() + request.requested_role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="text-sm whitespace-pre-wrap line-clamp-3">
                              {request.reason}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateLong(request.created_at)}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRoleChangeDecision(request.id, 'approved', request.user_id, request.requested_role);
                              }}
                              disabled={processingRequestId === request.id}
                            >
                              {processingRequestId === request.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <UserCheck className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRoleChangeDecision(request.id, 'rejected', request.user_id, request.requested_role);
                              }}
                              disabled={processingRequestId === request.id}
                            >
                              {processingRequestId === request.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <UserX className="h-4 w-4 mr-1" />
                              )}
                              Deny
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>LaceHub Resources</CardTitle>
                  <CardDescription>Manage educational resources and track engagement</CardDescription>
                </div>
                <Dialog open={isResourceDialogOpen} onOpenChange={(open) => {
                  setIsResourceDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Resource
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingResource ? "Edit Resource" : "Create New Resource"}</DialogTitle>
                      <DialogDescription>
                        {editingResource ? "Update resource details" : "Add a new educational resource to LaceHub"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g., Building Your Personal Brand"
                        />
                        {formErrors.title && (
                          <p className="text-sm text-destructive">{formErrors.title}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Brief description of what this resource covers..."
                          rows={3}
                        />
                        {formErrors.description && (
                          <p className="text-sm text-destructive">{formErrors.description}</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label>Resource Source *</Label>
                        <RadioGroup
                          value={inputType}
                          onValueChange={(value: 'url' | 'file') => {
                            setInputType(value);
                            setFormErrors({});
                          }}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="url" id="input-url" />
                            <Label htmlFor="input-url" className="flex items-center gap-1 cursor-pointer">
                              <Link className="h-4 w-4" />
                              URL
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="file" id="input-file" />
                            <Label htmlFor="input-file" className="flex items-center gap-1 cursor-pointer">
                              <Upload className="h-4 w-4" />
                              File Upload
                            </Label>
                          </div>
                        </RadioGroup>

                        {inputType === 'url' ? (
                          <div className="space-y-2">
                            <Input
                              id="url"
                              type="url"
                              value={formData.url}
                              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                              placeholder="https://example.com/resource"
                            />
                            {formErrors.url && (
                              <p className="text-sm text-destructive">{formErrors.url}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                id="file"
                                type="file"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.mp3,.jpg,.jpeg,.png,.gif,.webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setSelectedFile(file);
                                    setFormErrors({});
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </div>
                            {selectedFile && (
                              <p className="text-sm text-muted-foreground">
                                Selected: {selectedFile.name}
                              </p>
                            )}
                            {editingResource && !selectedFile && (
                              <p className="text-sm text-muted-foreground">
                                Current: {editingResource.url.split('/').pop()}
                              </p>
                            )}
                            {formErrors.file && (
                              <p className="text-sm text-destructive">{formErrors.file}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logo">Logo Image (Optional)</Label>
                        <p className="text-sm text-muted-foreground">
                          Upload a logo or thumbnail image to display on the resource card
                        </p>
                        <Input
                          id="logo"
                          type="file"
                          accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedLogoFile(file);
                            }
                          }}
                          className="cursor-pointer"
                        />
                        {selectedLogoFile && (
                          <div className="flex items-center gap-2">
                            <img
                              src={URL.createObjectURL(selectedLogoFile)}
                              alt="Logo preview"
                              className="h-12 w-12 object-contain rounded border"
                            />
                            <p className="text-sm text-muted-foreground">
                              {selectedLogoFile.name}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLogoFile(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                        {editingResource?.logo_url && !selectedLogoFile && (
                          <div className="flex items-center gap-2">
                            <img
                              src={editingResource.logo_url}
                              alt="Current logo"
                              className="h-12 w-12 object-contain rounded border"
                            />
                            <p className="text-sm text-muted-foreground">Current logo</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category *</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="academic">Academic</SelectItem>
                              <SelectItem value="financial_literacy">Financial Literacy</SelectItem>
                              <SelectItem value="personal_branding">Personal Branding</SelectItem>
                              <SelectItem value="career">Career</SelectItem>
                              <SelectItem value="networking">Networking</SelectItem>
                              <SelectItem value="resume_building">Resume Building</SelectItem>
                              <SelectItem value="interview_prep">Interview Prep</SelectItem>
                            </SelectContent>
                          </Select>
                          {formErrors.category && (
                            <p className="text-sm text-destructive">{formErrors.category}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="content_type">Content Type *</Label>
                          <Select
                            value={formData.content_type}
                            onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="article">Article</SelectItem>
                              <SelectItem value="service">Service</SelectItem>
                              <SelectItem value="content">Content</SelectItem>
                            </SelectContent>
                          </Select>
                          {formErrors.content_type && (
                            <p className="text-sm text-destructive">{formErrors.content_type}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setIsResourceDialogOpen(false);
                        resetForm();
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveResource} disabled={isUploading}>
                        {isUploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {editingResource ? "Update" : "Create"} Resource
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {resources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No resources yet. Create your first one!</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">
                          <BarChart3 className="h-4 w-4 inline mr-1" />
                          Clicks
                        </TableHead>
                        <TableHead className="text-center">Featured</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resources.map((resource) => (
                        <TableRow key={resource.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sanitizeResourceText(resource.title)}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {sanitizeResourceText(resource.description)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getCategoryLabel(resource.category)}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {resource.content_type.replace("_", " ")}
                          </TableCell>
                          <TableCell>
                            <Badge className={resource.is_active ? "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer" : "bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer"}>
                              {resource.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {resource.click_count}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={resource.is_featured ? "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer" : "bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer"}>
                              {resource.is_featured ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant={resource.is_featured ? "default" : "outline"}
                              onClick={() => handleToggleFeatured(resource.id, resource.is_featured || false)}
                              className={resource.is_featured ? "bg-amber-500 hover:bg-amber-600" : ""}
                            >
                              {resource.is_featured ? "⭐ Featured" : "Feature"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleActive(resource.id, resource.is_active)}
                            >
                              {resource.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(resource)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteResource(resource.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-badges">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="feedback">
          <AdminFeedback onFeedbackStatusChanged={fetchDashboardData} />
        </TabsContent>
      </Tabs>

      {/* Role Change Request Details Dialog */}
      {selectedRoleChangeRequest && (
        <Dialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Role Change Request Details</DialogTitle>
              <DialogDescription>
                Review and manage this user's role change request
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">User Name</label>
                <p className="text-base mt-1">
                  {getFullName(selectedRoleChangeRequest.profiles?.first_name, selectedRoleChangeRequest.profiles?.last_name) || "—"}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">Contact Email</label>
                <p className="text-base mt-1">{selectedRoleChangeRequest.profiles?.email || "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Current Role</label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedRoleChangeRequest.current_role.charAt(0).toUpperCase() + selectedRoleChangeRequest.current_role.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Requested Role</label>
                  <div className="mt-1">
                    <Badge
                      variant={selectedRoleChangeRequest.requested_role === 'employer' ? 'default' : selectedRoleChangeRequest.requested_role === 'mentor' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {selectedRoleChangeRequest.requested_role.charAt(0).toUpperCase() + selectedRoleChangeRequest.requested_role.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">Submitted</label>
                <p className="text-base mt-1">
                  {formatDateLong(selectedRoleChangeRequest.created_at)}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">Reason for Request</label>
                <div className="border rounded-lg p-4 mt-1 bg-secondary/50 whitespace-pre-wrap break-words">
                  {selectedRoleChangeRequest.reason}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setRoleChangeDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    handleRoleChangeDecision(selectedRoleChangeRequest.id, 'approved', selectedRoleChangeRequest.user_id, selectedRoleChangeRequest.requested_role);
                    setRoleChangeDialogOpen(false);
                  }}
                  disabled={processingRequestId === selectedRoleChangeRequest.id}
                >
                  {processingRequestId === selectedRoleChangeRequest.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4 mr-2" />
                  )}
                  Approve Request
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleRoleChangeDecision(selectedRoleChangeRequest.id, 'rejected', selectedRoleChangeRequest.user_id, selectedRoleChangeRequest.requested_role);
                    setRoleChangeDialogOpen(false);
                  }}
                  disabled={processingRequestId === selectedRoleChangeRequest.id}
                >
                  {processingRequestId === selectedRoleChangeRequest.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserX className="h-4 w-4 mr-2" />
                  )}
                  Deny Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Admin;
