import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as GoogleAuthSession from 'expo-auth-session/providers/google';
import { supabase } from '@/lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// Required: Complete auth session for popup dismissal
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Configuration
const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
};

const getRedirectUrl = (): string => {
  // Web uses our domain callback. Native uses Google Sign-In SDK and does not need this value.
  return makeRedirectUri({ path: 'auth/callback' });
};

export const useGoogleAuth = () => {
  // On native, configure Google Sign-In SDK
  useEffect(() => {
    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        webClientId: GOOGLE_CLIENT_IDS.web,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
    }
  }, []);

  // Web path below: create redirect URI and configure AuthSession provider (hooks always declared)
  const redirectUri = getRedirectUrl();

  const [request, response, promptAsync] = GoogleAuthSession.useAuthRequest({
    clientId: GOOGLE_CLIENT_IDS.web,
    androidClientId: GOOGLE_CLIENT_IDS.android || undefined,
    iosClientId: GOOGLE_CLIENT_IDS.ios || undefined,
    webClientId: GOOGLE_CLIENT_IDS.web || undefined,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: 'code',
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  // Log response changes (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && response) {
      console.log('useGoogleAuth: OAuth response received:', response.type);
      if (response.type === 'error') {
        console.error('useGoogleAuth: OAuth error details:', response.error);
      }
    }
  }, [response]);

  const signInWithGoogle = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        // Native: use Google Sign-In SDK and sign in to Supabase with the idToken
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
        const userInfo = await GoogleSignin.signIn();
        const idToken =
          (userInfo as any).idToken || (userInfo as any)?.data?.idToken;
        if (!idToken) {
          throw new Error('No idToken returned from Google Sign-In');
        }
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        if (error) {
          throw new Error(
            `Failed to sign in with Google token: ${error.message}`
          );
        }
        if (!data.user || !data.session) {
          throw new Error('No user/session returned from Supabase');
        }
        return { user: data.user, session: data.session };
      }

      // Web flow (unchanged)
      if (!request) {
        throw new Error(
          'Google Auth request not ready. Please wait and try again.'
        );
      }
      const result = await promptAsync();
      if (result.type === 'success') {
        const { code } = result.params as any;
        if (!code)
          throw new Error('No authorization code received from Google');
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          code
        );
        if (error) throw new Error(`Failed to exchange code: ${error.message}`);
        if (!data.user || !data.session)
          throw new Error('No user/session from Supabase');
        return { user: data.user, session: data.session };
      }
      if (result.type === 'cancel')
        throw new Error('Google sign-in was cancelled');
      throw new Error(`Google sign-in failed: ${result.type}`);
    } catch (error) {
      // Map common native errors to readable messages
      if ((error as any)?.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google sign-in was cancelled');
      }
      if ((error as any)?.code === statusCodes.IN_PROGRESS) {
        throw new Error('Google sign-in already in progress');
      }
      if ((error as any)?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available or outdated');
      }
      console.error('useGoogleAuth: Google sign in error:', error);
      throw error;
    }
  }, [promptAsync, request]);

  return {
    signInWithGoogle,
    request,
    response,
    // Native uses Google Sign-In SDK, so it's always ready there
    isReady: Platform.OS === 'web' ? !!request : true,
  };
};
