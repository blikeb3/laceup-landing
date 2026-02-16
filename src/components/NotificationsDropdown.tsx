import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, CheckCheck, Bell, Heart, MessageCircle, Users, Share2, Zap, Briefcase, Mail, MessageSquare } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

export const NotificationsDropdown = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    // Get icon and color based on notification type
    const getNotificationIcon = (type: string) => {
        switch(type) {
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

    const handleNotificationClick = (notification: any) => {
        // Mark as read
        if (!notification.read) {
            markAsRead(notification.id);
        }

        // Navigate to link if exists
        if (notification.link) {
            navigate(notification.link);
            setOpen(false);
        }
    };

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        markAllAsRead();
    };

    const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        deleteNotification(notificationId);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-white/10 transition-all">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-96 bg-white shadow-lg border border-gray-200 rounded-lg p-0 mt-2"
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-gray-700" />
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="text-xs text-navy hover:text-navy-light"
                        >
                            <CheckCheck className="h-4 w-4 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => {
                                const { icon: IconComponent, color, bgColor } = getNotificationIcon(notification.type);
                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group ${!notification.read ? 'bg-blue-50' : ''
                                            }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon Badge */}
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                <IconComponent className={`h-5 w-5 ${color}`} />
                                            </div>
                                            
                                            {/* Text Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
                                                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                            
                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notification.id);
                                                        }}
                                                        className="p-1 hover:bg-gray-200 rounded"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="h-4 w-4 text-gray-600" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDeleteNotification(e, notification.id)}
                                                    className="p-1 hover:bg-gray-200 rounded"
                                                    title="Delete"
                                                >
                                                    <X className="h-4 w-4 text-gray-600" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
