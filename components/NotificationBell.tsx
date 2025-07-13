import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  MessageCircle,
  Users,
  Megaphone,
  Calendar,
  UserPlus,
  CheckCircle,
  XCircle,
  X,
  Check,
  MoreHorizontal,
  Search,
  Filter,
  Settings,
  AlertTriangle,
  Clock,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { notificationService } from '@/services/notificationService';
import {
  Notification,
  EnhancedNotification,
  NotificationPriority,
  NotificationCategory,
  NotificationStats,
} from '@/types/notifications';
import { TextAvatar } from './TextAvatar';

const { width: screenWidth } = Dimensions.get('window');

interface NotificationBellProps {
  size?: number;
  iconColor?: string;
  badgeColor?: string;
  onNotificationPress?: (notification: Notification) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  showStats?: boolean;
  showSettings?: boolean;
  maxNotifications?: number;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  size = 24,
  iconColor = '#6B7280',
  badgeColor = '#DC2626',
  onNotificationPress,
  showSearch = true,
  showFilters = true,
  showStats = true,
  showSettings = true,
  maxNotifications = 50,
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<EnhancedNotification[]>(
    []
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'unread' | 'priority'
  >('all');
  const [selectedPriority, setSelectedPriority] = useState<
    NotificationPriority | 'all'
  >('all');
  const [selectedCategory, setSelectedCategory] = useState<
    NotificationCategory | 'all'
  >('all');
  const [groupBy, setGroupBy] = useState<
    'none' | 'type' | 'priority' | 'category'
  >('none');
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) {
      initializeNotifications();
      setupListeners();
    }

