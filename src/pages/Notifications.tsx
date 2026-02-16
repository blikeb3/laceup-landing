import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, CheckCheck, Bell, Heart, MessageCircle, Users, Share2, Zap, Briefcase, Mail, Trash2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);

  // Get icon and color based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post_like':
        return { icon: Heart, color: 'text-red-500', bgColor: 'bg-red-50' };
      case 'post_comment':
      case 'post_mention':
        return { icon: MessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-50' };
      case 'message':
        return { icon: Mail, color: 'text-green-500', bgColor: 'bg-green-50' };
      case 'connection_request':
      case 'connection_accepted':
        return { icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-50' };
      case 'endorsement':
        return { icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-50' };
      case 'opportunity':
        return { icon: Briefcase, color: 'text-indigo-500', bgColor: 'bg-indigo-50' };
      case 'post_publish':
        return { icon: Share2, color: 'text-orange-500', bgColor: 'bg-orange-50' };
      default:
        return { icon: Bell, color: 'text-gray-500', bgColor: 'bg-gray-50' };
    }
  };

  const getNotificationType = (type: string) => {
    const typeMap: Record<string, string> = {
      'post_like': 'Like',
      'post_comment': 'Comment',
      'post_mention': 'Mention',
      'message': 'Message',
      'connection_request': 'Connection Request',
      'connection_accepted': 'Connection Accepted',
      'endorsement': 'Endorsement',
      'opportunity': 'Opportunity',
      'post_publish': 'Post Published',
    };
    return typeMap[type] || 'Notification';
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to link if exists
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDeleteClick = (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (notificationToDelete) {
      deleteNotification(notificationToDelete);
    }
    setDeleteConfirmOpen(false);
    setNotificationToDelete(null);
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const NotificationCard = ({ notification }: { notification: any }) => {
    const { icon: IconComponent, color, bgColor } = getNotificationIcon(notification.type);
    const typeLabel = getNotificationType(notification.type);

    return (
      <div
        className={`p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
          !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-4">
          {/* Icon Badge */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
            <IconComponent className={`h-6 w-6 ${color}`} />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {typeLabel}
                  </Badge>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
            Stay updated with all your notifications
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
          <TabsTrigger value="all" className="gap-2 relative">
            <Bell className="h-4 w-4" />
            All Notifications
            {notifications.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
                {notifications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2 relative">
            <Mail className="h-4 w-4" />
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-lg">No notifications yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  When you get notifications, they'll show up here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Unread notifications first */}
              {unreadNotifications.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Unread</h3>
                  {unreadNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </>
              )}

              {/* Read notifications */}
              {readNotifications.length > 0 && (
                <>
                  {unreadNotifications.length > 0 && (
                    <div className="my-6 border-t border-gray-200" />
                  )}
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Earlier</h3>
                  {readNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {unreadNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-lg">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You have no unread notifications
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {unreadNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
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
