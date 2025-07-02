import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { styled } from 'nativewind';
import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, Info, X, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { Text } from './ui';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const { width: screenWidth } = Dimensions.get('window');

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface NotificationItemProps {
  notification: Notification;
  onHide: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onHide }) => {
  const [slideAnim] = useState(new Animated.Value(-screenWidth));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after duration
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        hideNotification();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, []);

  const hideNotification = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -screenWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(notification.id);
    });
  }, [notification.id, onHide]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={24} color="#10B981" />;
      case 'error':
        return <AlertCircle size={24} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={24} color="#F59E0B" />;
      case 'info':
        return <Info size={24} color="#3B82F6" />;
      default:
        return <Info size={24} color="#6B7280" />;
    }
  };

  const getBackgroundColorClass = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-success-50';
      case 'error':
        return 'bg-error-50';
      case 'warning':
        return 'bg-warning-50';
      case 'info':
        return 'bg-secondary-50';
      default:
        return 'bg-neutral-50';
    }
  };

  const getBorderColorClass = () => {
    switch (notification.type) {
      case 'success':
        return 'border-l-success-500';
      case 'error':
        return 'border-l-error-500';
      case 'warning':
        return 'border-l-warning-500';
      case 'info':
        return 'border-l-secondary-500';
      default:
        return 'border-l-neutral-500';
    }
  };

  const getActionTextColorClass = () => {
    switch (notification.type) {
      case 'success':
        return 'text-success-600';
      case 'error':
        return 'text-error-600';
      case 'warning':
        return 'text-warning-600';
      case 'info':
        return 'text-secondary-600';
      default:
        return 'text-neutral-600';
    }
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <StyledView
        className={`
          mx-4 my-1 rounded-xl border-l-4 shadow-sm
          ${getBackgroundColorClass()} 
          ${getBorderColorClass()}
        `}
      >
        <StyledView className="flex-row p-4">
          <StyledView className="mr-3 mt-0.5">
            {getIcon()}
          </StyledView>
          
          <StyledView className="flex-1">
            <Text variant="h6" weight="semibold" color="text-neutral-900">
              {notification.title}
            </Text>
            
            {notification.message && (
              <Text variant="body-sm" color="text-neutral-600" className="mt-1">
                {notification.message}
              </Text>
            )}
            
            {notification.action && (
              <StyledTouchableOpacity
                className="mt-2 self-start"
                onPress={notification.action.onPress}
                activeOpacity={0.7}
              >
                <Text 
                  variant="body-sm" 
                  weight="semibold" 
                  className={getActionTextColorClass()}
                >
                  {notification.action.label}
                </Text>
              </StyledTouchableOpacity>
            )}
          </StyledView>

          <StyledTouchableOpacity
            className="p-1"
            onPress={hideNotification}
            activeOpacity={0.7}
          >
            <X size={20} color="#6B7280" />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>
    </Animated.View>
  );
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notificationData: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const notification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notificationData,
    };

    setNotifications(prev => [notification, ...prev]);
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification, clearAll }}>
      {children}
      <StyledView className="absolute top-0 left-0 right-0 z-50 pt-14 pointer-events-none">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onHide={hideNotification}
          />
        ))}
      </StyledView>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;