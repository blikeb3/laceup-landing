import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Share2, Bookmark, Edit2, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreVertical } from "lucide-react";
import { getDisplayName, getInitials } from "@/lib/nameUtils";
import { PostMediaViewer } from "@/components/PostMediaViewer";
import { fetchMultipleUserRoles } from "@/lib/roleUtils";
import {
  UserBadge,
  PostComment,
  PostMedia,
  ProfileInfo,
  RawPostComment
} from "@/types/posts";
import { renderPostContent } from "@/lib/htmlUtils";
import { notifyPostLike, notifyPostComment } from "@/lib/notificationHelpers";

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    media_url: string | null;
    media_type: string | null;
    published_at: string;
    profiles: ProfileInfo | null;
    user_role?: string | null;
    user_is_admin?: boolean;
    user_badges?: UserBadge[];
    post_likes: { id: string; user_id: string }[];
    post_comments: PostComment[];
    post_bookmarks: { id: string; user_id: string }[];
    post_shares: { id: string }[];
    post_media?: PostMedia[];
  };
  onUpdate: () => void;
  currentUserId?: string;
  isDraft?: boolean;
  isHighlighted?: boolean;
}

export const PostCard = ({ post, onUpdate, currentUserId, isDraft = false, isHighlighted = false }: PostCardProps) => {
  const [liked, setLiked] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [newComment, setNewComment] = useState<string>("");
  const [comments, setComments] = useState<Array<PostComment>>(post.post_comments || []);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>(post.content);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);
  const { toast } = useToast();

  // Get media array - prefer post_media if available, otherwise use legacy media_url
  const mediaItems: PostMedia[] = post.post_media && post.post_media.length > 0
    ? post.post_media
    : (post.media_url
      ? [{ media_url: post.media_url, media_type: post.media_type || 'image' }]
      : []);

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        profiles!post_comments_user_id_fkey(first_name, last_name, avatar_url)
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Get user roles and badges for all commenters
      const userIds = [...new Set(data.map((comment: RawPostComment) => comment.user_id))];

      const [rolesMap, { data: badgesData }] = await Promise.all([
        fetchMultipleUserRoles(userIds),
        supabase
          .from('user_badges')
          .select(`
            id,
            user_id,
            badge_id,
            created_at,
            badges(id, name, description, icon, image_url, color_bg, color_text, is_active)
          `)
          .in('user_id', userIds)
      ]);

      const badgesMap = new Map<string, UserBadge[]>();
      badgesData?.forEach((ub: UserBadge) => {
        if (!badgesMap.has(ub.user_id)) {
          badgesMap.set(ub.user_id, []);
        }
        badgesMap.get(ub.user_id)!.push(ub);
      });

      const enrichedComments = data.map((comment: RawPostComment): PostComment => {
        const userRoles = rolesMap.get(comment.user_id);
        return {
          ...comment,
          user_role: userRoles?.baseRole ?? null,
          user_is_admin: userRoles?.hasAdminRole ?? false,
          user_badges: badgesMap.get(comment.user_id) || []
        };
      });

      setComments(enrichedComments);
    }
  }, [post.id]);

  useEffect(() => {
    if (currentUserId) {
      setLiked(post.post_likes.some(like => like.user_id === currentUserId));
      setBookmarked(post.post_bookmarks.some(bookmark => bookmark.user_id === currentUserId));
    }
  }, [post, currentUserId]);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments, fetchComments]);

  // Fetch comments on component mount to ensure roles and badges are loaded
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleLike = async () => {
    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like posts",
        variant: "destructive",
      });
      return;
    }

    try {
      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);

        if (error) throw error;
        setLiked(false);
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: currentUserId });

        if (error) throw error;
        setLiked(true);

        // Send notification to post author (don't notify if liking own post)
        if (post.user_id !== currentUserId) {
          // Get current user's name for the notification
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', currentUserId)
            .single();

          if (currentUserProfile) {
            const likerName = getDisplayName(
              currentUserProfile.first_name,
              currentUserProfile.last_name
            );
            await notifyPostLike(post.user_id, likerName, post.id);
          }
        }
      }
      onUpdate();
    } catch (error: unknown) {
      console.error('Error toggling like:', error);
      let message = 'Failed to update like';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleComment = async () => {
    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to comment",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          content: newComment,
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      onUpdate();

      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });

      // Send notification to post author (don't notify if commenting on own post)
      if (post.user_id !== currentUserId) {
        // Get current user's name for the notification
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', currentUserId)
          .single();

        if (currentUserProfile) {
          const commenterName = getDisplayName(
            currentUserProfile.first_name,
            currentUserProfile.last_name
          );
          await notifyPostComment(post.user_id, commenterName, post.id);
        }
      }
    } catch (error: unknown) {
      console.error('Error adding comment:', error);
      let message = 'Failed to add comment';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to share posts",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('post_shares')
        .insert({ post_id: post.id, user_id: currentUserId });

      if (error) throw error;

      // Copy link to clipboard
      const postUrl = `${window.location.origin}/home?post=${post.id}`;
      await navigator.clipboard.writeText(postUrl);

      toast({
        title: "Post shared",
        description: "Link copied to clipboard",
      });

      onUpdate();
    } catch (error: unknown) {
      console.error('Error sharing post:', error);
      let message = 'Failed to share post';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleBookmark = async () => {
    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to bookmark posts",
        variant: "destructive",
      });
      return;
    }

    try {
      if (bookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('post_bookmarks')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);

        if (error) throw error;
        setBookmarked(false);
        toast({
          title: "Bookmark removed",
          description: "Post removed from your bookmarks",
        });
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('post_bookmarks')
          .insert({ post_id: post.id, user_id: currentUserId });

        if (error) throw error;
        setBookmarked(true);
        toast({
          title: "Post bookmarked",
          description: "Post saved to your bookmarks",
        });
      }
      onUpdate();
    } catch (error: unknown) {
      console.error('Error toggling bookmark:', error);
      let message = 'Failed to update bookmark';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast({
        title: "Empty content",
        description: "Post content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent })
        .eq('id', post.id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      toast({
        title: "Post updated",
        description: "Your post has been updated successfully",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error: unknown) {
      console.error('Error updating post:', error);
      let message = 'Failed to update post';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post has been deleted",
      });

      onUpdate();
    } catch (error: unknown) {
      console.error('Error deleting post:', error);
      let message = 'Failed to delete post';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handlePublishDraft = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          is_published: true,
          published_at: new Date().toISOString()
        })
        .eq('id', post.id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      toast({
        title: "Post published",
        description: "Your draft has been published",
      });

      onUpdate();
    } catch (error: unknown) {
      console.error('Error publishing draft:', error);
      let message = 'Failed to publish draft';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const renderContent = () => {
    const sanitizedContent = renderPostContent(post.content);
    return <p className="mt-3 text-foreground whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
  };

  const authorName = getDisplayName(post.profiles?.first_name, post.profiles?.last_name);
  const authorInitials = getInitials(post.profiles?.first_name, post.profiles?.last_name);
  const timeAgo = formatDistanceToNow(new Date(post.published_at), { addSuffix: true });

  return (
    <Card
      id={`post-${post.id}`}
      className={`p-6 mb-4 animate-slide-up hover:shadow-lg transition-shadow overflow-hidden ${isHighlighted ? 'ring-2 ring-gold animate-pulse' : ''}`}
    >
      <div className="flex items-start space-x-3">
        <Link to={`/profile/${post.user_id}`} className="flex-shrink-0">
          <Avatar className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={post.profiles?.avatar_url || undefined} alt={authorName} />
            <AvatarFallback className="bg-secondary text-primary font-semibold">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Link to={`/profile/${post.user_id}`} className="font-semibold text-foreground hover:text-gold transition-colors">
                  {authorName}
                </Link>
                {post.user_is_admin && (
                  <Badge
                    variant="destructive"
                    className="text-xs px-1.5 py-0.5"
                  >
                    Admin
                  </Badge>
                )}
                {post.user_role && (
                  <Badge
                    className="text-xs px-1.5 py-0.5 bg-navy text-gold border-navy"
                  >
                    {post.user_role.charAt(0).toUpperCase() + post.user_role.slice(1)}
                  </Badge>
                )}
                {post.user_badges && post.user_badges.map((userBadge) => {
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
              <p className="text-xs text-muted-foreground">
                {timeAgo}
                {isDraft && <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded">Draft</span>}
              </p>
            </div>

            {currentUserId === post.user_id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isDraft && (
                    <DropdownMenuItem onClick={handlePublishDraft}>
                      <Send className="mr-2 h-4 w-4" />
                      Publish
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing ? (
            <div className="mt-3">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="mb-2"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(post.content);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-gold hover:bg-gold-light text-navy"
                  onClick={handleEdit}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            renderContent()
          )}

          {mediaItems.length > 0 && (
            <>
              {/* Multi-image gallery grid */}
              <div className="mt-4">
                {mediaItems.length === 1 ? (
                  // Single image - full width
                  <div
                    onClick={() => {
                      setGalleryIndex(0);
                      setShowGallery(true);
                    }}
                    className="cursor-pointer rounded-lg overflow-hidden"
                  >
                    {mediaItems[0].media_type === 'video' ? (
                      <video
                        src={mediaItems[0].media_url}
                        controls
                        className="w-full max-h-96 object-cover"
                      />
                    ) : (
                      <img
                        src={mediaItems[0].media_url}
                        alt="Post media"
                        className="w-full max-h-96 object-cover hover:opacity-90 transition-opacity"
                      />
                    )}
                  </div>
                ) : mediaItems.length === 2 ? (
                  // Two images - side by side
                  <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                    {mediaItems.map((media, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setGalleryIndex(idx);
                          setShowGallery(true);
                        }}
                        className="cursor-pointer overflow-hidden"
                      >
                        {media.media_type === 'video' ? (
                          <video
                            src={media.media_url}
                            className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <img
                            src={media.media_url}
                            alt={`Post media ${idx + 1}`}
                            className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : mediaItems.length === 3 ? (
                  // Three images - one large + two small
                  <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                    <div
                      onClick={() => {
                        setGalleryIndex(0);
                        setShowGallery(true);
                      }}
                      className="col-span-1 row-span-2 cursor-pointer overflow-hidden"
                    >
                      {mediaItems[0].media_type === 'video' ? (
                        <video
                          src={mediaItems[0].media_url}
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <img
                          src={mediaItems[0].media_url}
                          alt="Post media 1"
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        />
                      )}
                    </div>
                    {mediaItems.slice(1, 3).map((media, idx) => (
                      <div
                        key={idx + 1}
                        onClick={() => {
                          setGalleryIndex(idx + 1);
                          setShowGallery(true);
                        }}
                        className="cursor-pointer overflow-hidden"
                      >
                        {media.media_type === 'video' ? (
                          <video
                            src={media.media_url}
                            className="w-full h-24 object-cover hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <img
                            src={media.media_url}
                            alt={`Post media ${idx + 2}`}
                            className="w-full h-24 object-cover hover:opacity-90 transition-opacity"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Four or more images
                  <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                    {mediaItems.slice(0, 4).map((media, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setGalleryIndex(idx);
                          setShowGallery(true);
                        }}
                        className="relative cursor-pointer overflow-hidden"
                      >
                        {media.media_type === 'video' ? (
                          <video
                            src={media.media_url}
                            className="w-full h-24 object-cover hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <img
                            src={media.media_url}
                            alt={`Post media ${idx + 1}`}
                            className="w-full h-24 object-cover hover:opacity-90 transition-opacity"
                          />
                        )}
                        {/* +N indicator for remaining images */}
                        {idx === 3 && mediaItems.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">
                              +{mediaItems.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Combined Media + Comments Viewer */}
              <PostMediaViewer
                images={mediaItems.map(item => ({ url: item.media_url, media_type: item.media_type }))}
                initialIndex={galleryIndex}
                open={showGallery}
                onOpenChange={setShowGallery}
                comments={comments}
                newComment={newComment}
                onNewCommentChange={setNewComment}
                onPostComment={handleComment}
                postAuthorName={authorName}
                postContent={post.content}
                postTimeAgo={timeAgo}
                authorAvatar={post.profiles?.avatar_url}
                postAuthorRole={post.user_role}
                postAuthorIsAdmin={post.user_is_admin}
                postAuthorBadges={post.user_badges}
                likeCount={post.post_likes.length}
                liked={liked}
                onLike={handleLike}
                bookmarked={bookmarked}
                onBookmark={handleBookmark}
                shareCount={post.post_shares.length}
                onShare={handleShare}
              />
            </>
          )}

          {/* PostMediaViewer for posts without images - always render so comments dialog works */}
          {mediaItems.length === 0 && (
            <PostMediaViewer
              images={mediaItems.map(item => ({ url: item.media_url, media_type: item.media_type }))}
              initialIndex={0}
              open={showGallery}
              onOpenChange={setShowGallery}
              comments={comments}
              newComment={newComment}
              onNewCommentChange={setNewComment}
              onPostComment={handleComment}
              postAuthorName={authorName}
              postContent={post.content}
              postTimeAgo={timeAgo}
              authorAvatar={post.profiles?.avatar_url}
              postAuthorRole={post.user_role}
              postAuthorIsAdmin={post.user_is_admin}
              postAuthorBadges={post.user_badges}
              likeCount={post.post_likes.length}
              liked={liked}
              onLike={handleLike}
              bookmarked={bookmarked}
              onBookmark={handleBookmark}
              shareCount={post.post_shares.length}
              onShare={handleShare}
            />
          )}

          {!isDraft && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`px-2 sm:px-3 ${liked ? "text-destructive" : ""}`}
                >
                  <Heart className={`h-4 w-4 mr-1 sm:mr-2 ${liked ? "fill-current" : ""}`} />
                  {post.post_likes.length}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 sm:px-3"
                  onClick={() => {
                    setShowGallery(true);
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-1 sm:mr-2" />
                  {comments.length}
                </Button>

                <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{post.post_shares.length > 0 ? post.post_shares.length : 'Share'}</span>
                  <span className="sm:hidden">{post.post_shares.length || ''}</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3 flex-shrink-0"
                onClick={handleBookmark}
              >
                <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
