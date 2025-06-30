import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, ArrowLeft, Mail, CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { ValidatedInput } from '@/components/ValidatedInput';
import { useFormValidation, CommonValidationRules } from '@/utils/validation';
import { useNotification } from '@/components/NotificationSystem';
import { useAuth } from '@/providers/AuthProvider';

export default function SignUpScreen() {
  const { t } = useI18n();
  const { showNotification } = useNotification();
  const { signUp, signInWithGoogle, loading, resendEmailVerification } = useAuth();
  const params = useLocalSearchParams();
  
  // Get account type from params (from account type selection)
  const preSelectedAccountType = params.accountType as string;
  
  const [accountType] = useState(preSelectedAccountType || '');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form validation for authentication
  const {
    data: authData,
    errors: authErrors,
    touched: authTouched,
    updateField: updateAuthField,
    touchField: touchAuthField,
    validateAll: validateAuth,
    setValidationRules: setAuthValidationRules,
  } = useFormValidation(
    { email: '', password: '', confirmPassword: '' },
    {
      email: CommonValidationRules.email,
      password: CommonValidationRules.password,
      confirmPassword: CommonValidationRules.confirmPassword(''),
    }
  );

  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rateLimitCooldown > 0) {
      interval = setInterval(() => {
        setRateLimitCooldown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [rateLimitCooldown]);

  // Update confirm password validation when password changes
  React.useEffect(() => {
    setAuthValidationRules({
      email: CommonValidationRules.email,
      password: CommonValidationRules.password,
      confirmPassword: CommonValidationRules.confirmPassword(authData.password),
    });
    
    if (authTouched.confirmPassword) {
      touchAuthField('confirmPassword');
    }
  }, [authData.password]);

  const handleNext = () => {
    if (rateLimitCooldown > 0) {
      showNotification({
        type: 'warning',
        title: 'Please Wait',
        message: `You must wait ${rateLimitCooldown} seconds before trying again.`,
        duration: 3000,
      });
      return;
    }

    if (isSubmitting) {
      return; // Prevent double submission
    }

    if (!validateAuth()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors below and try again.',
        duration: 4000,
      });
      return;
    }
    handleSignUp();
  };

  const handleBack = () => {
    router.back();
  };

  const handleSignUp = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      const signUpData = {
        email: authData.email,
        password: authData.password,
        name: '', // Will be completed in profile step
        clubName: '',
        phone: '',
        userType: accountType as 'donor' | 'club',
        bloodGroup: '',
        country: 'BANGLADESH', // Provide a valid country value
        district: '',
        policeStation: '',
        state: '',
        city: '',
        address: '',
        website: '',
        description: '',
      };

      const result = await signUp(signUpData);
      
      if (result.needsEmailVerification) {
        setUserEmail(authData.email);
        setShowEmailVerification(true);
        
        showNotification({
          type: 'info',
          title: 'Verify Your Email',
          message: 'We\'ve sent a verification link to your email address. Please check your inbox and click the link to activate your account.',
          duration: 8000,
        });
      } else {
        // If no email verification needed, redirect to profile completion
        showNotification({
          type: 'success',
          title: 'Account Created!',
          message: 'Welcome to BloodConnect! Please complete your profile.',
          duration: 4000,
        });
        
        router.replace('/complete-profile');
      }
    } catch (error: any) {
      if (error?.isRateLimit) {
        setRateLimitCooldown(error.waitTime || 60);
        showNotification({
          type: 'warning',
          title: 'Rate Limit Exceeded',
          message: error.message,
          duration: 6000,
        });
      } else {
        let errorMessage = 'Something went wrong. Please try again.';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        showNotification({
          type: 'error',
          title: 'Registration Failed',
          message: errorMessage,
          duration: 5000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (rateLimitCooldown > 0) {
      showNotification({
        type: 'warning',
        title: 'Please Wait',
        message: `You must wait ${rateLimitCooldown} seconds before trying again.`,
        duration: 3000,
      });
      return;
    }

    try {
      await resendEmailVerification(userEmail);
      showNotification({
        type: 'success',
        title: 'Verification Email Sent',
        message: 'We\'ve sent another verification link to your email address.',
        duration: 4000,
      });
    } catch (error: any) {
      if (error?.isRateLimit) {
        setRateLimitCooldown(error.waitTime || 60);
        showNotification({
          type: 'warning',
          title: 'Rate Limit Exceeded',
          message: error.message,
          duration: 6000,
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Failed to Send Email',
          message: error instanceof Error ? error.message : 'Failed to resend verification email.',
          duration: 5000,
        });
      }
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      // Store account type in session storage for after OAuth redirect
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingAccountType', accountType);
      }
      
      await signInWithGoogle();
      
      showNotification({
        type: 'success',
        title: 'Welcome!',
        message: 'You have successfully signed up with Google.',
        duration: 3000,
      });
      
      // OAuth users will be redirected to complete-profile by AuthProvider
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Google Sign Up Failed',
        message: error instanceof Error ? error.message : 'Failed to sign up with Google.',
        duration: 5000,
      });
    }
  };

  // Email verification screen
  if (showEmailVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.verificationContainer}>
          <View style={styles.verificationContent}>
            <View style={styles.verificationIcon}>
              <Mail size={64} color="#DC2626" />
            </View>
            
            <Text style={styles.verificationTitle}>Check Your Email</Text>
            <Text style={styles.verificationMessage}>
              We've sent a verification link to{'\n'}
              <Text style={styles.emailText}>{userEmail}</Text>
            </Text>
            
            <View style={styles.verificationSteps}>
              <View style={styles.stepItem}>
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.stepText}>Check your email inbox</Text>
              </View>
              <View style={styles.stepItem}>
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.stepText}>Click the verification link</Text>
              </View>
              <View style={styles.stepItem}>
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.stepText}>Complete your profile</Text>
              </View>
            </View>

            <View style={styles.verificationActions}>
              <TouchableOpacity 
                style={[
                  styles.resendButton,
                  rateLimitCooldown > 0 && styles.resendButtonDisabled
                ]}
                onPress={handleResendVerification}
                disabled={loading || rateLimitCooldown > 0}
              >
                {rateLimitCooldown > 0 ? (
                  <View style={styles.cooldownContainer}>
                    <Clock size={16} color="#9CA3AF" />
                    <Text style={styles.resendButtonTextDisabled}>
                      Wait {rateLimitCooldown}s
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.resendButtonText}>
                    {loading ? 'Sending...' : 'Resend Verification Email'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.signInButton}
                onPress={() => router.push('/auth')}
              >
                <Text style={styles.signInButtonText}>Go to Sign In</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.verificationNote}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.verificationNoteText}>
                You must verify your email before you can complete your profile and start using BloodConnect.
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isButtonDisabled = loading || isSubmitting || rateLimitCooldown > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Heart size={32} color="#DC2626" />
            <Text style={styles.headerTitle}>Join BloodConnect</Text>
          </View>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>2/3</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.stepTitle}>Create Account</Text>
          <Text style={styles.stepSubtitle}>Enter your login credentials</Text>
          
          <View style={styles.form}>
            <ValidatedInput
              label={t('auth.email')}
              value={authData.email}
              onChangeText={(text) => updateAuthField('email', text)}
              onBlur={() => touchAuthField('email')}
              error={authErrors.email}
              touched={authTouched.email}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />

            <ValidatedInput
              label={t('auth.password')}
              value={authData.password}
              onChangeText={(text) => updateAuthField('password', text)}
              onBlur={() => touchAuthField('password')}
              error={authErrors.password}
              touched={authTouched.password}
              placeholder="Enter your password"
              isPassword
              required
              helpText="Must contain uppercase, lowercase, number, and 8+ characters"
            />

            <ValidatedInput
              label={t('auth.confirmPassword')}
              value={authData.confirmPassword}
              onChangeText={(text) => updateAuthField('confirmPassword', text)}
              onBlur={() => touchAuthField('confirmPassword')}
              error={authErrors.confirmPassword}
              touched={authTouched.confirmPassword}
              placeholder="Confirm your password"
              isPassword
              required
            />
          </View>

          <View style={styles.socialSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={handleGoogleSignUp}
                disabled={loading}
              >
                <Text style={styles.socialButtonText}>{t('auth.signInWithGoogle')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.nextButton, 
              isButtonDisabled && styles.nextButtonDisabled
            ]}
            onPress={handleNext}
            disabled={isButtonDisabled}
          >
            {rateLimitCooldown > 0 ? (
              <View style={styles.cooldownContainer}>
                <Clock size={16} color="#FFFFFF" />
                <Text style={styles.nextButtonText}>
                  Wait {rateLimitCooldown}s
                </Text>
              </View>
            ) : (
              <Text style={styles.nextButtonText}>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.signInSection}>
            <Text style={styles.signInText}>{t('auth.alreadyHaveAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/auth')}>
              <Text style={styles.signInLink}>{t('auth.signIn')}</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  stepIndicator: {
    width: 40,
    alignItems: 'center',
  },
  stepText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  socialSection: {
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  nextButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  nextButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  signInText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  signInLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
  // Email verification styles
  verificationContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  verificationContent: {
    alignItems: 'center',
  },
  verificationIcon: {
    marginBottom: 32,
  },
  verificationTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  verificationMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emailText: {
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
  },
  verificationSteps: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  verificationActions: {
    alignSelf: 'stretch',
    gap: 16,
    marginBottom: 24,
  },
  resendButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  resendButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  resendButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
  resendButtonTextDisabled: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#9CA3AF',
  },
  signInButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signInButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  verificationNote: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  verificationNoteText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});