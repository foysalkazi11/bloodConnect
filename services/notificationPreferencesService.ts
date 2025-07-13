import { supabase } from '@/lib/supabase';
import {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  NotificationPriorityConfig,
  NotificationDeliveryDecision,
  NotificationContext,
  NotificationEventType,
  AppState,
} from '@/types/notifications';

export class NotificationPreferencesService {
  private static instance: NotificationPreferencesService;
  private preferencesCache: Map<string, NotificationPreferences> = new Map();
  private priorityConfigCache: Map<string, NotificationPriorityConfig> =
    new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): NotificationPreferencesService {
    if (!NotificationPreferencesService.instance) {
      NotificationPreferencesService.instance =
        new NotificationPreferencesService();
    }
    return NotificationPreferencesService.instance;
  }

  /**
   * Get user notification preferences with caching
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // Check cache first
    const cacheKey = `prefs_${userId}`;
    const cached = this.preferencesCache.get(cacheKey);
    const cacheTime = this.cacheExpiry.get(cacheKey) || 0;

    if (cached && Date.now() - cacheTime < this.CACHE_TTL) {
      return cached;
    }

    try {
      // Use the database function to get preferences with defaults
      const { data, error } = await supabase
        .rpc('get_user_notification_preferences', { p_user_id: userId })
        .single();

      if (error) {
        console.error('Error fetching user preferences:', error);
        throw error;
      }

      // Transform the data to match our interface
      const dbData = data as any; // Type assertion for database response
      const preferences: NotificationPreferences = {
        id: dbData.id || '',
        user_id: dbData.user_id,
        push_enabled: dbData.push_enabled,
        in_app_enabled: dbData.in_app_enabled,
        sound_enabled: dbData.sound_enabled,
        vibration_enabled: dbData.vibration_enabled,
        quiet_hours_enabled: dbData.quiet_hours_enabled,
        quiet_hours_start: dbData.quiet_hours_start,
        quiet_hours_end: dbData.quiet_hours_end,
        emergency_notifications: dbData.emergency_notifications,
        direct_messages: dbData.direct_messages,
        club_messages: dbData.club_messages,
        club_announcements: dbData.club_announcements,
        club_events: dbData.club_events,
        join_requests: dbData.join_requests,
        social_interactions: dbData.social_interactions,
        system_updates: dbData.system_updates,
        emergency_only_mode: dbData.emergency_only_mode,
        batch_notifications: dbData.batch_notifications,
        created_at: dbData.created_at || new Date().toISOString(),
        updated_at: dbData.updated_at || new Date().toISOString(),
      };

      // Cache the result
      this.preferencesCache.set(cacheKey, preferences);
      this.cacheExpiry.set(cacheKey, Date.now());

      return preferences;
    } catch (error) {
      console.error('Error in getUserPreferences:', error);

      // Return default preferences if error occurs
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: NotificationPreferencesUpdate
  ): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating user preferences:', error);
        throw error;
      }

      // Clear cache for this user
      this.clearUserCache(userId);

      // Return updated preferences
      return this.getUserPreferences(userId);
    } catch (error) {
      console.error('Error in updateUserPreferences:', error);
      throw error;
    }
  }

  /**
   * Get notification priority configuration
   */
  async getPriorityConfig(
    notificationType: string
  ): Promise<NotificationPriorityConfig | null> {
    // Check cache first
    const cached = this.priorityConfigCache.get(notificationType);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('notification_priority_config')
        .select('*')
        .eq('notification_type', notificationType)
        .single();

      if (error) {
        console.error('Error fetching priority config:', error);
        return null;
      }

      // Cache the result
      this.priorityConfigCache.set(notificationType, data);

      return data;
    } catch (error) {
      console.error('Error in getPriorityConfig:', error);
      return null;
    }
  }

  /**
   * Determine notification delivery method based on preferences and context
   */
  async getDeliveryDecision(
    userId: string,
    notificationType: NotificationEventType,
    appState: AppState = 'unknown'
  ): Promise<NotificationDeliveryDecision> {
    try {
      const { data, error } = await supabase
        .rpc('get_notification_delivery_method', {
          p_user_id: userId,
          p_notification_type: notificationType,
          p_app_state: appState,
        })
        .single();

      if (error) {
        console.error('Error getting delivery decision:', error);
        // Return default decision
        return {
          should_send_push: false,
          should_send_in_app: true,
          delivery_method: 'in_app',
        };
      }

      const dbData = data as any; // Type assertion for database response
      return {
        should_send_push: dbData.should_send_push,
        should_send_in_app: dbData.should_send_in_app,
        delivery_method: dbData.delivery_method,
      };
    } catch (error) {
      console.error('Error in getDeliveryDecision:', error);
      return {
        should_send_push: false,
        should_send_in_app: true,
        delivery_method: 'in_app',
      };
    }
  }

  /**
   * Check if user is currently in quiet hours
   */
  async isUserInQuietHours(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_user_in_quiet_hours', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error checking quiet hours:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error in isUserInQuietHours:', error);
      return false;
    }
  }

  /**
   * Get default notification preferences for a user
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      id: '',
      user_id: userId,
      push_enabled: true,
      in_app_enabled: true,
      sound_enabled: true,
      vibration_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      emergency_notifications: true,
      direct_messages: true,
      club_messages: true,
      club_announcements: true,
      club_events: true,
      join_requests: true,
      social_interactions: true,
      system_updates: true,
      emergency_only_mode: false,
      batch_notifications: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Clear cache for a specific user
   */
  private clearUserCache(userId: string): void {
    const cacheKey = `prefs_${userId}`;
    this.preferencesCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.preferencesCache.clear();
    this.priorityConfigCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Subscribe to real-time preference changes
   */
  subscribeToPreferenceChanges(
    userId: string,
    callback: (preferences: NotificationPreferences) => void
  ): () => void {
    const subscription = supabase
      .channel(`user_preferences_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notification_preferences',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          // Clear cache and fetch fresh data
          this.clearUserCache(userId);
          const updatedPreferences = await this.getUserPreferences(userId);
          callback(updatedPreferences);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Bulk update preferences
   */
  async bulkUpdatePreferences(
    userId: string,
    updates: NotificationPreferencesUpdate
  ): Promise<void> {
    try {
      await this.updateUserPreferences(userId, updates);
    } catch (error) {
      console.error('Error in bulkUpdatePreferences:', error);
      throw error;
    }
  }

  /**
   * Reset preferences to default
   */
  async resetPreferencesToDefault(
    userId: string
  ): Promise<NotificationPreferences> {
    const defaultPrefs = this.getDefaultPreferences(userId);

    // Remove the non-updatable fields
    const updates: NotificationPreferencesUpdate = {
      push_enabled: defaultPrefs.push_enabled,
      in_app_enabled: defaultPrefs.in_app_enabled,
      sound_enabled: defaultPrefs.sound_enabled,
      vibration_enabled: defaultPrefs.vibration_enabled,
      quiet_hours_enabled: defaultPrefs.quiet_hours_enabled,
      quiet_hours_start: defaultPrefs.quiet_hours_start,
      quiet_hours_end: defaultPrefs.quiet_hours_end,
      emergency_notifications: defaultPrefs.emergency_notifications,
      direct_messages: defaultPrefs.direct_messages,
      club_messages: defaultPrefs.club_messages,
      club_announcements: defaultPrefs.club_announcements,
      club_events: defaultPrefs.club_events,
      join_requests: defaultPrefs.join_requests,
      social_interactions: defaultPrefs.social_interactions,
      system_updates: defaultPrefs.system_updates,
      emergency_only_mode: defaultPrefs.emergency_only_mode,
      batch_notifications: defaultPrefs.batch_notifications,
    };

    return this.updateUserPreferences(userId, updates);
  }

  /**
   * Get notification category preference
   */
  async getCategoryPreference(
    userId: string,
    category:
      | 'emergency'
      | 'messages'
      | 'announcements'
      | 'events'
      | 'social'
      | 'system'
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);

    switch (category) {
      case 'emergency':
        return preferences.emergency_notifications;
      case 'messages':
        return preferences.direct_messages || preferences.club_messages;
      case 'announcements':
        return preferences.club_announcements;
      case 'events':
        return preferences.club_events;
      case 'social':
        return preferences.social_interactions;
      case 'system':
        return preferences.system_updates;
      default:
        return true;
    }
  }

  /**
   * Update category preference
   */
  async updateCategoryPreference(
    userId: string,
    category:
      | 'emergency'
      | 'messages'
      | 'announcements'
      | 'events'
      | 'social'
      | 'system',
    enabled: boolean
  ): Promise<void> {
    const updates: NotificationPreferencesUpdate = {};

    switch (category) {
      case 'emergency':
        updates.emergency_notifications = enabled;
        break;
      case 'messages':
        updates.direct_messages = enabled;
        updates.club_messages = enabled;
        break;
      case 'announcements':
        updates.club_announcements = enabled;
        break;
      case 'events':
        updates.club_events = enabled;
        break;
      case 'social':
        updates.social_interactions = enabled;
        break;
      case 'system':
        updates.system_updates = enabled;
        break;
    }

    await this.updateUserPreferences(userId, updates);
  }

  /**
   * Check if notification type is enabled for user
   */
  async isNotificationTypeEnabled(
    userId: string,
    notificationType: NotificationEventType
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);

    // If in emergency only mode, only allow urgent notifications
    if (preferences.emergency_only_mode) {
      const config = await this.getPriorityConfig(notificationType);
      return config?.priority_level === 'urgent';
    }

    // Check specific type preferences
    switch (notificationType) {
      case 'emergency_blood_request':
        return preferences.emergency_notifications;
      case 'direct_message':
        return preferences.direct_messages;
      case 'club_message':
        return preferences.club_messages;
      case 'club_announcement':
      case 'club_announcement_urgent':
        return preferences.club_announcements;
      case 'club_event':
      case 'event_reminder':
        return preferences.club_events;
      case 'join_request':
      case 'join_request_approved':
        return preferences.join_requests;
      case 'social_interaction':
        return preferences.social_interactions;
      case 'system_update':
        return preferences.system_updates;
      default:
        return true;
    }
  }

  /**
   * Format quiet hours for display
   */
  formatQuietHours(startTime: string, endTime: string): string {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }

  /**
   * Validate quiet hours input
   */
  validateQuietHours(startTime: string, endTime: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(startTime) && timeRegex.test(endTime);
  }
}

// Export singleton instance
export const notificationPreferencesService =
  NotificationPreferencesService.getInstance();