    return () => {
      cleanupListeners();
    };
  }, [user?.id]);

  const initializeNotifications = async () => {
    try {
      setLoading(true);
      await notificationService.initialize(user?.id!);
      await loadNotifications(true);
      await loadUnreadCount();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupListeners = () => {
    if (!user?.id) return;

    // Listen for new notifications
    notificationService.addNotificationListener('bell', (notification) => {
      handleNewNotification(notification);
    });

    // Listen for unread count changes
    notificationService.addCountListener('bell', (count) => {
      setUnreadCount(count);
      if (count > 0) {
        animateBell();
      }
    });
  };

  const cleanupListeners = () => {
    notificationService.removeNotificationListener('bell');
    notificationService.removeCountListener('bell');
  };

  const loadNotifications = async (reset: boolean = false) => {
    try {
      const currentPage = reset ? 0 : page;

      // Check if notification service method exists
      if (typeof notificationService.getEnhancedNotifications !== 'function') {
        console.warn('getEnhancedNotifications method not available');
        setNotifications([]);
        return;
      }

      const data = await notificationService.getEnhancedNotifications({
        limit: 20,
        offset: currentPage * 20,
        unreadOnly: selectedFilter === 'unread',
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        type:
          selectedCategory !== 'all' ? (selectedCategory as any) : undefined,
      });

      // Ensure data is an array and has unique IDs
      const uniqueData = Array.isArray(data)
        ? data.filter(
            (notification, index, self) =>
              index === self.findIndex((n) => n.id === notification.id)
          )
        : [];

      if (reset) {
        setNotifications(uniqueData);
        setPage(0);
      } else {
        setNotifications((prev) => {
          const combined = [...prev, ...uniqueData];
          // Remove duplicates based on ID
          return combined.filter(
            (notification, index, self) =>
              index === self.findIndex((n) => n.id === notification.id)
          );
        });
      }

      setHasMore(uniqueData.length === 20);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  };

  const loadUnreadCount = async () => {
    try {
      if (typeof notificationService.getUnreadCount !== 'function') {
        console.warn('getUnreadCount method not available');
        setUnreadCount(0);
        return;
      }

      const count = await notificationService.getUnreadCount();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
      setUnreadCount(0);
    }
  };

  const handleNewNotification = (notification: Notification) => {
    // Convert to enhanced notification
    const enhancedNotification: EnhancedNotification = {
      ...notification,
      priority_level: 'medium',
      delivery_method: 'in_app',
      can_be_batched: true,
      max_delay_minutes: 0,
      requires_permission: false,
      delivery_status: 'delivered',
      delivery_attempts: 1,
    };

    setNotifications((prev) => [enhancedNotification, ...prev.slice(0, 19)]);
    animateBell();
  };

  const animateBell = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleDropdown = () => {
    if (showDropdown) {
      // Hide dropdown
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowDropdown(false);
      });
    } else {
      // Show dropdown
      setShowDropdown(true);
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Refresh notifications when opening - reset to get latest notifications first
      loadNotifications(true);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read and close dropdown
    await notificationService.markAsRead(notification.id);
    setShowDropdown(false);

    // Handle navigation
    if (onNotificationPress) {
      onNotificationPress(notification);
    } else {
      notificationService.handleNotificationTap(notification);
    }

    // Refresh notifications list
    await loadNotifications(true);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications(true);
      setShowDropdown(false);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDismissNotification = async (
    notificationId: string,
    event: any
  ) => {
    event.stopPropagation();
    try {
      await notificationService.dismissNotification(notificationId);
      await loadNotifications(true);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const defaultColor = '#6B7280';
    const iconColor =
      typeof notificationService.getNotificationColor === 'function'
        ? notificationService.getNotificationColor(type)
        : defaultColor;

    const iconProps = {
      size: 20,
      color: iconColor || defaultColor,
    };

    switch (type) {
      case 'direct_message':
        return <MessageCircle {...iconProps} />;
      case 'group_message':
        return <Users {...iconProps} />;
      case 'club_announcement':
        return <Megaphone {...iconProps} />;
      case 'club_event':
        return <Calendar {...iconProps} />;
      case 'join_request':
        return <UserPlus {...iconProps} />;
      case 'join_approved':
        return <CheckCircle {...iconProps} />;
      case 'join_rejected':
        return <XCircle {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const formatNotificationTime = (dateString: string) => {
    if (typeof notificationService.formatNotificationTime === 'function') {
      return notificationService.formatNotificationTime(dateString);
    }

    // Fallback formatting
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;

      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  const renderNotificationItem = (
    notification: Notification,
    index: number
  ) => (
    <TouchableOpacity
      key={`notification-${notification.id}-${index}`}
      style={[
        styles.notificationItem,
        !notification.is_read && styles.notificationItemUnread,
        index === notifications.length - 1 && styles.notificationItemLast,
      ]}
      onPress={() => handleNotificationPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIcon}>
        {getNotificationIcon(notification.type)}
      </View>

      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.notificationTime}>
          {formatNotificationTime(notification.created_at)}
        </Text>
      </View>

      {!notification.is_read && <View style={styles.unreadDot} />}

      <TouchableOpacity
        style={styles.dismissButton}
        onPress={(e) => handleDismissNotification(notification.id, e)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={styles.bellContainer}
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Bell size={size} color={iconColor} />
        </Animated.View>

        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="none"
        onRequestClose={toggleDropdown}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={toggleDropdown}
        >
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                opacity: dropdownAnim,
                transform: [
                  {
                    translateY: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Header */}
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Notifications</Text>
                <View style={styles.headerActions}>
                  {unreadCount > 0 && (
                    <TouchableOpacity
                      style={styles.markAllButton}
                      onPress={handleMarkAllAsRead}
                    >
                      <Check size={16} color="#DC2626" />
                      <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={toggleDropdown}
                  >
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notifications List */}
              <ScrollView
                style={styles.notificationsList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                      Loading notifications...
                    </Text>
                  </View>
                ) : notifications.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Bell size={48} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No notifications</Text>
                    <Text style={styles.emptyText}>
                      You&apos;re all caught up! New notifications will appear
                      here.
                    </Text>
                  </View>
                ) : (
                  notifications.map((notification, index) => (
                    <View
                      key={`notification-wrapper-${notification.id}-${index}`}
                    >
                      {renderNotificationItem(notification, index)}
                    </View>
                  ))
                )}
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    lineHeight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: screenWidth * 0.9,
    maxWidth: 400,
    maxHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    gap: 4,
  },
  markAllText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#DC2626',
  },
  closeButton: {
    padding: 4,
  },
  notificationsList: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  notificationItemUnread: {
    backgroundColor: '#FEF7F7',
  },
  notificationItemLast: {
    borderBottomWidth: 0,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 2,
  },
  notificationTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#111827',
    lineHeight: 18,
  },
  notificationMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 16,
  },
  notificationTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginTop: 6,
  },
  dismissButton: {
    padding: 4,
    marginTop: 2,
  },
});

export default NotificationBell;
