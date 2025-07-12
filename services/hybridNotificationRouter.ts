import { AppState } from 'react-native';
import {
  NotificationEventType,
  NotificationDeliveryDecision,
  NotificationPreferences,
  NotificationPriority,
  NotificationContext,
  AppState as NotificationAppState,
} from '@/types/notifications';
import { notificationPreferencesService } from './notificationPreferencesService';
import { pushNotificationService } from './pushNotificationService';

export interface DeliveryContext {
  user_id: string;
  notification_type: NotificationEventType;
  priority: NotificationPriority;
  app_state: NotificationAppState;
  device_state: 'active' | 'inactive' | 'background';
  network_state: 'connected' | 'disconnected' | 'poor';
  battery_level?: number;
  is_charging?: boolean;
  current_time: Date;
  user_activity_score: number; // 0-100, higher = more active
  recent_interactions: number; // interactions in last 10 minutes
}

export interface DeliveryStrategy {
  strategy_name: string;
  should_send_push: boolean;
  should_send_in_app: boolean;
  delay_minutes: number;
  batch_with_others: boolean;
  priority_override?: NotificationPriority;
  reasoning: string;
}

export interface RouterMetrics {
  total_decisions: number;
  push_sent: number;
  in_app_sent: number;
  both_sent: number;
  skipped: number;
  success_rate: number;
  user_engagement_score: number;
}

export class HybridNotificationRouter {
  private static instance: HybridNotificationRouter;
  private routingHistory: Array<{
    context: DeliveryContext;
    strategy: DeliveryStrategy;
    timestamp: Date;
    outcome: 'success' | 'failed' | 'ignored';
  }> = [];
  private maxHistorySize = 1000;
  private userActivityScores: Map<string, number> = new Map();
  private lastInteractionTime: Map<string, Date> = new Map();

  static getInstance(): HybridNotificationRouter {
    if (!HybridNotificationRouter.instance) {
      HybridNotificationRouter.instance = new HybridNotificationRouter();
    }
    return HybridNotificationRouter.instance;
  }

  /**
   * Main routing decision function
   */
  async makeDeliveryDecision(
    context: DeliveryContext
  ): Promise<DeliveryStrategy> {
    try {
      // Get user preferences
      const preferences =
        await notificationPreferencesService.getUserPreferences(
          context.user_id
        );

      // Check if notifications are globally disabled
      if (!preferences.push_enabled && !preferences.in_app_enabled) {
        return this.createStrategy(
          'disabled',
          false,
          false,
          0,
          false,
          'All notifications disabled'
        );
      }

      // Check emergency mode
      if (preferences.emergency_only_mode && context.priority !== 'urgent') {
        return this.createStrategy(
          'emergency_only',
          false,
          false,
          0,
          false,
          'Emergency only mode active'
        );
      }

      // Check quiet hours
      const inQuietHours = this.isInQuietHours(
        preferences,
        context.current_time
      );
      if (inQuietHours && context.priority !== 'urgent') {
        return this.createStrategy(
          'quiet_hours',
          false,
          true,
          0,
          false,
          'Quiet hours active'
        );
      }

      // Apply routing strategies based on context
      const strategy = this.selectOptimalStrategy(context, preferences);

      // Log the decision
      this.logDecision(context, strategy);

      return strategy;
    } catch (error) {
      console.error('Error in makeDeliveryDecision:', error);
      return this.createStrategy(
        'fallback',
        false,
        true,
        0,
        false,
        'Error occurred, fallback to in-app'
      );
    }
  }

