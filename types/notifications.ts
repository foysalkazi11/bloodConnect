// Notification System Types
export interface NotificationPreferences {
  id: string;
  user_id: string;

  // Global notification settings
  push_enabled: boolean;
  in_app_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;

  // Quiet hours settings
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // TIME format: "HH:mm"
  quiet_hours_end: string; // TIME format: "HH:mm"

  // Category-specific settings
  emergency_notifications: boolean;
  direct_messages: boolean;
  club_messages: boolean;
  club_announcements: boolean;
  club_events: boolean;
  join_requests: boolean;
  social_interactions: boolean;
  system_updates: boolean;

  // Delivery preferences
  emergency_only_mode: boolean;
  batch_notifications: boolean;

  created_at: string;
  updated_at: string;
}

export interface NotificationPriorityConfig {
  id: string;
  notification_type: string;
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  default_channels: ('push' | 'in_app')[];
  requires_permission: boolean;
  can_be_batched: boolean;
  max_delay_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationDeliveryLog {
  id: string;
  notification_id: string;
  user_id: string;
  delivery_method: 'push' | 'in_app' | 'both';
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped';
  delivery_attempt: number;
  error_message?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationDeliveryDecision {
  should_send_push: boolean;
  should_send_in_app: boolean;
  delivery_method: 'push' | 'in_app' | 'both' | 'skipped';
}

export interface NotificationContext {
  user_id: string;
  notification_type: string;
  app_state: 'foreground' | 'background' | 'unknown';
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  is_emergency: boolean;
  can_be_delayed: boolean;
}

// Enhanced notification interface
export interface EnhancedNotification extends Notification {
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  delivery_method: 'push' | 'in_app' | 'both';
  can_be_batched: boolean;
  max_delay_minutes: number;
  requires_permission: boolean;
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped';
  delivery_attempts: number;
  scheduled_for?: string;
}

// Base notification interface (from existing system)
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  entity_type?: string;
  entity_id?: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  message?: string; // Alternative to body
  related_id?: string; // Alternative to entity_id
  related_type?: string; // Alternative to entity_type
  action_url?: string; // Navigation URL
  is_dismissed?: boolean; // Dismissal status
  read_at?: string; // When it was read
  expires_at?: string; // Expiration date
}

// Notification preferences update payload
export interface NotificationPreferencesUpdate {
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  emergency_notifications?: boolean;
  direct_messages?: boolean;
  club_messages?: boolean;
  club_announcements?: boolean;
  club_events?: boolean;
  join_requests?: boolean;
  social_interactions?: boolean;
  system_updates?: boolean;
  emergency_only_mode?: boolean;
  batch_notifications?: boolean;
}

// Notification statistics
export interface NotificationStats {
  total_notifications: number;
  unread_count: number;
  delivered_count: number;
  failed_count: number;
  push_count: number;
  in_app_count: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}

// Notification batch
export interface NotificationBatch {
  id: string;
  user_id: string;
  notifications: EnhancedNotification[];
  batch_type: 'time_based' | 'count_based' | 'priority_based';
  scheduled_for: string;
  created_at: string;
}

// Push notification payload
export interface PushNotificationPayload {
  to: string; // Push token
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'high';
  channelId?: string;
  ttl?: number;
}

// Push token interface
export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  device_type: 'ios' | 'android' | 'web';
  device_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Push notification request
export interface PushNotificationRequest {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'high';
  ttl?: number;
  channelId?: string;
}

// Push notification response
export interface PushNotificationResponse {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: any;
}

// Push notification delivery result
export interface PushDeliveryResult {
  success: boolean;
  tokens_sent: number;
  tokens_failed: number;
  error_messages: string[];
}

// In-app notification payload
export interface InAppNotificationPayload {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  actions?: NotificationAction[];
  data?: Record<string, any>;
}

// Notification action
export interface NotificationAction {
  id: string;
  label: string;
  action: 'navigate' | 'dismiss' | 'mark_read' | 'custom';
  params?: Record<string, any>;
}

// Notification event types
export type NotificationEventType =
  | 'emergency_blood_request'
  | 'direct_message'
  | 'club_message'
  | 'club_announcement'
  | 'club_announcement_urgent'
  | 'club_event'
  | 'event_reminder'
  | 'join_request'
  | 'join_request_approved'
  | 'social_interaction'
  | 'system_update'
  | 'typing_indicator';

// Notification delivery channels
export type NotificationChannel = 'push' | 'in_app';

// App state for notification context
export type AppState = 'foreground' | 'background' | 'unknown';

// Notification priority levels
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// Notification delivery status
export type NotificationDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'skipped';

// Notification category for grouping
export type NotificationCategory =
  | 'emergency'
  | 'messages'
  | 'announcements'
  | 'events'
  | 'social'
  | 'system';
