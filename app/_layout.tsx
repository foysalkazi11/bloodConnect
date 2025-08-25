import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import '../global.css';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { I18nProvider } from '@/providers/I18nProvider';
import { NotificationProvider } from '@/components/NotificationSystem';
import { AuthProvider } from '@/providers/AuthProvider';
import { AdProvider } from '@/providers/AdProvider';
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { adMobService } from '@/services/adMobService';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

// Complete the authentication session when the app is opened via deep link
WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  // Initialize AdMob
  useEffect(() => {
    const initializeAds = async () => {
      try {
        await adMobService.initialize();
        console.log('AdMob initialized successfully');
      } catch (error) {
        console.error('Failed to initialize AdMob:', error);
      }
    };

    initializeAds();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const hasHandledAuthLink = useRef(false);
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);

      // Handle OAuth callback
      if (
        url.includes('bloodlink://auth/callback') ||
        url.includes('/auth/callback')
      ) {
        // On web, let Supabase handle session from URL; avoid router redirects that
        // can strip the hash parameters before Supabase processes them
        if (Platform.OS === 'web') {
          return;
        }
        // Prevent handling the same auth callback multiple times
        if (hasHandledAuthLink.current) {
          return;
        }
        // Parse URL parameters using QueryParams utility
        try {
          const { params: qp, errorCode } = QueryParams.getQueryParams(url);
          if (errorCode) {
            console.warn('Deep link parse error:', errorCode);
          }
          const queryParams: Record<string, string> = {};
          Object.entries(qp || {}).forEach(([key, value]) => {
            if (typeof value === 'string') queryParams[key] = value;
          });

          console.log('Parsed deep link params:', queryParams);

          // Navigate with parsed parameters
          hasHandledAuthLink.current = true;
          if (Object.keys(queryParams).length > 0) {
            router.push({ pathname: '/auth/callback', params: queryParams });
          } else {
            router.push('/auth/callback');
          }
        } catch (error) {
          console.error('Error parsing deep link:', error);
          // Fallback to basic navigation
          hasHandledAuthLink.current = true;
          router.push('/auth/callback');
        }
      }
    };

    // Handle deep links when app is already open (native only)
    const subscription =
      Platform.OS !== 'web'
        ? Linking.addEventListener('url', ({ url }) => {
            handleDeepLink(url);
          })
        : (null as any);

    // Handle deep link when app is opened from closed state (native only)
    if (Platform.OS !== 'web') {
      Linking.getInitialURL().then((url) => {
        if (url) {
          handleDeepLink(url);
        }
      });
    }

    return () => {
      subscription?.remove?.();
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <AdProvider>
        <NotificationProvider>
          <I18nProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen
                name="complete-profile"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </I18nProvider>
        </NotificationProvider>
      </AdProvider>
    </AuthProvider>
  );
}
