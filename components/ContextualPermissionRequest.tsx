import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  MessageCircle,
  AlertTriangle,
  Calendar,
  Bell,
  X,
  Check,
  Settings,
} from 'lucide-react-native';
import { PermissionRequest } from '@/services/progressivePermissionService';

interface ContextualPermissionRequestProps {
  visible: boolean;
  request: PermissionRequest | null;
  onAccept: (categories: string[]) => void;
  onDecline: () => void;
  onSkip: () => void;
  onCustomize: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ContextualPermissionRequest: React.FC<
  ContextualPermissionRequestProps
> = ({ visible, request, onAccept, onDecline, onSkip, onCustomize }) => {
  const [slideAnim] = useState(new Animated.Value(0));
  const [opacityAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible && request) {
      // Fade in animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, request]);

  const getIcon = () => {
    if (!request) return null;

    const iconProps = { size: 48, color: '#DC2626' };

    switch (request.icon) {
      case 'users':
        return <Users {...iconProps} />;
      case 'message-circle':
        return <MessageCircle {...iconProps} />;
      case 'alert-triangle':
        return <AlertTriangle {...iconProps} />;
      case 'calendar':
        return <Calendar {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const getPriorityIndicator = () => {
    if (!request) return null;

    const colors = {
      high: '#DC2626',
      medium: '#F59E0B',
      low: '#10B981',
    };

    return (
      <View
        style={[
          styles.priorityIndicator,
          { backgroundColor: colors[request.priority] },
        ]}
      >
        <Text style={styles.priorityText}>
          {request.priority.toUpperCase()}
        </Text>
      </View>
    );
  };

  const getCategoryBadges = () => {
    if (!request) return null;

    const categoryNames: Record<string, string> = {
      club_messages: 'Club Messages',
      club_announcements: 'Announcements',
      club_events: 'Events',
      direct_messages: 'Direct Messages',
      emergency_notifications: 'Emergency Alerts',
      social_interactions: 'Social Updates',
    };

    return (
      <View style={styles.categoriesContainer}>
        <Text style={styles.categoriesTitle}>
          You will receive notifications for:
        </Text>
        {request.categories.map((category) => (
          <View key={category} style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {categoryNames[category] || category}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (!visible || !request) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={request.canSkip ? onSkip : undefined}
      presentationStyle="overFullScreen"
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
            },
          ]}
        >
          <SafeAreaView style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              {getPriorityIndicator()}
              {request.canSkip && (
                <TouchableOpacity style={styles.closeButton} onPress={onSkip}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContentContainer}
            >
              {/* Icon */}
              <View style={styles.iconContainer}>{getIcon()}</View>

              {/* Title and Message */}
              <View style={styles.textContainer}>
                <Text style={styles.title}>{request.title}</Text>
                <Text style={styles.message}>{request.message}</Text>
              </View>

              {/* Categories */}
              {getCategoryBadges()}

              {/* Benefits */}
              <View style={styles.benefitsContainer}>
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={16} color="#10B981" />
                  </View>
                  <Text style={styles.benefitText}>
                    Stay connected when it matters most
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={16} color="#10B981" />
                  </View>
                  <Text style={styles.benefitText}>
                    You can change these settings anytime
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={16} color="#10B981" />
                  </View>
                  <Text style={styles.benefitText}>
                    Only important notifications, no spam
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons - Fixed at bottom */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => onAccept(request.categories)}
                activeOpacity={0.8}
              >
                <Bell size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  Enable Notifications
                </Text>
              </TouchableOpacity>

              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onCustomize}
                  activeOpacity={0.7}
                >
                  <Settings size={16} color="#6B7280" />
                  <Text style={styles.secondaryButtonText}>Customize</Text>
                </TouchableOpacity>

                {request.canSkip && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onDecline}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryButtonText}>Not now</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                We respect your privacy. Notifications can be managed in
                Settings.
              </Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  priorityIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#DC2626',
  },
  benefitsContainer: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  secondaryButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default ContextualPermissionRequest;
