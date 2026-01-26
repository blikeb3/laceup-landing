import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, X, Heart, Share2, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { getDisplayName, getInitials } from "@/lib/nameUtils";
import DOMPurify from "dompurify";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserBadge, PostComment, PostMediaImage } from "@/types/posts";
import { renderPostContent } from "@/lib/htmlUtils";

interface PostMediaViewerProps {
  images: PostMediaImage[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: PostComment[];
  newComment: string;
  onNewCommentChange: (text: string) => void;
  onPostComment: () => void;
  postAuthorName?: string;
  postContent?: string;
  postTimeAgo?: string;
  authorAvatar?: string;
  postAuthorRole?: string | null;
  postAuthorIsAdmin?: boolean;
  postAuthorBadges?: UserBadge[];
  likeCount?: number;
  liked?: boolean;
  onLike?: () => void;
  bookmarked?: boolean;
  onBookmark?: () => void;
  shareCount?: number;
  onShare?: () => void;
}

export const PostMediaViewer = ({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
  comments,
  newComment,
  onNewCommentChange,
  onPostComment,
  postAuthorName,
  postContent,
  postTimeAgo,
  authorAvatar,
  postAuthorRole,
  postAuthorIsAdmin,
  postAuthorBadges,
  likeCount = 0,
  liked = false,
  onLike,
  bookmarked = false,
  onBookmark,
  shareCount = 0,
  onShare,
}: PostMediaViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const hasImages = images && images.length > 0;

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, open]);

  const handlePrevious = () => {
    if (hasImages) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const handleNext = () => {
    if (hasImages) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  };

  const currentImage = hasImages ? images[currentIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${hasImages ? 'max-w-6xl' : 'max-w-2xl'} w-full max-h-[90vh] p-0 border-0 ${hasImages ? 'bg-black/95' : 'bg-background'} flex gap-0`}>
        <VisuallyHidden asChild>
          <DialogTitle>Post Media and Comments Viewer</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <DialogDescription>View post images and comments</DialogDescription>
        </VisuallyHidden>

        {/* Left Side - Image Gallery (only if images exist) */}
        {hasImages && (
          <div className="flex-1 min-w-0 flex flex-col relative h-[80vh]">
            {/* Image Display */}
            <div className="flex-1 flex items-center justify-center min-w-0 p-4">
              <div className="bg-black/20 border border-border rounded-lg overflow-hidden flex items-center justify-center h-fit w-fit max-h-full max-w-full">
                {currentImage?.media_type.startsWith("image") ? (
                  <img
                    src={currentImage.url}
                    alt={`Image ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain absolute"
                  />
                ) : (
                  <video
                    src={currentImage?.url}
                    controls
                    className="max-w-full max-h-full object-contain absolute"
                  />
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium">
                  {currentIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Right Side - Post Content and Comments */}
        <div className={`${hasImages ? 'w-96' : 'flex-1'} bg-background ${hasImages ? 'border-l border-border' : ''} flex flex-col ${hasImages ? 'h-[80vh]' : 'max-h-[80vh]'} overflow-y-auto`}>
          {/* Post Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={authorAvatar} />
                <AvatarFallback className="bg-secondary text-xs font-semibold">
                  {postAuthorName ? getInitials(postAuthorName.split(' ')[0], postAuthorName.split(' ')[1]) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-1 mb-1">
                  <p className="font-semibold text-sm">{postAuthorName}</p>

                  {postAuthorRole && (
                    <Badge
                      className="text-xs px-1 py-0 bg-navy text-gold border-navy"
                    >
                      {postAuthorRole.charAt(0).toUpperCase() + postAuthorRole.slice(1)}
                    </Badge>
                  )}
                  {postAuthorBadges && postAuthorBadges.length > 0 && postAuthorBadges.map((userBadge) => {
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
                                  className="w-4 h-4 object-contain"
                                />
                              ) : badge.icon ? (
                                <span className="text-sm">{badge.icon}</span>
                              ) : null}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <p className="font-semibold">{badge.name}</p>
                              {badge.description && <p className="text-xs mt-1">{badge.description}</p>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{postTimeAgo}</p>
              </div>
            </div>
            {postContent && (
              <p
                className="text-sm whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: renderPostContent(postContent) }}
              />
            )}
          </div>

          {/* Post Actions */}
          <div className="px-4 py-3 border-b border-border flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLike}
              className={liked ? "text-destructive" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${liked ? "fill-current" : ""}`} />
              {likeCount || 'Like'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {shareCount > 0 ? shareCount : 'Share'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onBookmark}
              className="ml-auto"
            >
              <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
            </Button>
          </div>
          
          {/* Comments Section */}
          <div className="p-4 space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((comment: PostComment) => (
                <div key={comment.id} className="flex space-x-3">
                  <Link to={`/profile/${comment.user_id}`} className="flex-shrink-0">
                    <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={comment.profiles?.avatar_url || undefined} alt={getDisplayName(comment.profiles?.first_name, comment.profiles?.last_name)} />
                      <AvatarFallback className="bg-secondary text-xs font-semibold">
                        {getInitials(comment.profiles?.first_name, comment.profiles?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="bg-secondary/50 rounded-lg p-2">
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        <Link to={`/profile/${comment.user_id}`} className="font-semibold text-xs hover:text-gold transition-colors">
                          {getDisplayName(comment.profiles?.first_name, comment.profiles?.last_name)}
                        </Link>

                        {comment.user_role && (
                          <Badge
                            className="text-xs px-1 py-0 bg-navy text-gold border-navy"
                          >
                            {comment.user_role.charAt(0).toUpperCase() + comment.user_role.slice(1)}
                          </Badge>
                        )}
                        {comment.user_badges && comment.user_badges.length > 0 && comment.user_badges.map((userBadge) => {
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
                                        className="w-4 h-4 object-contain"
                                      />
                                    ) : badge.icon ? (
                                      <span className="text-sm">{badge.icon}</span>
                                    ) : null}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <p className="font-semibold">{badge.name}</p>
                                    {badge.description && <p className="text-xs mt-1">{badge.description}</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                      <p
                        className="text-sm break-words whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: renderPostContent(comment.content) }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input - Sticky */}
          <div className="sticky bottom-0 bg-background p-3 border-t border-border space-y-2">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => onNewCommentChange(e.target.value)}
              rows={1}
              className="resize-none text-sm"
            />
            <Button
              onClick={onPostComment}
              disabled={!newComment.trim()}
              className="w-full bg-gold hover:bg-gold-light text-navy text-sm h-8"
            >
              Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
