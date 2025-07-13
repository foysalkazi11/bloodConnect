import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import {
  NotificationEventType,
  NotificationDeliveryDecision,
  PushToken,
  PushNotificationRequest,
} from '@/types/notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { data } = notification.request.content;

    // Always show test notifications and urgent/high priority notifications
    const isTest = data?.test === true || data?.type === 'test';
    const isHighPriority =
      data?.priority === 'urgent' || data?.priority === 'high';
    const shouldShow = isTest || isHighPriority;

    return {
      shouldShowAlert: shouldShow,
      shouldPlaySound: shouldShow,
      shouldSetBadge: true,
      shouldShowBanner: shouldShow,
      shouldShowList: true,
    };
  },
});

export class PushNotificationService {
  private static instance: PushNotificationService;
  private currentToken: string | null = null;
  private isInitialized = false;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(userId: string): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Push notifications not supported on simulator');
        return false;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Push notification permissions denied');
        return false;
      }

      // Configure Android channels
      if (Platform.OS === 'android') {
        await this.configureAndroidChannels();
      }

      // Register for push notifications
      const token = await this.registerForPushNotifications();
      if (!token) {
        console.log('Failed to get push token');
        return false;
      }

      // Store token in database
      await this.storePushToken(userId, token);

      // Setup listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('Push notification service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  private async configureAndroidChannels(): Promise<void> {
    try {
      // Emergency notifications
      await Notifications.setNotificationChannelAsync('emergency', {
        name: 'Emergency Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DC2626',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      // High priority notifications
      await Notifications.setNotificationChannelAsync('high', {
        name: 'High Priority',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      // Default notifications
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      // Low priority notifications
      await Notifications.setNotificationChannelAsync('low', {
        name: 'Low Priority',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 250],
        lightColor: '#6B7280',
        sound: null,
        enableVibrate: false,
        enableLights: false,
      });
    } catch (error) {
      console.error('Error configuring Android channels:', error);
    }
  }

  private async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      if (!projectId) {
        console.warn('EXPO_PUBLIC_PROJECT_ID not configured');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.currentToken = token.data;
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  private async storePushToken(userId: string, token: string): Promise<void> {
    try {
      const deviceType =
        Platform.OS === 'ios'
          ? 'ios'
          : Platform.OS === 'android'
          ? 'android'
          : 'web';

      const deviceId = Device.modelName || 'unknown';

      // First, deactivate all old tokens for this user/device combination
      await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('device_type', deviceType);

      // Try to update existing record first
      const { data: existingData, error: updateError } = await supabase
        .from('push_tokens')
        .update({
          device_type: deviceType,
          device_id: deviceId,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('token', token)
        .select();

      if (updateError) {
        console.error('Error updating existing token:', updateError);
      }

      // If no existing record was updated, insert a new one
      if (!existingData || existingData.length === 0) {
        const { error: insertError } = await supabase
          .from('push_tokens')
          .insert({
            user_id: userId,
            token,
            device_type: deviceType,
            device_id: deviceId,
            is_active: true,
          });

        if (insertError) {
          console.error('Error inserting push token:', insertError);
          throw insertError;
        } else {
          console.log('Push token inserted successfully');
        }
      } else {
        console.log('Push token updated successfully');
      }
    } catch (error) {
      console.error('Error in storePushToken:', error);
      throw error;
    }
  }

  private setupNotificationListeners(): void {
    // Listen for notifications received while app is active
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.handleNotificationReceived(notification);
      }
    );

    // Listen for user interactions with notifications
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        this.handleNotificationResponse(response);
      });
  }

  private handleNotificationReceived(
    notification: Notifications.Notification
  ): void {
    const { data } = notification.request.content;

    // Update badge count
    if (data?.badge) {
      Notifications.setBadgeCountAsync(Number(data.badge));
    }

    console.log(
      'Notification received in foreground:',
      notification.request.content
    );
  }

  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const { data } = response.notification.request.content;

    // Handle navigation or custom actions
    if (data?.action_url) {
      console.log('Should navigate to:', data.action_url);
    }

    // Mark notification as read if it has an ID
    if (data?.notification_id) {
      this.markNotificationAsRead(String(data.notification_id));
    }
  }

  private async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId,
      });

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async sendPushNotification(
    userId: string,
    notification: PushNotificationRequest
  ): Promise<boolean> {
    try {
      const tokens = await this.getUserPushTokens(userId);

      if (tokens.length === 0) {
        console.log('No active push tokens found for user:', userId);
        return false;
      }

      const results = await Promise.allSettled(
        tokens.map((token) => this.sendToToken(token.token, notification))
      );

      const successful = results.some(
        (result) => result.status === 'fulfilled' && result.value
      );

      return successful;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  private async sendToToken(
    token: string,
    notification: PushNotificationRequest
  ): Promise<boolean> {
    try {
      const message = {
        to: token,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: notification.sound,
        badge: notification.badge,
        priority: notification.priority,
        ttl: notification.ttl,
        channelId: notification.channelId,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (result.errors) {
        console.error('Push notification errors:', result.errors);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending to token:', error);
      return false;
    }
  }

  private async getUserPushTokens(userId: string): Promise<PushToken[]> {
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching push tokens:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserPushTokens:', error);
      return [];
    }
  }

  async sendNotificationWithDeliveryDecision(
    userId: string,
    notificationType: NotificationEventType,
    title: string,
    body: string,
    data?: Record<string, any>,
    deliveryDecision?: NotificationDeliveryDecision
  ): Promise<boolean> {
    if (!deliveryDecision?.should_send_push) {
      return false;
    }

    // Determine priority and channel based on notification type
    let priority: 'default' | 'high' = 'default';
    let channelId = 'default';

    if (notificationType === 'emergency_blood_request') {
      priority = 'high';
      channelId = 'emergency';
    } else if (notificationType.includes('urgent')) {
      priority = 'high';
      channelId = 'high';
    } else if (notificationType.includes('direct_message')) {
      priority = 'high';
      channelId = 'high';
    }

    const notification: PushNotificationRequest = {
      to: '',
      title,
      body,
      data: {
        ...data,
        notification_type: notificationType,
        priority: priority === 'high' ? 'high' : 'default',
      },
      sound: 'default',
      priority,
      channelId,
      ttl: 86400,
    };

    return await this.sendPushNotification(userId, notification);
  }

  async updateBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await this.updateBadgeCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }

  async arePushNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking push notification status:', error);
      return false;
    }
  }

  async refreshPushToken(userId: string): Promise<boolean> {
    try {
      const newToken = await this.registerForPushNotifications();
      if (newToken) {
        await this.storePushToken(userId, newToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing push token:', error);
      return false;
    }
  }

  cleanup(): void {
    this.notificationListener?.remove();
    this.responseListener?.remove();
    this.currentToken = null;
    this.isInitialized = false;
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
