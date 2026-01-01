import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notifications';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            setNotifications(data || []);
            setUnreadCount(data?.filter(n => !n.read).length || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;

            // Update local state
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            if (error) throw error;

            // Update local state
            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true, read_at: n.read ? n.read_at : new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            toast({
                title: 'Error',
                description: 'Failed to mark notifications as read',
                variant: 'destructive',
            });
        }
    };

    // Delete notification
    const deleteNotification = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;

            // Update local state
            const deletedNotification = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (deletedNotification && !deletedNotification.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete notification',
                variant: 'destructive',
            });
        }
    };

    // Subscribe to real-time notifications
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const setupRealtimeSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Initial fetch
            await fetchNotifications();

            // Set up real-time subscription filtered by user_id
            channel = supabase
                .channel(`notifications:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const newNotification = payload.new as Notification;
                        setNotifications(prev => {
                            // Avoid duplicates
                            if (prev.some(n => n.id === newNotification.id)) {
                                return prev;
                            }
                            return [newNotification, ...prev.slice(0, 19)];
                        });
                        if (!newNotification.read) {
                            setUnreadCount(prev => prev + 1);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const updatedNotification = payload.new as Notification;
                        setNotifications(prev =>
                            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
                        );
                        // Update unread count based on the change
                        setUnreadCount(prev => {
                            const oldNotification = notifications.find(n => n.id === updatedNotification.id);
                            if (oldNotification && !oldNotification.read && updatedNotification.read) {
                                return Math.max(0, prev - 1);
                            } else if (oldNotification && oldNotification.read && !updatedNotification.read) {
                                return prev + 1;
                            }
                            return prev;
                        });
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const deletedId = payload.old.id;
                        setNotifications(prev => {
                            const deleted = prev.find(n => n.id === deletedId);
                            if (deleted && !deleted.read) {
                                setUnreadCount(count => Math.max(0, count - 1));
                            }
                            return prev.filter(n => n.id !== deletedId);
                        });
                    }
                )
                .subscribe();
        };

        setupRealtimeSubscription();

        return () => {
            if (channel) {
                channel.unsubscribe();
            }
        };
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refetch: fetchNotifications,
    };
};
