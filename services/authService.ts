import { supabase, UserProfile } from '@/lib/supabase';
import { Platform } from 'react-native';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  phone: string;
  userType: 'donor' | 'club';
  bloodGroup?: string;
  country: string;
  district?: string;
  policeStation?: string;
  state?: string;
  city?: string;
  address?: string;
  website?: string;
  description?: string;
  clubName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  private getRedirectUrl() {
    // Native: always deep link into the app using our custom scheme
    if (Platform.OS !== 'web') {
      return 'bloodconnect://auth/callback';
    }

    // Web: use current origin
    if (typeof window !== 'undefined' && window.location?.origin) {
      const origin = window.location.origin;
      console.log('AuthService: Current origin:', origin);
      return `${origin}/auth/callback`;
    }

    // Fallback (should rarely be used)
    return 'bloodconnect://auth/callback';
  }

  private parseRateLimitError(error: any): {
    isRateLimit: boolean;
    waitTime?: number;
    message: string;
  } {
    const errorMessage = error?.message || '';
    const errorBody = error?.body || '';

    // Check for rate limit error patterns
    const rateLimitPatterns = [
      /For security purposes, you can only request this after (\d+) seconds?/i,
      /over_email_send_rate_limit/i,
      /rate.?limit/i,
    ];

    const isRateLimit = rateLimitPatterns.some(
      (pattern) => pattern.test(errorMessage) || pattern.test(errorBody)
    );

    if (isRateLimit) {
      // Try to extract wait time from error message
      const waitTimeMatch =
        errorMessage.match(/after (\d+) seconds?/i) ||
        errorBody.match(/after (\d+) seconds?/i);
      const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1], 10) : 60;

      return {
        isRateLimit: true,
        waitTime,
        message: `Too many requests. Please wait ${waitTime} seconds before trying again.`,
      };
    }

    return {
      isRateLimit: false,
      message: errorMessage,
    };
  }

  private isInvalidRefreshTokenError(error: any): boolean {
    const errorMessage = error?.message || '';
    const errorBody = error?.body || '';

    // Check for various refresh token error patterns
    const refreshTokenErrorPatterns = [
      /Invalid Refresh Token: Refresh Token Not Found/i,
      /refresh_token_not_found/i,
      /invalid_grant/i,
      /refresh token not found/i,
      /invalid refresh token/i,
    ];

    return refreshTokenErrorPatterns.some(
      (pattern) => pattern.test(errorMessage) || pattern.test(errorBody)
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            'Request timed out. Please check your connection and try again.'
          )
        );
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  private async clearAllStorageData() {
    try {
      console.log('AuthService: Clearing all storage data...');

      // Clear localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => {
          console.log('Removing localStorage key:', key);
          window.localStorage.removeItem(key);
        });
      }

      // Clear sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const sessionKeysToRemove = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (
            key &&
            (key.startsWith('sb-') ||
              key.includes('supabase') ||
              key === 'pendingAccountType')
          ) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach((key) => {
          console.log('Removing sessionStorage key:', key);
          window.sessionStorage.removeItem(key);
        });
      }

      console.log('AuthService: Storage data cleared successfully');
    } catch (error) {
      console.error('AuthService: Error clearing storage data:', error);
    }
  }

  private async clearStaleSession() {
    try {
      console.log('AuthService: Clearing stale session...');

      // Clear any existing session
      await supabase.auth.signOut();

      // Clear storage data
      await this.clearAllStorageData();

      console.log('AuthService: Stale session cleared');
    } catch (error) {
      console.log('AuthService: Error clearing stale session:', error);
    }
  }

  async getCurrentUserAndSession() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (userError) {
        // Handle specific error cases
        if (
          userError.message.includes(
            'User from sub claim in JWT does not exist'
          )
        ) {
          console.log('Stale JWT detected, clearing session...');
          await this.clearStaleSession();
          return { user: null, session: null };
        }
        if (this.isInvalidRefreshTokenError(userError)) {
          console.log('Invalid refresh token detected, clearing session...');
          await this.clearStaleSession();
          return { user: null, session: null };
        }
        if (userError.message === 'Auth session missing!') {
          return { user: null, session: null };
        }
        throw new Error(userError.message);
      }

      if (sessionError) {
        console.error('Session error:', sessionError);
        // Check for refresh token errors in session error
        if (this.isInvalidRefreshTokenError(sessionError)) {
          console.log(
            'Invalid refresh token in session error, clearing session...'
          );
          await this.clearStaleSession();
          return { user: null, session: null };
        }
        return { user, session: null };
      }

      return { user, session };
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('User from sub claim in JWT does not exist')
        ) {
          console.log('Stale JWT detected, clearing session...');
          await this.clearStaleSession();
          return { user: null, session: null };
        }
        if (this.isInvalidRefreshTokenError(error)) {
          console.log(
            'Invalid refresh token in catch block, clearing session...'
          );
          await this.clearStaleSession();
          return { user: null, session: null };
        }
        if (!error.message.includes('Auth session missing')) {
          console.error('Get current user and session error:', error);
        }
      }
      return { user: null, session: null };
    }
  }

  async signUp(data: SignUpData) {
    try {
      console.log('Starting signup process...');

      const redirectUrl = this.getRedirectUrl();
      console.log('AuthService: Using redirect URL:', redirectUrl);

      // Store signup data in sessionStorage for later profile creation
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(
          'pendingSignupData',
          JSON.stringify({
            name: data.name,
            phone: data.phone,
            userType: data.userType,
            bloodGroup: data.bloodGroup,
            country: data.country,
            district: data.district,
            policeStation: data.policeStation,
            state: data.state,
            city: data.city,
            address: data.address,
            website: data.website,
            description: data.description,
            clubName: data.clubName,
          })
        );
      }

      // 1. Create auth user with email confirmation required
      const authPromise = supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            user_type: data.userType,
          },
        },
      });

      const { data: authData, error: authError } = await this.withTimeout(
        authPromise,
        15000
      );

      if (authError) {
        console.error('Auth signup error:', authError);
        const rateLimitInfo = this.parseRateLimitError(authError);
        if (rateLimitInfo.isRateLimit) {
          const error = new Error(rateLimitInfo.message);
          (error as any).isRateLimit = true;
          (error as any).waitTime = rateLimitInfo.waitTime;
          throw error;
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      console.log('Auth user created successfully:', authData.user.id);

      // Check if user is immediately signed in (e.g., OAuth or email confirmation disabled)
      const needsEmailVerification = !authData.user.email_confirmed_at;

      if (!needsEmailVerification && authData.session) {
        console.log('User is immediately authenticated, creating profile...');

        // Create profile immediately since user is authenticated
        try {
          await this.createInitialProfile(authData.user.id, data);
          console.log('Initial profile created successfully');
        } catch (profileError) {
          console.error('Failed to create initial profile:', profileError);
          // Don't throw here - profile can be created later in complete-profile
        }
      }

      return {
        user: authData.user,
        session: authData.session,
        needsEmailVerification,
      };
    } catch (error) {
      console.error('Sign up error:', error);

      // Clear pending signup data on error
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('pendingSignupData');
      }

      // Add more specific error handling
      if (error instanceof Error) {
        if (
          error.message.includes('timeout') ||
          error.message.includes('timed out')
        ) {
          throw new Error(
            'The request is taking too long. Please check your internet connection and try again.'
          );
        }
        if (
          error.message.includes('network') ||
          error.message.includes('fetch')
        ) {
          throw new Error(
            'Network error. Please check your internet connection and try again.'
          );
        }
      }

      throw error;
    }
  }

  private async createInitialProfile(userId: string, data: SignUpData) {
    const profileData: Partial<UserProfile> = {
      id: userId,
      email: data.email,
      user_type: data.userType,
      country: data.country,
      name: data.userType === 'donor' ? data.name : data.clubName || data.name,
      phone: data.phone,
      is_available: false, // Will be set after profile completion
    };

    // Add optional fields if provided
    if (data.bloodGroup && data.userType === 'donor') {
      profileData.blood_group = data.bloodGroup;
    }
    if (data.district) profileData.district = data.district;
    if (data.policeStation) profileData.police_station = data.policeStation;
    if (data.state) profileData.state = data.state;
    if (data.city) profileData.city = data.city;
    if (data.address) profileData.address = data.address;
    if (data.website) profileData.website = data.website;
    if (data.description) profileData.description = data.description;

    const { error } = await supabase
      .from('user_profiles')
      .upsert([profileData], { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }
  }

  async signIn(data: SignInData) {
    try {
      const signInPromise = supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      const { data: authData, error } = await this.withTimeout(
        signInPromise,
        10000
      );

      if (error) {
        // Handle expected authentication errors without logging to console
        if (error.message === 'Invalid login credentials') {
          throw new Error(
            'Invalid email or password. Please check your credentials and try again.'
          );
        }

        if (error.message.includes('Email not confirmed')) {
          throw new Error(
            'Please verify your email address before signing in. Check your inbox for a verification link.'
          );
        }

        // Log other unexpected errors for debugging
        console.error('Unexpected sign in error:', error);
        throw new Error(error.message);
      }

      // Check if email is verified
      if (!authData.user?.email_confirmed_at) {
        throw new Error(
          'Please verify your email address before signing in. Check your inbox for a verification link.'
        );
      }

      return {
        user: authData.user,
        session: authData.session,
      };
    } catch (error) {
      // Re-throw the error without additional logging since we've already handled it above
      throw error;
    }
  }

  async signInWithGoogle() {
    try {
      const redirectUrl = this.getRedirectUrl();
      console.log('AuthService: Google OAuth redirect URL:', redirectUrl);

      // Store account type preference for OAuth users
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const urlParams = new URLSearchParams(window.location.search);
        const accountType = urlParams.get('accountType') || 'donor';
        sessionStorage.setItem('pendingAccountType', accountType);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        throw new Error(`Google sign-in failed: ${error.message}`);
      }

      console.log('Google OAuth initiated successfully');
      return data;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }

  async resendEmailVerification(email: string) {
    try {
      const redirectUrl = this.getRedirectUrl();
      console.log(
        'AuthService: Resend verification redirect URL:',
        redirectUrl
      );

      const resendPromise = supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      const { error } = await this.withTimeout(resendPromise, 10000);

      if (error) {
        const rateLimitInfo = this.parseRateLimitError(error);
        if (rateLimitInfo.isRateLimit) {
          const rateLimitError = new Error(rateLimitInfo.message);
          (rateLimitError as any).isRateLimit = true;
          (rateLimitError as any).waitTime = rateLimitInfo.waitTime;
          throw rateLimitError;
        }
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      console.log('AuthService: Starting sign out process...');

      // Sign out from Supabase first
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.error('AuthService: Supabase sign out error:', error);
        // Continue with cleanup even if server sign out fails
      }

      // Clear all storage data after sign out
      await this.clearAllStorageData();

      console.log('AuthService: Sign out completed successfully');
    } catch (error) {
      console.error('AuthService: Sign out error:', error);
      // Clear storage even if there's an error
      await this.clearAllStorageData();
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        // Handle specific error cases
        if (
          error.message.includes('User from sub claim in JWT does not exist')
        ) {
          console.log('Stale JWT detected, clearing session...');
          await this.clearStaleSession();
          return null;
        }
        if (this.isInvalidRefreshTokenError(error)) {
          console.log('Invalid refresh token detected, clearing session...');
          await this.clearStaleSession();
          return null;
        }
        if (error.message === 'Auth session missing!') {
          return null;
        }
        throw new Error(error.message);
      }

      return user;
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('User from sub claim in JWT does not exist')
        ) {
          console.log('Stale JWT detected, clearing session...');
          await this.clearStaleSession();
          return null;
        }
        if (this.isInvalidRefreshTokenError(error)) {
          console.log('Invalid refresh token detected, clearing session...');
          await this.clearStaleSession();
          return null;
        }
        if (!error.message.includes('Auth session missing')) {
          console.error('Get current user error:', error);
        }
      }
      return null;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log('Fetching user profile for ID:', userId);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('Profile fetch error:', error);
        // Handle permission denied errors gracefully
        if (
          error.code === '42501' ||
          error.message.includes('permission denied')
        ) {
          console.log(
            'Permission denied for user profile, user may need to re-authenticate'
          );
          return null;
        }
        // Handle case where profile doesn't exist yet
        if (error.code === 'PGRST116') {
          console.log('User profile not found, may need to be created');
          return null;
        }
        throw new Error(error.message);
      }

      console.log('User profile fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      // If it's a timeout or network error, return null instead of throwing
      if (error instanceof Error && error.message.includes('timed out')) {
        console.log('Profile fetch timed out, returning null');
        return null;
      }
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    try {
      console.log('Updating profile for user:', userId);
      console.log('Profile updates to send:', updates);

      // Ensure we have a valid user session
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Authentication required. Please sign in again.');
      }

      if (user.id !== userId) {
        throw new Error("Unauthorized: Cannot update another user's profile.");
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        // Ensure required fields are present
        email: updates.email || '',
        name: updates.name || '',
        user_type: updates.user_type || 'donor',
        country: updates.country || 'BANGLADESH',
      };

      console.log('Sending update request to Supabase...');

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert([{ id: userId, ...updateData }], { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      } else {
        console.log('Profile update successful');
      }

      if (!data) {
        throw new Error('No data returned from profile update');
      }

      console.log('Profile updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async resetPassword(email: string) {
    try {
      const redirectUrl = this.getRedirectUrl();
      console.log('AuthService: Password reset redirect URL:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectUrl}?type=recovery`,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  // Expose a helper to set session from tokens (used by native deep link flow)
  async setSessionWithTokens(accessToken: string, refreshToken: string) {
    console.log('AuthService: Setting session with tokens...');
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error('AuthService: Session set error:', error);
      throw new Error(error.message);
    }
    console.log('AuthService: Session set successfully, user:', data?.user?.id);
    return data;
  }

  // Handle email verification callback
  async handleEmailVerification() {
    try {
      console.log('AuthService: Handling email verification...');
      console.log('Current URL:', window.location.href);

      // Get the current URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const accessToken =
        urlParams.get('access_token') || hashParams.get('access_token');
      const refreshToken =
        urlParams.get('refresh_token') || hashParams.get('refresh_token');
      const error = urlParams.get('error') || hashParams.get('error');
      const errorDescription =
        urlParams.get('error_description') ||
        hashParams.get('error_description');
      const errorCode =
        urlParams.get('error_code') || hashParams.get('error_code');

      console.log('URL params:', {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
        error,
        errorDescription,
        errorCode,
      });

      // Check for errors first
      if (error) {
        console.log('Verification error detected:', error, errorDescription);
        if (
          error === 'access_denied' &&
          (errorCode === 'otp_expired' || errorDescription?.includes('expired'))
        ) {
          throw new Error(
            'Email verification link has expired. Please request a new one.'
          );
        }
        throw new Error(errorDescription || 'Email verification failed');
      }

      // If we have tokens, set the session
      if (accessToken && refreshToken) {
        console.log('Setting session with tokens...');
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error(sessionError.message);
        }

        console.log('Session set successfully:', data.user?.id);
        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      }

      // Check if user is already authenticated
      console.log('Checking existing session...');
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session check error:', sessionError);
        throw new Error(sessionError.message);
      }

      if (session && session.user?.email_confirmed_at) {
        console.log('Found existing verified session:', session.user.id);
        return {
          success: true,
          user: session.user,
          session: session,
        };
      }

      console.log('No valid session found');
      throw new Error('No valid session found. Please try signing in again.');
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
