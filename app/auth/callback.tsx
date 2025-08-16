import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart,
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authService } from '@/services/authService';
import { useNotification } from '@/components/NotificationSystem';
import { useAuth } from '@/providers/AuthProvider';
// QueryParams is not needed on native here; URL parsing is handled in _layout

export default function AuthCallbackScreen() {
  const { showNotification } = useNotification();
  const { handleSessionUpdate } = useAuth();
  const params = useLocalSearchParams();
  const handledRef = useRef(false);

  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = React.useState('');
  const [canRetry, setCanRetry] = React.useState(false);

  const handleAuthCallback = useCallback(async () => {
    console.log('AuthCallback: Starting verification process...');
    setStatus('loading');
    setCanRetry(false);

    try {
      // Parse parameters differently for web vs native
      const getParam = (key: string): string | null => {
        const raw = (params as any)?.[key];
        if (Array.isArray(raw)) return raw[0] ?? null;
        console.log('AuthCallback: Raw:', raw);
        return (raw as string) ?? null;
      };

      let error: string | null = null;
      let errorCode: string | null = null;
      let errorDescription: string | null = null;
      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      if (Platform.OS === 'web') {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        error = urlParams.get('error') || hashParams.get('error');
        errorCode = urlParams.get('error_code') || hashParams.get('error_code');
        errorDescription =
          urlParams.get('error_description') ||
          hashParams.get('error_description');
        accessToken =
          urlParams.get('access_token') || hashParams.get('access_token');
        refreshToken =
          urlParams.get('refresh_token') || hashParams.get('refresh_token');
      } else {
        // Native: read from route params only (we already parsed deep link before pushing this screen)
        error = getParam('error');
        errorCode = getParam('error_code');
        errorDescription = getParam('error_description');
        accessToken = getParam('access_token') || getParam('accessToken');
        refreshToken = getParam('refresh_token') || getParam('refreshToken');
      }

      console.log('AuthCallback: URL analysis:', {
        error,
        errorCode,
        errorDescription,
        accessToken,
        refreshToken,
      });

      if (error) {
        console.log('AuthCallback: Error detected in URL');
        if (
          error === 'access_denied' &&
          (errorCode === 'otp_expired' || errorDescription?.includes('expired'))
        ) {
          setStatus('error');
          setMessage(
            'Your email verification link has expired. Please request a new verification email.'
          );
          setCanRetry(true);

          showNotification(
            {
              type: 'warning',
              title: 'Link Expired',
              message:
                'Your verification link has expired. You can request a new one.',
              duration: 6000,
            },
            true
          );
          return;
        } else {
          setStatus('error');
          setMessage(
            errorDescription || 'Email verification failed. Please try again.'
          );
          setCanRetry(true);

          showNotification(
            {
              type: 'error',
              title: 'Verification Failed',
              message: errorDescription || 'Email verification failed',
              duration: 5000,
            },
            true
          );
          return;
        }
      }

      // If no errors in URL, proceed with verification
      let success = false;
      if (Platform.OS !== 'web' && accessToken && refreshToken) {
        // Native first-time flow: set session immediately and move on

        await authService.setSessionWithTokens(accessToken, refreshToken);

        success = true;
        console.log('AuthCallback: Session set successfully');
      } else {
        const result = await authService.handleEmailVerification();
        success = Boolean((result as any)?.success);
      }

      if (!success) throw new Error('Verification failed');

      setStatus('success');
      setMessage('Email verified successfully! Redirecting...');
      showNotification(
        {
          type: 'success',
          title: 'Email Verified!',
          message: 'Your account has been activated. Redirecting...',
          duration: 2000,
        },
        true
      );

      // Use handleSessionUpdate to properly initialize the user session
      await handleSessionUpdate();

      // Navigate immediately after session update completes
      router.replace('/complete-profile');
    } catch (error) {
      console.error('AuthCallback: Verification error:', error);
      setStatus('error');

      const errorMessage =
        error instanceof Error ? error.message : 'Verification failed';
      setMessage(errorMessage);

      // Check if this is an expired link error
      if (errorMessage.includes('expired')) {
        setCanRetry(true);
        showNotification(
          {
            type: 'warning',
            title: 'Link Expired',
            message:
              'Your verification link has expired. You can request a new one.',
            duration: 6000,
          },
          true
        );
      } else {
        showNotification(
          {
            type: 'error',
            title: 'Verification Failed',
            message: errorMessage,
            duration: 5000,
          },
          true
        );
      }
    }
  }, [params, showNotification, handleSessionUpdate]);

  useEffect(() => {
    if (handledRef.current) return;
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => {
        handledRef.current = true;
        handleAuthCallback();
      }, 200);
      return () => clearTimeout(timer);
    }

    const p: any = params || {};
    const hasAuthParams = Boolean(
      p.access_token ||
        p.refresh_token ||
        p.accessToken ||
        p.refreshToken ||
        p.error ||
        p.error_code ||
        p.error_description
    );
    if (!hasAuthParams) {
      return;
    }
    handledRef.current = true;
    handleAuthCallback();
  }, [params, handleAuthCallback, handleSessionUpdate]);

  const handleRetry = () => {
    console.log('AuthCallback: Retry requested, redirecting to auth');
    router.push('/auth');
  };

  const handleGoToSignIn = () => {
    console.log('AuthCallback: Go to sign in requested');
    router.replace('/auth');
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <ActivityIndicator size="large" color="#DC2626" />;
      case 'success':
        return <CheckCircle size={64} color="#10B981" />;
      case 'error':
        return <AlertCircle size={64} color="#EF4444" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      default:
        return '#DC2626';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Heart size={48} color="#DC2626" style={styles.logo} />

        <View style={styles.statusContainer}>
          {getIcon()}

          <Text style={styles.title}>
            {status === 'loading' && 'Verifying Your Email...'}
            {status === 'success' && 'Verification Complete!'}
            {status === 'error' && 'Verification Failed'}
          </Text>

          <Text style={[styles.message, { color: getStatusColor() }]}>
            {status === 'loading' &&
              'Please wait while we verify your email address.'}
            {status === 'success' && message}
            {status === 'error' && message}
          </Text>

          {status === 'success' && (
            <Text style={styles.redirectText}>
              Redirecting you to complete your profile...
            </Text>
          )}

          {status === 'error' && (
            <View style={styles.errorActions}>
              {canRetry ? (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}
                >
                  <RefreshCw size={20} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Request New Link</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={handleGoToSignIn}
                >
                  <Text style={styles.signInButtonText}>Go to Sign In</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    marginBottom: 48,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 24,
    maxWidth: 400,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  redirectText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  errorActions: {
    marginTop: 24,
    gap: 12,
    alignSelf: 'stretch',
  },
  retryButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  signInButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
});
