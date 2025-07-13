import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { AppState } from 'react-native';
import {
  Notification,
  EnhancedNotification,
  NotificationEventType,
  NotificationDeliveryDecision,
  NotificationStats,
  InAppNotificationPayload,
  NotificationAction,
  NotificationCategory,
  NotificationPriority,
  NotificationDeliveryLog,
  AppState as NotificationAppState,
} from '@/types/notifications';
import { notificationPreferencesService } from './notificationPreferencesService';
import { pushNotificationService } from './pushNotificationService';
import { hybridNotificationRouter } from './hybridNotificationRouter';

export interface NotificationSettings {
  id: string;
  user_id: string;
  direct_messages: boolean;
  group_messages: boolean;
  club_announcements: boolean;
  club_events: boolean;
  join_requests: boolean;
  join_responses: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSubscription {
  id: string;
  user_id: string;
  subscription_type: string;
  subscription_id: string;
  is_active: boolean;
  created_at: string;
}

type NotificationListener = (notification: Notification) => void;
type CountListener = (count: number) => void;

class NotificationService {
  private listeners: Map<string, NotificationListener> = new Map();
  private countListeners: Map<string, CountListener> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private currentUserId: string | null = null;
  private appState: NotificationAppState = 'unknown';
  private notificationHistory: EnhancedNotification[] = [];
  private maxHistorySize = 200;

  // Initialize the service for a user
  async initialize(userId: string) {
    this.currentUserId = userId;
    await this.setupRealtimeSubscriptions();
    await this.refreshUnreadCount();
    await this.loadNotificationHistory();
    this.setupAppStateListener();
  }

  // Cleanup when user logs out
  cleanup() {
    this.listeners.clear();
    this.countListeners.clear();
    this.unsubscribeAll();
    this.currentUserId = null;
    this.appState = 'unknown';
    this.notificationHistory = [];
  }

