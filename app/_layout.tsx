import { useEffect } from 'react';
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
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);

      // Handle OAuth callback
      if (
        url.includes('bloodconnect://auth/callback') ||
        url.includes('/auth/callback')
      ) {
        // On web, let Supabase handle session from URL; avoid router redirects that
        // can strip the hash parameters before Supabase processes them
        if (Platform.OS === 'web') {
          return;
        }
        // Parse URL parameters from the deep link
        try {
          const urlObj = new URL(url);
          const params = new URLSearchParams(urlObj.hash.substring(1)); // Get hash parameters

          // Build query string for router
          const queryParams: Record<string, string> = {};
          params.forEach((value, key) => {
            queryParams[key] = value;
          });

          console.log('Parsed deep link params:', queryParams);

          // Navigate with parsed parameters
          if (Object.keys(queryParams).length > 0) {
            router.push({
              pathname: '/auth/callback',
              params: queryParams,
            });
          } else {
            router.push('/auth/callback');
          }
        } catch (error) {
          console.error('Error parsing deep link:', error);
          // Fallback to basic navigation
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
    </AuthProvider>
  );
}
