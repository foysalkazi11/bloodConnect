import React, { useEffect, useCallback } from 'react';
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
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

type CallbackType = 'email_verification' | 'oauth' | 'unknown';

export default function AuthCallbackScreen() {
  const { showNotification } = useNotification();
  const params = useLocalSearchParams();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = React.useState('');
  const [canRetry, setCanRetry] = React.useState(false);
  const [callbackType, setCallbackType] =
    React.useState<CallbackType>('unknown');
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Define callback type determination function
  const determineCallbackType = useCallback((): CallbackType => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const type = hashParams.get('type') || urlParams.get('type');
      const accessToken = hashParams.get('access_token');
      const provider = urlParams.get('provider');

      // OAuth callback indicators
      if (provider || (accessToken && !type)) {
        return 'oauth';
      }

      // Email verification callback indicators
      if (type === 'signup' || type === 'email_change' || type === 'recovery') {
        return 'email_verification';
      }

      // Check if this looks like an OAuth callback based on typical parameters
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      if (code || state) {
        return 'oauth';
      }
    } else {
      // For mobile with the new Google provider approach,
      // we mainly get authorization codes, not tokens
      console.log('AuthCallback: Checking mobile deep link parameters...');
      console.log('AuthCallback: Available params:', params);

      // Check for authorization code (new approach)
      const hasCode = params.code || params['code'];
      const hasState = params.state || params['state'];

      // Check for legacy token parameters (fallback)
      const hasAccessToken = params.access_token || params['access_token'];
      const hasRefreshToken = params.refresh_token || params['refresh_token'];

      console.log('AuthCallback: Mobile OAuth params:', {
        hasCode: !!hasCode,
        hasState: !!hasState,
        hasAccessToken: !!hasAccessToken,
        hasRefreshToken: !!hasRefreshToken,
      });

      // If we have OAuth-related parameters, this is an OAuth callback
      if (hasCode || hasState || hasAccessToken || hasRefreshToken) {
        console.log('AuthCallback: Detected OAuth callback based on params');
        return 'oauth';
      }

      // For mobile deep links to /auth/callback without specific params,
      // assume OAuth (most common case)
      console.log('AuthCallback: Assuming OAuth for mobile deep link');
      return 'oauth';
    }

    return 'email_verification'; // Fallback
  }, [params]);

  const handleAuthCallback = useCallback(async () => {
    if (isProcessing) {
      console.log('AuthCallback: Already processing, ignoring duplicate call');
      return;
    }

    console.log('AuthCallback: Starting callback process...');
    setIsProcessing(true);
    setStatus('loading');
    setCanRetry(false);

    try {
      const type = determineCallbackType();
      setCallbackType(type);
      console.log('AuthCallback: Determined callback type:', type);

      if (type === 'oauth') {
        await handleOAuthCallback();
      } else {
        await handleEmailVerificationCallback();
      }
    } catch (error) {
      console.error('AuthCallback: Callback error:', error);
      setStatus('error');

      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
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
          title:
            callbackType === 'oauth' ? 'Sign In Failed' : 'Verification Failed',
          message: errorMessage,
          duration: 5000,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, callbackType, showNotification, determineCallbackType]);

  const handleOAuthCallback = async () => {
    console.log('AuthCallback: Processing OAuth callback...');
    setMessage('Completing sign in with Google...');

    if (Platform.OS === 'web') {
      await handleWebOAuthCallback();
    } else {
      // For mobile with the new Google provider approach,
      // the session should already be set by the authService
      console.log('AuthCallback: Checking for existing session...');

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('AuthCallback: Session check error:', error);
          throw new Error(error.message);
        }

        if (session?.user) {
          console.log(
            'AuthCallback: Found existing session, user:',
            session.user.id
          );
          await handleSuccessfulAuth(session.user, 'oauth');
        } else {
          // If no session, wait a bit for AuthProvider to initialize
          console.log(
            'AuthCallback: No session found, waiting for AuthProvider...'
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const {
            data: { session: retrySession },
            error: retryError,
          } = await supabase.auth.getSession();

          if (retryError) {
            throw new Error(retryError.message);
          }

          if (retrySession?.user) {
            console.log(
              'AuthCallback: Found session after retry, user:',
              retrySession.user.id
            );
            await handleSuccessfulAuth(retrySession.user, 'oauth');
          } else {
            throw new Error('No session found after OAuth');
          }
        }
      } catch (error) {
        console.error('AuthCallback: Mobile OAuth callback error:', error);
        throw error;
      }
    }
  };

  const handleWebOAuthCallback = async () => {
    // Check if this is a callback from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const urlHash = new URLSearchParams(window.location.hash.substring(1));

    // Check for error parameters
    const error = urlParams.get('error') || urlHash.get('error');
    const errorDescription =
      urlParams.get('error_description') || urlHash.get('error_description');

    if (error) {
      throw new Error(errorDescription || error);
    }

    // Check for success parameters
    const accessToken = urlHash.get('access_token');
    const refreshToken = urlHash.get('refresh_token');
    const code = urlParams.get('code');

    if (accessToken && refreshToken) {
      // Direct token callback
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (data.user) {
        await handleSuccessfulAuth(data.user, 'oauth');
      }
    } else if (code) {
      // Authorization code flow
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        throw new Error(exchangeError.message);
      }

      if (data.user) {
        await handleSuccessfulAuth(data.user, 'oauth');
      }
    } else {
      // Check if user is already authenticated
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (session?.user) {
        await handleSuccessfulAuth(session.user, 'oauth');
      } else {
        throw new Error('No authentication data found');
      }
    }
  };

  const handleEmailVerificationCallback = async () => {
    console.log('AuthCallback: Processing email verification callback...');
    setMessage('Verifying your email address...');

    // Check URL parameters for errors first
    const urlParams =
      Platform.OS === 'web'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const hashParams =
      Platform.OS === 'web'
        ? new URLSearchParams(window.location.hash.substring(1))
        : new URLSearchParams();

    const error = urlParams.get('error') || hashParams.get('error');
    const errorCode =
      urlParams.get('error_code') || hashParams.get('error_code');
    const errorDescription =
      urlParams.get('error_description') || hashParams.get('error_description');

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
      console.log('AuthCallback: Email verification successful');

      // Get the current user to check their status
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Failed to get user information after verification');
      }

      await handleSuccessfulAuth(user, 'email_verification');
    } else {
      throw new Error('Verification failed');
    }
  };

  const handleSuccessfulAuth = async (
    user: any,
    type: 'oauth' | 'email_verification'
  ) => {
    // Wrap the entire success flow in a timeout
    const successTimeout = setTimeout(() => {
      console.log(
        'AuthCallback: handleSuccessfulAuth timed out, forcing redirect...'
      );
      setStatus('success');
      setMessage('Authentication successful! Redirecting...');

      // Force redirect after timeout
      setTimeout(() => {
        console.log('AuthCallback: Forced redirect to /(tabs) after timeout');
        router.replace('/(tabs)');
      }, 1000);
    }, 15000); // 15 second total timeout

    try {
      console.log(
        'AuthCallback: handleSuccessfulAuth started for type:',
        type,
        'user:',
        user.id
      );
      setStatus('success');

      if (type === 'oauth') {
        setMessage('Sign in successful! Setting up your account...');

        showNotification({
          type: 'success',
          title: 'Welcome!',
          message: 'You have successfully signed in with Google.',
          duration: 4000,
        });
      } else {
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
      }

      console.log('AuthCallback: About to check user profile...');
      // Check if user profile exists, if not they need to complete their profile
      let existingProfile, profileError;

      try {
        // Add timeout to profile check as well
        const profilePromise = supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('Profile check timeout after 8 seconds')),
            8000
          );
        });

        const result = (await Promise.race([
          profilePromise,
          timeoutPromise,
        ])) as any;
        existingProfile = result.data;
        profileError = result.error;

        console.log('AuthCallback: Profile check completed:', {
          hasProfile: !!existingProfile,
          error: profileError?.code,
          errorMessage: profileError?.message,
        });
      } catch (error) {
        console.error('AuthCallback: Profile check failed:', error);
        profileError = error;
        existingProfile = null;

        // If profile check times out, assume no profile and proceed with creation
        if (error instanceof Error && error.message.includes('timeout')) {
          console.log(
            'AuthCallback: Profile check timed out, assuming no profile exists'
          );
          profileError = { code: 'PGRST116', message: 'No rows returned' };
        }
      }

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, need to complete profile
        console.log(
          'AuthCallback: No profile found, redirecting to complete-profile'
        );

        if (type === 'oauth') {
          // For OAuth users, get account type from session storage (web only)
          let accountType = 'donor'; // Default for mobile
          if (
            Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            window.sessionStorage
          ) {
            accountType =
              sessionStorage.getItem('pendingAccountType') || 'donor';
          }

          console.log(
            'AuthCallback: Creating profile for OAuth user with accountType:',
            accountType
          );

          // Create basic profile for OAuth users
          let insertError = null;
          try {
            console.log('AuthCallback: Creating profile for OAuth user...');
            const insertPromise = supabase.from('user_profiles').insert({
              id: user.id,
              email: user.email,
              name:
                user.user_metadata?.full_name || user.user_metadata?.name || '',
              user_type: accountType,
              phone: '', // Required field
              country: 'BANGLADESH', // Default value
              avatar_url: user.user_metadata?.avatar_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(
                () =>
                  reject(new Error('Profile creation timeout after 8 seconds')),
                8000
              );
            });

            const result = (await Promise.race([
              insertPromise,
              timeoutPromise,
            ])) as any;
            insertError = result.error;

            console.log('AuthCallback: Profile creation result:', {
              success: !insertError,
              error: insertError,
            });
          } catch (error) {
            console.error('AuthCallback: Profile creation failed:', error);
            insertError = error;
          }

          if (insertError) {
            console.error(
              'AuthCallback: Error creating user profile:',
              insertError
            );

            // If profile creation fails, still proceed to main app
            console.log(
              'AuthCallback: Profile creation failed, but proceeding to main app'
            );
          } else {
            console.log('AuthCallback: Profile created successfully');
          }

          // Clean up session storage (web only)
          if (
            Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            window.sessionStorage
          ) {
            sessionStorage.removeItem('pendingAccountType');
          }

          console.log('AuthCallback: Redirecting to main app in 1.5s...');
          // OAuth users can go directly to main app
          setTimeout(() => {
            console.log('AuthCallback: Executing redirect to /(tabs)');
            router.replace('/(tabs)');
          }, 1500);
        } else {
          // Email verification users need to complete their profile
          setTimeout(() => {
            router.replace('/complete-profile');
          }, 2000);
        }
      } else if (existingProfile) {
        // Profile exists, go to main app
        console.log('AuthCallback: Profile exists, redirecting to main app');
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      } else {
        console.error('Error checking user profile:', profileError);
        // Still redirect to main app as fallback
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      }
    } catch (error) {
      console.error('AuthCallback: Error in handleSuccessfulAuth:', error);
      setStatus('error');
      setMessage('Authentication successful but profile setup failed');

      // Still redirect to main app
      setTimeout(() => {
        console.log('AuthCallback: Fallback redirect to /(tabs) after error');
        router.replace('/(tabs)');
      }, 2000);
    } finally {
      // Clear the timeout since we completed or failed
      clearTimeout(successTimeout);
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

  // useEffect to handle component mounting and parameter processing
  useEffect(() => {
    console.log('AuthCallback: Component mounted/updated');
    console.log('AuthCallback: URL params:', params);

    if (Platform.OS === 'web') {
      console.log('AuthCallback: Current URL:', window.location.href);
    }

    // Only proceed if we have meaningful params or if this is web
    const hasOAuthParams =
      Platform.OS === 'web' ||
      !!(
        params &&
        (params.code ||
          params.access_token ||
          params.refresh_token ||
          params.token_type)
      );

    console.log('AuthCallback: Has OAuth params or is web:', hasOAuthParams);
    console.log('AuthCallback: Is processing:', isProcessing);

    if (hasOAuthParams && !isProcessing) {
      // Add a small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        handleAuthCallback();
      }, 500);

      return () => clearTimeout(timer);
    } else if (isProcessing) {
      console.log('AuthCallback: Already processing, skipping...');
    } else {
      console.log(
        'AuthCallback: No OAuth params found, waiting for proper redirect...'
      );
    }
  }, [params, isProcessing, handleAuthCallback]);

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

  const getTitle = () => {
    if (status === 'loading') {
      return callbackType === 'oauth'
        ? 'Completing Sign In...'
        : 'Verifying Your Email...';
    }
    if (status === 'success') {
      return callbackType === 'oauth'
        ? 'Sign In Complete!'
        : 'Verification Complete!';
    }
    return callbackType === 'oauth' ? 'Sign In Failed' : 'Verification Failed';
  };

  const getLoadingMessage = () => {
    if (callbackType === 'oauth') {
      return 'Please wait while we complete your Google sign in.';
    }
    return 'Please wait while we verify your email address.';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Heart size={48} color="#DC2626" style={styles.logo} />

        <View style={styles.statusContainer}>
          {getIcon()}

          <Text style={styles.title}>{getTitle()}</Text>

          <Text style={[styles.message, { color: getStatusColor() }]}>
            {status === 'loading' ? getLoadingMessage() : message}
          </Text>

          {status === 'success' && (
            <Text style={styles.redirectText}>
              {callbackType === 'oauth'
                ? 'Taking you to your dashboard...'
                : 'Redirecting you to complete your profile...'}
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
                  <Text style={styles.retryButtonText}>
                    {callbackType === 'oauth'
                      ? 'Try Again'
                      : 'Request New Link'}
                  </Text>
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
