import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import {
  TestTube,
  Bell,
  Settings,
  X,
  Play,
  AlertCircle,
  MessageCircle,
  Users,
  Calendar,
  Activity,
} from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  NotificationEventType,
  NotificationPriority,
} from '@/types/notifications';
import { hybridNotificationRouter } from '@/services/hybridNotificationRouter';
import { notificationTestService } from '@/services/notificationTestService';

interface NotificationTestPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface TestScenario {
  id: string;
  name: string;
  type: NotificationEventType;
  priority: NotificationPriority;
  icon: React.ReactNode;
  description: string;
  testData: {
    title: string;
    message: string;
  };
}

export const NotificationTestPanel: React.FC<NotificationTestPanelProps> = ({
  visible,
  onClose,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [appState, setAppState] = useState<'foreground' | 'background'>(
    'background'
  );
  const [userActivity, setUserActivity] = useState<'low' | 'medium' | 'high'>(
    'medium'
  );

  const { user } = useAuth();

  const testScenarios: TestScenario[] = [
    {
      id: 'emergency',
      name: 'Emergency Blood Request',
      type: 'emergency_blood_request',
      priority: 'urgent',
      icon: <AlertCircle size={20} color="#DC2626" />,
      description: 'Test urgent emergency blood request notification',
      testData: {
        title: 'Emergency Blood Request',
        message: 'Blood needed urgently at City Hospital. A+ required.',
      },
    },
    {
      id: 'direct_message',
      name: 'Direct Message',
      type: 'direct_message',
      priority: 'high',
      icon: <MessageCircle size={20} color="#3B82F6" />,
      description: 'Test direct message notification',
      testData: {
        title: 'New Direct Message',
        message: 'You have a new message from Dr. Smith.',
      },
    },
    {
      id: 'club_message',
      name: 'Club Message',
      type: 'club_message',
      priority: 'medium',
      icon: <Users size={20} color="#8B5CF6" />,
      description: 'Test club group message notification',
      testData: {
        title: 'Club Message',
        message: 'New message in Blood Heroes club.',
      },
    },
    {
      id: 'club_announcement',
      name: 'Club Announcement',
      type: 'club_announcement',
      priority: 'medium',
      icon: <Bell size={20} color="#F59E0B" />,
      description: 'Test club announcement notification',
      testData: {
        title: 'Club Announcement',
        message: 'Blood Heroes club has a new announcement.',
      },
    },
    {
      id: 'club_event',
      name: 'Club Event',
      type: 'club_event',
      priority: 'medium',
      icon: <Calendar size={20} color="#10B981" />,
      description: 'Test club event notification',
      testData: {
        title: 'New Club Event',
        message: 'Blood Drive scheduled for tomorrow at 10 AM.',
      },
    },
  ];

  const handleTestScenario = async (scenario: TestScenario) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please login to test notifications');
      return;
    }

    setTesting(true);
    setSelectedScenario(scenario.id);

    try {
      // Test the hybrid router decision
      const testResult = await notificationTestService.testNotificationFlow(
        scenario.type,
        appState,
        userActivity
      );

      // Create actual notification in database
      const { data: notificationId, error } = await supabase.rpc(
        'create_notification',
        {
          p_user_id: user.id,
          p_type: scenario.type,
          p_title: scenario.testData.title,
          p_message: scenario.testData.message,
          p_related_id: null,
          p_related_type: null,
          p_action_url: null,
          p_expires_at: null,
        }
      );

      if (error) {
        throw error;
      }

      setTestResults((prev) => [
        ...prev,
        {
          scenario: scenario.name,
          result: testResult,
          timestamp: new Date().toISOString(),
          notificationId,
        },
      ]);

      Alert.alert(
        'Test Complete',
        `${scenario.name} tested successfully!\n\nDelivery Method: ${testResult.deliveryDecision?.delivery_method}\nStrategy: ${testResult.details?.strategy}\nTime: ${testResult.timeTaken}ms`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Test failed:', error);
      Alert.alert('Test Failed', `Error testing ${scenario.name}: ${error}`);
    } finally {
      setTesting(false);
      setSelectedScenario(null);
    }
  };

  const handleRunAllTests = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please login to run tests');
      return;
    }

    setTesting(true);

    try {
      const testSuite = await notificationTestService.runAllTests();
      const report = notificationTestService.generateTestReport(testSuite);

      Alert.alert(
        'All Tests Complete',
        `${testSuite.results.filter((r) => r.success).length}/${
          testSuite.results.length
        } tests passed\n\nSuccess Rate: ${(
          (testSuite.results.filter((r) => r.success).length /
            testSuite.results.length) *
          100
        ).toFixed(1)}%\n\nTotal Time: ${testSuite.totalTime}ms`,
        [{ text: 'OK' }]
      );

      setTestResults((prev) => [
        ...prev,
        {
          scenario: 'Full Test Suite',
          result: {
            success: testSuite.overallSuccess,
            message: `${testSuite.results.length} tests completed`,
            details: testSuite,
          },
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Full test failed:', error);
      Alert.alert('Test Failed', `Error running full test suite: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'low':
        return <Activity size={16} color="#EF4444" />;
      case 'medium':
        return <Activity size={16} color="#F59E0B" />;
      case 'high':
        return <Activity size={16} color="#10B981" />;
      default:
        return <Activity size={16} color="#6B7280" />;
    }
  };

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900">
            Notification Test Panel
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 py-4">
          {/* Test Settings */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Test Settings
            </Text>

            <View className="bg-gray-50 rounded-lg p-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-medium text-gray-900">
                  App State
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-sm text-gray-600 mr-2">Background</Text>
                  <Switch
                    value={appState === 'foreground'}
                    onValueChange={(value) =>
                      setAppState(value ? 'foreground' : 'background')
                    }
                    trackColor={{ false: '#E5E7EB', true: '#FEE2E2' }}
                    thumbColor={
                      appState === 'foreground' ? '#DC2626' : '#9CA3AF'
                    }
                  />
                  <Text className="text-sm text-gray-600 ml-2">Foreground</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-base font-medium text-gray-900">
                  User Activity
                </Text>
                <View className="flex-row items-center">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setUserActivity(level)}
                      className={`mx-1 px-3 py-1 rounded-full flex-row items-center ${
                        userActivity === level
                          ? 'bg-red-100 border border-red-300'
                          : 'bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {getActivityIcon(level)}
                      <Text
                        className={`ml-1 text-sm capitalize ${
                          userActivity === level
                            ? 'text-red-800'
                            : 'text-gray-700'
                        }`}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Test Scenarios */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Test Scenarios
            </Text>

            {testScenarios.map((scenario) => (
              <View key={scenario.id} className="mb-3">
                <View className="bg-white rounded-lg p-4 border border-gray-200">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      {scenario.icon}
                      <Text className="ml-2 text-base font-medium text-gray-900">
                        {scenario.name}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <View
                        className={`px-2 py-1 rounded-full ${
                          scenario.priority === 'urgent'
                            ? 'bg-red-100'
                            : scenario.priority === 'high'
                            ? 'bg-orange-100'
                            : 'bg-yellow-100'
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            scenario.priority === 'urgent'
                              ? 'text-red-800'
                              : scenario.priority === 'high'
                              ? 'text-orange-800'
                              : 'text-yellow-800'
                          }`}
                        >
                          {scenario.priority}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text className="text-sm text-gray-600 mb-3">
                    {scenario.description}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleTestScenario(scenario)}
                    disabled={testing}
                    className={`flex-row items-center justify-center px-4 py-2 rounded-lg ${
                      testing && selectedScenario === scenario.id
                        ? 'bg-gray-200'
                        : 'bg-red-600 active:bg-red-700'
                    }`}
                  >
                    <Play
                      size={16}
                      color={
                        testing && selectedScenario === scenario.id
                          ? '#6B7280'
                          : '#FFFFFF'
                      }
                    />
                    <Text
                      className={`ml-2 text-sm font-medium ${
                        testing && selectedScenario === scenario.id
                          ? 'text-gray-600'
                          : 'text-white'
                      }`}
                    >
                      {testing && selectedScenario === scenario.id
                        ? 'Testing...'
                        : 'Test'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Run All Tests */}
          <View className="mb-6">
            <TouchableOpacity
              onPress={handleRunAllTests}
              disabled={testing}
              className={`flex-row items-center justify-center px-6 py-3 rounded-lg ${
                testing ? 'bg-gray-200' : 'bg-blue-600 active:bg-blue-700'
              }`}
            >
              <TestTube size={20} color={testing ? '#6B7280' : '#FFFFFF'} />
              <Text
                className={`ml-2 text-base font-medium ${
                  testing ? 'text-gray-600' : 'text-white'
                }`}
              >
                {testing ? 'Running Tests...' : 'Run All Tests'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Test Results */}
          {testResults.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                Recent Test Results
              </Text>

              {testResults
                .slice(-5)
                .reverse()
                .map((result, index) => (
                  <View key={index} className="mb-2 bg-gray-50 rounded-lg p-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-sm font-medium text-gray-900">
                        {result.scenario}
                      </Text>
                      <Text
                        className={`text-xs font-medium ${
                          result.result.success
                            ? 'text-green-800'
                            : 'text-red-800'
                        }`}
                      >
                        {result.result.success ? 'PASS' : 'FAIL'}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-600">
                      {result.result.message}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};