  /**
   * Select optimal delivery strategy based on context
   */
  private selectOptimalStrategy(
    context: DeliveryContext,
    preferences: NotificationPreferences
  ): DeliveryStrategy {
    const {
      app_state,
      priority,
      notification_type,
      device_state,
      user_activity_score,
    } = context;

    // Strategy 1: High priority + Background = Push
    if (priority === 'urgent' && app_state === 'background') {
      return this.createStrategy(
        'urgent_background',
        true,
        false,
        0,
        false,
        'Urgent notification while app is in background'
      );
    }

    // Strategy 2: High priority + Foreground = Both (for maximum visibility)
    if (priority === 'urgent' && app_state === 'foreground') {
      return this.createStrategy(
        'urgent_foreground',
        true,
        true,
        0,
        false,
        'Urgent notification needs maximum visibility'
      );
    }

    // Strategy 3: App in foreground + High activity = In-app only
    if (app_state === 'foreground' && user_activity_score > 70) {
      return this.createStrategy(
        'active_foreground',
        false,
        true,
        0,
        false,
        'User is actively using the app'
      );
    }

    // Strategy 4: Background + Low activity = Push
    if (app_state === 'background' && user_activity_score < 30) {
      return this.createStrategy(
        'inactive_background',
        preferences.push_enabled,
        false,
        0,
        false,
        'User is not active, send push notification'
      );
    }

    // Strategy 5: Medium priority + Can batch = Batched delivery
    if (priority === 'medium' && preferences.batch_notifications) {
      return this.createStrategy(
        'batch_medium',
        preferences.push_enabled,
        preferences.in_app_enabled,
        5, // 5 minute delay for batching
        true,
        'Medium priority notification can be batched'
      );
    }

    // Strategy 6: Low priority + Background = Delayed push
    if (priority === 'low' && app_state === 'background') {
      return this.createStrategy(
        'delayed_low',
        preferences.push_enabled,
        false,
        15, // 15 minute delay
        true,
        'Low priority notification delayed'
      );
    }

    // Strategy 7: Poor network + Emergency = Push with retry
    if (context.network_state === 'poor' && priority === 'urgent') {
      return this.createStrategy(
        'poor_network_urgent',
        true,
        true,
        0,
        false,
        'Poor network but urgent notification'
      );
    }

    // Strategy 8: Low battery + Non-urgent = In-app only
    if (
      context.battery_level &&
      context.battery_level < 20 &&
      priority !== 'urgent'
    ) {
      return this.createStrategy(
        'low_battery_conserve',
        false,
        preferences.in_app_enabled,
        0,
        false,
        'Low battery, conserving power'
      );
    }

    // Strategy 9: Direct messages = Smart delivery based on relationship
    if (notification_type === 'direct_message') {
      return this.handleDirectMessageStrategy(context, preferences);
    }

    // Strategy 10: Club notifications = Group-aware delivery
    if (notification_type.includes('club_')) {
      return this.handleClubNotificationStrategy(context, preferences);
    }

    // Default strategy: Respect user preferences
    return this.createStrategy(
      'default',
      preferences.push_enabled && app_state === 'background',
      preferences.in_app_enabled,
      0,
      false,
      'Default delivery based on user preferences'
    );
  }

  /**
   * Handle direct message notifications with relationship context
   */
  private handleDirectMessageStrategy(
    context: DeliveryContext,
    preferences: NotificationPreferences
  ): DeliveryStrategy {
    const { app_state, user_activity_score } = context;

    // If user is actively chatting, show in-app immediately
    if (app_state === 'foreground' && user_activity_score > 80) {
      return this.createStrategy(
        'active_chat',
        false,
        true,
        0,
        false,
        'User is actively in conversation'
      );
    }

    // If user is away, send push for immediate attention
    if (app_state === 'background' || user_activity_score < 20) {
      return this.createStrategy(
        'away_message',
        preferences.push_enabled,
        false,
        0,
        false,
        'User is away, send push for direct message'
      );
    }

    // Default direct message handling
    return this.createStrategy(
      'direct_message_default',
      preferences.push_enabled,
      preferences.in_app_enabled,
      0,
      false,
      'Standard direct message delivery'
    );
  }

