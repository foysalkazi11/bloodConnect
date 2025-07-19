import { supabase } from '@/lib/supabase';
import { pushNotificationService } from './pushNotificationService';
import { notificationPreferencesService } from './notificationPreferencesService';

export interface PermissionContext {
  trigger:
    | 'club_join'
    | 'first_message'
    | 'emergency_request'
    | 'event_creation'
    | 'manual';
  clubId?: string;
  userId?: string;
  eventId?: string;
  metadata?: Record<string, any>;
}

export interface PermissionRequest {
  id: string;
  title: string;
  message: string;
  icon: string;
  categories: string[];
  context: PermissionContext;
  priority: 'low' | 'medium' | 'high';
  canSkip: boolean;
  reminderEnabled?: boolean;
}

export interface UserPermissionState {
  user_id: string;
  has_system_permission: boolean;
  permission_requested_at?: string;
  permission_granted_at?: string;
  contexts_seen: string[];
  contexts_accepted: string[];
  contexts_declined: string[];
  last_prompt_shown?: string;
  total_prompts_shown: number;
  created_at: string;
  updated_at: string;
}

class ProgressivePermissionService {
  private currentUserId: string | null = null;
  private permissionState: UserPermissionState | null = null;

  // Initialize for a user
  async initialize(userId: string) {
    this.currentUserId = userId;
    await this.loadPermissionState();
  }

  // Load user permission state
  private async loadPermissionState() {
    if (!this.currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_permission_state')
        .select('*')
        .eq('user_id', this.currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading permission state:', error);
        return;
      }

      if (!data) {
        // Create initial state
        await this.createInitialPermissionState();
      } else {
        this.permissionState = data;
      }
    } catch (error) {
      console.error('Error in loadPermissionState:', error);
    }
  }

  // Create initial permission state for new user
  private async createInitialPermissionState() {
    if (!this.currentUserId) return;

    const initialState: Omit<UserPermissionState, 'created_at' | 'updated_at'> =
      {
        user_id: this.currentUserId,
        has_system_permission: false,
        contexts_seen: [],
        contexts_accepted: [],
        contexts_declined: [],
        total_prompts_shown: 0,
      };

    try {
      const { data, error } = await supabase
        .from('user_permission_state')
        .insert(initialState)
        .select()
        .single();

      if (error) {
        console.error('Error creating permission state:', error);
        return;
      }

      this.permissionState = data;
    } catch (error) {
      console.error('Error in createInitialPermissionState:', error);
    }
  }

  // Check if user should see permission request for a context
  async shouldShowPermissionRequest(
    context: PermissionContext
  ): Promise<boolean> {
    if (!this.permissionState) return false;

    const contextKey = this.getContextKey(context);

    // Don't show if already seen this context
    if (this.permissionState.contexts_seen.includes(contextKey)) {
      return false;
    }

    // Don't show if user has declined too many times recently
    if (this.permissionState.total_prompts_shown >= 3) {
      return false;
    }

    // Don't show if last prompt was too recent (within 24 hours)
    if (this.permissionState.last_prompt_shown) {
      const lastPrompt = new Date(this.permissionState.last_prompt_shown);
      const now = new Date();
      const hoursSinceLastPrompt =
        (now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastPrompt < 24) {
        return false;
      }
    }

    return true;
  }

  // Get appropriate permission request for context
  async getPermissionRequest(
    context: PermissionContext
  ): Promise<PermissionRequest | null> {
    const canShow = await this.shouldShowPermissionRequest(context);
    if (!canShow) return null;

    switch (context.trigger) {
      case 'club_join':
        return {
          id: 'club_join_' + Date.now(),
          title: 'Stay connected with your club',
          message:
            'Get notified of important announcements, events, and messages from your club members.',
          icon: 'users',
          categories: ['club_messages', 'club_announcements', 'club_events'],
          context,
          priority: 'high',
          canSkip: true,
          reminderEnabled: true,
        };

      case 'first_message':
        return {
          id: 'first_message_' + Date.now(),
          title: "Don't miss important messages",
          message:
            'Get notified when someone sends you a direct message so you can respond quickly.',
          icon: 'message-circle',
          categories: ['direct_messages'],
          context,
          priority: 'high',
          canSkip: true,
          reminderEnabled: true,
        };

      case 'emergency_request':
        return {
          id: 'emergency_' + Date.now(),
          title: 'Help save lives with emergency alerts',
          message:
            'Get notified immediately when there are urgent blood donation requests in your area.',
          icon: 'alert-triangle',
          categories: ['emergency_notifications'],
          context,
          priority: 'high',
          canSkip: false,
          reminderEnabled: false,
        };

      case 'event_creation':
        return {
          id: 'event_creation_' + Date.now(),
          title: 'Stay updated on blood drive events',
          message:
            'Get notified about upcoming blood drives and donation events you can participate in.',
          icon: 'calendar',
          categories: ['club_events', 'emergency_notifications'],
          context,
          priority: 'medium',
          canSkip: true,
          reminderEnabled: true,
        };

      default:
        return null;
    }
  }

