import { Platform } from 'react-native';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
}

export interface UserProperties {
  userId: string;
  userType: 'donor' | 'club';
  bloodGroup?: string;
  country: string;
  language: string;
}

class AnalyticsService {
  private isInitialized = false;
  private userId: string | null = null;

  /**
   * Initialize analytics service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize analytics providers here
      // Example: Firebase Analytics, Mixpanel, etc.

      this.isInitialized = true;
      console.log('AnalyticsService: Initialized successfully');
    } catch (error) {
      console.error('AnalyticsService: Initialization failed:', error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.isInitialized) return;

    this.userId = properties.userId;

    // Set user properties in analytics providers
    console.log('AnalyticsService: Set user properties', properties);
  }

  /**
   * Track custom events
   */
  trackEvent(event: AnalyticsEvent): void {
    if (!this.isInitialized) return;

    const eventData = {
      ...event,
      userId: event.userId || this.userId,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    };

    // Send event to analytics providers
    console.log('AnalyticsService: Track event', eventData);
  }

  /**
   * Track screen views
   */
  trackScreen(screenName: string, properties?: Record<string, any>): void {
    this.trackEvent({
      name: 'screen_view',
      properties: {
        screen_name: screenName,
        ...properties,
      },
    });
  }

  /**
   * Track user actions
   */
  trackUserAction(action: string, properties?: Record<string, any>): void {
    this.trackEvent({
      name: 'user_action',
      properties: {
        action,
        ...properties,
      },
    });
  }

  /**
   * Track blood donation events
   */
  trackBloodDonationEvent(
    eventType: string,
    properties?: Record<string, any>
  ): void {
    this.trackEvent({
      name: 'blood_donation_event',
      properties: {
        event_type: eventType,
        ...properties,
      },
    });
  }

  /**
   * Track club activities
   */
  trackClubActivity(
    activityType: string,
    properties?: Record<string, any>
  ): void {
    this.trackEvent({
      name: 'club_activity',
      properties: {
        activity_type: activityType,
        ...properties,
      },
    });
  }

  /**
   * Track search events
   */
  trackSearch(query: string, filters?: Record<string, any>): void {
    this.trackEvent({
      name: 'search_performed',
      properties: {
        query,
        filters,
      },
    });
  }

  /**
   * Track notification events
   */
  trackNotificationEvent(
    eventType: string,
    properties?: Record<string, any>
  ): void {
    this.trackEvent({
      name: 'notification_event',
      properties: {
        event_type: eventType,
        ...properties,
      },
    });
  }

  /**
   * Track app performance metrics
   */
  trackPerformance(
    metric: string,
    value: number,
    properties?: Record<string, any>
  ): void {
    this.trackEvent({
      name: 'performance_metric',
      properties: {
        metric,
        value,
        ...properties,
      },
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.trackEvent({
      name: 'app_error',
      properties: {
        error_message: error.message,
        error_stack: error.stack,
        ...context,
      },
    });
  }

  /**
   * Reset user data (for logout)
   */
  resetUser(): void {
    this.userId = null;
    // Reset user data in analytics providers
    console.log('AnalyticsService: Reset user data');
  }
}

export const analyticsService = new AnalyticsService();
