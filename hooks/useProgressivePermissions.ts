import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';
import {
  progressivePermissionService,
  PermissionContext,
  PermissionRequest,
} from '@/services/progressivePermissionService';

interface UseProgressivePermissionsReturn {
  // State
  currentRequest: PermissionRequest | null;
  isVisible: boolean;
  loading: boolean;

  // Actions
  triggerPermissionRequest: (context: PermissionContext) => Promise<void>;
  handleAccept: (categories: string[]) => Promise<void>;
  handleDecline: () => Promise<void>;
  handleSkip: () => Promise<void>;
  handleCustomize: () => void;

  // Utilities
  hasSystemPermission: () => Promise<boolean>;
  resetPermissionState: () => Promise<void>;
  getPermissionStats: () => any;
}

export const useProgressivePermissions =
  (): UseProgressivePermissionsReturn => {
    const [currentRequest, setCurrentRequest] =
      useState<PermissionRequest | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();
    const { showNotification } = useNotification();

    // Initialize service when user changes
    useEffect(() => {
      if (user?.id) {
        progressivePermissionService.initialize(user.id);
      } else {
        progressivePermissionService.cleanup();
      }
    }, [user?.id]);

    // Trigger a contextual permission request
    const triggerPermissionRequest = useCallback(
      async (context: PermissionContext) => {
        if (!user?.id) return;

        try {
          setLoading(true);

          // Get the appropriate permission request for this context
          const request =
            await progressivePermissionService.getPermissionRequest(context);

          if (request) {
            // Record that we've shown this request
            await progressivePermissionService.recordPermissionSeen(context);

            // Show the request
            setCurrentRequest(request);
            setIsVisible(true);

            console.log(
              'Showing permission request:',
              request.title,
              'for context:',
              context.trigger
            );
          } else {
            console.log(
              'No permission request needed for context:',
              context.trigger
            );
          }
        } catch (error) {
          console.error('Error triggering permission request:', error);
        } finally {
          setLoading(false);
        }
      },
      [user?.id]
    );

    // Handle user accepting the permission request
    const handleAccept = useCallback(
      async (categories: string[]) => {
        if (!currentRequest) return;

        try {
          setLoading(true);

          // Record the acceptance
          await progressivePermissionService.recordPermissionResponse(
            currentRequest.context,
            true,
            categories
          );

          // Hide the modal
          setIsVisible(false);
          setCurrentRequest(null);

          // Show success notification
          showNotification({
            type: 'success',
            title: 'Notifications enabled!',
            message: 'You can manage these settings anytime in your profile.',
            duration: 4000,
          });

          console.log(
            'User accepted permission request for categories:',
            categories
          );
        } catch (error) {
          console.error('Error handling permission acceptance:', error);
          showNotification({
            type: 'error',
            title: 'Error',
            message: 'Failed to enable notifications. Please try again.',
            duration: 4000,
          });
        } finally {
          setLoading(false);
        }
      },
      [currentRequest, showNotification]
    );

    // Handle user declining the permission request
    const handleDecline = useCallback(async () => {
      if (!currentRequest) return;

      try {
        setLoading(true);

        // Record the decline
        await progressivePermissionService.recordPermissionResponse(
          currentRequest.context,
          false,
          []
        );

        // Hide the modal
        setIsVisible(false);
        setCurrentRequest(null);

        console.log(
          'User declined permission request for context:',
          currentRequest.context.trigger
        );
      } catch (error) {
        console.error('Error handling permission decline:', error);
      } finally {
        setLoading(false);
      }
    }, [currentRequest]);

    // Handle user skipping the permission request
    const handleSkip = useCallback(async () => {
      if (!currentRequest) return;

      // Just hide the modal without recording a response
      setIsVisible(false);
      setCurrentRequest(null);

      console.log(
        'User skipped permission request for context:',
        currentRequest.context.trigger
      );
    }, [currentRequest]);

    // Handle user wanting to customize settings
    const handleCustomize = useCallback(() => {
      // Hide the current modal
      setIsVisible(false);
      setCurrentRequest(null);

      // Note: The NotificationSettings modal should be opened by the calling component
      // This hook just signals that customization was requested
      console.log('User requested to customize notification settings');
    }, []);

    // Check if user has system permission
    const hasSystemPermission = useCallback(async (): Promise<boolean> => {
      try {
        return await progressivePermissionService.hasSystemPermission();
      } catch (error) {
        console.error('Error checking system permission:', error);
        return false;
      }
    }, []);

    // Reset permission state (useful for testing or user request)
    const resetPermissionState = useCallback(async () => {
      try {
        await progressivePermissionService.resetPermissionState();
        showNotification({
          type: 'info',
          title: 'Permission state reset',
          message: 'You may see notification prompts again.',
          duration: 3000,
        });
      } catch (error) {
        console.error('Error resetting permission state:', error);
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to reset permission state.',
          duration: 4000,
        });
      }
    }, [showNotification]);

    // Get permission statistics
    const getPermissionStats = useCallback(() => {
      return progressivePermissionService.getPermissionStats();
    }, []);

    return {
      // State
      currentRequest,
      isVisible,
      loading,

      // Actions
      triggerPermissionRequest,
      handleAccept,
      handleDecline,
      handleSkip,
      handleCustomize,

      // Utilities
      hasSystemPermission,
      resetPermissionState,
      getPermissionStats,
    };
  };

export default useProgressivePermissions;
