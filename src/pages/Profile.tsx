import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapPin, Briefcase, Calendar, Edit, Upload, Users, Eye, FileText, Download, Share2, Trash2, Loader2, ExternalLink, Plus, X, ThumbsUp, UserCog, Trophy, GraduationCap, Mail, Phone, Bookmark, Award, Bell, MessageSquare, Image as ImageIcon, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { SkillSelector } from "@/components/SkillSelector";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ReferralDialog } from "@/components/ReferralDialog";
import { SecuritySettings } from "@/components/SecuritySettings";
import { useUserAnalytics, formatCount } from "@/hooks/useUserAnalytics";
import { getFullName, getInitials } from "@/lib/nameUtils";
import { formatPhoneNumber } from "@/lib/phoneMask";
import { formatDistanceToNow } from "date-fns";
import { formatDateLong } from "@/lib/dateFormat";
import { fetchUserRoles } from "@/lib/roleUtils";

interface JobExperience {
  id?: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  currentlyWorking?: boolean;
  description?: string;
}

interface Degree {
  id?: string;
  degree: string;
  field: string;
  institution: string;
  year: string;
}

interface Profile {
  firstName: string;
  lastName: string;
  biography?: string | null;
  location?: string | null;
  degree?: string | null;
  degrees?: Degree[] | null;
  about?: string | null;
  skills?: string[] | string | null;
  avatarUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  university?: string | null;
  sport?: string | null;
  athleticAccomplishments?: string | null;
  academicAccomplishments?: string | null;
  contactPrivacy?: 'public' | 'connections' | 'private';
  resumeUrl?: string | null;
  jobExperiences?: JobExperience[] | null;
  createdAt?: string | null;
  userBadges?: Array<{
    id: string;
    badge_id: string | null;
    created_at: string;
    user_id: string;
    badges: {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      image_url: string | null;
      color_bg: string | null;
      color_text: string | null;
      is_active: boolean;
    };
  }>;
}

interface Endorsement {
  id: string;
  endorser_id: string;
  endorsed_user_id: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
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
}

interface ActivityItem {
  id: string;
  type: 'post' | 'comment' | 'image' | 'video';
  created_at: string;
  text?: string | null;
  media_url?: string | null;
  post_id?: string;
}

