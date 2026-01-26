import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDateLong } from "@/lib/dateFormat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, Award, Trash2, Plus, Image as ImageIcon, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EMOJI_CATEGORIES } from "@/constants/emojis";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  image_url: string | null;
  color_bg: string;
  color_text: string;
  is_active: boolean;
}

interface UserWithBadges {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string | null;
  badges: Badge[];
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithBadges[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBadgeFilters, setSelectedBadgeFilters] = useState<string[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithBadges[]>([]);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [badgeName, setBadgeName] = useState("");
  const [badgeDescription, setBadgeDescription] = useState("");
  const [badgeIcon, setBadgeIcon] = useState("⭐");
  const [badgeImageFile, setBadgeImageFile] = useState<File | null>(null);
  const [badgeImagePreview, setBadgeImagePreview] = useState<string | null>(null);
  const [useEmojiIcon, setUseEmojiIcon] = useState(false);
  const [badgeColorBg, setBadgeColorBg] = useState("bg-amber-100");
  const [badgeColorText, setBadgeColorText] = useState("text-amber-800");
  const [creatingBadge, setCreatingBadge] = useState(false);
  const [removingBadge, setRemovingBadge] = useState<string | null>(null);
  const [deletingBadge, setDeletingBadge] = useState<string | null>(null);
  const { toast } = useToast();

  const loadBadges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error("Error loading badges:", error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, created_at")
        .order("created_at", { ascending: false });

      if (profileError) throw profileError;

      // Fetch badges for each user
      const usersWithBadges = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: userBadgeData } = await supabase
            .from("user_badges")
            .select("badges(*)")
            .eq("user_id", profile.id);

          return {
            ...profile,
            badges: (userBadgeData || []).map((ub) => ub.badges as Badge).filter(Boolean),
          };
        })
      );

      setUsers(usersWithBadges);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadBadges(), loadUsers()]);
    } finally {
      setLoading(false);
    }
  }, [loadBadges, loadUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBadge = async () => {
    if (!badgeName.trim()) {
      toast({
        title: "Error",
        description: "Badge name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingBadge(true);
      let imageUrl: string | null = null;

      // Upload image if provided
      if (badgeImageFile) {
        const fileExt = badgeImageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `badges/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('badge-images')
          .upload(filePath, badgeImageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('badge-images')
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("badges").insert({
        name: badgeName,
        description: badgeDescription || null,
        icon: badgeIcon,
        image_url: imageUrl,
        color_bg: badgeColorBg,
        color_text: badgeColorText,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Badge created successfully",
      });

      // Reset form
      setBadgeName("");
      setBadgeDescription("");
      setBadgeIcon("⭐");
      setBadgeImageFile(null);
      setBadgeImagePreview(null);
      setUseEmojiIcon(false);
      setBadgeColorBg("bg-amber-100");
      setBadgeColorText("text-amber-800");
      setBadgeDialogOpen(false);

      await loadBadges();
    } catch (error) {
      console.error("Error creating badge:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create badge",
        variant: "destructive",
      });
    } finally {
      setCreatingBadge(false);
    }
  };

  const handleImageFileSelect = (file: File | null) => {
    if (!file) {
      setBadgeImageFile(null);
      setBadgeImagePreview(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setBadgeImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setBadgeImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAssignBadge = async (userId: string, badgeId: string) => {
    try {
      const { error } = await supabase
        .from("user_badges")
        .insert({ user_id: userId, badge_id: badgeId });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Badge assigned successfully",
      });

      await loadUsers();
    } catch (error) {
      console.error("Error assigning badge:", error);
      toast({
        title: "Error",
        description: "Failed to assign badge",
        variant: "destructive",
      });
    }
  };

  const handleRemoveBadge = async (userId: string, badgeId: string) => {
    try {
      setRemovingBadge(`${userId}-${badgeId}`);
      const { error } = await supabase
        .from("user_badges")
        .delete()
        .eq("user_id", userId)
        .eq("badge_id", badgeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Badge removed successfully",
      });

      await loadUsers();
    } catch (error) {
      console.error("Error removing badge:", error);
      toast({
        title: "Error",
        description: "Failed to remove badge",
        variant: "destructive",
      });
    } finally {
      setRemovingBadge(null);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm("Are you sure you want to delete this badge? This will remove it from all users.")) return;

    try {
      setDeletingBadge(badgeId);

      // First delete all user_badges assignments
      const { error: userBadgesError } = await supabase
        .from("user_badges")
        .delete()
        .eq("badge_id", badgeId);

      if (userBadgesError) throw userBadgesError;

      // Then delete the badge itself
      const { error } = await supabase
        .from("badges")
        .delete()
        .eq("id", badgeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Badge deleted successfully",
      });

      await loadData();
    } catch (error) {
      console.error("Error deleting badge:", error);
      toast({
        title: "Error",
        description: "Failed to delete badge",
        variant: "destructive",
      });
    } finally {
      setDeletingBadge(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const filtered = users.filter((user) => {
      // Search term filter
      const matchesSearch =
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Badge filter - if filters are selected, user must have at least one selected badge
      const matchesBadgeFilter =
        selectedBadgeFilters.length === 0 ||
        user.badges.some((badge) =>
          selectedBadgeFilters.includes(badge.id)
        );

      return matchesSearch && matchesBadgeFilter;
    });
    setFilteredUsers(filtered);
  }, [searchTerm, users, selectedBadgeFilters]);

  const COLOR_OPTIONS = [
    { bg: "bg-amber-100", text: "text-amber-800", label: "Amber" },
    { bg: "bg-blue-100", text: "text-blue-800", label: "Blue" },
    { bg: "bg-green-100", text: "text-green-800", label: "Green" },
    { bg: "bg-red-100", text: "text-red-800", label: "Red" },
    { bg: "bg-purple-100", text: "text-purple-800", label: "Purple" },
    { bg: "bg-pink-100", text: "text-pink-800", label: "Pink" },
  ];

  const userBadgeIds = new Set(filteredUsers.flatMap((u) => u.badges.map((b) => b.id)));
  const availableBadgesForUser = (userId: string) => {
    const user = filteredUsers.find((u) => u.id === userId);
    return badges.filter((b) => !user?.badges.some((ub) => ub.id === b.id));
  };

  return (
    <div className="space-y-6">
      {/* Badges Management Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Available Badges
            </CardTitle>
            <CardDescription>Create and manage user badges</CardDescription>
          </div>
          <Button
            onClick={() => setBadgeDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Badge
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {badges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No badges created yet. Create one to get started!
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-3 rounded-lg border flex flex-col gap-2 ${badge.color_bg}`}
                >
                  <div className="flex items-start justify-between">
                    {badge.image_url ? (
                      <img
                        src={badge.image_url}
                        alt={badge.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{badge.icon}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDeleteBadge(badge.id)}
                      disabled={deletingBadge === badge.id}
                    >
                      {deletingBadge === badge.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className={`font-semibold text-sm ${badge.color_text}`}>
                      {badge.name}
                    </p>
                    {badge.description && (
                      <p className="text-xs text-muted-foreground">
                        {badge.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>Manage user badges and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />

            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <Button
                    key={badge.id}
                    variant={
                      selectedBadgeFilters.includes(badge.id)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setSelectedBadgeFilters((prev) =>
                        prev.includes(badge.id)
                          ? prev.filter((id) => id !== badge.id)
                          : [...prev, badge.id]
                      );
                    }}
                    className="gap-1"
                  >
                    {badge.image_url ? (
                      <img
                        src={badge.image_url}
                        alt={badge.name}
                        className="w-4 h-4 rounded object-cover"
                      />
                    ) : (
                      <span>{badge.icon}</span>
                    )}
                    {badge.name}
                    {selectedBadgeFilters.includes(badge.id) && (
                      <span className="text-xs ml-1">✓</span>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || selectedBadgeFilters.length > 0
                ? "No users match your filters"
                : "No users found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Badges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/profile/${user.id}`}
                          className="hover:text-gold transition-colors hover:underline"
                        >
                          {user.first_name || user.last_name
                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                            : "No name"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {user.created_at
                          ? formatDateLong(user.created_at)
                          : "Unknown"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {user.badges.map((badge) => (
                            <div
                              key={badge.id}
                              className={`px-3 py-2 rounded text-xs font-medium flex items-center gap-2 ${badge.color_bg} ${badge.color_text}`}
                            >
                              {badge.image_url ? (
                                <img
                                  src={badge.image_url}
                                  alt={badge.name}
                                  className="w-5 h-5 rounded object-cover"
                                />
                              ) : (
                                <span className="text-lg">{badge.icon}</span>
                              )}
                              {badge.name}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                                onClick={() =>
                                  handleRemoveBadge(user.id, badge.id)
                                }
                                disabled={
                                  removingBadge === `${user.id}-${badge.id}`
                                }
                              >
                                {removingBadge === `${user.id}-${badge.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ))}
                          {availableBadgesForUser(user.id).length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Badge
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {availableBadgesForUser(user.id).map(
                                  (badge) => (
                                    <DropdownMenuItem
                                      key={badge.id}
                                      onClick={() =>
                                        handleAssignBadge(user.id, badge.id)
                                      }
                                    >
                                      {badge.image_url ? (
                                        <img
                                          src={badge.image_url}
                                          alt={badge.name}
                                          className="w-5 h-5 mr-2 rounded object-cover"
                                        />
                                      ) : (
                                        <span className="text-lg mr-2">{badge.icon}</span>
                                      )}
                                      {badge.name}
                                    </DropdownMenuItem>
                                  )
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Badge Dialog */}
      <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Badge</DialogTitle>
            <DialogDescription>
              Create a custom badge that can be assigned to users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            <div
              className={`p-4 rounded-lg border text-center ${badgeColorBg} ${badgeColorText}`}
            >
              {badgeImagePreview ? (
                <img
                  src={badgeImagePreview}
                  alt="Badge preview"
                  className="w-20 h-20 mx-auto mb-2 rounded object-cover"
                />
              ) : (
                <div className="text-4xl mb-2">{badgeIcon}</div>
              )}
              <p className="font-semibold">{badgeName || "Badge Name"}</p>
              {badgeDescription && (
                <p className="text-xs mt-1 opacity-75">{badgeDescription}</p>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="badge-name">Badge Name</Label>
                <Input
                  id="badge-name"
                  placeholder="e.g., Founding Member"
                  value={badgeName}
                  onChange={(e) => setBadgeName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="badge-description">Description (optional)</Label>
                <Textarea
                  id="badge-description"
                  placeholder="Brief description of this badge"
                  value={badgeDescription}
                  onChange={(e) => setBadgeDescription(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>

              {/* Badge Type Selector - Segmented Control */}
              <div className="space-y-2">
                <Label>Badge Type</Label>
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                    onClick={() => setUseEmojiIcon(false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded transition-all font-medium ${!useEmojiIcon
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>Image</span>
                  </button>
                  <button
                    onClick={() => setUseEmojiIcon(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded transition-all font-medium ${useEmojiIcon
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <Smile className="h-4 w-4" />
                    <span>Emoji</span>
                  </button>
                </div>
              </div>

              {/* Badge Image Upload - PRIMARY */}
              {!useEmojiIcon && (
                <div className="space-y-1">
                  <Label htmlFor="badge-image">Badge Image</Label>
                  <div className="flex gap-2">
                    <Input
                      id="badge-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileSelect(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    {badgeImageFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleImageFileSelect(null)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, or GIF (max 5MB)
                  </p>
                </div>
              )}

              {/* Badge Icon - SECONDARY */}
              {useEmojiIcon && (
                <div className="space-y-1">
                  <Label>Select Icon</Label>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-center py-3 bg-muted rounded">
                      {badgeIcon}
                    </div>
                    {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                      <div key={category} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {category}
                        </p>
                        <div className="grid grid-cols-8 gap-1">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => setBadgeIcon(emoji)}
                              className={`text-xl p-2 rounded transition-all ${badgeIcon === emoji
                                ? "ring-2 ring-primary bg-primary/10 scale-110"
                                : "hover:bg-muted"
                                }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label>Color</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.bg}
                      onClick={() => {
                        setBadgeColorBg(color.bg);
                        setBadgeColorText(color.text);
                      }}
                      className={`p-3 rounded border-2 text-center text-sm font-medium transition-all ${badgeColorBg === color.bg
                        ? "border-primary scale-105"
                        : "border-transparent hover:border-muted-foreground"
                        } ${color.bg} ${color.text}`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBadgeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBadge}
              disabled={creatingBadge || !badgeName.trim()}
            >
              {creatingBadge ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Badge"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
