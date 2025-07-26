import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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
  Heart,
  Settings,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';

interface NotificationSettingsProps {
  visible?: boolean;
  onClose?: () => void;
}

interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  in_app_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  emergency_notifications: boolean;
  direct_messages: boolean;
  club_messages: boolean;
  club_announcements: boolean;
  club_events: boolean;
  social_interactions: boolean;
  system_updates: boolean;
  emergency_only_mode: boolean;
  batch_notifications: boolean;
  created_at: string;
  updated_at: string;
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
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  const { user, profile } = useAuth();
  const { showNotification } = useNotification();

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        // Progressive permission defaults - start conservative, let users opt-in
        const mockPreferences: NotificationPreferences = {
          id: 'pref_' + user.id,
          user_id: user.id,
          push_enabled: false, // Start with push disabled
          in_app_enabled: true, // In-app notifications are less intrusive
          sound_enabled: false, // Start quiet
          vibration_enabled: false, // Start quiet
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          emergency_notifications: false, // Let users opt-in when they understand the value
          direct_messages: false, // Enable when user starts messaging
          club_messages: false, // Enable when user joins a club
          club_announcements: false, // Enable when user joins a club
          club_events: false, // Enable when user joins a club
          social_interactions: false, // Opt-in only for less important notifications
          system_updates: true, // Keep essential system updates on
          emergency_only_mode: false,
          batch_notifications: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setPreferences(mockPreferences);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load notification preferences',
          duration: 4000,
        });
      } finally {
        setLoading(false);
      }
    };

    if (visible && user?.id) {
      loadPreferences();
    }
  }, [visible, user?.id, profile?.user_type, showNotification]);

  const updatePreference = async (
    updates: Partial<NotificationPreferences>
  ) => {
    if (!user?.id || !preferences) return;

    try {
      // Update local state immediately for responsive UI
      const updatedPreferences = { ...preferences, ...updates };
      setPreferences(updatedPreferences);

      // In real app, this would update Supabase
      console.log('Updating preferences:', updates);

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

  const formatQuietHours = (startTime: string, endTime: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const getCategorySettings = (): CategorySettings[] => {
    if (!preferences) return [];

    const categories: CategorySettings[] = [
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
        description: 'Direct messages and conversations',
        icon: <MessageCircle size={24} color="#3B82F6" />,
        enabled: preferences.direct_messages,
        subcategories: [
          {
            id: 'direct_messages',
            title: 'Direct Messages',
            enabled: preferences.direct_messages,
          },
        ],
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

    // Add club-specific categories for club users or donors who are in clubs
    if (profile?.user_type === 'club' || profile?.user_type === 'donor') {
      categories[1].subcategories?.push({
        id: 'club_messages',
        title: 'Club Messages',
        enabled: preferences.club_messages,
      });

      categories.splice(2, 0, {
        id: 'announcements',
        title: 'Club Announcements',
        description: 'Club announcements and important updates',
        icon: <Megaphone size={24} color="#F59E0B" />,
        enabled: preferences.club_announcements,
      });

      categories.splice(3, 0, {
        id: 'events',
        title: 'Club Events',
        description: 'Blood drives, meetings, and club events',
        icon: <Calendar size={24} color="#10B981" />,
        enabled: preferences.club_events,
      });
    }

    return categories;
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
                  const updates: Partial<NotificationPreferences> = {};
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
                        const updates: Partial<NotificationPreferences> = {};
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

  if (loading) {
    return (
      <Modal
        visible={visible}
        presentationStyle="pageSheet"
        animationType="slide"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
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
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <X size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderGlobalSettings()}
          {renderQuietHours()}
          {renderCategorySettings()}

          {/* User Type Indicator */}
          <View style={styles.userTypeSection}>
            <Text style={styles.userTypeTitle}>
              Settings for:{' '}
              {profile?.user_type === 'club' ? 'Club Account' : 'Donor Account'}
            </Text>
            <Text style={styles.userTypeDescription}>
              {profile?.user_type === 'club'
                ? 'Club accounts receive notifications for member management, events, and announcements.'
                : 'Donor accounts receive notifications for blood donation opportunities and club activities.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
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
  userTypeSection: {
    backgroundColor: '#EFF6FF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  userTypeTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1E40AF',
    marginBottom: 8,
  },
  userTypeDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});

export default NotificationSettings;
