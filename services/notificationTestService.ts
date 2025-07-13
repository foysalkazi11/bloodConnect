import { supabase } from '@/lib/supabase';
import {
  NotificationEventType,
  NotificationPriority,
  NotificationDeliveryDecision,
  NotificationPreferences,
} from '@/types/notifications';
import { notificationService } from './notificationService';
import { pushNotificationService } from './pushNotificationService';
import { notificationPreferencesService } from './notificationPreferencesService';
import {
  hybridNotificationRouter,
  DeliveryContext,
} from './hybridNotificationRouter';

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<TestResult>;
  cleanup: () => Promise<void>;
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timeTaken: number;
  deliveryDecision?: NotificationDeliveryDecision;
}

export interface NotificationTestSuite {
  scenarios: TestScenario[];
  results: TestResult[];
  overallSuccess: boolean;
  totalTime: number;
}

export class NotificationTestService {
  private static instance: NotificationTestService;
  private testUserId: string = 'test-user-123';
  private testResults: TestResult[] = [];

  static getInstance(): NotificationTestService {
    if (!NotificationTestService.instance) {
      NotificationTestService.instance = new NotificationTestService();
    }
    return NotificationTestService.instance;
  }

  /**
   * Run all notification tests
   */
  async runAllTests(): Promise<NotificationTestSuite> {
    console.log('🧪 Starting Notification System Tests');

    const scenarios = this.createTestScenarios();
    const results: TestResult[] = [];
    let totalTime = 0;

    for (const scenario of scenarios) {
      console.log(`📋 Running: ${scenario.name}`);

      try {
        await scenario.setup();
        const result = await scenario.execute();
        await scenario.cleanup();

        results.push(result);
        totalTime += result.timeTaken;

        console.log(
          `${result.success ? '✅' : '❌'} ${scenario.name}: ${result.message}`
        );
        if (result.details) {
          console.log('   Details:', result.details);
        }
      } catch (error) {
        const errorResult: TestResult = {
          success: false,
          message: `Test failed with error: ${error}`,
          timeTaken: 0,
        };
        results.push(errorResult);
        console.log(`❌ ${scenario.name}: ${errorResult.message}`);
      }
    }

    const overallSuccess = results.every((r) => r.success);

    console.log(
      `\n📊 Test Summary: ${results.filter((r) => r.success).length}/${
        results.length
      } passed`
    );
    console.log(`⏱️ Total time: ${totalTime}ms`);
    console.log(
      `${overallSuccess ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`
    );

    return {
      scenarios,
      results,
      overallSuccess,
      totalTime,
    };
  }