  /**
   * Handle club notifications with group context
   */
  private handleClubNotificationStrategy(
    context: DeliveryContext,
    preferences: NotificationPreferences
  ): DeliveryStrategy {
    const { notification_type, app_state, priority } = context;

    // Club announcements are important
    if (
      notification_type === 'club_announcement' ||
      notification_type === 'club_announcement_urgent'
    ) {
      return this.createStrategy(
        'club_announcement',
        preferences.push_enabled,
        preferences.in_app_enabled,
        0,
        false,
        'Club announcement needs visibility'
      );
    }

    // Club events can be batched unless urgent
    if (notification_type === 'club_event' && priority !== 'urgent') {
      return this.createStrategy(
        'club_event_batch',
        preferences.push_enabled,
        preferences.in_app_enabled,
        10, // 10 minute delay
        true,
        'Club event can be batched'
      );
    }

    // Club messages can be batched when in background
    if (notification_type === 'club_message' && app_state === 'background') {
      return this.createStrategy(
        'club_message_batch',
        preferences.push_enabled,
        false,
        3, // 3 minute delay
        true,
        'Club message batched when in background'
      );
    }

    // Default club notification handling
    return this.createStrategy(
      'club_default',
      preferences.push_enabled && app_state === 'background',
      preferences.in_app_enabled,
      0,
      false,
      'Default club notification delivery'
    );
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(
    preferences: NotificationPreferences,
    currentTime: Date
  ): boolean {
    if (!preferences.quiet_hours_enabled) return false;

    const current = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startTime = this.parseTime(preferences.quiet_hours_start);
    const endTime = this.parseTime(preferences.quiet_hours_end);

    if (startTime <= endTime) {
      return current >= startTime && current <= endTime;
    } else {
      // Crosses midnight
      return current >= startTime || current <= endTime;
    }
  }

  /**
   * Parse time string "HH:mm" to minutes
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Create delivery strategy object
   */
  private createStrategy(
    name: string,
    push: boolean,
    inApp: boolean,
    delay: number,
    batch: boolean,
    reasoning: string,
    priorityOverride?: NotificationPriority
  ): DeliveryStrategy {
    return {
      strategy_name: name,
      should_send_push: push,
      should_send_in_app: inApp,
      delay_minutes: delay,
      batch_with_others: batch,
      priority_override: priorityOverride,
      reasoning,
    };
  }

  /**
   * Log routing decision for analytics
   */
  private logDecision(
    context: DeliveryContext,
    strategy: DeliveryStrategy
  ): void {
    this.routingHistory.push({
      context,
      strategy,
      timestamp: new Date(),
      outcome: 'success', // Will be updated based on actual delivery
    });

    // Maintain history size
    if (this.routingHistory.length > this.maxHistorySize) {
      this.routingHistory = this.routingHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Update user activity score
   */
  updateUserActivity(
    userId: string,
    interactionType: 'tap' | 'scroll' | 'type' | 'navigate'
  ): void {
    const currentScore = this.userActivityScores.get(userId) || 0;
    const increment = {
      tap: 1,
      scroll: 0.5,
      type: 2,
      navigate: 1.5,
    }[interactionType];

    const newScore = Math.min(100, currentScore + increment);
    this.userActivityScores.set(userId, newScore);
    this.lastInteractionTime.set(userId, new Date());

    // Decay scores over time
    this.decayUserActivity(userId);
  }

  /**
   * Decay user activity score over time
   */
  private decayUserActivity(userId: string): void {
    const lastInteraction = this.lastInteractionTime.get(userId);
    if (!lastInteraction) return;

    const minutesSinceLastInteraction =
      (Date.now() - lastInteraction.getTime()) / (1000 * 60);
    const currentScore = this.userActivityScores.get(userId) || 0;

    // Decay rate: lose 1 point per minute of inactivity
    const decayedScore = Math.max(
      0,
      currentScore - minutesSinceLastInteraction
    );
    this.userActivityScores.set(userId, decayedScore);
  }

  /**
   * Get user activity score
   */
  getUserActivityScore(userId: string): number {
    this.decayUserActivity(userId);
    return this.userActivityScores.get(userId) || 0;
  }

  /**
   * Get routing metrics for analytics
   */
  getRoutingMetrics(): RouterMetrics {
    const recent = this.routingHistory.slice(-100); // Last 100 decisions

    return {
      total_decisions: recent.length,
      push_sent: recent.filter((r) => r.strategy.should_send_push).length,
      in_app_sent: recent.filter((r) => r.strategy.should_send_in_app).length,
      both_sent: recent.filter(
        (r) => r.strategy.should_send_push && r.strategy.should_send_in_app
      ).length,
      skipped: recent.filter(
        (r) => !r.strategy.should_send_push && !r.strategy.should_send_in_app
      ).length,
      success_rate:
        recent.filter((r) => r.outcome === 'success').length / recent.length,
      user_engagement_score:
        Array.from(this.userActivityScores.values()).reduce(
          (a, b) => a + b,
          0
        ) / this.userActivityScores.size || 0,
    };
  }

  /**
   * Convert strategy to delivery decision
   */
  strategyToDeliveryDecision(
    strategy: DeliveryStrategy
  ): NotificationDeliveryDecision {
    let deliveryMethod: 'push' | 'in_app' | 'both' | 'skipped' = 'skipped';

    if (strategy.should_send_push && strategy.should_send_in_app) {
      deliveryMethod = 'both';
    } else if (strategy.should_send_push) {
      deliveryMethod = 'push';
    } else if (strategy.should_send_in_app) {
      deliveryMethod = 'in_app';
    }

    return {
      should_send_push: strategy.should_send_push,
      should_send_in_app: strategy.should_send_in_app,
      delivery_method: deliveryMethod,
    };
  }

  /**
   * Create delivery context from available information
   */
  createDeliveryContext(
    userId: string,
    notificationType: NotificationEventType,
    priority: NotificationPriority,
    appState: NotificationAppState = 'unknown'
  ): DeliveryContext {
    return {
      user_id: userId,
      notification_type: notificationType,
      priority,
      app_state: appState,
      device_state: appState === 'foreground' ? 'active' : 'background',
      network_state: 'connected', // Could be enhanced with actual network detection
      current_time: new Date(),
      user_activity_score: this.getUserActivityScore(userId),
      recent_interactions: this.getRecentInteractions(userId),
    };
  }

  /**
   * Get recent interactions count
   */
  private getRecentInteractions(userId: string): number {
    const lastInteraction = this.lastInteractionTime.get(userId);
    if (!lastInteraction) return 0;

    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    return lastInteraction.getTime() > tenMinutesAgo ? 1 : 0;
  }

  /**
   * Reset user activity (for testing)
   */
  resetUserActivity(userId: string): void {
    this.userActivityScores.delete(userId);
    this.lastInteractionTime.delete(userId);
  }

  /**
   * Clear routing history (for testing)
   */
  clearHistory(): void {
    this.routingHistory = [];
    this.userActivityScores.clear();
    this.lastInteractionTime.clear();
  }
}

export const hybridNotificationRouter = HybridNotificationRouter.getInstance();
export default hybridNotificationRouter;
