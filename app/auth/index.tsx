import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, ArrowLeft, Mail } from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { router, usePathname } from 'expo-router';
import { ValidatedInput } from '@/components/ValidatedInput';
import { useFormValidation, CommonValidationRules } from '@/utils/validation';
import { useNotification } from '@/components/NotificationSystem';
import { useAuth } from '@/providers/AuthProvider';
import { Logo } from '@/components/ui';

export default function SignInScreen() {
  const { t } = useI18n();
  const { showNotification } = useNotification();
  const {
    signIn,
    signInWithGoogle,
    loading,
    resetPassword,
    resendEmailVerification,
  } = useAuth();
  const pathname = usePathname();

  const { data, errors, touched, updateField, touchField, validateAll } =
    useFormValidation(
      { email: '', password: '' },
      {
        email: CommonValidationRules.email,
        password: {
          required: true,
          minLength: 6, // Less strict for sign in
        },
      }
    );

  const handleSignIn = async () => {
    if (!validateAll()) {
      showNotification(
        {
          type: 'error',
          title: 'Validation Error',
          message: 'Please fix the errors below and try again.',
          duration: 4000,
        },
        true
      );
      return;
    }

    try {
      await signIn(data.email, data.password);

      showNotification(
        {
          type: 'success',
          title: 'Welcome Back!',
          message: 'You have successfully signed in.',
          duration: 3000,
        },
        true
      );

      // Navigation handled centrally by AuthProvider based on profile completeness
    } catch (error) {
      // Clear password field for security after failed login
      updateField('password', '');
      // Normalize error payloads (Error or { code, message })
      const errObj: any = error || {};
      const normalizedMessage =
        error instanceof Error
          ? error.message
          : typeof errObj.message === 'string'
          ? errObj.message
          : 'Please check your credentials and try again.';
      const errorCode = errObj.code as string | undefined;

      // Check if it's an email verification error
      if (normalizedMessage.includes('verify your email')) {
        showNotification(
          {
            type: 'warning',
            title: 'Email Verification Required',
            message: normalizedMessage,
            duration: 8000,
            action: {
              label: 'Resend Email',
              onPress: () => handleResendVerification(data.email),
            },
          },
          true
        );
      } else if (
        errorCode === 'invalid_credentials' ||
        /Invalid login credentials/i.test(normalizedMessage)
      ) {
        showNotification(
          {
            type: 'error',
            title: 'Invalid Credentials',
            message: 'Invalid email or password. Please try again.',
            duration: 5000,
            action: {
              label: 'Forgot Password?',
              onPress: handleForgotPassword,
            },
          },
          true
        );
      } else {
        showNotification(
          {
            type: 'error',
            title: 'Sign In Failed',
            message: normalizedMessage,
            duration: 5000,
            action: {
              label: 'Forgot Password?',
              onPress: handleForgotPassword,
            },
          },
          true
        );
      }
    }
  };

  const handleResendVerification = async (email: string) => {
    try {
      await resendEmailVerification(email);
      showNotification(
        {
          type: 'success',
          title: 'Verification Email Sent',
          message: "We've sent a new verification link to your email address.",
          duration: 4000,
        },
        true
      );
    } catch (error) {
      showNotification(
        {
          type: 'error',
          title: 'Failed to Send Email',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to resend verification email.',
          duration: 5000,
        },
        true
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();

      showNotification(
        {
          type: 'success',
          title: 'Welcome!',
          message: 'You have successfully signed in with Google.',
          duration: 3000,
        },
        true
      );

      // Navigation handled centrally by AuthProvider based on profile completeness
    } catch (error) {
      const errObj: any = error || {};
      const normalizedMessage =
        error instanceof Error
          ? error.message
          : typeof errObj.message === 'string'
          ? errObj.message
          : 'Failed to sign in with Google.';
      const errorCode = errObj.code as string | undefined;

      const title =
        errorCode === 'invalid_credentials' ||
        /Invalid login credentials/i.test(normalizedMessage)
          ? 'Invalid Credentials'
          : 'Google Sign In Failed';

      showNotification(
        {
          type: 'error',
          title,
          message: normalizedMessage,
          duration: 5000,
        },
        true
      );
    }
  };

  const handleSignUp = () => {
    router.push('/auth/account-type');
  };

  const handleForgotPassword = async () => {
    if (!data.email) {
      showNotification(
        {
          type: 'info',
          title: 'Enter Your Email',
          message:
            'Please enter your email address first, then try forgot password.',
          duration: 4000,
        },
        true
      );
      return;
    }

    try {
      await resetPassword(data.email);
      showNotification(
        {
          type: 'success',
          title: 'Reset Email Sent',
          message: "We've sent a password reset link to your email address.",
          duration: 6000,
        },
        true
      );
    } catch (error) {
      showNotification(
        {
          type: 'error',
          title: 'Reset Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to send reset email.',
          duration: 5000,
        },
        true
      );
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            {/* <Heart size={48} color="#DC2626" /> */}
            <Logo size={64} />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue helping save lives
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <ValidatedInput
            label={t('auth.email')}
            value={data.email}
            onChangeText={(text) => updateField('email', text)}
            onBlur={() => touchField('email')}
            error={errors.email}
            touched={touched.email}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            required
          />

          <ValidatedInput
            label={t('auth.password')}
            value={data.password}
            onChangeText={(text) => updateField('password', text)}
            onBlur={() => touchField('password')}
            error={errors.password}
            touched={touched.password}
            placeholder="Enter your password"
            isPassword
            autoComplete="password"
            required
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>
              {t('auth.forgotPassword')}
            </Text>
          </TouchableOpacity>
          {/* Social Sign In */}
          <View style={styles.socialSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Text style={styles.socialButtonText}>
                  {t('auth.signInWithGoogle')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.signInButton,
              loading && styles.signInButtonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.signInButtonText}>
              {loading ? 'Signing In...' : t('auth.signIn')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.signUpSection}>
          <Text style={styles.signUpText}>{t('auth.dontHaveAccount')}</Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpLink}>{t('auth.signUp')}</Text>
          </TouchableOpacity>
        </View>

        {/* Email Verification Notice */}
        <View style={styles.verificationNotice}>
          <Mail size={20} color="#3B82F6" />
          <Text style={styles.verificationText}>
            New to BloodLink? You&apos;ll need to verify your email after
            signing up.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerContainer: {
    paddingTop: 20,
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#DC2626',
  },
  signInButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signInButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  signInButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  verificationText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  socialSection: {
    marginBottom: 32,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  socialButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#374151',
  },
  signUpSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  signUpText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  signUpLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
});
