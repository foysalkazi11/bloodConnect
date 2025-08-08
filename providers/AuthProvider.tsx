import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '@/services/authService';
import { UserProfile } from '@/lib/supabase';
import { router } from 'expo-router';
import notificationService from '@/services/notificationService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isEmailVerified: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: any) => Promise<{ needsEmailVerification: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendEmailVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Use the Google Auth hook (always call hook to follow Rules of Hooks)
  const googleAuth = useGoogleAuth();

  const isEmailVerified = user?.email_confirmed_at != null;

  // Check if profile is complete
  const isProfileComplete = (profile: UserProfile | null): boolean => {
    if (!profile) return false;

    // Check if name is empty, just whitespace, or same as email (temporary name)
    if (
      !profile.name ||
      profile.name.trim().length === 0 ||
      profile.name === profile.email
    ) {
      return false;
    }

    const requiredFields = ['name', 'phone', 'user_type', 'country'];

    // Check basic required fields
    for (const field of requiredFields) {
      const value = profile[field as keyof UserProfile];
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        return false;
      }
    }

    // Check location-specific requirements
    if (profile.country === 'BANGLADESH') {
      if (!profile.district || !profile.police_station) {
        return false;
      }
    } else {
      if (!profile.state || !profile.city) {
        return false;
      }
    }

    // Check donor-specific requirements
    if (profile.user_type === 'donor' && !profile.blood_group) {
      return false;
    }

    return true;
  };

  const handleProfileRedirection = (
    userProfile: UserProfile | null,
    currentUser: User
  ) => {
    // Only redirect if user is verified
    if (!currentUser.email_confirmed_at) {
      return;
    }

    // Only redirect if:
    // 1. Profile exists
    // 2. Profile is incomplete
    // 3. We're not already on the complete-profile page
    if (
      userProfile &&
      !isProfileComplete(userProfile) &&
      typeof window !== 'undefined'
    ) {
      console.log(
        'AuthProvider: Profile incomplete, redirecting to complete-profile'
      );

      const currentPath = window.location.pathname;
      // Prevent redirect if already on complete-profile or auth pages
      if (
        currentPath !== '/complete-profile' &&
        !currentPath.startsWith('/auth/')
      ) {
        router.replace('/complete-profile');
      }
    }
  };

  const isCompletingProfile = () => {
    return (
      typeof window !== 'undefined' &&
      window.location.pathname === '/complete-profile'
    );
  };

  const clearAuthState = () => {
    console.log('AuthProvider: Clearing auth state...');
    setUser(null);
    setSession(null);
    setProfile(null);

    // Cleanup notification service
    try {
      notificationService.cleanup();
    } catch (error) {
      console.error(
        'AuthProvider: Failed to cleanup notification service:',
        error
      );
    }
  };

  const handleAuthenticationError = (error: any) => {
    console.error('AuthProvider: Authentication error detected:', error);

    // Check if the error indicates authentication issues
    const errorMessage = error?.message || '';
    const isAuthError =
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('JWT') ||
      errorMessage.includes('user_not_found') ||
      errorMessage.includes('Invalid JWT');

    if (isAuthError) {
      console.log(
        'AuthProvider: Clearing auth state due to authentication error'
      );
      clearAuthState();

      // Redirect to auth page if not already there
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/auth/')) {
          router.replace('/auth');
        }
      }
      return true;
    }

    return false;
  };

  const ensureProfileExists = async (currentUser: User) => {
    try {
      console.log(
        'AuthProvider: Ensuring profile exists for user:',
        currentUser.id
      );

      // First, verify the session is still valid
      const { session: currentSession } =
        await authService.getCurrentUserAndSession();
      if (!currentSession || !currentSession.user) {
        console.log(
          'AuthProvider: No valid session found during profile check'
        );
        return null;
      }

      let userProfile = null;

      try {
        userProfile = await authService.getUserProfile(currentUser.id);
      } catch (profileError: any) {
        console.log('AuthProvider: Error fetching profile:', profileError);

        // Handle case where profile doesn't exist (404 or no rows returned)
        const errorMessage = profileError?.message || '';
        if (
          errorMessage.includes('no rows returned') ||
          errorMessage.includes('PGRST116') ||
          profileError?.status === 404
        ) {
          console.log('AuthProvider: Profile does not exist, will create one');
          userProfile = null;
        } else if (handleAuthenticationError(profileError)) {
          return null;
        } else {
          throw profileError;
        }
      }

      if (!userProfile) {
        console.log(
          'AuthProvider: No profile found, checking for pending signup data...'
        );

        // Check if we have pending signup data from registration
        let pendingData = null;
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const pendingDataStr = sessionStorage.getItem('pendingSignupData');
          if (pendingDataStr) {
            try {
              pendingData = JSON.parse(pendingDataStr);
              sessionStorage.removeItem('pendingSignupData');
            } catch (e) {
              console.error('Failed to parse pending signup data:', e);
            }
          }
        }

        // Create initial profile
        const initialProfileData: Partial<UserProfile> = {
          email: currentUser.email || '',
          user_type: pendingData?.userType || 'donor',
          country: pendingData?.country || 'BANGLADESH',
          name: pendingData?.name || currentUser.email || '', // Use email as temporary name
          phone: pendingData?.phone || '',
          is_available: false,
        };

        // Add optional fields if available
        if (pendingData?.bloodGroup && pendingData.userType === 'donor') {
          (initialProfileData as any).blood_group = pendingData.bloodGroup;
        }
        if (pendingData?.district)
          initialProfileData.district = pendingData.district;
        if (pendingData?.policeStation)
          initialProfileData.police_station = pendingData.policeStation;
        if (pendingData?.state) initialProfileData.state = pendingData.state;
        if (pendingData?.city) initialProfileData.city = pendingData.city;
        if (pendingData?.address)
          initialProfileData.address = pendingData.address;
        if (pendingData?.website)
          initialProfileData.website = pendingData.website;
        if (pendingData?.description)
          initialProfileData.description = pendingData.description;

        console.log(
          'AuthProvider: Creating initial profile with data:',
          initialProfileData
        );

        try {
          // Verify session is still valid before creating profile
          const { session: sessionCheck } =
            await authService.getCurrentUserAndSession();
          if (!sessionCheck || !sessionCheck.user) {
            console.log(
              'AuthProvider: Session invalid before profile creation'
            );
            return null;
          }

          userProfile = await authService.updateProfile(
            currentUser.id,
            initialProfileData
          );
          console.log('AuthProvider: Initial profile created successfully');
        } catch (error: any) {
          console.error(
            'AuthProvider: Failed to create initial profile:',
            error
          );

          // Handle authentication errors during profile creation
          if (handleAuthenticationError(error)) {
            return null;
          }

          // Don't throw - let the user complete profile manually
          console.log('AuthProvider: Will let user complete profile manually');
        }
      }

      return userProfile;
    } catch (error: any) {
      console.error('AuthProvider: Error ensuring profile exists:', error);

      // Handle authentication errors
      if (handleAuthenticationError(error)) {
        return null;
      }

      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Getting initial session...');
        const { user: currentUser, session: currentSession } =
          await authService.getCurrentUserAndSession();

        if (currentUser && currentSession) {
          console.log('AuthProvider: Found current user:', currentUser.id);
          setUser(currentUser);
          setSession(currentSession);

          // Initialize notification service for the user
          try {
            await notificationService.initialize(currentUser.id);
          } catch (error) {
            console.error(
              'AuthProvider: Failed to initialize notification service:',
              error
            );
          }

          // Initialize push notification service for the user
          try {
            await pushNotificationService.initialize(currentUser.id);
          } catch (error) {
            console.error(
              'AuthProvider: Failed to initialize push notification service:',
              error
            );
          }

          // Only fetch/create profile if email is verified
          if (currentUser.email_confirmed_at) {
            const userProfile = await ensureProfileExists(currentUser);
            setProfile(userProfile);

            // Handle profile completion redirection
            if (userProfile) {
              handleProfileRedirection(userProfile, currentUser);

              // Activate donor availability after profile completion
              if (
                isProfileComplete(userProfile) &&
                userProfile.user_type === 'donor' &&
                !userProfile.is_available
              ) {
                try {
                  await authService.updateProfile(currentUser.id, {
                    is_available: true,
                    email: currentUser.email || userProfile.email, // Ensure email is included
                  });
                  const updatedProfile = await authService.getUserProfile(
                    currentUser.id
                  );
                  setProfile(updatedProfile);
                } catch (error: any) {
                  console.error(
                    'AuthProvider: Failed to activate donor availability:',
                    error
                  );
                  handleAuthenticationError(error);
                }
              }
            }
          }
        } else {
          console.log('AuthProvider: No current user found');
          clearAuthState();

          // Attempt silent Google sign-in on native to restore session seamlessly
          if (Platform.OS !== 'web') {
            try {
              const hasPrev = GoogleSignin.hasPreviousSignIn();
              if (hasPrev) {
                console.log('AuthProvider: Trying Google silent sign-in...');
                try {
                  await GoogleSignin.signInSilently();
                } catch (e) {
                  // ignore; we'll still try to fetch tokens below
                }
                const tokens = await GoogleSignin.getTokens();
                if (tokens?.idToken) {
                  const { error } = await (
                    await import('@/lib/supabase')
                  ).supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: tokens.idToken,
                  });
                  if (error) {
                    console.error(
                      'AuthProvider: Silent Google sign-in failed:',
                      error
                    );
                  } else {
                    console.log(
                      'AuthProvider: Silent Google sign-in succeeded'
                    );
                    // auth state listener will populate state shortly
                  }
                }
              }
            } catch (e) {
              console.error(
                'AuthProvider: Silent Google sign-in attempt error:',
                e
              );
            }
          }
        }
      } catch (error: any) {
        console.error('AuthProvider: Error getting initial session:', error);
        handleAuthenticationError(error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event, session) => {
      console.log(
        'AuthProvider: Auth state changed:',
        event,
        session?.user?.id || 'no user'
      );

      // Don't process auth changes if we're in the middle of signing out
      if (isSigningOut && event === 'SIGNED_OUT') {
        console.log(
          'AuthProvider: Ignoring SIGNED_OUT event during sign out process'
        );
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('AuthProvider: User signed out, clearing state');
        clearAuthState();
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Initialize notification service for the user
        try {
          await notificationService.initialize(session.user.id);
        } catch (error) {
          console.error(
            'AuthProvider: Failed to initialize notification service:',
            error
          );
        }

        // Initialize push notification service for the user
        try {
          await pushNotificationService.initialize(session.user.id);
        } catch (error) {
          console.error(
            'AuthProvider: Failed to initialize push notification service:',
            error
          );
        }

        // Only fetch/create profile if email is verified
        if (session.user.email_confirmed_at) {
          try {
            const userProfile = await ensureProfileExists(session.user);
            if (userProfile) {
              setProfile(userProfile);

              // Force profile completion redirection
              if (!isProfileComplete(userProfile)) {
                console.log(
                  'AuthProvider: Profile incomplete, redirecting to complete-profile'
                );

                if (typeof window !== 'undefined') {
                  const currentPath = window.location.pathname;
                  // Prevent redirect if already on complete-profile or auth pages
                  if (
                    currentPath !== '/complete-profile' &&
                    !currentPath.startsWith('/auth/')
                  ) {
                    router.replace('/complete-profile');
                  }
                }
              } else {
                // Activate donor availability after profile completion
                if (
                  userProfile.user_type === 'donor' &&
                  !userProfile.is_available
                ) {
                  try {
                    await authService.updateProfile(session.user.id, {
                      is_available: true,
                      email: session.user.email || userProfile.email, // Ensure email is included
                    });
                    const updatedProfile = await authService.getUserProfile(
                      session.user.id
                    );
                    setProfile(updatedProfile);
                  } catch (error: any) {
                    console.error(
                      'AuthProvider: Failed to activate donor availability:',
                      error
                    );
                    handleAuthenticationError(error);
                  }
                }
              }
            }
          } catch (error: any) {
            console.error('AuthProvider: Error loading profile:', error);
            if (!handleAuthenticationError(error)) {
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
        }
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isSigningOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await authService.signIn({ email, password });
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const result = await authService.signUp(data);

      // If user doesn't need email verification (e.g., OAuth), they're immediately signed in
      if (!result.needsEmailVerification && result.session) {
        // Profile should already be created in signUp method
        console.log(
          'AuthProvider: User immediately signed in, profile should exist'
        );
      }

      setLoading(false);
      return { needsEmailVerification: result.needsEmailVerification };
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Use AuthService for web
        await authService.signInWithGoogle();
      } else {
        // Expo rule: Check if request is ready before prompting
        if (!googleAuth.isReady) {
          throw new Error(
            'Google authentication is not ready. Please wait and try again.'
          );
        }
        // Use the hook for mobile
        await googleAuth.signInWithGoogle();
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [googleAuth]);

  const signOut = useCallback(async () => {
    console.log('AuthProvider: signOut called');

    // Prevent multiple simultaneous sign out attempts
    if (isSigningOut) {
      console.log('AuthProvider: Sign out already in progress');
      return;
    }

    setIsSigningOut(true);
    setLoading(true);

    try {
      console.log('AuthProvider: Starting sign out process...');

      // Clear local state first to provide immediate UI feedback
      clearAuthState();

      // Also sign out of Google on native so next launch doesn't reuse OS session
      if (Platform.OS !== 'web') {
        try {
          await GoogleSignin.signOut();
        } catch (e) {
          console.error('AuthProvider: Google signOut failed (ignored):', e);
        }
      }

      // Call the auth service to sign out
      await authService.signOut();

      console.log('AuthProvider: Sign out completed successfully');
    } catch (error: any) {
      console.error('AuthProvider: Sign out error:', error);
      // Even if there's an error, we should clear the local state
      clearAuthState();

      // Don't throw the error if it's just a session issue
      if (!handleAuthenticationError(error)) {
        throw error;
      }
    } finally {
      setIsSigningOut(false);
      setLoading(false);
    }
  }, [isSigningOut]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) {
        throw new Error('No user logged in');
      }

      console.log('AuthProvider: updateProfile called with:', updates);
      console.log('AuthProvider: Current user ID:', user.id);

      try {
        // Verify session is still valid before updating
        const { session: currentSession } =
          await authService.getCurrentUserAndSession();
        if (!currentSession || !currentSession.user) {
          throw new Error('Authentication required. Please sign in again.');
        }

        // Ensure all required non-nullable fields are preserved during partial updates
        const updatesWithRequiredFields = {
          ...updates,
          // Preserve email - prioritize updates, then current user email, then existing profile email
          email: updates.email || user.email || profile?.email,
          // Preserve name - prioritize updates, then existing profile, then user email as fallback
          name: updates.name || profile?.name || user.email,
          // Preserve user_type - prioritize updates, then existing profile, then default to 'donor'
          user_type: updates.user_type || profile?.user_type || 'donor',
          // Preserve country - prioritize updates, then existing profile, then default to 'BANGLADESH'
          country: updates.country || profile?.country || 'BANGLADESH',
        };

        // Remove any fields that are still null or undefined to avoid constraint violations
        Object.keys(updatesWithRequiredFields).forEach((key) => {
          const value = updatesWithRequiredFields[key as keyof UserProfile];
          if (value === null || value === undefined || value === '') {
            // For required fields, provide defaults instead of removing them
            if (key === 'email') {
              updatesWithRequiredFields.email = user.email || '';
            } else if (key === 'name') {
              updatesWithRequiredFields.name = user.email || '';
            } else if (key === 'user_type') {
              updatesWithRequiredFields.user_type = 'donor';
            } else if (key === 'country') {
              updatesWithRequiredFields.country = 'BANGLADESH';
            } else {
              // For optional fields, remove them if they're null/undefined/empty
              delete updatesWithRequiredFields[key as keyof UserProfile];
            }
          }
        });

        console.log(
          'AuthProvider: Updating profile with required fields preserved:',
          updatesWithRequiredFields
        );

        // Make sure we're sending a valid update request
        let updatedProfile;
        try {
          updatedProfile = await authService.updateProfile(
            user.id,
            updatesWithRequiredFields
          );
        } catch (updateError) {
          console.error(
            'AuthProvider: First update attempt failed:',
            updateError
          );

          // Try again with minimal required fields if first attempt fails
          const minimalUpdates: any = {
            email: updates.email || user.email || profile?.email || '',
            name: updates.name || profile?.name || user.email || '',
            user_type: updates.user_type || profile?.user_type || 'donor',
            country: updates.country || profile?.country || 'BANGLADESH',
            phone: updates.phone || profile?.phone || '',
          };

          if (updates.blood_group) {
            minimalUpdates.blood_group = updates.blood_group;
          }

          console.log(
            'AuthProvider: Trying with minimal updates:',
            minimalUpdates
          );
          updatedProfile = await authService.updateProfile(
            user.id,
            minimalUpdates
          );
        }

        console.log(
          'AuthProvider: Profile updated successfully:',
          updatedProfile
        );
        setProfile(updatedProfile);
        return updatedProfile;
      } catch (error: any) {
        console.error('AuthProvider: Profile update failed:', error);

        // Handle authentication errors
        if (handleAuthenticationError(error)) {
          throw new Error('Authentication required. Please sign in again.');
        }

        throw error;
      }
    },
    [user, profile]
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authService.resetPassword(email);
    } catch (error) {
      throw error;
    }
  }, []);

  const resendEmailVerification = useCallback(async (email: string) => {
    try {
      await authService.resendEmailVerification(email);
    } catch (error) {
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    isEmailVerified,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    resetPassword,
    resendEmailVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