  // Record that user has seen a permission request
  async recordPermissionSeen(context: PermissionContext) {
    if (!this.permissionState) return;

    const contextKey = this.getContextKey(context);

    if (!this.permissionState.contexts_seen.includes(contextKey)) {
      const updatedSeen = [...this.permissionState.contexts_seen, contextKey];
      const updatedCount = this.permissionState.total_prompts_shown + 1;

      await this.updatePermissionState({
        contexts_seen: updatedSeen,
        total_prompts_shown: updatedCount,
        last_prompt_shown: new Date().toISOString(),
      });
    }
  }

  // Record user's response to permission request
  async recordPermissionResponse(
    context: PermissionContext,
    accepted: boolean,
    categories: string[]
  ) {
    if (!this.permissionState) return;

    const contextKey = this.getContextKey(context);

    if (accepted) {
      // Update accepted contexts
      const updatedAccepted = [
        ...this.permissionState.contexts_accepted,
        contextKey,
      ];
      await this.updatePermissionState({
        contexts_accepted: updatedAccepted,
      });

      // Enable the notification categories
      await this.enableNotificationCategories(categories);

      // Check if we should request system permission
      await this.checkAndRequestSystemPermission();
    } else {
      // Update declined contexts
      const updatedDeclined = [
        ...this.permissionState.contexts_declined,
        contextKey,
      ];
      await this.updatePermissionState({
        contexts_declined: updatedDeclined,
      });
    }
  }

  // Enable notification categories for user
  private async enableNotificationCategories(categories: string[]) {
    if (!this.currentUserId) return;

    try {
      // Get current preferences or create defaults
      let preferences = await notificationPreferencesService.getUserPreferences(
        this.currentUserId
      );

      // Update the specified categories
      const updates: Record<string, boolean> = {};
      categories.forEach((category) => {
        updates[category] = true;
      });

      // Also enable in-app notifications
      updates.in_app_enabled = true;

      await notificationPreferencesService.updateUserPreferences(
        this.currentUserId,
        updates
      );
    } catch (error) {
      console.error('Error enabling notification categories:', error);
    }
  }

  // Check if we should request system permission and do so
  private async checkAndRequestSystemPermission() {
    if (!this.permissionState || this.permissionState.has_system_permission)
      return;

    // Check if user has enabled any notification categories
    if (!this.currentUserId) return;

    try {
      const preferences =
        await notificationPreferencesService.getUserPreferences(
          this.currentUserId
        );

      const hasEnabledCategories =
        preferences.emergency_notifications ||
        preferences.direct_messages ||
        preferences.club_messages ||
        preferences.club_announcements ||
        preferences.club_events;

      if (hasEnabledCategories) {
        // Request system permission
        const granted = await pushNotificationService.requestPermissions();

        if (granted) {
          // Initialize push service for this user
          await pushNotificationService.initialize(this.currentUserId);

          // Update permission state
          await this.updatePermissionState({
            has_system_permission: true,
            permission_requested_at: new Date().toISOString(),
            permission_granted_at: new Date().toISOString(),
          });

          // Enable push notifications in preferences
          await notificationPreferencesService.updateUserPreferences(
            this.currentUserId,
            {
              push_enabled: true,
            }
          );
        } else {
          // User declined system permission
          await this.updatePermissionState({
            has_system_permission: false,
            permission_requested_at: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error checking system permission:', error);
    }
  }

  // Update permission state in database
  private async updatePermissionState(updates: Partial<UserPermissionState>) {
    if (!this.currentUserId || !this.permissionState) return;

    try {
      const { data, error } = await supabase
        .from('user_permission_state')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', this.currentUserId)
        .select()
        .single();

      if (error) {
        console.error('Error updating permission state:', error);
        return;
      }

      // Update local state
      this.permissionState = { ...this.permissionState, ...updates };
    } catch (error) {
      console.error('Error in updatePermissionState:', error);
    }
  }

  // Generate context key for tracking
  private getContextKey(context: PermissionContext): string {
    const base = context.trigger;
    if (context.clubId) {
      return `${base}_club_${context.clubId}`;
    }
    if (context.userId) {
      return `${base}_user_${context.userId}`;
    }
    return base;
  }

  // Check if user has system permission
  async hasSystemPermission(): Promise<boolean> {
    if (this.permissionState) {
      return this.permissionState.has_system_permission;
    }

    // Fallback to checking push service
    return await pushNotificationService.arePushNotificationsEnabled();
  }

  // Get permission statistics for analytics
  getPermissionStats() {
    if (!this.permissionState) return null;

    return {
      total_prompts_shown: this.permissionState.total_prompts_shown,
      contexts_accepted: this.permissionState.contexts_accepted.length,
      contexts_declined: this.permissionState.contexts_declined.length,
      has_system_permission: this.permissionState.has_system_permission,
      permission_granted_at: this.permissionState.permission_granted_at,
    };
  }

  // Reset permission state (for testing or user request)
  async resetPermissionState() {
    if (!this.currentUserId) return;

    try {
      await supabase
        .from('user_permission_state')
        .delete()
        .eq('user_id', this.currentUserId);

      this.permissionState = null;
      await this.loadPermissionState();
    } catch (error) {
      console.error('Error resetting permission state:', error);
    }
  }

  // Cleanup when user logs out
  cleanup() {
    this.currentUserId = null;
    this.permissionState = null;
  }
}

// Export singleton instance
export const progressivePermissionService = new ProgressivePermissionService();
export default progressivePermissionService;
