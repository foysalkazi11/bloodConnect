import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
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

export default function AuthCallbackScreen() {
  const { showNotification } = useNotification();
  const params = useLocalSearchParams();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = React.useState('');
  const [canRetry, setCanRetry] = React.useState(false);

  useEffect(() => {
    console.log('AuthCallback: Component mounted');
    console.log('AuthCallback: URL params:', params);
    console.log('AuthCallback: Current URL:', window.location.href);

    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      handleAuthCallback();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleAuthCallback = async () => {
    console.log('AuthCallback: Starting verification process...');
    setStatus('loading');
    setCanRetry(false);

    try {
      // Check URL parameters for errors first
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const error = urlParams.get('error') || hashParams.get('error');
      const errorCode =
        urlParams.get('error_code') || hashParams.get('error_code');
      const errorDescription =
        urlParams.get('error_description') ||
        hashParams.get('error_description');

      console.log('AuthCallback: URL analysis:', {
        error,
        errorCode,
        errorDescription,
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

          showNotification({
            type: 'warning',
            title: 'Link Expired',
            message:
              'Your verification link has expired. You can request a new one.',
            duration: 6000,
          });
          return;
        } else {
          setStatus('error');
          setMessage(
            errorDescription || 'Email verification failed. Please try again.'
          );
          setCanRetry(true);

          showNotification({
            type: 'error',
            title: 'Verification Failed',
            message: errorDescription || 'Email verification failed',
            duration: 5000,
          });
          return;
        }
      }

      // If no errors in URL, proceed with verification
      console.log(
        'AuthCallback: No errors in URL, proceeding with verification...'
      );
      const result = await authService.handleEmailVerification();

      if (result.success) {
        console.log('AuthCallback: Verification successful');
        setStatus('success');
        setMessage(
          'Email verified successfully! Redirecting to complete your profile...'
        );

        showNotification({
          type: 'success',
          title: 'Email Verified!',
          message:
            'Your account has been activated. Please complete your profile to start using BloodConnect.',
          duration: 4000,
        });

        // Redirect to profile completion after a short delay
        setTimeout(() => {
          console.log('AuthCallback: Redirecting to complete-profile');
          router.replace('/complete-profile');
        }, 2000);
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      console.error('AuthCallback: Verification error:', error);
      setStatus('error');

      const errorMessage =
        error instanceof Error ? error.message : 'Verification failed';
      setMessage(errorMessage);

      // Check if this is an expired link error
      if (errorMessage.includes('expired')) {
        setCanRetry(true);
        showNotification({
          type: 'warning',
          title: 'Link Expired',
          message:
            'Your verification link has expired. You can request a new one.',
          duration: 6000,
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Verification Failed',
          message: errorMessage,
          duration: 5000,
        });
      }
    }
  };

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
