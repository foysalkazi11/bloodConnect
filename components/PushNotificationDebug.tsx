import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { pushNotificationService } from '@/services/pushNotificationService';
import { supabase } from '@/lib/supabase';

export default function PushNotificationDebug() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('Not initialized');
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string>('Unknown');
  const [isDevice, setIsDevice] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<string>('');
  const [dbTokens, setDbTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    setIsDevice(Device.isDevice);
    setProjectId(process.env.EXPO_PUBLIC_PROJECT_ID || 'NOT_SET');

    // Check permissions
    const { status: permissionStatus } =
      await Notifications.getPermissionsAsync();
    setPermissions(permissionStatus);

    // Set appropriate status based on platform
    if (!Device.isDevice) {
      setStatus('Not supported on web/simulator');
    } else {
      // Check if already has token
      const currentToken = pushNotificationService.getCurrentToken();
      if (currentToken) {
        setToken(currentToken);
        setStatus('Already initialized');
      }
    }

    // Check database tokens
    await checkDatabaseTokens();
  };

  const checkDatabaseTokens = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tokens:', error);
        return;
      }

      setDbTokens(data || []);
    } catch (error) {
      console.error('Error checking database tokens:', error);
    }
  };

  const requestPermissions = async () => {
    setLoading(true);
    try {
      const success = await pushNotificationService.requestPermissions();
      if (success) {
        setPermissions('granted');
        setStatus('Permissions granted');
      } else {
        setPermissions('denied');
        setStatus('Permissions denied');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setStatus('Error requesting permissions');
    }
    setLoading(false);
  };

  const initializePushNotifications = async () => {
    if (!user) {
      Alert.alert('Error', 'No user found');
      return;
    }

    setLoading(true);
    setStatus('Initializing...');

    try {
      const success = await pushNotificationService.initialize(user.id);
      if (success) {
        setStatus('Successfully initialized');
        const currentToken = pushNotificationService.getCurrentToken();
        setToken(currentToken);
        await checkDatabaseTokens();
      } else {
        setStatus('Failed to initialize');
      }
    } catch (error) {
      console.error('Error initializing:', error);
      setStatus(`Error: ${error}`);
    }
    setLoading(false);
  };

  const sendTestNotification = async () => {
    if (!user) {
      Alert.alert('Error', 'No user found');
      return;
    }

    setLoading(true);
    try {
      // Send a high-priority test notification using emergency type for better visibility
      const success =
        await pushNotificationService.sendNotificationWithDeliveryDecision(
          user.id,
          'emergency_blood_request', // Use emergency type for high priority
          'BloodConnect Test 🩸',
          'This is a test push notification! If you can see this, push notifications are working correctly.',
          {
            type: 'test',
            priority: 'urgent',
            test: true,
          },
          {
            should_send_push: true,
            should_send_in_app: false,
            delivery_method: 'push',
          }
        );

      if (success) {
        Alert.alert(
          'Test Notification Sent! 🚀',
          'Check your device for the notification.\n\n' +
            '💡 To see the notification:\n' +
            '• Minimize or close the app\n' +
            '• Look for notification banner\n' +
            '• Check notification center\n' +
            '• Ensure notifications are ON in iOS Settings\n\n' +
            "🔧 If you don't see it:\n" +
            '• iOS may suppress notifications when app is active\n' +
            '• Check if Do Not Disturb is enabled\n' +
            '• Verify app notification permissions'
        );
      } else {
        Alert.alert('Failed', 'Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', `Failed to send test notification: ${error}`);
    }
    setLoading(false);
  };

  const refreshTokens = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const success = await pushNotificationService.refreshPushToken(user.id);
      if (success) {
        const currentToken = pushNotificationService.getCurrentToken();
        setToken(currentToken);
        await checkDatabaseTokens();
        setStatus('Token refreshed successfully');
      } else {
        setStatus('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      setStatus(`Error refreshing token: ${error}`);
    }
    setLoading(false);
  };

  const clearTokens = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing tokens:', error);
      } else {
        setDbTokens([]);
        setToken(null);
        setStatus('Tokens cleared');
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Push Notification Debug</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>
          <Text style={styles.info}>
            Device: {isDevice ? 'Physical Device' : 'Simulator'}
          </Text>
          <Text style={styles.info}>Platform: {Platform.OS}</Text>
          <Text style={styles.info}>Project ID: {projectId}</Text>
          <Text style={styles.info}>
            User ID: {user?.id || 'Not logged in'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Status</Text>
          <Text style={[styles.info, { color: user ? '#10B981' : '#EF4444' }]}>
            Status: {user ? '✅ Logged In' : '❌ Not Logged In'}
          </Text>
          {user && (
            <>
              <Text style={styles.info}>Email: {user.email}</Text>
              <Text style={styles.info}>
                Email Verified: {user.email_confirmed_at ? '✅ Yes' : '❌ No'}
              </Text>
            </>
          )}
          {!user && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ You need to sign in to test push notifications
              </Text>
              <Text style={styles.bulletText}>
                • Go to Profile tab to sign in
              </Text>
              <Text style={styles.bulletText}>
                • Or use the debug button to navigate to /auth
              </Text>
              <Text style={styles.bulletText}>
                • Push notifications require user authentication
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notification Status</Text>
          <Text style={styles.info}>Status: {status}</Text>
          <Text style={styles.info}>Permissions: {permissions}</Text>
          <Text style={styles.info}>Current Token: {token ? 'Yes' : 'No'}</Text>
          <Text style={styles.info}>Database Tokens: {dbTokens.length}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {!isDevice && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ Push notifications only work on physical mobile devices
                (iOS/Android). To test push notifications:
              </Text>
              <Text style={styles.bulletText}>
                • Use Expo Go app on your phone
              </Text>
              <Text style={styles.bulletText}>
                • Build a development build with EAS
              </Text>
              <Text style={styles.bulletText}>• Test on a physical device</Text>
              <Text style={styles.bulletText}>
                • Web browsers use different notification APIs
              </Text>
            </View>
          )}

          {!user && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.buttonText}>🔑 Sign In / Create Account</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              isDevice ? styles.primaryButton : styles.disabledButton,
            ]}
            onPress={requestPermissions}
            disabled={loading || !isDevice}
          >
            <Text style={styles.buttonText}>Request Permissions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              isDevice ? styles.primaryButton : styles.disabledButton,
            ]}
            onPress={initializePushNotifications}
            disabled={loading || !isDevice}
          >
            <Text style={styles.buttonText}>Initialize Push Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              isDevice ? styles.secondaryButton : styles.disabledButton,
            ]}
            onPress={refreshTokens}
            disabled={loading || !isDevice}
          >
            <Text style={styles.buttonText}>Refresh Token</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              isDevice && token ? styles.successButton : styles.disabledButton,
            ]}
            onPress={sendTestNotification}
            disabled={loading || !token || !isDevice}
          >
            <Text style={styles.buttonText}>Send Test Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              isDevice ? styles.dangerButton : styles.disabledButton,
            ]}
            onPress={clearTokens}
            disabled={loading || !isDevice}
          >
            <Text style={styles.buttonText}>Clear All Tokens</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Tokens</Text>
          {dbTokens.length > 0 ? (
            dbTokens.map((token, index) => (
              <View key={index} style={styles.tokenCard}>
                <Text style={styles.tokenInfo}>
                  Device: {token.device_type}
                </Text>
                <Text style={styles.tokenInfo}>
                  Active: {token.is_active ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.tokenInfo}>
                  Created: {new Date(token.created_at).toLocaleString()}
                </Text>
                <Text style={styles.tokenInfo}>
                  Token: {token.token.substring(0, 50)}...
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noTokens}>No tokens found in database</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  info: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#DC2626',
  },
  secondaryButton: {
    backgroundColor: '#3B82F6',
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenCard: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tokenInfo: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 2,
  },
  noTokens: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
  },
  bulletText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#92400E',
    marginLeft: 8,
    marginVertical: 2,
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
});