  // Setup app state listener
  private setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      this.appState = nextAppState === 'active' ? 'foreground' : 'background';
    });

    // Set initial state
    this.appState =
      AppState.currentState === 'active' ? 'foreground' : 'background';
  }

  // Load notification history
  private async loadNotificationHistory() {
    if (!this.currentUserId) return;

    try {
      const notifications = await this.getNotifications(this.maxHistorySize);
      this.notificationHistory = notifications.map((notification) => ({
        ...notification,
        priority_level: 'medium' as NotificationPriority,
        delivery_method: 'in_app' as const,
        can_be_batched: true,
        max_delay_minutes: 0,
        requires_permission: false,
        delivery_status: 'delivered' as const,
        delivery_attempts: 1,
      }));
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  }

  // Set up real-time subscriptions for notifications
  private async setupRealtimeSubscriptions() {
    if (!this.currentUserId) return;

    // Subscribe to notifications changes
    const notificationChannel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.currentUserId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          this.handleNewNotification(notification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.currentUserId}`,
        },
        (payload) => {
          this.refreshUnreadCount();
        }
      )
      .subscribe();

    this.subscriptions.set('notifications', notificationChannel);
  }

  // Handle new notification with smart delivery
  private async handleNewNotification(notification: Notification) {
    // Convert to enhanced notification
    const enhancedNotification = await this.enhanceNotification(notification);

    // Add to history
    this.addToHistory(enhancedNotification);

    // Determine delivery method based on preferences
    const deliveryDecision = await this.getSmartDeliveryDecision(
      notification.user_id,
      notification.type as NotificationEventType
    );

    // Log delivery attempt
    await this.logDeliveryAttempt(notification.id, deliveryDecision);

    // Send push notification if required
    if (deliveryDecision.should_send_push) {
      await pushNotificationService.sendNotificationWithDeliveryDecision(
        notification.user_id,
        notification.type as NotificationEventType,
        notification.title,
        notification.body || notification.message || '',
        {
          notification_id: notification.id,
          action_url: notification.action_url,
          ...notification.data,
        },
        deliveryDecision
      );
    }

    // Notify listeners if should send in-app
    if (deliveryDecision.should_send_in_app) {
      this.listeners.forEach((listener) => {
        listener(notification);
      });
    }

    // Update badge count
    const unreadCount = await this.getUnreadCount();
    await pushNotificationService.updateBadgeCount(unreadCount);

    // Update unread count
    this.refreshUnreadCount();
  }

  // Enhance notification with additional metadata
  private async enhanceNotification(
    notification: Notification
  ): Promise<EnhancedNotification> {
    const config = await notificationPreferencesService.getPriorityConfig(
      notification.type
    );

    return {
      ...notification,
      priority_level: config?.priority_level || 'medium',
      delivery_method: 'in_app',
      can_be_batched: config?.can_be_batched || true,
      max_delay_minutes: config?.max_delay_minutes || 0,
      requires_permission: config?.requires_permission || false,
      delivery_status: 'pending',
      delivery_attempts: 0,
    };
  }

  // Add notification to history
  private addToHistory(notification: EnhancedNotification) {
    this.notificationHistory.unshift(notification);

    // Keep history size limited
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(
        0,
        this.maxHistorySize
      );
    }
  }

  // Get smart delivery decision using hybrid router
  private async getSmartDeliveryDecision(
    userId: string,
    notificationType: NotificationEventType
  ): Promise<NotificationDeliveryDecision> {
    try {
      // Get priority from notification type
      const priority = this.getNotificationPriority(notificationType);

      // Create delivery context
      const context = hybridNotificationRouter.createDeliveryContext(
        userId,
        notificationType,
        priority,
        this.appState
      );

      // Get routing strategy
      const strategy = await hybridNotificationRouter.makeDeliveryDecision(
        context
      );

      // Convert strategy to delivery decision
      const decision =
        hybridNotificationRouter.strategyToDeliveryDecision(strategy);

      console.log(`Notification routing decision for ${notificationType}:`, {
        strategy: strategy.strategy_name,
        reasoning: strategy.reasoning,
        decision: decision.delivery_method,
      });

      return decision;
    } catch (error) {
      console.error('Error in smart delivery decision:', error);
      // Fallback to simple preference-based decision
      return await notificationPreferencesService.getDeliveryDecision(
        userId,
        notificationType,
        this.appState
      );
    }
  }

  // Get notification priority based on type
  private getNotificationPriority(
    notificationType: NotificationEventType
  ): NotificationPriority {
    switch (notificationType) {
      case 'emergency_blood_request':
        return 'urgent';
      case 'club_announcement_urgent':
        return 'urgent';
      case 'direct_message':
      case 'club_message':
        return 'high';
      case 'club_announcement':
      case 'club_event':
      case 'join_request':
        return 'medium';
      case 'social_interaction':
      case 'system_update':
        return 'low';
      default:
        return 'medium';
    }
  }

  // Update user activity when interacting with notifications
  updateUserActivity(
    userId: string,
    interactionType: 'tap' | 'scroll' | 'type' | 'navigate'
  ): void {
    hybridNotificationRouter.updateUserActivity(userId, interactionType);
  }

  // Get routing metrics for analytics
  getRoutingMetrics() {
    return hybridNotificationRouter.getRoutingMetrics();
  }

  // Log delivery attempt
  private async logDeliveryAttempt(
    notificationId: string,
    deliveryDecision: NotificationDeliveryDecision
  ) {
    if (!this.currentUserId) return;

    try {
      await supabase.from('notification_delivery_log').insert({
        notification_id: notificationId,
        user_id: this.currentUserId,
        delivery_method: deliveryDecision.delivery_method,
        delivery_status: 'sent',
        delivery_attempt: 1,
        delivered_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging delivery attempt:', error);
    }
  }

  // Get all notifications for current user
  async getNotifications(
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    if (!this.currentUserId) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', this.currentUserId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  }

  // Get enhanced notifications with filtering and sorting
  async getEnhancedNotifications(
    options: {
      limit?: number;
      offset?: number;
      priority?: NotificationPriority;
      category?: NotificationCategory;
      unreadOnly?: boolean;
      type?: NotificationEventType;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<EnhancedNotification[]> {
    const {
      limit = 50,
      offset = 0,
      priority,
      category,
      unreadOnly,
      type,
      startDate,
      endDate,
    } = options;

    if (!this.currentUserId) return [];

    // First get notifications
    let notificationQuery = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', this.currentUserId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false });

    // Apply filters
    if (unreadOnly) {
      notificationQuery = notificationQuery.eq('is_read', false);
    }

    if (type) {
      notificationQuery = notificationQuery.eq('type', type);
    }

    if (startDate) {
      notificationQuery = notificationQuery.gte('created_at', startDate);
    }

    if (endDate) {
      notificationQuery = notificationQuery.lte('created_at', endDate);
    }

    // Apply pagination
    notificationQuery = notificationQuery.range(offset, offset + limit - 1);

    const { data: notifications, error: notificationError } =
      await notificationQuery;

    if (notificationError) {
      console.error('Error fetching notifications:', notificationError);
      return [];
    }

    // Get priority configs for all notification types
    const { data: priorityConfigs, error: priorityError } = await supabase
      .from('notification_priority_config')
      .select('*');

    if (priorityError) {
      console.error('Error fetching priority configs:', priorityError);
      return [];
    }

    // Create a lookup map for priority configs
    const priorityConfigMap = new Map();
    priorityConfigs?.forEach((config) => {
      priorityConfigMap.set(config.notification_type, config);
    });

    // Enhance notifications with priority config data
    const enhancedNotifications = (notifications || []).map(
      (notification: any) => {
        const priorityConfig = priorityConfigMap.get(notification.type);

        return {
          ...notification,
          priority_level: priorityConfig?.priority_level || 'medium',
          delivery_method: 'in_app' as const,
          can_be_batched: priorityConfig?.can_be_batched || true,
          max_delay_minutes: priorityConfig?.max_delay_minutes || 0,
          requires_permission: priorityConfig?.requires_permission || false,
          delivery_status: 'delivered' as const,
          delivery_attempts: 1,
        };
      }
    );

    // Apply priority filter if specified
    if (priority) {
      return enhancedNotifications.filter(
        (notification) => notification.priority_level === priority
      );
    }

    return enhancedNotifications;
  }

  // Get grouped notifications
  async getGroupedNotifications(
    groupBy: 'type' | 'priority' | 'date' | 'category' = 'type'
  ): Promise<Record<string, EnhancedNotification[]>> {
    const notifications = await this.getEnhancedNotifications({ limit: 100 });

    const grouped: Record<string, EnhancedNotification[]> = {};

    notifications.forEach((notification) => {
      let key: string;

      switch (groupBy) {
        case 'type':
          key = notification.type;
          break;
        case 'priority':
          key = notification.priority_level;
          break;
        case 'date':
          key = new Date(notification.created_at).toDateString();
          break;
        case 'category':
          key = this.getCategoryFromType(notification.type);
          break;
        default:
          key = notification.type;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(notification);
    });

    return grouped;
  }

  // Get category from notification type
  private getCategoryFromType(type: string): string {
    if (type.includes('emergency')) return 'emergency';
    if (type.includes('message')) return 'messages';
    if (type.includes('announcement')) return 'announcements';
    if (type.includes('event')) return 'events';
    if (type.includes('social')) return 'social';
    if (type.includes('system')) return 'system';
    return 'other';
  }

  // Get notification statistics
  async getNotificationStats(): Promise<NotificationStats> {
    if (!this.currentUserId) {
      return {
        total_notifications: 0,
        unread_count: 0,
        delivered_count: 0,
        failed_count: 0,
        push_count: 0,
        in_app_count: 0,
        by_type: {},
        by_priority: {},
      };
    }

    try {
      const [
        totalResult,
        unreadResult,
        deliveryStatsResult,
        typeStatsResult,
        priorityStatsResult,
      ] = await Promise.all([
        // Total notifications
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', this.currentUserId),

        // Unread count
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', this.currentUserId)
          .eq('is_read', false),

        // Delivery stats
        supabase
          .from('notification_delivery_log')
          .select('delivery_method, delivery_status')
          .eq('user_id', this.currentUserId),

        // Type stats
        supabase
          .from('notifications')
          .select('type')
          .eq('user_id', this.currentUserId),

        // Priority stats - get all notifications first
        supabase
          .from('notifications')
          .select('type')
          .eq('user_id', this.currentUserId),
      ]);

      const deliveryStats = deliveryStatsResult.data || [];
      const typeStats = typeStatsResult.data || [];
      const priorityStats = priorityStatsResult.data || [];

      const by_type = typeStats.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get priority configs to map notification types to priorities
      const { data: priorityConfigs } = await supabase
        .from('notification_priority_config')
        .select('*');

      const priorityConfigMap = new Map();
      priorityConfigs?.forEach((config) => {
        priorityConfigMap.set(config.notification_type, config);
      });

      const by_priority = priorityStats.reduce((acc, item: any) => {
        const priorityConfig = priorityConfigMap.get(item.type);
        const priority = priorityConfig?.priority_level || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total_notifications: totalResult.count || 0,
        unread_count: unreadResult.count || 0,
        delivered_count: deliveryStats.filter(
          (d) => d.delivery_status === 'delivered'
        ).length,
        failed_count: deliveryStats.filter(
          (d) => d.delivery_status === 'failed'
        ).length,
        push_count: deliveryStats.filter((d) => d.delivery_method === 'push')
          .length,
        in_app_count: deliveryStats.filter(
          (d) => d.delivery_method === 'in_app'
        ).length,
        by_type,
        by_priority,
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        total_notifications: 0,
        unread_count: 0,
        delivered_count: 0,
        failed_count: 0,
        push_count: 0,
        in_app_count: 0,
        by_type: {},
        by_priority: {},
      };
    }
  }

  // Get unread notification count
  async getUnreadCount(): Promise<number> {
    if (!this.currentUserId) return 0;

    const { data, error } = await supabase.rpc('get_unread_notification_count');

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return data || 0;
  }

  // Refresh and broadcast unread count
  private async refreshUnreadCount() {
    const count = await this.getUnreadCount();
    this.countListeners.forEach((listener) => {
      listener(count);
    });
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      notification_id: notificationId,
    });

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    await this.refreshUnreadCount();
    return data || false;
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<number> {
    const { data, error } = await supabase.rpc('mark_all_notifications_read');

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }

    await this.refreshUnreadCount();
    return data || 0;
  }

  // Dismiss notification
  async dismissNotification(notificationId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('dismiss_notification', {
      notification_id: notificationId,
    });

    if (error) {
      console.error('Error dismissing notification:', error);
      return false;
    }

    await this.refreshUnreadCount();
    return data || false;
  }

  // Navigate to direct message conversation
  private async navigateToDirectMessage(
    conversationId: string,
    fallbackUserId?: string
  ) {
    try {
      // Get conversation participants to find the other user
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', this.currentUserId);

      if (error || !participants || participants.length === 0) {
        console.error('Error getting conversation participants:', error);
        router.push('/(tabs)/clubs' as any);
        return;
      }

      const otherUserId = participants[0].user_id;

      // Find clubs where both users are members
      const { data: otherUserClubs, error: otherClubError } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', otherUserId)
        .eq('status', 'approved');

      if (otherClubError || !otherUserClubs || otherUserClubs.length === 0) {
        console.log('Other user has no clubs, navigating to clubs list');
        router.push('/(tabs)/clubs' as any);
        return;
      }

      const otherUserClubIds = otherUserClubs.map((c) => c.club_id);

      // Find a shared club
      const { data: sharedClubs, error: sharedClubError } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', this.currentUserId)
        .eq('status', 'approved')
        .in('club_id', otherUserClubIds)
        .limit(1);

      if (sharedClubs && sharedClubs.length > 0) {
        const clubId = sharedClubs[0].club_id;
        console.log(
          `Navigating to direct message: /(tabs)/clubs/${clubId}/direct-message/${otherUserId}`
        );
        router.push(
          `/(tabs)/clubs/${clubId}/direct-message/${otherUserId}` as any
        );
      } else {
        console.log('No shared club found, navigating to clubs list');
        router.push('/(tabs)/clubs' as any);
      }
    } catch (error) {
      console.error('Error navigating to direct message:', error);
      router.push('/(tabs)/clubs' as any);
    }
  }

  // Handle notification tap/click - navigate to appropriate screen
  handleNotificationTap(notification: Notification) {
    console.log('Handling notification tap:', notification);

    // Mark as read first
    this.markAsRead(notification.id);

    try {
      // Navigate based on action URL or notification type
      if (notification.action_url) {
        console.log('Navigating to action URL:', notification.action_url);

        // Check if the action URL is valid and specific
        if (
          notification.action_url.includes('/direct-message/') ||
          notification.action_url.includes('/chat') ||
          notification.action_url.includes('/announcements') ||
          notification.action_url.includes('/events') ||
          notification.action_url.includes('/members')
        ) {
          // This is a specific URL, navigate directly
          router.push(notification.action_url as any);
        } else if (
          notification.action_url === '/(tabs)/clubs' &&
          notification.type === 'direct_message'
        ) {
          // Generic clubs URL for direct message - try to be more specific
          if (
            notification.related_id &&
            notification.related_type === 'conversation'
          ) {
            this.navigateToDirectMessage(notification.related_id);
          } else {
            router.push(notification.action_url as any);
          }
        } else {
          // Use the action URL as provided
          router.push(notification.action_url as any);
        }
      } else {
        // Fallback navigation based on type (for notifications without action_url)
        switch (notification.type) {
          case 'direct_message':
            if (
              notification.related_id &&
              notification.related_type === 'conversation'
            ) {
              console.log(
                'Navigating to direct message conversation:',
                notification.related_id
              );
              this.navigateToDirectMessage(notification.related_id);
            } else {
              router.push('/(tabs)/clubs' as any);
            }
            break;
          case 'group_message':
            if (notification.related_id) {
              console.log('Navigating to club chat:', notification.related_id);
              router.push(
                `/(tabs)/clubs/${notification.related_id}/chat` as any
              );
            } else {
              router.push('/(tabs)/clubs' as any);
            }
            break;
          case 'club_announcement':
            if (notification.related_id) {
              console.log(
                'Navigating to club announcements:',
                notification.related_id
              );
              router.push(
                `/(tabs)/clubs/${notification.related_id}/announcements` as any
              );
            } else {
              router.push('/(tabs)/clubs' as any);
            }
            break;
          case 'club_event':
            if (notification.related_id) {
              console.log(
                'Navigating to club events:',
                notification.related_id
              );
              router.push(
                `/(tabs)/clubs/${notification.related_id}/events` as any
              );
            } else {
              router.push('/(tabs)/clubs' as any);
            }
            break;
          case 'join_request':
          case 'join_approved':
          case 'join_rejected':
            if (notification.related_id) {
              console.log(
                'Navigating to club for join status:',
                notification.related_id
              );
              router.push(`/(tabs)/clubs/${notification.related_id}` as any);
            } else {
              router.push('/(tabs)/clubs' as any);
            }
            break;
          default:
            console.log('Default navigation to clubs');
            router.push('/(tabs)/clubs' as any);
        }
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
      // Fallback to main tabs screen
      router.push('/(tabs)');
    }
  }

  // Get user notification settings
  async getNotificationSettings(): Promise<NotificationSettings | null> {
    if (!this.currentUserId) return null;

    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', this.currentUserId)
      .single();

    if (error) {
      // If no settings exist, create default ones
      if (error.code === 'PGRST116') {
        return await this.createDefaultSettings();
      }
      console.error('Error fetching notification settings:', error);
      return null;
    }

    return data;
  }

  // Create default notification settings
  private async createDefaultSettings(): Promise<NotificationSettings | null> {
    if (!this.currentUserId) return null;

    const { data, error } = await supabase
      .from('user_notification_settings')
      .insert({
        user_id: this.currentUserId,
        direct_messages: true,
        group_messages: true,
        club_announcements: true,
        club_events: true,
        join_requests: true,
        join_responses: true,
        email_notifications: false,
        push_notifications: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating default notification settings:', error);
      return null;
    }

    return data;
  }

  // Update notification settings
  async updateNotificationSettings(
    settings: Partial<NotificationSettings>
  ): Promise<boolean> {
    if (!this.currentUserId) return false;

    const { error } = await supabase
      .from('user_notification_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }

    return true;
  }

  // Subscribe to notifications
  async subscribeToNotifications(type: string, id: string): Promise<boolean> {
    if (!this.currentUserId) return false;

    const { error } = await supabase.from('notification_subscriptions').upsert({
      user_id: this.currentUserId,
      subscription_type: type,
      subscription_id: id,
      is_active: true,
    });

    if (error) {
      console.error('Error subscribing to notifications:', error);
      return false;
    }

    return true;
  }

  // Unsubscribe from notifications
  async unsubscribeFromNotifications(
    type: string,
    id: string
  ): Promise<boolean> {
    if (!this.currentUserId) return false;

    const { error } = await supabase
      .from('notification_subscriptions')
      .update({ is_active: false })
      .eq('user_id', this.currentUserId)
      .eq('subscription_type', type)
      .eq('subscription_id', id);

    if (error) {
      console.error('Error unsubscribing from notifications:', error);
      return false;
    }

    return true;
  }

  // Add listener for new notifications
  addNotificationListener(id: string, listener: NotificationListener) {
    this.listeners.set(id, listener);
  }

  // Remove notification listener
  removeNotificationListener(id: string) {
    this.listeners.delete(id);
  }

  // Add listener for unread count changes
  addCountListener(id: string, listener: CountListener) {
    this.countListeners.set(id, listener);
  }

  // Remove count listener
  removeCountListener(id: string) {
    this.countListeners.delete(id);
  }

  // Unsubscribe from all real-time channels
  private unsubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }

  // Helper to get notification icon based on type
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'direct_message':
        return 'message-circle';
      case 'group_message':
        return 'users';
      case 'club_announcement':
        return 'megaphone';
      case 'club_event':
        return 'calendar';
      case 'join_request':
        return 'user-plus';
      case 'join_approved':
        return 'check-circle';
      case 'join_rejected':
        return 'x-circle';
      default:
        return 'bell';
    }
  }

  // Helper to get notification color based on type
  getNotificationColor(type: string): string {
    switch (type) {
      case 'direct_message':
        return '#3B82F6'; // Blue
      case 'group_message':
        return '#8B5CF6'; // Purple
      case 'club_announcement':
        return '#F59E0B'; // Amber
      case 'club_event':
        return '#10B981'; // Emerald
      case 'join_request':
        return '#DC2626'; // Red
      case 'join_approved':
        return '#10B981'; // Green
      case 'join_rejected':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }

  // Helper to format notification time
  formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