const Profile = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [newAuthEmail, setNewAuthEmail] = useState<string>("");
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState<Profile>({
    firstName: '',
    lastName: '',
    biography: '',
    location: '',
    degree: '',
    degrees: [],
    about: '',
    skills: [],
    avatarUrl: null,
    email: null,
    phone: null,
    university: null,
    sport: null,
    athleticAccomplishments: null,
    academicAccomplishments: null,
    contactPrivacy: 'connections',
    resumeUrl: null,
    jobExperiences: [],
    createdAt: null
  });

  const [formData, setFormData] = useState<Profile>(profileData);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [connections, setConnections] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; university: string | null; avatar_url: string | null }>>([]);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [selectedResume, setSelectedResume] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [selectedResumePreviewUrl, setSelectedResumePreviewUrl] = useState<string | null>(null);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [roleChangeRequest, setRoleChangeRequest] = useState<RoleChangeRequest | null>(null);
  const [requestedRole, setRequestedRole] = useState<string>("");
  const [roleChangeReason, setRoleChangeReason] = useState<string>("");
  const [submittingRoleChange, setSubmittingRoleChange] = useState(false);
  const [enablePostNotifications, setEnablePostNotifications] = useState(true);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityStats, setActivityStats] = useState({ posts: 0, comments: 0, images: 0, videos: 0 });

  // 2FA
  const [mfaFactors, setMfaFactors] = useState([]);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);

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

  const sortDegrees = (degrees: Degree[] = []) => {
    return [...degrees].sort((a, b) => {
      // Extract year for comparison - handle ranges like "2020-2024" by taking the end year
      const getYear = (yearStr: string) => {
        if (!yearStr) return 0;
        const match = yearStr.match(/(\d{4})(?:-\d{4})?$/);
        return match ? parseInt(match[1]) : 0;
      };
      const yearA = getYear(a.year);
      const yearB = getYear(b.year);
      // Sort descending (most recent first)
      return yearB - yearA;
    });
  };

  const setSortedJobExperiences = (updater: (jobs: JobExperience[]) => JobExperience[]) => {
    setFormData(prev => {
      const current = prev.jobExperiences || [];
      const next = sortJobExperiences(updater([...current]));
      return { ...prev, jobExperiences: next };
    });
  };

  // Use real analytics
  const { postsCount, connectionsCount, profileViewsCount, loading: analyticsLoading } = useUserAnalytics(currentUserId);

  useEffect(() => {
    fetchProfile();
    fetchConnections();
    fetchEndorsements();
    fetchRoleChangeRequest();
  }, []);

  useEffect(() => {
    // Check if URL hash is #referral and open dialog
    if (window.location.hash === '#referral') {
      setReferralDialogOpen(true);
      // Clear the hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    if (!selectedResume) {
      setSelectedResumePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedResume);
    setSelectedResumePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedResume]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);
    setAuthEmail(user.email || '');

    // Fetch user roles (can have multiple)
    const { baseRole, hasAdminRole } = await fetchUserRoles(user.id);

    setUserRole(baseRole);
    setIsAdmin(hasAdminRole);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Fetch user badges
    const { data: badgesData } = await supabase
      .from("user_badges")
      .select("*, badges(*)")
      .eq("user_id", user.id);

    await fetchActivity(user.id);

    if (!error && data) {
      const rawDegrees = (data.degrees as unknown) || [];
      const parsedDegrees: Degree[] = Array.isArray(rawDegrees)
        ? rawDegrees.map((d: any) => ({
          degree: d.degree || '',
          field: d.field || '',
          institution: d.institution || '',
          year: d.year || '',
          ...(d.id && { id: d.id }),
        }))
        : [];

      const profile = {
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        biography: data.biography,
        location: data.location,
        degrees: parsedDegrees,
        about: data.about,
        skills: data.skills || [],
        avatarUrl: data.avatar_url,
        email: data.email,
        phone: data.phone,
        university: data.university,
        sport: data.sport,
        athleticAccomplishments: data.athletic_accomplishments,
        academicAccomplishments: data.academic_accomplishments,
        contactPrivacy: (data.contact_privacy as 'public' | 'connections' | 'private') || 'connections',
        resumeUrl: data.resume_url,
        jobExperiences: sortJobExperiences(
          (Array.isArray(data.job_experiences) ? (data.job_experiences as unknown as JobExperience[]) : []) || []
        ),
        createdAt: data.created_at,
        userBadges: badgesData || []
      };
      setProfileData(profile);
      setFormData(profile);
    }
    setLoading(false);
  };

  const fetchActivity = async (userId: string) => {
    try {
      const [{ data: postsData }, { data: commentsData }] = await Promise.all([
        supabase
          .from("posts")
          .select("id, content, created_at, post_media(id, media_url, media_type)")
          .eq("user_id", userId)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("post_comments")
          .select("id, content, created_at, post_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20)
      ]);

      const postItems: ActivityItem[] = (postsData || []).map((post: any) => ({
        id: `post-${post.id}`,
        type: "post",
        created_at: post.created_at,
        text: post.content,
        post_id: post.id,
      }));

      const mediaItems: ActivityItem[] = (postsData || []).flatMap((post: any) =>
        (post.post_media || []).map((media: any) => ({
          id: `media-${media.id}`,
          type: media.media_type === "video" ? "video" : "image",
          created_at: post.created_at,
          media_url: media.media_url,
          post_id: post.id,
        }))
      );

      const commentItems: ActivityItem[] = (commentsData || []).map((comment: any) => ({
        id: `comment-${comment.id}`,
        type: "comment",
        created_at: comment.created_at,
        text: comment.content,
        post_id: comment.post_id,
      }));

      const allActivity = [...postItems, ...mediaItems, ...commentItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12);

      setActivityItems(allActivity);
      setActivityStats({
        posts: postItems.length,
        comments: commentItems.length,
        images: mediaItems.filter((item) => item.type === "image").length,
        videos: mediaItems.filter((item) => item.type === "video").length,
      });
    } catch (error) {
      console.error("Error fetching profile activity:", error);
      setActivityItems([]);
      setActivityStats({ posts: 0, comments: 0, images: 0, videos: 0 });
    }
  };

  const handleAuthEmailUpdate = async () => {
    const trimmed = newAuthEmail.trim();
    if (!trimmed || trimmed.toLowerCase() === authEmail.toLowerCase()) {
      toast({
        title: "No changes",
        description: "Enter a different email to update your login.",
      });
      return;
    }

    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    if (!emailRegex.test(trimmed)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      setEmailUpdateLoading(true);
      const { error } = await supabase.auth.updateUser({
        email: trimmed,
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: "Check the new address to confirm the change.",
      });
      setNewAuthEmail("");
      // authEmail will update after confirmation; keep showing current until then
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start email change";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setEmailUpdateLoading(false);
    }
  };

  const fetchConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: connections, error: connectionsError } = await supabase
      .from("connections")
      .select("*")
      .eq("user_id", user.id)
      .limit(5);

    if (connectionsError) throw connectionsError;

    const { data: connectionUsers, error: connectionUsersError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, university, avatar_url")
      .in("id", connections?.map(c => c.connected_user_id) || []);

    if (connectionUsersError) throw connectionUsersError;

    setConnections(connectionUsers || []);
  };

  const fetchEndorsements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("endorsements")
        .select(`
          *,
          profiles!endorsements_endorser_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq("endorsed_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEndorsements((data as Endorsement[]) || []);
    } catch (error) {
      console.error("Error fetching endorsements:", error);
    }
  };

  const fetchRoleChangeRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("role_change_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setRoleChangeRequest(data as RoleChangeRequest);
        setRequestedRole(data.requested_role);
        setRoleChangeReason(data.reason);
      }
    } catch (error) {
      console.error("Error fetching role change request:", error);
    }
  };

  const getAvailableRoles = () => {
    const allRoles = ['athlete', 'mentor', 'employer'];
    return allRoles.filter(role => role !== userRole);
  };  // Always filter out current base role, admin can still request changes

  const handleRoleChangeSubmit = async () => {
    if (!requestedRole || !roleChangeReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a role and provide a reason",
        variant: "destructive"
      });
      return;
    }

    if (roleChangeReason.length < 20) {
      toast({
        title: "Reason Too Short",
        description: "Please provide at least 20 characters explaining your request",
        variant: "destructive"
      });
      return;
    }

    setSubmittingRoleChange(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (roleChangeRequest) {
        // Update existing request
        const { error } = await supabase
          .from("role_change_requests")
          .update({
            requested_role: requestedRole,
            reason: roleChangeReason
          })
          .eq("id", roleChangeRequest.id);

        if (error) throw error;

        toast({
          title: "Request Updated",
          description: "Your role change request has been updated successfully"
        });
      } else {
        // Create new request
        const { error } = await supabase
          .from("role_change_requests")
          .insert({
            user_id: user.id,
            current_role: userRole || 'athlete',
            requested_role: requestedRole,
            reason: roleChangeReason,
            status: 'pending'
          });

        if (error) throw error;

        toast({
          title: "Request Submitted",
          description: "Your role change request has been submitted for review"
        });
      }

      setRoleChangeDialogOpen(false);
      fetchRoleChangeRequest();
    } catch (error) {
      console.error("Error submitting role change request:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit request",
        variant: "destructive"
      });
    } finally {
      setSubmittingRoleChange(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 40 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Avatar image must be less than 40MB",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadAvatar = async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 40 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Resume must be less than 40MB",
          variant: "destructive"
        });
        return;
      }
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or Word document",
          variant: "destructive"
        });
        return;
      }
      setSelectedResume(file);
    }
  };

  const uploadResume = async () => {
    if (!selectedResume || !currentUserId) return;

    setUploadingResume(true);
    try {
      const fileExt = selectedResume.name.split('.').pop();
      const fileName = `resume.${fileExt}`;
      const filePath = `${currentUserId}/${fileName}`;

      // Delete old resume if exists
      await supabase.storage.from('resumes').remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, selectedResume, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('resumes').getPublicUrl(filePath);

      // Update profile with resume URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ resume_url: data.publicUrl })
        .eq('id', currentUserId);

      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, resumeUrl: data.publicUrl }));
      setSelectedResume(null);
      toast({
        title: "Resume Uploaded",
        description: "Your resume has been uploaded successfully"
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive"
      });
    } finally {
      setUploadingResume(false);
    }
  };

  const deleteResume = async () => {
    if (!currentUserId || !profileData.resumeUrl) return;

    try {
      const filePath = `${currentUserId}/resume.pdf`;
      await supabase.storage.from('resumes').remove([filePath]);

      const { error } = await supabase
        .from('profiles')
        .update({ resume_url: null })
        .eq('id', currentUserId);

      if (error) throw error;

      setProfileData(prev => ({ ...prev, resumeUrl: null }));
      toast({
        title: "Resume Deleted",
        description: "Your resume has been removed"
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete resume",
        variant: "destructive"
      });
    }
  };

  const shareResume = async () => {
    if (!profileData.resumeUrl) return;

    try {
      await navigator.clipboard.writeText(profileData.resumeUrl);
      toast({
        title: "Link Copied",
        description: "Resume link copied to clipboard"
      });
    } catch {
      toast({
        title: "Share Failed",
        description: "Could not copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim() || formData.firstName.length > 50) {
      toast({
        title: "Invalid First Name",
        description: "First name must be between 1 and 50 characters",
        variant: "destructive"
      });
      return;
    }

    if (!formData.lastName.trim() || formData.lastName.length > 50) {
      toast({
        title: "Invalid Last Name",
        description: "Last name must be between 1 and 50 characters",
        variant: "destructive"
      });
      return;
    }

    if ((formData.about?.length || 0) > 1000) {
      toast({
        title: "About Too Long",
        description: "About section must be less than 1000 characters",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let avatarUrl = formData.avatarUrl;

      // Upload avatar if a new file was selected
      if (selectedFile) {
        avatarUrl = await uploadAvatar(selectedFile, user.id);
      }

      // Parse skills: convert string to array if needed
      const skillsArray = typeof formData.skills === 'string'
        ? formData.skills.split(",").map(s => s.trim()).filter(Boolean)
        : (formData.skills || []);

      console.log("Updating profile with data:", {
        first_name: formData.firstName,
        last_name: formData.lastName,
        biography: formData.biography,
        location: formData.location,
        degree: formData.degree,
        about: formData.about,
        skills: skillsArray,
        avatar_url: avatarUrl
      });

      const sortedJobExperiences = sortJobExperiences(formData.jobExperiences || []);

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          biography: formData.biography,
          location: formData.location,
          degrees: (formData.degrees || []) as unknown as Json[],
          about: formData.about,
          skills: skillsArray,
          avatar_url: avatarUrl,
          email: formData.email,
          phone: formData.phone,
          university: formData.university,
          sport: formData.sport,
          athletic_accomplishments: formData.athleticAccomplishments,
          academic_accomplishments: formData.academicAccomplishments,
          contact_privacy: formData.contactPrivacy,
          job_experiences: sortedJobExperiences as unknown as Json[]
        })
        .eq("id", user.id);

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      console.log("Profile updated successfully");

      const updatedData = { ...formData, avatarUrl, skills: skillsArray, jobExperiences: sortedJobExperiences };
      setProfileData(updatedData);
      setFormData(updatedData);
      setSelectedFile(null);
      setDialogOpen(false);

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated"
      });
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 pt-24">
        <LoadingSpinner fullPage text="Loading profile..." />
      </div>
    );
  }

  const completionChecks = [
    !!profileData.avatarUrl,
    !!profileData.about,
    !!profileData.biography,
    !!profileData.location,
    !!profileData.university,
    !!profileData.sport,
    !!profileData.resumeUrl,
    Array.isArray(profileData.skills) && profileData.skills.length > 0,
    Array.isArray(profileData.jobExperiences) && profileData.jobExperiences.length > 0,
    Array.isArray(profileData.degrees) && profileData.degrees.length > 0,
  ];
  const completionPercent = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Header Card */}
      <Card className="p-4 sm:p-8 mb-6 animate-slide-up">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32">
            <AvatarImage src={profileData.avatarUrl || undefined} alt={getFullName(profileData.firstName, profileData.lastName)} />
            <AvatarFallback className="bg-gold text-navy text-3xl sm:text-5xl font-bold">
              {getInitials(profileData.firstName, profileData.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
              <div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-heading font-bold">{getFullName(profileData.firstName, profileData.lastName) || 'Your Name'}</h1>
                  <div className="flex flex-wrap gap-2 items-center">
                    {userRole && (
                      <Badge
                        className="text-xs sm:text-sm px-2 py-0.5 h-6 sm:h-8 bg-navy text-gold border-navy"
                      >
                        {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                      </Badge>
                    )}
                    {profileData.userBadges && profileData.userBadges.map((userBadge) => {
                      const badge = userBadge.badges;
                      if (!badge) return null;

                      return (
                        <TooltipProvider key={userBadge.id}>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                {badge.image_url ? (
                                  <img src={badge.image_url} alt={badge.name} className="w-14 h-14 sm:w-10 sm:h-10 object-contain" />
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
                </div>
                <p className="text-base sm:text-lg text-muted-foreground mt-1">
                  {profileData.biography}
                </p>

                <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {profileData.location || 'Location not set'}
                  </div>
                  <div className="flex items-center">
                    <GraduationCap className="h-4 w-4 mr-1" />
                    {profileData.university}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Joined {profileData.createdAt ? formatDateLong(profileData.createdAt) : 'Recently'}
                  </div>
                  {profileData.sport && (
                    <div className="flex items-center">
                      <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/20 flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {profileData.sport}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                {(profileData.email || profileData.phone) && (
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    {profileData.email && (
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="h-4 w-4 mr-1" />
                        Contact Email: {profileData.email}
                      </div>
                    )}
                    {profileData.phone && (
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="h-4 w-4 mr-1" />
                        {profileData.phone}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {/* Post Notification Toggle */}
                <Button
                  onClick={() => setEnablePostNotifications(!enablePostNotifications)}
                  variant={enablePostNotifications ? "default" : "outline"}
                  className={enablePostNotifications ? "bg-gold hover:bg-gold-light text-navy" : ""}
                  title={enablePostNotifications ? "Followers will be notified when you post" : "Followers will NOT be notified when you post"}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {enablePostNotifications ? "Notifications On" : "Notifications Off"}
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gold hover:bg-gold-light text-navy">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Update your profile information below
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="avatar">Profile Picture</Label>
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-20 h-20">
                            <AvatarImage src={selectedFile ? URL.createObjectURL(selectedFile) : (formData.avatarUrl || undefined)} alt="Preview" />
                            <AvatarFallback className="bg-gold text-navy text-2xl font-bold">
                              {getInitials(formData.firstName, formData.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Input
                              id="avatar"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="cursor-pointer"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Max file size: 40MB
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name <span style={{ color: "red" }}>*</span></Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            maxLength={50}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name <span style={{ color: "red" }}>*</span></Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            maxLength={50}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="biography">Biography</Label>
                        <Input
                          id="biography"
                          value={formData.biography || ''}
                          onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                          maxLength={200}
                          placeholder="Former Athlete • Career Transition • Industry Enthusiast"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location || ''}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          maxLength={100}
                          placeholder="City, State"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Degrees</Label>
                        <div className="space-y-3">
                          {(formData.degrees || []).map((degree, idx) => (
                            <Card key={idx} className="p-3 bg-muted border-border">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">Degree</Label>
                                      <Input
                                        value={degree.degree}
                                        onChange={(e) => {
                                          const newDegrees = [...(formData.degrees || [])];
                                          newDegrees[idx].degree = e.target.value;
                                          setFormData({ ...formData, degrees: newDegrees });
                                        }}
                                        placeholder="B.S., M.A., Ph.D., etc."
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Field of Study</Label>
                                      <Input
                                        value={degree.field}
                                        onChange={(e) => {
                                          const newDegrees = [...(formData.degrees || [])];
                                          newDegrees[idx].field = e.target.value;
                                          setFormData({ ...formData, degrees: newDegrees });
                                        }}
                                        placeholder="Sports Marketing, Biology, etc."
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">Institution</Label>
                                      <Input
                                        value={degree.institution}
                                        onChange={(e) => {
                                          const newDegrees = [...(formData.degrees || [])];
                                          newDegrees[idx].institution = e.target.value;
                                          setFormData({ ...formData, degrees: newDegrees });
                                        }}
                                        placeholder="University Name"
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Year</Label>
                                      <Input
                                        value={degree.year}
                                        onChange={(e) => {
                                          const newDegrees = [...(formData.degrees || [])];
                                          newDegrees[idx].year = e.target.value;
                                          setFormData({ ...formData, degrees: newDegrees });
                                        }}
                                        placeholder="2020, 2020-2024, etc."
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newDegrees = (formData.degrees || []).filter((_, i) => i !== idx);
                                    setFormData({ ...formData, degrees: newDegrees });
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newDegree: Degree = {
                              degree: '',
                              field: '',
                              institution: '',
                              year: ''
                            };
                            setFormData({ ...formData, degrees: [...(formData.degrees || []), newDegree] });
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Degree
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Contact Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          maxLength={100}
                          placeholder="contact@example.com"
                        />
                        <p className="text-xs text-muted-foreground">This is your public-facing email (if allowed by privacy). It does not change your login email.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                          maxLength={14}
                          placeholder="(555) 123-4567"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactPrivacy">Contact Information Privacy</Label>
                        <Select
                          value={formData.contactPrivacy || 'connections'}
                          onValueChange={(value: 'public' | 'connections' | 'private') =>
                            setFormData({ ...formData, contactPrivacy: value })
                          }
                        >
                          <SelectTrigger id="contactPrivacy">
                            <SelectValue placeholder="Select privacy level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public - Anyone can see</SelectItem>
                            <SelectItem value="connections">Connections Only - Only your connections can see</SelectItem>
                            <SelectItem value="private">Private - Only you can see</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Controls who can view your contact email and phone number
                        </p>
                      </div>

                      {/* Login Email (Authentication) */}
                      <div className="space-y-2">
                        <Label htmlFor="authEmail">Login Email (sign-in)</Label>
                        <Input
                          id="authEmail"
                          type="email"
                          value={authEmail}
                          readOnly
                          className="bg-muted/50"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="new-login-email@example.com"
                            value={newAuthEmail}
                            onChange={(e) => setNewAuthEmail(e.target.value)}
                          />
                          <Button
                            type="button"
                            onClick={handleAuthEmailUpdate}
                            disabled={emailUpdateLoading}
                            className="whitespace-nowrap"
                          >
                            {emailUpdateLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>Send verification link</>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          We’ll send a verification link to the new email. Your login email updates after you confirm.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="university">University</Label>
                        <Input
                          id="university"
                          value={formData.university || ''}
                          onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                          maxLength={100}
                          placeholder="University Name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sport">Sport</Label>
                        <Input
                          id="sport"
                          value={formData.sport || ''}
                          onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                          maxLength={50}
                          placeholder="e.g., Basketball, Soccer, Track"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="about">About</Label>
                        <Textarea
                          id="about"
                          value={formData.about || ''}
                          onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                          maxLength={1000}
                          rows={6}
                          placeholder="Tell us about yourself..."
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.about?.length || 0}/1000 characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="athletic-accomplishments">Athletic Accomplishments</Label>
                        <Textarea
                          id="athletic-accomplishments"
                          value={formData.athleticAccomplishments || ''}
                          onChange={(e) => setFormData({ ...formData, athleticAccomplishments: e.target.value })}
                          maxLength={1000}
                          rows={4}
                          placeholder="List your athletic achievements, awards, records..."
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.athleticAccomplishments?.length || 0}/1000 characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="academic-accomplishments">Academic Accomplishments</Label>
                        <Textarea
                          id="academic-accomplishments"
                          value={formData.academicAccomplishments || ''}
                          onChange={(e) => setFormData({ ...formData, academicAccomplishments: e.target.value })}
                          maxLength={1000}
                          rows={4}
                          placeholder="List your academic achievements, honors, GPA..."
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.academicAccomplishments?.length || 0}/1000 characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="skills">Skills</Label>
                        <SkillSelector
                          skills={Array.isArray(formData.skills) ? formData.skills : []}
                          onChange={(newSkills) => setFormData({ ...formData, skills: newSkills })}
                          maxSkills={20}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Job Experiences</Label>
                        <div className="space-y-3">
                          {(formData.jobExperiences || []).map((job, idx) => (
                            <Card key={idx} className="p-3 bg-muted border-border">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">Company</Label>
                                      <Input
                                        value={job.company}
                                        onChange={(e) => {
                                          setSortedJobExperiences((jobs) => {
                                            jobs[idx].company = e.target.value;
                                            return jobs;
                                          });
                                        }}
                                        placeholder="Company name"
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Position</Label>
                                      <Input
                                        value={job.position}
                                        onChange={(e) => {
                                          setSortedJobExperiences((jobs) => {
                                            jobs[idx].position = e.target.value;
                                            return jobs;
                                          });
                                        }}
                                        placeholder="Job title"
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">Start Date</Label>
                                      <Input
                                        type="date"
                                        value={job.startDate}
                                        onChange={(e) => {
                                          setSortedJobExperiences((jobs) => {
                                            jobs[idx].startDate = e.target.value;
                                            return jobs;
                                          });
                                        }}
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">End Date</Label>
                                      <Input
                                        type="date"
                                        value={job.endDate}
                                        onChange={(e) => {
                                          setSortedJobExperiences((jobs) => {
                                            jobs[idx].endDate = e.target.value;
                                            return jobs;
                                          });
                                        }}
                                        disabled={job.currentlyWorking}
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`currently-working-${idx}`}
                                      checked={job.currentlyWorking || false}
                                      onChange={(e) => {
                                        setSortedJobExperiences((jobs) => {
                                          jobs[idx].currentlyWorking = e.target.checked;
                                          if (e.target.checked) {
                                            jobs[idx].endDate = '';
                                          }
                                          return jobs;
                                        });
                                      }}
                                    />
                                    <Label htmlFor={`currently-working-${idx}`} className="text-xs cursor-pointer">
                                      I currently work here
                                    </Label>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Description (Optional)</Label>
                                    <Textarea
                                      value={job.description || ''}
                                      onChange={(e) => {
                                        setSortedJobExperiences((jobs) => {
                                          jobs[idx].description = e.target.value;
                                          return jobs;
                                        });
                                      }}
                                      placeholder="Describe your responsibilities and achievements..."
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSortedJobExperiences((jobs) => jobs.filter((_, i) => i !== idx));
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newJob: JobExperience = {
                              id: `temp-${Date.now()}`,
                              company: '',
                              position: '',
                              startDate: '',
                              endDate: '',
                              currentlyWorking: false,
                              description: ''
                            };
                            setSortedJobExperiences((jobs) => [...jobs, newJob]);
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Job Experience
                        </Button>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setFormData(profileData);
                            setSelectedFile(null);
                            setDialogOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-gold hover:bg-gold-light text-navy"
                          disabled={uploading}
                        >
                          {uploading ? "Uploading..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                {userRole && (
                  <Button
                    onClick={() => setRoleChangeDialogOpen(true)}
                    variant="outline"
                    className="bg-gold hover:bg-gold-light text-navy"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Change Role
                    {roleChangeRequest && (
                      <Badge variant="outline" className="ml-2 text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        Pending
                      </Badge>
                    )}
                  </Button>
                )}
                <Button
                  onClick={() => setReferralDialogOpen(true)}
                  variant="outline"
                  className="bg-gold hover:bg-gold-light text-navy"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Earn Rewards
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <FileText className="h-4 w-4 text-gold" />
                  <p className="text-2xl font-bold text-gold">{formatCount(postsCount)}</p>
                </div>
                <p className="text-sm text-muted-foreground">Posts</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-4 w-4 text-foreground" />
                  <p className="text-2xl font-bold">{formatCount(connectionsCount)}</p>
                </div>
                <p className="text-sm text-muted-foreground">Connections</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Eye className="h-4 w-4 text-foreground" />
                  <p className="text-2xl font-bold">{formatCount(profileViewsCount)}</p>
                </div>
                <p className="text-sm text-muted-foreground">Profile Views</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* About & Skills */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-heading font-bold mb-4">About</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-line">
              {profileData.about || ''}
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-heading font-bold mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(formData?.skills)
                ? formData.skills
                : (formData?.skills || '').split(',').map(s => s.trim()).filter(Boolean)
              ).map((skill) => (
                <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">
                  {skill}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-heading font-bold mb-4">Activity</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Posts</p>
                <p className="text-lg font-semibold">{activityStats.posts}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Comments</p>
                <p className="text-lg font-semibold">{activityStats.comments}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Images</p>
                <p className="text-lg font-semibold">{activityStats.images}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Videos</p>
                <p className="text-lg font-semibold">{activityStats.videos}</p>
              </div>
            </div>

            {activityItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activityItems.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      {item.type === "post" && <FileText className="h-4 w-4" />}
                      {item.type === "comment" && <MessageSquare className="h-4 w-4" />}
                      {item.type === "image" && <ImageIcon className="h-4 w-4" />}
                      {item.type === "video" && <Video className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                      {item.text && (
                        <p className="text-sm line-clamp-2 whitespace-pre-line">
                          {item.text.replace(/<[^>]*>/g, "").trim()}
                        </p>
                      )}
                      {item.media_url && (
                        <img
                          src={item.media_url}
                          alt={`${item.type} preview`}
                          className="mt-2 w-16 h-16 rounded object-cover border"
                        />
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {profileData.athleticAccomplishments && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Athletic Accomplishments
              </h2>
              <p className="text-foreground leading-relaxed whitespace-pre-line">
                {profileData.athleticAccomplishments}
              </p>
            </Card>
          )}

          {profileData.academicAccomplishments && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Academic Accomplishments
              </h2>
              <p className="text-foreground leading-relaxed whitespace-pre-line">
                {profileData.academicAccomplishments}
              </p>
            </Card>
          )}

          {profileData.degrees && profileData.degrees.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Education
              </h2>
              <div className="space-y-4">
                {sortDegrees(profileData.degrees).map((degree, index) => (
                  <div key={index} className="pb-4 border-b last:border-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {degree.degree} {degree.field && `in ${degree.field}`}
                        </h3>
                        {degree.institution && (
                          <p className="text-sm text-muted-foreground">{degree.institution}</p>
                        )}
                      </div>
                      {degree.year && (
                        <span className="text-sm text-muted-foreground">{degree.year}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {profileData.jobExperiences && profileData.jobExperiences.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" /> Job Experience
              </h2>
              <div className="space-y-4">
                {profileData.jobExperiences.map((job, index) => (
                  <div key={index} className="pb-4 border-b last:border-0">
                    <h3 className="font-semibold text-foreground">{job.position}</h3>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateLong(job.startDate)} {!job.currentlyWorking && job.endDate ? `- ${formatDateLong(job.endDate)}` : job.currentlyWorking ? '- Present' : ''}
                    </p>
                    {job.description && (
                      <p className="text-sm text-foreground mt-2 whitespace-pre-line">{job.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Endorsements Section */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Endorsements ({endorsements.length})
            </h3>

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
                            alt={getFullName(
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
                            {getFullName(
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
                No endorsements yet.
              </p>
            )}
          </Card>

          {/* Security Settings */}
          <SecuritySettings userId={currentUserId} userEmail={authEmail} />

          <Card className="p-6">
            <h3 className="font-semibold mb-2">Profile Completion</h3>
            <p className="text-2xl font-bold">{completionPercent}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add profile details, skills, education, and resume to strengthen your profile.
            </p>
            <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-gold" style={{ width: `${completionPercent}%` }} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">My Connections</h3>
              <Link to="/my-hub#connections">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  View All
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {connections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No connections yet</p>
              ) : (
                connections.map((user) => (
                  <Link key={user.id} to={`/profile/${user.id}`} className="flex items-center space-x-3 hover:bg-secondary p-2 rounded-lg transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url || undefined} alt={getFullName(user.first_name, user.last_name)} />
                      <AvatarFallback className="bg-gold text-navy text-sm font-bold">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm hover:text-gold transition-colors">{getFullName(user.first_name, user.last_name) || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user?.university}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <div className="space-y-3">
              <Link to="/home?filter=my-posts" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="font-medium text-sm">My Posts</p>
                  <p className="text-xs text-muted-foreground">View your posts</p>
                </div>
              </Link>
              <Link to="/home?tab=bookmarks" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                  <Bookmark className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="font-medium text-sm">Bookmarks</p>
                  <p className="text-xs text-muted-foreground">Saved posts</p>
                </div>
              </Link>
              <div
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary cursor-pointer"
                onClick={() => setResumeDialogOpen(true)}
              >
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="font-medium text-sm">Resume</p>
                  <p className="text-xs text-muted-foreground">
                    {profileData.resumeUrl ? 'View & manage' : 'Upload resume'}
                  </p>
                </div>
              </div>
              <div
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary cursor-pointer"
                onClick={() => setReferralDialogOpen(true)}
              >
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="font-medium text-sm">Refer a teammate</p>
                  <p className="text-xs text-muted-foreground">Send an invite email</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Role Change Request Dialog */}
          <Dialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {roleChangeRequest ? 'Update Role Change Request' : 'Request Role Change'}
                </DialogTitle>
                <DialogDescription>
                  {roleChangeRequest
                    ? 'You can update your pending request below'
                    : 'Submit a request to change your user type. An administrator will review your request.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="current-role">Current Role</Label>
                  <Input
                    id="current-role"
                    value={userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requested-role">Requested Role <span className="text-red-500">*</span></Label>
                  <Select
                    value={requestedRole}
                    onValueChange={setRequestedRole}
                  >
                    <SelectTrigger id="requested-role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableRoles().map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Request <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="reason"
                    value={roleChangeReason}
                    onChange={(e) => setRoleChangeReason(e.target.value)}
                    placeholder="Please explain why you are requesting this role change..."
                    rows={5}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {roleChangeReason.length}/500 characters (minimum 20)
                  </p>
                </div>

                {roleChangeRequest && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Status:</strong> Pending Review
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted {formatDistanceToNow(new Date(roleChangeRequest.created_at), { addSuffix: true })}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRoleChangeDialogOpen(false);
                      if (!roleChangeRequest) {
                        setRequestedRole("");
                        setRoleChangeReason("");
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRoleChangeSubmit}
                    disabled={submittingRoleChange}
                    className="bg-gold hover:bg-gold-light text-navy"
                  >
                    {submittingRoleChange ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      roleChangeRequest ? 'Update Request' : 'Submit Request'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Referral Dialog */}
          <ReferralDialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen} />

          {/* Resume Dialog */}
          <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Resume</DialogTitle>
                <DialogDescription>
                  Upload, share, or download your resume
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {profileData.resumeUrl ? (
                  <div className="space-y-4">
                    {/* Resume Preview */}
                    <div className="border rounded-lg overflow-hidden bg-muted">
                      {profileData.resumeUrl.endsWith('.pdf') || profileData.resumeUrl.includes('.pdf') ? (
                        <iframe
                          src={`${profileData.resumeUrl}#toolbar=0&navpanes=0`}
                          className="w-full h-[400px]"
                          title="Resume Preview"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Preview not available for this file type
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(profileData.resumeUrl!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in New Tab
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(profileData.resumeUrl!, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={shareResume}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Link
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={deleteResume}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Resume
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload your resume (PDF or Word)
                      </p>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeFileChange}
                        className="hidden"
                        id="resume-upload"
                      />
                      <Label htmlFor="resume-upload" className="cursor-pointer">
                        <Button variant="outline" asChild>
                          <span>Choose File</span>
                        </Button>
                      </Label>
                    </div>
                    {selectedResume && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5" />
                            <div className="flex flex-col">
                              <span className="text-sm truncate max-w-[240px]">{selectedResume.name}</span>
                              <span className="text-xs text-muted-foreground">{(selectedResume.size / (1024 * 1024)).toFixed(1)} MB • {selectedResume.type || 'File'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedResume(null)}
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              onClick={uploadResume}
                              disabled={uploadingResume}
                            >
                              {uploadingResume ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Upload'
                              )}
                            </Button>
                          </div>
                        </div>

                        {selectedResumePreviewUrl && (
                          <div className="border rounded-lg overflow-hidden bg-muted">
                            {selectedResume.type === 'application/pdf' ? (
                              <iframe
                                src={`${selectedResumePreviewUrl}#toolbar=0&navpanes=0`}
                                className="w-full h-[360px]"
                                title="Selected Resume Preview"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                                <FileText className="h-10 w-10 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  Preview not available for this file type. You can still open it before uploading.
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(selectedResumePreviewUrl, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Open Selected File
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Profile;
