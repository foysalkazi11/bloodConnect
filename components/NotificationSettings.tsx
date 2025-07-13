import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
  Moon,
  Clock,
  AlertTriangle,
  MessageCircle,
  Users,
  Megaphone,
  Calendar,
  UserPlus,
  Heart,
  Settings,
  RotateCcw,
  Save,
  CheckCircle,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';
import {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  NotificationStats,
} from '@/types/notifications';
import { notificationPreferencesService } from '@/services/notificationPreferencesService';
import notificationService from '@/services/notificationService';
import { pushNotificationService } from '@/services/pushNotificationService';

interface NotificationSettingsProps {
  onBack?: () => void;
  visible?: boolean;
  onClose?: () => void;
}

interface CategorySettings {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  subcategories?: {
    id: string;
    title: string;
    enabled: boolean;
  }[];
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  visible,
  onClose,
}) => {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  const { user } = useAuth();
  const { showNotification } = useNotification();

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;

      try {
        const userPrefs =
          await notificationPreferencesService.getUserPreferences(user.id);
        setPreferences(userPrefs);

        // Check push notification permissions
        const pushPermissions =
          await pushNotificationService.arePushNotificationsEnabled();
        setPushEnabled(pushPermissions);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      loadPreferences();
    }
  }, [visible, user?.id]);

  const loadStats = async () => {
    try {
      const notificationStats =
        await notificationService.getNotificationStats();
      setStats(notificationStats);
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const updatePreference = async (updates: NotificationPreferencesUpdate) => {
    if (!user?.id || !preferences) return;

    try {
      const updatedPreferences =
        await notificationPreferencesService.updateUserPreferences(
          user.id,
          updates
        );
      setPreferences(updatedPreferences);
      setHasChanges(true);

      showNotification({
        type: 'success',
        title: 'Preferences Updated',
        message: 'Your notification preferences have been saved',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update notification preferences',
        duration: 4000,
      });
    }
  };

  const handleResetToDefault = () => {
    Alert.alert(
      'Reset to Default',
      'Are you sure you want to reset all notification preferences to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await notificationPreferencesService.resetPreferencesToDefault(
                user?.id!
              );
              await loadPreferences();
              setHasChanges(false);
              showNotification({
                type: 'success',
                title: 'Preferences Reset',
                message:
                  'All notification preferences have been reset to default',
                duration: 3000,
              });
            } catch (error) {
              console.error('Error resetting preferences:', error);
              showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to reset preferences',
                duration: 4000,
              });
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const formatQuietHours = (startTime: string, endTime: string) => {
    return notificationPreferencesService.formatQuietHours(startTime, endTime);
  };

  const getCategorySettings = (): CategorySettings[] => {
    if (!preferences) return [];

    return [
      {
        id: 'emergency',
        title: 'Emergency Notifications',
        description: 'Critical blood donation requests and medical emergencies',
        icon: <AlertTriangle size={24} color="#DC2626" />,
        enabled: preferences.emergency_notifications,
      },
      {
        id: 'messages',
        title: 'Messages',
        description: 'Direct messages and group conversations',
        icon: <MessageCircle size={24} color="#3B82F6" />,
        enabled: preferences.direct_messages,
        subcategories: [
          {
            id: 'direct_messages',
            title: 'Direct Messages',
            enabled: preferences.direct_messages,
          },
          {
            id: 'club_messages',
            title: 'Club Messages',
            enabled: preferences.club_messages,
          },
        ],
      },
      {
        id: 'announcements',
        title: 'Announcements',
        description: 'Club announcements and important updates',
        icon: <Megaphone size={24} color="#F59E0B" />,
        enabled: preferences.club_announcements,
      },
      {
        id: 'events',
        title: 'Events',
        description: 'Blood drives, meetings, and club events',
        icon: <Calendar size={24} color="#10B981" />,
        enabled: preferences.club_events,
      },
      {
        id: 'social',
        title: 'Social',
        description: 'Likes, comments, and social interactions',
        icon: <Heart size={24} color="#EC4899" />,
        enabled: preferences.social_interactions,
      },
      {
        id: 'system',
        title: 'System',
        description: 'App updates and system notifications',
        icon: <Settings size={24} color="#6B7280" />,
        enabled: preferences.system_updates,
      },
    ];
  };

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Notification Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total_notifications}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.unread_count}</Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.delivered_count}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.failed_count}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderGlobalSettings = () => {
    if (!preferences) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Global Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Bell size={20} color="#DC2626" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications when app is closed
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.push_enabled}
            onValueChange={(value) => updatePreference({ push_enabled: value })}
            trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
            thumbColor={preferences.push_enabled ? '#DC2626' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Smartphone size={20} color="#DC2626" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>In-App Notifications</Text>
              <Text style={styles.settingDescription}>
                Show notifications while using the app
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.in_app_enabled}
            onValueChange={(value) =>
              updatePreference({ in_app_enabled: value })
            }
            trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
            thumbColor={preferences.in_app_enabled ? '#DC2626' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            {preferences.sound_enabled ? (
              <Volume2 size={20} color="#DC2626" />
            ) : (
              <VolumeX size={20} color="#9CA3AF" />
            )}
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sound</Text>
              <Text style={styles.settingDescription}>
                Play sound for notifications
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.sound_enabled}
            onValueChange={(value) =>
              updatePreference({ sound_enabled: value })
            }
            trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
            thumbColor={preferences.sound_enabled ? '#DC2626' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Smartphone size={20} color="#DC2626" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Vibration</Text>
              <Text style={styles.settingDescription}>
                Vibrate for notifications
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.vibration_enabled}
            onValueChange={(value) =>
              updatePreference({ vibration_enabled: value })
            }
            trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
            thumbColor={preferences.vibration_enabled ? '#DC2626' : '#9CA3AF'}
          />
        </View>
      </View>
    );
  };

  const renderQuietHours = () => {
    if (!preferences) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet Hours</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Moon size={20} color="#DC2626" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
              <Text style={styles.settingDescription}>
                Pause non-urgent notifications during quiet hours
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.quiet_hours_enabled}
            onValueChange={(value) =>
              updatePreference({ quiet_hours_enabled: value })
            }
            trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
            thumbColor={preferences.quiet_hours_enabled ? '#DC2626' : '#9CA3AF'}
          />
        </View>

        {preferences.quiet_hours_enabled && (
          <View style={styles.quietHoursInfo}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.quietHoursText}>
              Quiet hours:{' '}
              {formatQuietHours(
                preferences.quiet_hours_start,
                preferences.quiet_hours_end
              )}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderCategorySettings = () => {
    const categories = getCategorySettings();

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Categories</Text>

        {categories.map((category) => (
          <View key={category.id} style={styles.categoryItem}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryLeft}>
                {category.icon}
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>
                    {category.description}
                  </Text>
                </View>
              </View>
              <Switch
                value={category.enabled}
                onValueChange={(value) => {
                  const updates: NotificationPreferencesUpdate = {};
                  switch (category.id) {
                    case 'emergency':
                      updates.emergency_notifications = value;
                      break;
                    case 'messages':
                      updates.direct_messages = value;
                      updates.club_messages = value;
                      break;
                    case 'announcements':
                      updates.club_announcements = value;
                      break;
                    case 'events':
                      updates.club_events = value;
                      break;
                    case 'social':
                      updates.social_interactions = value;
                      break;
                    case 'system':
                      updates.system_updates = value;
                      break;
                  }
                  updatePreference(updates);
                }}
                trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
                thumbColor={category.enabled ? '#DC2626' : '#9CA3AF'}
              />
            </View>

            {category.subcategories && category.enabled && (
              <View style={styles.subcategories}>
                {category.subcategories.map((subcategory) => (
                  <View key={subcategory.id} style={styles.subcategoryItem}>
                    <Text style={styles.subcategoryTitle}>
                      {subcategory.title}
                    </Text>
                    <Switch
                      value={subcategory.enabled}
                      onValueChange={(value) => {
                        const updates: NotificationPreferencesUpdate = {};
                        if (subcategory.id === 'direct_messages') {
                          updates.direct_messages = value;
                        } else if (subcategory.id === 'club_messages') {
                          updates.club_messages = value;
                        }
                        updatePreference(updates);
                      }}
                      trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
                      thumbColor={subcategory.enabled ? '#DC2626' : '#9CA3AF'}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderSpecialModes = () => {
    if (!preferences) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Modes</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <AlertTriangle size={20} color="#DC2626" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Emergency Only Mode</Text>
              <Text style={styles.settingDescription}>
                Only receive urgent emergency notifications
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.emergency_only_mode}
            onValueChange={(value) =>
              updatePreference({ emergency_only_mode: value })
            }
            trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
            thumbColor={preferences.emergency_only_mode ? '#DC2626' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Clock size={20} color="#DC2626" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Batch Notifications</Text>
              <Text style={styles.settingDescription}>
                Group similar notifications together
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.batch_notifications}
            onValueChange={(value) =>
              updatePreference({ batch_notifications: value })
            }
            trackColor={{ false: '#F3F4F6', true: '#FEE2E2' }}
            thumbColor={preferences.batch_notifications ? '#DC2626' : '#9CA3AF'}
          />
        </View>
      </View>
    );
  };

  const handlePushNotificationToggle = async () => {
    if (!user?.id) return;

    setCheckingPermissions(true);
    try {
      if (!pushEnabled) {
        // Request permission
        const granted = await pushNotificationService.requestPermissions();
        if (granted) {
          // Initialize push service for this user
          await pushNotificationService.initialize(user.id);
          setPushEnabled(true);

          // Update preferences
          await updatePreference({ push_enabled: true });

          showNotification({
            type: 'success',
            title: 'Push Notifications Enabled',
            message: 'You will now receive push notifications',
            duration: 3000,
          });
        } else {
          showNotification({
            type: 'error',
            title: 'Permission Denied',
            message: 'Push notifications require permission to work',
            duration: 4000,
          });
        }
      } else {
        // Disable push notifications
        await updatePreference({ push_enabled: false });
        setPushEnabled(false);

        showNotification({
          type: 'success',
          title: 'Push Notifications Disabled',
          message: 'You will no longer receive push notifications',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update push notification settings',
        duration: 4000,
      });
    } finally {
      setCheckingPermissions(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            Notification Settings
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} className="text-gray-600" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 py-4">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#DC2626" />
              <Text className="mt-4 text-gray-600">Loading settings...</Text>
            </View>
          ) : (
            <>
              {/* Push Notifications Section */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900">
                      Push Notifications
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      Receive notifications when the app is closed
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    {checkingPermissions && (
                      <ActivityIndicator
                        size="small"
                        color="#DC2626"
                        className="mr-2"
                      />
                    )}
                    <Switch
                      value={pushEnabled && preferences?.push_enabled}
                      onValueChange={handlePushNotificationToggle}
                      disabled={checkingPermissions}
                      trackColor={{ false: '#E5E7EB', true: '#FEE2E2' }}
                      thumbColor={
                        pushEnabled && preferences?.push_enabled
                          ? '#DC2626'
                          : '#9CA3AF'
                      }
                    />
                  </View>
                </View>

                {pushEnabled && preferences?.push_enabled && (
                  <View className="bg-green-50 p-3 rounded-lg">
                    <Text className="text-sm text-green-800">
                      ✓ Push notifications are enabled and working
                    </Text>
                  </View>
                )}

                {!pushEnabled && (
                  <View className="bg-amber-50 p-3 rounded-lg">
                    <Text className="text-sm text-amber-800">
                      ⚠ Push notifications are disabled in system settings
                    </Text>
                  </View>
                )}
              </View>

              {/* Existing settings... */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900">
                      In-App Notifications
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      Show notifications while using the app
                    </Text>
                  </View>
                  <Switch
                    value={preferences?.in_app_enabled}
                    onValueChange={(value) =>
                      updatePreference({ in_app_enabled: value })
                    }
                    trackColor={{ false: '#E5E7EB', true: '#FEE2E2' }}
                    thumbColor={
                      preferences?.in_app_enabled ? '#DC2626' : '#9CA3AF'
                    }
                  />
                </View>
              </View>

              {/* Sound & Vibration */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-4">
                  Sound & Vibration
                </Text>

                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base text-gray-900">Sound</Text>
                  <Switch
                    value={preferences?.sound_enabled}
                    onValueChange={(value) =>
                      updatePreference({ sound_enabled: value })
                    }
                    trackColor={{ false: '#E5E7EB', true: '#FEE2E2' }}
                    thumbColor={
                      preferences?.sound_enabled ? '#DC2626' : '#9CA3AF'
                    }
                  />
                </View>

                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base text-gray-900">Vibration</Text>
                  <Switch
                    value={preferences?.vibration_enabled}
                    onValueChange={(value) =>
                      updatePreference({ vibration_enabled: value })
                    }
                    trackColor={{ false: '#E5E7EB', true: '#FEE2E2' }}
                    thumbColor={
                      preferences?.vibration_enabled ? '#DC2626' : '#9CA3AF'
                    }
                  />
                </View>
              </View>

              {/* ... rest of existing settings ... */}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
  },
  resetButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#F9FAFB',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  settingDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  quietHoursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  quietHoursText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  categoryItem: {
    backgroundColor: '#FFFFFF',
    marginBottom: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  categoryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  categoryDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  subcategories: {
    backgroundColor: '#F9FAFB',
    paddingLeft: 56,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  subcategoryTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#111827',
  },
});

export default NotificationSettings;