  /**
   * Create test scenarios
   */
  private createTestScenarios(): TestScenario[] {
    return [
      {
        id: 'push-service-init',
        name: 'Push Service Initialization',
        description: 'Test push notification service initialization',
        setup: async () => {
          pushNotificationService.cleanup();
        },
        execute: async () => {
          const startTime = Date.now();
          const initialized = await pushNotificationService.initialize(
            this.testUserId
          );
          const timeTaken = Date.now() - startTime;

          return {
            success: initialized,
            message: initialized
              ? 'Push service initialized successfully'
              : 'Failed to initialize push service',
            timeTaken,
            details: {
              hasToken: pushNotificationService.getCurrentToken() !== null,
              permissionsEnabled:
                await pushNotificationService.arePushNotificationsEnabled(),
            },
          };
        },
        cleanup: async () => {},
      },
      {
        id: 'preferences-load',
        name: 'User Preferences Loading',
        description: 'Test loading user notification preferences',
        setup: async () => {
          // Create default preferences
          await notificationPreferencesService.updateUserPreferences(
            this.testUserId,
            {
              push_enabled: true,
              in_app_enabled: true,
              emergency_notifications: true,
            }
          );
        },
        execute: async () => {
          const startTime = Date.now();
          const preferences =
            await notificationPreferencesService.getUserPreferences(
              this.testUserId
            );
          const timeTaken = Date.now() - startTime;

          return {
            success: preferences !== null,
            message: preferences
              ? 'Preferences loaded successfully'
              : 'Failed to load preferences',
            timeTaken,
            details: preferences,
          };
        },
        cleanup: async () => {},
      },
      {
        id: 'hybrid-router-urgent',
        name: 'Hybrid Router - Urgent Notification',
        description:
          'Test hybrid router with urgent notification in background',
        setup: async () => {
          hybridNotificationRouter.clearHistory();
          hybridNotificationRouter.resetUserActivity(this.testUserId);
        },
        execute: async () => {
          const startTime = Date.now();

          const context: DeliveryContext = {
            user_id: this.testUserId,
            notification_type: 'emergency_blood_request',
            priority: 'urgent',
            app_state: 'background',
            device_state: 'background',
            network_state: 'connected',
            current_time: new Date(),
            user_activity_score: 0,
            recent_interactions: 0,
          };

          const strategy = await hybridNotificationRouter.makeDeliveryDecision(
            context
          );
          const decision =
            hybridNotificationRouter.strategyToDeliveryDecision(strategy);
          const timeTaken = Date.now() - startTime;

          const expectedPush = strategy.should_send_push;
          const success = expectedPush === true; // Should send push for urgent background

          return {
            success,
            message: success
              ? 'Urgent notification routed correctly'
              : 'Urgent notification routing failed',
            timeTaken,
            deliveryDecision: decision,
            details: {
              strategy: strategy.strategy_name,
              reasoning: strategy.reasoning,
              shouldSendPush: strategy.should_send_push,
              shouldSendInApp: strategy.should_send_in_app,
            },
          };
        },
        cleanup: async () => {},
      },
      {
        id: 'hybrid-router-foreground',
        name: 'Hybrid Router - Foreground Active User',
        description: 'Test hybrid router with active user in foreground',
        setup: async () => {
          hybridNotificationRouter.updateUserActivity(this.testUserId, 'tap');
          hybridNotificationRouter.updateUserActivity(this.testUserId, 'type');
          hybridNotificationRouter.updateUserActivity(
            this.testUserId,
            'navigate'
          );
        },
        execute: async () => {
          const startTime = Date.now();

          const context: DeliveryContext = {
            user_id: this.testUserId,
            notification_type: 'club_message',
            priority: 'medium',
            app_state: 'foreground',
            device_state: 'active',
            network_state: 'connected',
            current_time: new Date(),
            user_activity_score: hybridNotificationRouter.getUserActivityScore(
              this.testUserId
            ),
            recent_interactions: 1,
          };

          const strategy = await hybridNotificationRouter.makeDeliveryDecision(
            context
          );
          const decision =
            hybridNotificationRouter.strategyToDeliveryDecision(strategy);
          const timeTaken = Date.now() - startTime;

          const expectedInApp = strategy.should_send_in_app;
          const success = expectedInApp === true; // Should send in-app for active foreground user

          return {
            success,
            message: success
              ? 'Active foreground user routed correctly'
              : 'Active foreground routing failed',
            timeTaken,
            deliveryDecision: decision,
            details: {
              strategy: strategy.strategy_name,
              reasoning: strategy.reasoning,
              userActivityScore: context.user_activity_score,
              shouldSendPush: strategy.should_send_push,
              shouldSendInApp: strategy.should_send_in_app,
            },
          };
        },
        cleanup: async () => {},
      },
      {
        id: 'quiet-hours-test',
        name: 'Quiet Hours Handling',
        description: 'Test notification behavior during quiet hours',
        setup: async () => {
          // Set quiet hours to current time
          const now = new Date();
          const quietStart = `${now.getHours()}:${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
          const quietEnd = `${(now.getHours() + 2) % 24}:${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;

          await notificationPreferencesService.updateUserPreferences(
            this.testUserId,
            {
              quiet_hours_enabled: true,
              quiet_hours_start: quietStart,
              quiet_hours_end: quietEnd,
            }
          );
        },
        execute: async () => {
          const startTime = Date.now();

          const context: DeliveryContext = {
            user_id: this.testUserId,
            notification_type: 'club_message',
            priority: 'medium',
            app_state: 'background',
            device_state: 'background',
            network_state: 'connected',
            current_time: new Date(),
            user_activity_score: 0,
            recent_interactions: 0,
          };

          const strategy = await hybridNotificationRouter.makeDeliveryDecision(
            context
          );
          const decision =
            hybridNotificationRouter.strategyToDeliveryDecision(strategy);
          const timeTaken = Date.now() - startTime;

          const shouldRespectQuietHours =
            strategy.strategy_name === 'quiet_hours';
          const success =
            shouldRespectQuietHours &&
            strategy.should_send_in_app &&
            !strategy.should_send_push;

          return {
            success,
            message: success
              ? 'Quiet hours respected correctly'
              : 'Quiet hours not respected',
            timeTaken,
            deliveryDecision: decision,
            details: {
              strategy: strategy.strategy_name,
              reasoning: strategy.reasoning,
              inQuietHours: shouldRespectQuietHours,
            },
          };
        },
        cleanup: async () => {
          await notificationPreferencesService.updateUserPreferences(
            this.testUserId,
            {
              quiet_hours_enabled: false,
            }
          );
        },
      },
      {
        id: 'emergency-override',
        name: 'Emergency Override',
        description: 'Test emergency notifications override quiet hours',
        setup: async () => {
          // Set quiet hours to current time
          const now = new Date();
          const quietStart = `${now.getHours()}:${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
          const quietEnd = `${(now.getHours() + 2) % 24}:${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;

          await notificationPreferencesService.updateUserPreferences(
            this.testUserId,
            {
              quiet_hours_enabled: true,
              quiet_hours_start: quietStart,
              quiet_hours_end: quietEnd,
              emergency_notifications: true,
            }
          );
        },
        execute: async () => {
          const startTime = Date.now();

          const context: DeliveryContext = {
            user_id: this.testUserId,
            notification_type: 'emergency_blood_request',
            priority: 'urgent',
            app_state: 'background',
            device_state: 'background',
            network_state: 'connected',
            current_time: new Date(),
            user_activity_score: 0,
            recent_interactions: 0,
          };

          const strategy = await hybridNotificationRouter.makeDeliveryDecision(
            context
          );
          const decision =
            hybridNotificationRouter.strategyToDeliveryDecision(strategy);
          const timeTaken = Date.now() - startTime;

          const overrodeQuietHours = strategy.strategy_name !== 'quiet_hours';
          const success = overrodeQuietHours && strategy.should_send_push;

          return {
            success,
            message: success
              ? 'Emergency override worked correctly'
              : 'Emergency override failed',
            timeTaken,
            deliveryDecision: decision,
            details: {
              strategy: strategy.strategy_name,
              reasoning: strategy.reasoning,
              overrodeQuietHours,
            },
          };
        },
        cleanup: async () => {
          await notificationPreferencesService.updateUserPreferences(
            this.testUserId,
            {
              quiet_hours_enabled: false,
            }
          );
        },
      },
      {
        id: 'notification-creation',
        name: 'Notification Creation Flow',
        description: 'Test end-to-end notification creation',
        setup: async () => {
          await notificationService.initialize(this.testUserId);
        },
        execute: async () => {
          const startTime = Date.now();

          try {
            // Create a test notification
            const { error } = await supabase.rpc('create_notification', {
              p_user_id: this.testUserId,
              p_type: 'club_announcement',
              p_title: 'Test Announcement',
              p_message: 'This is a test notification',
              p_related_id: null,
              p_related_type: null,
              p_action_url: null,
              p_expires_at: null,
            });

            const timeTaken = Date.now() - startTime;

            return {
              success: !error,
              message: error
                ? `Failed to create notification: ${error.message}`
                : 'Notification created successfully',
              timeTaken,
              details: { error },
            };
          } catch (error) {
            const timeTaken = Date.now() - startTime;
            return {
              success: false,
              message: `Exception during notification creation: ${error}`,
              timeTaken,
            };
          }
        },
        cleanup: async () => {},
      },
      {
        id: 'routing-metrics',
        name: 'Routing Metrics Collection',
        description: 'Test routing metrics and analytics',
        setup: async () => {
          hybridNotificationRouter.clearHistory();
        },
        execute: async () => {
          const startTime = Date.now();

          // Make several routing decisions
          const contexts = [
            {
              type: 'direct_message',
              priority: 'high',
              app_state: 'foreground',
            },
            {
              type: 'club_message',
              priority: 'medium',
              app_state: 'background',
            },
            {
              type: 'emergency_blood_request',
              priority: 'urgent',
              app_state: 'background',
            },
          ];

          for (const ctx of contexts) {
            const context: DeliveryContext = {
              user_id: this.testUserId,
              notification_type: ctx.type as NotificationEventType,
              priority: ctx.priority as NotificationPriority,
              app_state: ctx.app_state as any,
              device_state:
                ctx.app_state === 'foreground' ? 'active' : 'background',
              network_state: 'connected',
              current_time: new Date(),
              user_activity_score: 50,
              recent_interactions: 0,
            };

            await hybridNotificationRouter.makeDeliveryDecision(context);
          }

          const metrics = hybridNotificationRouter.getRoutingMetrics();
          const timeTaken = Date.now() - startTime;

          const success = metrics.total_decisions === 3;

          return {
            success,
            message: success
              ? 'Routing metrics collected successfully'
              : 'Routing metrics collection failed',
            timeTaken,
            details: metrics,
          };
        },
        cleanup: async () => {},
      },
    ];
  }

  /**
   * Run individual test by ID
   */
  async runTest(testId: string): Promise<TestResult> {
    const scenario = this.createTestScenarios().find((s) => s.id === testId);
    if (!scenario) {
      return {
        success: false,
        message: `Test '${testId}' not found`,
        timeTaken: 0,
      };
    }

    try {
      await scenario.setup();
      const result = await scenario.execute();
      await scenario.cleanup();
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Test failed with error: ${error}`,
        timeTaken: 0,
      };
    }
  }

  /**
   * Test specific notification flow
   */
  async testNotificationFlow(
    notificationType: NotificationEventType,
    appState: 'foreground' | 'background' = 'background',
    userActivityLevel: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Set up user activity
      const activityScore = { low: 10, medium: 50, high: 90 }[
        userActivityLevel
      ];
      if (activityScore > 50) {
        for (let i = 0; i < 5; i++) {
          hybridNotificationRouter.updateUserActivity(this.testUserId, 'tap');
        }
      }

      // Create context
      const context = hybridNotificationRouter.createDeliveryContext(
        this.testUserId,
        notificationType,
        'medium',
        appState
      );

      // Get routing decision
      const strategy = await hybridNotificationRouter.makeDeliveryDecision(
        context
      );
      const decision =
        hybridNotificationRouter.strategyToDeliveryDecision(strategy);

      const timeTaken = Date.now() - startTime;

      return {
        success: true,
        message: `Notification flow tested successfully`,
        timeTaken,
        deliveryDecision: decision,
        details: {
          notificationType,
          appState,
          userActivityLevel,
          strategy: strategy.strategy_name,
          reasoning: strategy.reasoning,
          decision: decision.delivery_method,
        },
      };
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      return {
        success: false,
        message: `Notification flow test failed: ${error}`,
        timeTaken,
      };
    }
  }

  /**
   * Generate test report
   */
  generateTestReport(testSuite: NotificationTestSuite): string {
    const { scenarios, results, overallSuccess, totalTime } = testSuite;

    let report = `
# Notification System Test Report

## Summary
- **Total Tests**: ${scenarios.length}
- **Passed**: ${results.filter((r) => r.success).length}
- **Failed**: ${results.filter((r) => !r.success).length}
- **Success Rate**: ${(
      (results.filter((r) => r.success).length / results.length) *
      100
    ).toFixed(1)}%
- **Total Time**: ${totalTime}ms
- **Overall Result**: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}

## Test Results

`;

    scenarios.forEach((scenario, index) => {
      const result = results[index];
      const status = result.success ? '✅ PASS' : '❌ FAIL';

      report += `### ${scenario.name} ${status}
- **Description**: ${scenario.description}
- **Time**: ${result.timeTaken}ms
- **Message**: ${result.message}
`;

      if (result.details) {
        report += `- **Details**: \`\`\`json
${JSON.stringify(result.details, null, 2)}
\`\`\`
`;
      }

      report += '\n';
    });

    return report;
  }
}

export const notificationTestService = NotificationTestService.getInstance();
export default notificationTestService;
