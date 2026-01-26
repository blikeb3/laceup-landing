import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Briefcase, MapPin, Clock, DollarSign, Calendar, Plus, Filter, Building2, Users, GraduationCap, Heart, Send, Edit, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { fetchUserRoles, fetchMultipleUserRoles } from "@/lib/roleUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FlattenedUserBadge } from "@/types/posts";

interface Opportunity {
  id: string;
  type: string;
  title: string;
  company_name: string;
  location: string | null;
  location_type: string | null;
  employment_level: string | null;
  career_interest: string | null;
  description: string;
  requirements: string[] | null;
  compensation: string | null;
  mentorship_slots: number | null;
  application_deadline: string | null;
  created_at: string;
  posted_by: string;
  posted_by_name?: string | null;
  posted_by_role?: string | null;
  posted_by_is_admin?: boolean;
  user_badges?: FlattenedUserBadge[];
}

interface Application {
  opportunity_id: string;
  applicant_id?: string;
  cover_letter?: string;
  created_at?: string;
  opportunity?: Opportunity | null;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
    resume_url?: string;
  };
}

const Opportunities = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [myPostedOpportunities, setMyPostedOpportunities] = useState<Opportunity[]>([]);
  const [applicantsByOpportunity, setApplicantsByOpportunity] = useState<Record<string, Application[]>>({});

  // Fetch applicants for an opportunity (for creator)
  const fetchApplicantsForOpportunity = async (opportunityId: string) => {
    // First, fetch applications
    const { data: applications, error: appError } = await supabase
      .from("opportunity_applications")
      .select("*")
      .eq("opportunity_id", opportunityId);

    if (appError || !applications || applications.length === 0) {
      setApplicantsByOpportunity((prev) => ({ ...prev, [opportunityId]: [] }));
      return;
    }

    // Then fetch profile data for all applicants
    const applicantIds = applications.map((app) => app.applicant_id);
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, avatar_url, resume_url")
      .in("id", applicantIds);

    if (profileError) {
      console.error("Error fetching applicant profiles:", profileError);
      setApplicantsByOpportunity((prev) => ({ ...prev, [opportunityId]: [] }));
      return;
    }

    // Create a map of profiles by ID
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Combine applications with profile data
    const validApplicants: Application[] = applications.map((app) => {
      const profile = profileMap.get(app.applicant_id);
      const firstName = profile?.first_name || "";
      const lastName = profile?.last_name || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;
      return {
        opportunity_id: app.opportunity_id,
        applicant_id: app.applicant_id,
        cover_letter: app.cover_letter,
        created_at: app.created_at,
        user: profile ? {
          id: profile.id,
          full_name: fullName,
          email: profile.email,
          avatar_url: profile.avatar_url,
          resume_url: profile.resume_url,
        } : undefined,
      };
    });

    setApplicantsByOpportunity((prev) => ({ ...prev, [opportunityId]: validApplicants }));
  };

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [careerFilter, setCareerFilter] = useState<string>("");
  
  // Infinite scroll state
  const [hasOpportunitiesMore, setHasOpportunitiesMore] = useState(true);
  const [loadingOpportunitiesMore, setLoadingOpportunitiesMore] = useState(false);
  const loadingOpportunitiesRef = useRef(false);
  const opportunitiesLoadMoreRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 12;
  
  const [formData, setFormData] = useState({
    type: "job",
    title: "",
    company_name: "",
    location: "",
    location_type: "on-site",
    employment_level: "full-time",
    career_interest: "",
    description: "",
    requirements: "",
    compensation: "",
    mentorship_slots: "",
    application_deadline: "",
  });
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [viewingDetailsId, setViewingDetailsId] = useState<string | null>(null);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const { toast } = useToast();

  const formatDate = (value?: string | null) => {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  // Store user's resumeUrl from profile
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  // For uploading resume if user has none
  const {
    selectedFile: resumeFile,
    uploading: resumeUploading,
    fileInputRef: resumeInputRef,
    handleFileSelect: handleResumeSelect,
    uploadFile: uploadResumeFile,
    clearFileSelection: clearResumeSelection,
  } = useFileUpload();

  // Fetch resumeUrl from profile on mount
  useEffect(() => {
    const fetchResumeUrl = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("resume_url")
        .eq("id", user.id)
        .single();
      setResumeUrl(profile?.resume_url ?? null);
    };
    fetchResumeUrl();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...opportunities];

    if (selectedType !== "all") {
      filtered = filtered.filter((opp) => opp.type === selectedType);
    }

    if (locationFilter) {
      filtered = filtered.filter((opp) =>
        opp.location?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        opp.location_type?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter((opp) => opp.employment_level === levelFilter);
    }

    if (careerFilter) {
      filtered = filtered.filter((opp) =>
        opp.career_interest?.toLowerCase().includes(careerFilter.toLowerCase()) ||
        opp.title.toLowerCase().includes(careerFilter.toLowerCase())
      );
    }

    setFilteredOpportunities(filtered);
  }, [opportunities, selectedType, locationFilter, levelFilter, careerFilter]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const fetchOpportunities = useCallback(async (reset: boolean = true) => {
    if (!reset && loadingOpportunitiesRef.current) return;
    
    try {
      if (!reset) {
        loadingOpportunitiesRef.current = true;
        setLoadingOpportunitiesMore(true);
      }
      
      const from = reset ? 0 : opportunities.length;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!error && data) {
      // Get all unique user IDs who posted opportunities
      const posterIds = [...new Set(data.map((opp: Record<string, unknown>) => opp.posted_by as string))];

      // Fetch profiles for all posters
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", posterIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch roles for all posters
      const rolesMap = await fetchMultipleUserRoles(posterIds);

      // Fetch badges for all posters
      const { data: userBadgesData } = await supabase
        .from("user_badges")
        .select("user_id, badge_id, badges(id, name, description, image_url, icon)")
        .in("user_id", posterIds);

      const badgesMap = new Map<string, FlattenedUserBadge[]>();
      if (userBadgesData) {
        userBadgesData.forEach((ub: Record<string, unknown>) => {
          const userId = ub.user_id as string;
          const badge = ub.badges as Record<string, unknown>;
          if (badge) {
            if (!badgesMap.has(userId)) {
              badgesMap.set(userId, []);
            }
            badgesMap.get(userId)!.push({
              id: badge.id as string,
              name: badge.name as string,
              description: (badge.description as string) || undefined,
              image_url: (badge.image_url as string) || undefined,
              icon: (badge.icon as string) || undefined,
            });
          }
        });
      }

      // Transform data to include posted_by_name and posted_by_role
      const transformedData: Opportunity[] = data.map((opp: Record<string, unknown>) => {
        const profile = profilesMap.get(opp.posted_by as string);
        const userRoles = rolesMap.get(opp.posted_by as string) || { baseRole: null, hasAdminRole: false };

        return {
          ...opp,
          posted_by_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null,
          posted_by_role: userRoles.baseRole,
          posted_by_is_admin: userRoles.hasAdminRole,
          user_badges: badgesMap.get(opp.posted_by as string) || [],
        } as Opportunity;
      });
      
      if (reset) {
        setOpportunities(transformedData);
      } else {
        setOpportunities(prev => [...prev, ...transformedData]);
      }
      
      setHasOpportunitiesMore(data.length === PAGE_SIZE);
    }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    } finally {
      setLoading(false);
      if (!reset) {
        loadingOpportunitiesRef.current = false;
        setLoadingOpportunitiesMore(false);
      }
    }
  }, [opportunities.length]);

  const fetchMyApplications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("opportunity_applications")
      .select(`
        opportunity_id,
        created_at,
        opportunity:opportunity_id (
          id,
          type,
          title,
          company_name,
          location,
          location_type,
          employment_level,
          career_interest,
          description,
          compensation,
          mentorship_slots,
          application_deadline,
          created_at,
          posted_by
        )
      `)
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMyApplications(data as unknown as Application[]);
    }
  };

  const fetchMyPostedOpportunities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("posted_by", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMyPostedOpportunities(data);
    }
  };

  const fetchCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCurrentUserRole(null);
      return;
    }

    const { baseRole } = await fetchUserRoles(user.id);
    setCurrentUserRole(baseRole);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      await fetchCurrentUserRole();
      await fetchOpportunities();
      await fetchMyApplications();
      await fetchMyPostedOpportunities();
    };
    init();
  }, []);

  const handlePostOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!canPostOpportunity) {
      toast({
        title: "Not allowed",
        description: "Only mentors, employers, and admins can post opportunities.",
        variant: "destructive",
      });
      return;
    }

    const requirements = formData.requirements
      .split("\n")
      .filter((req) => req.trim() !== "");

    let error = null;
    if (editingOpportunityId) {
      const { error: updateError } = await supabase
        .from("opportunities")
        .update({
          type: formData.type,
          title: formData.title,
          company_name: formData.company_name,
          location: formData.location || null,
          location_type: formData.location_type,
          employment_level: formData.employment_level,
          career_interest: formData.career_interest || null,
          description: formData.description,
          requirements: requirements.length > 0 ? requirements : null,
          compensation: formData.compensation || null,
          mentorship_slots: formData.mentorship_slots ? parseInt(formData.mentorship_slots) : null,
          application_deadline: formData.application_deadline || null,
        })
        .eq("id", editingOpportunityId);

      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("opportunities").insert({
        posted_by: user.id,
        type: formData.type,
        title: formData.title,
        company_name: formData.company_name,
        location: formData.location || null,
        location_type: formData.location_type,
        employment_level: formData.employment_level,
        career_interest: formData.career_interest || null,
        description: formData.description,
        requirements: requirements.length > 0 ? requirements : null,
        compensation: formData.compensation || null,
        mentorship_slots: formData.mentorship_slots ? parseInt(formData.mentorship_slots) : null,
        application_deadline: formData.application_deadline || null,
      });

      error = insertError;
    }

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post opportunity.",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success!", description: "Opportunity posted successfully." });

    setShowPostDialog(false);
    setFormData({
      type: "job",
      title: "",
      company_name: "",
      location: "",
      location_type: "on-site",
      employment_level: "full-time",
      career_interest: "",
      description: "",
      requirements: "",
      compensation: "",
      mentorship_slots: "",
      application_deadline: "",
    });
    setEditingOpportunityId(null);
    fetchOpportunities();
  };

  const handleDeleteOpportunity = async (opportunityId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this opportunity?");
    if (!confirmDelete) return;

    if (!currentUserId) {
      toast({ title: "Error", description: "You must be logged in to delete opportunities.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", opportunityId);

    if (error) {
      console.error("Delete opportunity error:", error);
      toast({ title: "Error", description: "Failed to delete opportunity.", variant: "destructive" });
      return;
    }

    toast({ title: "Deleted", description: "Opportunity removed." });
    fetchOpportunities();
    fetchMyPostedOpportunities();
  };

  const handleEditOpportunity = (opportunity: Opportunity) => {
    setFormData({
      type: opportunity.type,
      title: opportunity.title,
      company_name: opportunity.company_name,
      location: opportunity.location || "",
      location_type: opportunity.location_type || "on-site",
      employment_level: opportunity.employment_level || "full-time",
      career_interest: opportunity.career_interest || "",
      description: opportunity.description,
      requirements: opportunity.requirements ? opportunity.requirements.join("\n") : "",
      compensation: opportunity.compensation || "",
      mentorship_slots: opportunity.mentorship_slots ? String(opportunity.mentorship_slots) : "",
      application_deadline: opportunity.application_deadline || "",
    });
    setEditingOpportunityId(opportunity.id);
    setShowPostDialog(true);
  };

  const handleApply = async (opportunityId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to apply.",
        variant: "destructive",
      });
      return;
    }

    if (!canApplyToOpportunity) {
      toast({
        title: "Not allowed",
        description: "Only athletes and admins can apply to opportunities.",
        variant: "destructive",
      });
      setApplyingTo(null);
      return;
    }

    let finalResumeUrl = resumeUrl;
    if (!resumeUrl && resumeFile) {
      const uploaded = await uploadResumeFile(user.id);
      if (uploaded && uploaded.url) {
        finalResumeUrl = uploaded.url;
        await supabase.from("profiles").update({ resume_url: finalResumeUrl }).eq("id", user.id);
        setResumeUrl(finalResumeUrl);
        clearResumeSelection();
      }
    }

    const { error } = await supabase.from("opportunity_applications").insert({
      opportunity_id: opportunityId,
      applicant_id: user.id,
      cover_letter: coverLetter || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message.includes("duplicate") ? "You've already applied to this opportunity." : "Failed to apply.",
        variant: "destructive",
      });
      setApplyingTo(null);
      setCoverLetter("");
      return;
    }

    // Send email notification to job poster (fire and forget - don't block on this)
    supabase.functions.invoke('notify-job-application', {
      body: {
        opportunityId,
        applicantId: user.id,
      },
    }).then(({ error: notifyError }) => {
      if (notifyError) {
        console.error('Failed to send application notification email:', notifyError);
      }
    });

    toast({ title: "Success!", description: "Your application has been submitted." });
    setApplyingTo(null);
    setCoverLetter("");
    fetchMyApplications();
  };
  const hasApplied = (opportunityId: string) => {
    return myApplications.some((app) => app.opportunity_id === opportunityId);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "job":
        return <Briefcase className="h-5 w-5" />;
      case "internship":
        return <GraduationCap className="h-5 w-5" />;
      case "mentorship":
        return <Users className="h-5 w-5" />;
      default:
        return <Briefcase className="h-5 w-5" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "job":
        return "default";
      case "internship":
        return "secondary";
      case "mentorship":
        return "outline";
      default:
        return "default";
    }
  };

  const canPostOpportunity = currentUserRole === "mentor" || currentUserRole === "employer" || currentUserRole === "admin";
  const canApplyToOpportunity = currentUserRole === "athlete" || currentUserRole === "admin";

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasOpportunitiesMore && !loadingOpportunitiesMore) {
          fetchOpportunities(false);
        }
      },
      { threshold: 0.1 }
    );

    if (opportunitiesLoadMoreRef.current) {
      observer.observe(opportunitiesLoadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasOpportunitiesMore, loadingOpportunitiesMore, fetchOpportunities]);

  if (loading) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LoadingSpinner fullPage text="Loading opportunities..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-heading font-bold text-foreground mb-2">
              Opportunities Board
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Find mentorships, internships, and career opportunities tailored for athletes
            </p>
          </div>
          {canPostOpportunity ? (
            <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gold hover:bg-gold/90 text-navy">
                  <Plus className="h-4 w-4 mr-2" />
                  Post Opportunity
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border">
                <DialogHeader>
                  <DialogTitle>Post an Opportunity</DialogTitle>
                  <DialogDescription>
                    Share a job, internship, or mentorship opportunity with athletes
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePostOpportunity} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Opportunity Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="job">Job</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="mentorship">Mentorship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title <span style={{ color: "red" }}>*</span></Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Marketing Intern"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company/Organization <span style={{ color: "red" }}>*</span></Label>
                      <Input
                        id="company"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="e.g., Nike"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., New York, NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location Type</Label>
                      <Select
                        value={formData.location_type}
                        onValueChange={(value) => setFormData({ ...formData, location_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="on-site">On-site</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Employment Level</Label>
                      <Select
                        value={formData.employment_level}
                        onValueChange={(value) => setFormData({ ...formData, employment_level: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="internship">Internship</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="mentorship">Mentorship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="career">Career Interest</Label>
                      <Input
                        id="career"
                        value={formData.career_interest}
                        onChange={(e) => setFormData({ ...formData, career_interest: e.target.value })}
                        placeholder="e.g., Sports Marketing"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description <span style={{ color: "red" }}>*</span></Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the opportunity..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements (one per line)</Label>
                    <Textarea
                      id="requirements"
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      placeholder="Bachelor's degree&#10;2+ years experience&#10;Strong communication skills"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="compensation">Compensation</Label>
                      <Input
                        id="compensation"
                        value={formData.compensation}
                        onChange={(e) => setFormData({ ...formData, compensation: e.target.value })}
                        placeholder="e.g., $50,000 - $70,000"
                      />
                    </div>
                    {formData.type === "mentorship" && (
                      <div className="space-y-2">
                        <Label htmlFor="slots">Available Slots</Label>
                        <Input
                          id="slots"
                          type="number"
                          value={formData.mentorship_slots}
                          onChange={(e) => setFormData({ ...formData, mentorship_slots: e.target.value })}
                          placeholder="e.g., 5"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="deadline">Application Deadline</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.application_deadline}
                        onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-navy">
                    Post Opportunity
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="text-sm text-muted-foreground text-right">
              Only mentors, employers, and admins can post opportunities.
            </div>
          )}
        </div>

        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="available">Available Opportunities</TabsTrigger>
            <TabsTrigger value="applications">
              {canPostOpportunity ? "My Posted Opportunities" : "My Applications"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            {/* Filters */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-5 w-5" />
                  Filter Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Opportunity Type</Label>
                  <div className="flex gap-2 p-1 bg-muted rounded-lg">
                    <button
                      onClick={() => setSelectedType("all")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded transition-all font-medium ${selectedType === "all"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedType("job")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded transition-all font-medium ${selectedType === "job"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Jobs
                    </button>
                    <button
                      onClick={() => setSelectedType("internship")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded transition-all font-medium ${selectedType === "internship"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Internships
                    </button>
                    <button
                      onClick={() => setSelectedType("mentorship")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded transition-all font-medium ${selectedType === "mentorship"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Mentorships
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location-filter">Location</Label>
                    <Input
                      id="location-filter"
                      placeholder="Search location..."
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All levels" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="all">All levels</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="mentorship">Mentorship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="career-filter">Career Interest</Label>
                    <Input
                      id="career-filter"
                      placeholder="Search career field..."
                      value={careerFilter}
                      onChange={(e) => setCareerFilter(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opportunities List */}
            {filteredOpportunities.length === 0 ? (
              <Card className="p-8 text-center bg-card border-border">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No opportunities found matching your filters.</p>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filteredOpportunities.map((opportunity) => (
                  <Card key={opportunity.id} className="bg-card border-border hover:border-gold transition-colors cursor-pointer" onClick={() => setViewingDetailsId(opportunity.id)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-navy/10 text-navy">
                            {getTypeIcon(opportunity.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-xl">{opportunity.title}</CardTitle>
                              <Badge variant={getTypeBadgeColor(opportunity.type) as "default" | "secondary" | "outline"}>
                                {opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)}
                              </Badge>
                              {hasApplied(opportunity.id) && (
                                <Badge variant="outline" className="border-green-500 text-green-600">
                                  <Heart className="h-3 w-3 mr-1 fill-current" />
                                  Applied
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {opportunity.company_name}
                              </span>
                              {opportunity.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {opportunity.location}
                                </span>
                              )}
                              {opportunity.location_type && (
                                <Badge variant="secondary" className="text-xs">
                                  {opportunity.location_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Apply button on card */}
                          {canApplyToOpportunity && currentUserId !== opportunity.posted_by && (
                            <Button
                              size="sm"
                              variant={hasApplied(opportunity.id) ? "outline" : "default"}
                              className={hasApplied(opportunity.id) ? "" : "bg-gold hover:bg-gold/90 text-navy"}
                              disabled={hasApplied(opportunity.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setApplyingTo(opportunity.id);
                              }}
                            >
                              {hasApplied(opportunity.id) ? "Applied" : "Apply"}
                            </Button>
                          )}

                          {!canApplyToOpportunity && currentUserId !== opportunity.posted_by && (
                            <p className="text-xs text-muted-foreground">Only athletes and admins can apply to opportunities.</p>
                          )}

                          {currentUserId === opportunity.posted_by && (
                            <div className="flex items-center gap-2">
                              {/* View Applicants Button FIRST */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                                      e.stopPropagation();
                                      if (!applicantsByOpportunity[opportunity.id]) {
                                        await fetchApplicantsForOpportunity(opportunity.id);
                                      }
                                    }}
                                    title="View Applicants"
                                  >
                                    <Users className="h-4 w-4 mr-1" />
                                    View Applicants
                                  </Button>
                                </DialogTrigger>
                                <DialogContent
                                  className="w-[95vw] sm:w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DialogHeader>
                                    <DialogTitle>Applicants for {opportunity.title}</DialogTitle>
                                    <DialogDescription>
                                      See all users who have applied to this opportunity.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {applicantsByOpportunity[opportunity.id] && applicantsByOpportunity[opportunity.id].length > 0 ? (
                                      <ul className="divide-y divide-border">
                                        {applicantsByOpportunity[opportunity.id].map((app, idx) => (
                                          <li key={app.applicant_id || idx} className="py-3 flex items-center gap-3">
                                            {app.user?.avatar_url ? (
                                              <img src={app.user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-navy">
                                                {app.user?.full_name?.[0] || app.user?.email?.[0] || "?"}
                                              </div>
                                            )}
                                            <div>
                                              <div className="font-medium text-foreground">{app.user?.full_name || app.user?.email || "Unknown"}</div>
                                              <div className="text-xs text-muted-foreground">{app.user?.email}</div>
                                              {app.cover_letter && (
                                                <div className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Cover Letter:</span> {app.cover_letter}</div>
                                              )}
                                              {app.user?.resume_url && (
                                                <div className="mt-1">
                                                  <a
                                                    href={app.user.resume_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-gold hover:text-gold-light underline inline-flex items-center gap-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    📄 Download Resume
                                                  </a>
                                                </div>
                                              )}
                                              <div className="text-xs text-muted-foreground">Applied {app.created_at ? new Date(app.created_at).toLocaleString() : ""}"</div>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div className="text-muted-foreground text-center">No applicants yet.</div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              {/* Edit and Delete buttons */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditOpportunity(opportunity);
                                }}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOpportunity(opportunity.id);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-3 text-sm">
                        {opportunity.employment_level && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {opportunity.employment_level.charAt(0).toUpperCase() + opportunity.employment_level.slice(1)}
                          </span>
                        )}
                        {opportunity.compensation && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            {opportunity.compensation}
                          </span>
                        )}
                        {opportunity.mentorship_slots && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {opportunity.mentorship_slots} slots available
                          </span>
                        )}
                        {opportunity.application_deadline && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Apply by {formatDate(opportunity.application_deadline)}
                          </span>
                        )}
                      </div>

                      {opportunity.career_interest && (
                        <div>
                          <Badge variant="outline" className="border-gold text-gold">
                            {opportunity.career_interest}
                          </Badge>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span>Posted {formatDate(opportunity.created_at)}</span>
                          {opportunity.posted_by_name && (
                            <div className="flex items-center flex-wrap gap-2">
                              <span>by {opportunity.posted_by_name}</span>
                              {opportunity.posted_by_is_admin && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs px-1.5 py-0.5"
                                >
                                  Admin
                                </Badge>
                              )}
                              {opportunity.posted_by_role && (
                                <Badge
                                  className="text-xs px-1.5 py-0.5 bg-navy text-gold border-navy"
                                >
                                  {opportunity.posted_by_role.charAt(0).toUpperCase() + opportunity.posted_by_role.slice(1)}
                                </Badge>
                              )}
                              {opportunity.user_badges && opportunity.user_badges.length > 0 && (
                                <TooltipProvider>
                                  {opportunity.user_badges.map((userBadge) => (
                                    <Tooltip key={userBadge.id} delayDuration={100}>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-help">
                                          {userBadge.image_url ? (
                                            <img src={userBadge.image_url} alt={userBadge.name} className="w-6 h-6 object-contain" />
                                          ) : userBadge.icon ? (
                                            <span className="text-lg">{userBadge.icon}</span>
                                          ) : null}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        <div className="font-semibold">{userBadge.name}</div>
                                        {userBadge.description && <div className="text-xs mt-1">{userBadge.description}</div>}
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                </TooltipProvider>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Infinite scroll trigger for opportunities */}
            {hasOpportunitiesMore && (
              <div ref={opportunitiesLoadMoreRef} className="py-8 text-center">
                {loadingOpportunitiesMore && <LoadingSpinner />}
              </div>
            )}

            {/* Details Dialogs - Rendered outside cards */}
            {filteredOpportunities.map((opportunity) => (
              <Dialog key={`details-dialog-${opportunity.id}`} open={viewingDetailsId === opportunity.id} onOpenChange={(open) => !open && setViewingDetailsId(null)}>
                <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">{opportunity.title}</DialogTitle>
                    <DialogDescription className="text-base">
                      <div className="flex items-center gap-2 mt-2">
                        <Building2 className="h-4 w-4" />
                        {opportunity.company_name}
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 text-sm">
                      {opportunity.location && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {opportunity.location}
                        </span>
                      )}
                      {opportunity.location_type && (
                        <Badge variant="secondary" className="text-xs">
                          {opportunity.location_type}
                        </Badge>
                      )}
                      {opportunity.employment_level && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {opportunity.employment_level.charAt(0).toUpperCase() + opportunity.employment_level.slice(1)}
                        </span>
                      )}
                      {opportunity.compensation && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          {opportunity.compensation}
                        </span>
                      )}
                    </div>
                    {opportunity.career_interest && (
                      <div>
                        <Badge variant="outline" className="border-gold text-gold">
                          {opportunity.career_interest}
                        </Badge>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {opportunity.description}
                      </p>
                    </div>
                    {opportunity.requirements && opportunity.requirements.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Requirements</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {opportunity.requirements.map((req, idx) => (
                            <li key={idx}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {opportunity.application_deadline && (
                      <div className="p-3 bg-muted/50 rounded border border-border">
                        <p className="text-sm">
                          <span className="font-semibold">Application Deadline:</span> {formatDate(opportunity.application_deadline)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-border">
                    {canApplyToOpportunity && currentUserId !== opportunity.posted_by && (
                      <Button
                        size="sm"
                        variant={hasApplied(opportunity.id) ? "outline" : "default"}
                        className={hasApplied(opportunity.id) ? "" : "bg-gold hover:bg-gold/90 text-navy"}
                        disabled={hasApplied(opportunity.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setApplyingTo(opportunity.id);
                        }}
                      >
                        {hasApplied(opportunity.id) ? "Applied" : "Apply"}
                      </Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ))}

            {/* Apply Dialogs - Rendered outside cards and details dialogs */}
            {filteredOpportunities.map((opportunity) => (
              <Dialog key={`apply-dialog-${opportunity.id}`} open={applyingTo === opportunity.id} onOpenChange={(open) => !open && setApplyingTo(null)}>
                <DialogContent className="w-[95vw] sm:w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-background border-border">
                  <DialogHeader>
                    <DialogTitle>Apply to {opportunity.title}</DialogTitle>
                    <DialogDescription>
                      Submit your application for this {opportunity.type}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cover-letter">Cover Letter (Optional)</Label>
                      <Textarea
                        id="cover-letter"
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Tell them why you're interested..."
                        rows={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Resume</Label>
                      {resumeUrl ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">View My Resume</a>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input
                            id="resume-upload"
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            ref={resumeInputRef}
                            onChange={handleResumeSelect}
                            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-muted file:text-navy hover:file:bg-muted/80"
                            disabled={resumeUploading}
                          />
                          {resumeFile && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{resumeFile.name}</span>
                              <Button size="sm" variant="outline" onClick={clearResumeSelection} type="button">Remove</Button>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">No resume uploaded in your profile. Upload to use for this and future applications.</div>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleApply(opportunity.id)}
                      className="w-full bg-gold hover:bg-gold/90 text-navy"
                      disabled={resumeUploading}
                    >
                      {resumeUploading ? (
                        <LoadingSpinner text="Uploading..." />
                      ) : (
                        <><Send className="h-4 w-4 mr-2" />Submit Application</>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </TabsContent>

          <TabsContent value="applications">
            {canPostOpportunity ? (
              /* Employer/Mentor view - My Posted Opportunities */
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5" />
                    My Posted Opportunities
                  </CardTitle>
                  <CardDescription>Manage opportunities you have posted.</CardDescription>
                </CardHeader>
                <CardContent>
                  {myPostedOpportunities.length === 0 && (
                    <p className="text-sm text-muted-foreground">You have not posted any opportunities yet.</p>
                  )}

                  {myPostedOpportunities.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myPostedOpportunities.map((opp) => (
                        <Card key={opp.id} className="border-border">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={getTypeBadgeColor(opp.type) as "default" | "secondary" | "outline"}>
                                    {opp.type.charAt(0).toUpperCase() + opp.type.slice(1)}
                                  </Badge>
                                  {opp.application_deadline && (
                                    <span className="text-xs text-muted-foreground">
                                      Deadline {formatDate(opp.application_deadline)}
                                    </span>
                                  )}
                                </div>
                                <CardTitle className="text-lg leading-tight">{opp.title}</CardTitle>
                                <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
                                  <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{opp.company_name}</span>
                                  {opp.location && (
                                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{opp.location}</span>
                                  )}
                                  {opp.employment_level && (
                                    <Badge variant="secondary" className="text-xs">
                                      {opp.employment_level}
                                    </Badge>
                                  )}
                                </CardDescription>
                              </div>
                              <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                                Posted {formatDate(opp.created_at)}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-0">
                            {opp.career_interest && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">Career</Badge>
                                <span>{opp.career_interest}</span>
                              </div>
                            )}
                            {opp.compensation && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                <span>{opp.compensation}</span>
                              </div>
                            )}
                            <p className="text-sm text-foreground line-clamp-3">{opp.description}</p>
                            <div className="flex items-center gap-2 pt-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (!applicantsByOpportunity[opp.id]) {
                                        await fetchApplicantsForOpportunity(opp.id);
                                      }
                                    }}
                                  >
                                    <Users className="h-4 w-4 mr-1" />
                                    View Applicants
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="w-[95vw] sm:w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border">
                                  <DialogHeader>
                                    <DialogTitle>Applicants for {opp.title}</DialogTitle>
                                    <DialogDescription>
                                      See all users who have applied to this opportunity.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {applicantsByOpportunity[opp.id] && applicantsByOpportunity[opp.id].length > 0 ? (
                                      <ul className="divide-y divide-border">
                                        {applicantsByOpportunity[opp.id].map((app, idx) => (
                                          <li key={app.applicant_id || idx} className="py-3 flex items-center gap-3">
                                            {app.user?.avatar_url ? (
                                              <img src={app.user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-navy">
                                                {app.user?.full_name?.[0] || app.user?.email?.[0] || "?"}
                                              </div>
                                            )}
                                            <div>
                                              <div className="font-medium text-foreground">{app.user?.full_name || app.user?.email || "Unknown"}</div>
                                              <div className="text-xs text-muted-foreground">{app.user?.email}</div>
                                              {app.cover_letter && (
                                                <div className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Cover Letter:</span> {app.cover_letter}</div>
                                              )}
                                              {app.user?.resume_url && (
                                                <div className="mt-1">
                                                  <a
                                                    href={app.user.resume_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-gold hover:text-gold-light underline inline-flex items-center gap-1"
                                                  >
                                                    📄 Download Resume
                                                  </a>
                                                </div>
                                              )}
                                              <div className="text-xs text-muted-foreground">Applied {app.created_at ? new Date(app.created_at).toLocaleString() : ""}</div>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div className="text-muted-foreground text-center">No applicants yet.</div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditOpportunity(opp)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteOpportunity(opp.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Athlete view - My Applications */
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="h-5 w-5" />
                    My Applications
                  </CardTitle>
                  <CardDescription>See every opportunity you have applied to.</CardDescription>
                </CardHeader>
                <CardContent>
                  {myApplications.length === 0 && (
                    <p className="text-sm text-muted-foreground">You have not applied to any opportunities yet.</p>
                  )}

                  {myApplications.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myApplications.map((application) => {
                        const opp = application.opportunity;
                        if (!opp) {
                          return (
                            <Card key={application.opportunity_id} className="border-border">
                              <CardContent className="p-4 text-sm text-muted-foreground">
                                This opportunity is no longer available.
                              </CardContent>
                            </Card>
                          );
                        }

                        return (
                          <Card key={`${application.opportunity_id}-${application.created_at}`} className="border-border">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getTypeBadgeColor(opp.type) as "default" | "secondary" | "outline"}>
                                      {opp.type.charAt(0).toUpperCase() + opp.type.slice(1)}
                                    </Badge>
                                    {opp.application_deadline && (
                                      <span className="text-xs text-muted-foreground">
                                        Deadline {formatDate(opp.application_deadline)}
                                      </span>
                                    )}
                                  </div>
                                  <CardTitle className="text-lg leading-tight">{opp.title}</CardTitle>
                                  <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
                                    <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{opp.company_name}</span>
                                    {opp.location && (
                                      <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{opp.location}</span>
                                    )}
                                    {opp.employment_level && (
                                      <Badge variant="secondary" className="text-xs">
                                        {opp.employment_level}
                                      </Badge>
                                    )}
                                  </CardDescription>
                                </div>
                                <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                                  Applied {formatDate(application.created_at || opp.created_at)}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                              {opp.career_interest && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">Career</Badge>
                                  <span>{opp.career_interest}</span>
                                </div>
                              )}
                              {opp.compensation && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <DollarSign className="h-4 w-4" />
                                  <span>{opp.compensation}</span>
                                </div>
                              )}
                              <p className="text-sm text-foreground line-clamp-3">{opp.description}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Opportunities;
