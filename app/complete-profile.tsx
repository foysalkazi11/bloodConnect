import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, User, Users } from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { router } from 'expo-router';
import { LocationSelector } from '@/components/LocationSelector';
import { ValidatedInput } from '@/components/ValidatedInput';
import { useFormValidation, CommonValidationRules } from '@/utils/validation';
import { useNotification } from '@/components/NotificationSystem';
import { useAuth } from '@/providers/AuthProvider';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const USER_TYPES = [
  { label: 'Blood Donor', value: 'donor' },
  { label: 'Blood Donation Club', value: 'club' }
];

export default function CompleteProfileScreen() {
  const { t } = useI18n();
  const { showNotification } = useNotification();
  const { user, profile, updateProfile, loading } = useAuth();
  const [accountType, setAccountType] = useState<'donor' | 'club'>('donor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializationAttempted = useRef(false);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);

  // Check if profile is complete to determine if we should redirect
  const checkIfProfileIsComplete = () => {
    if (!profile) return false;

    // Basic required fields
    if (!profile.name || profile.name === profile.email || !profile.phone)
      return false;

    // Location fields
    if (profile.country === 'BANGLADESH') {
      if (!profile.district || !profile.police_station) return false;
    } else {
      if (!profile.state || !profile.city) return false;
    }

    // Donor-specific fields
    if (profile.user_type === 'donor' && !profile.blood_group) return false;

    return true;
  };

  // Get account type from session storage (for OAuth users) or profile
  useEffect(() => {
    if (profile?.user_type) {
      console.log('Setting account type from profile:', profile.user_type);
      setAccountType(profile.user_type);
    } else if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.sessionStorage
    ) {
      const pendingType = sessionStorage.getItem('pendingAccountType');
      if (pendingType === 'donor' || pendingType === 'club') {
        console.log('Setting account type from session storage:', pendingType);
        setAccountType(pendingType);
        sessionStorage.removeItem('pendingAccountType');
      }
    }
  }, [profile]);

  // Initialize profile if user is authenticated but no profile exists
  useEffect(() => {
    const initializeProfile = async () => {
      // Check for profile existence AND initialization flag to prevent infinite loops
      if (user && user.email_confirmed_at && !profile && !initializationAttempted.current && !loading) {
        console.log(
          'CompleteProfile: User authenticated but no profile, initializing...'
        );
        initializationAttempted.current = true;

        try {
          // Check for pending signup data
          let pendingData = null;
          if (
            Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            window.sessionStorage
          ) {
            const pendingDataStr = sessionStorage.getItem('pendingSignupData');
            if (pendingDataStr) {
              try {
                pendingData = JSON.parse(pendingDataStr);
                sessionStorage.removeItem('pendingSignupData');
                console.log('Found pending signup data:', pendingData);
              } catch (e) {
                console.error('Failed to parse pending signup data:', e);
              }
            }
          }

          // Create minimal profile to satisfy RLS
          const initialData: any = {
            email: user.email || '',
            user_type: pendingData?.userType || accountType || 'donor',
            country: pendingData?.country || 'BANGLADESH',
            name: user.email || '', // Temporary name
            phone: pendingData?.phone || '',
            is_available: false,
          };

          // Add optional fields if available
          if (pendingData?.bloodGroup && pendingData.userType === 'donor') {
            initialData.blood_group = pendingData.bloodGroup;
          }
          if (pendingData?.district)
            initialData.district = pendingData.district;
          if (pendingData?.policeStation)
            initialData.police_station = pendingData.policeStation;
          if (pendingData?.state) initialData.state = pendingData.state;
          if (pendingData?.city) initialData.city = pendingData.city;
          if (pendingData?.address) initialData.address = pendingData.address;
          if (pendingData?.website) initialData.website = pendingData.website;
          if (pendingData?.description)
            initialData.description = pendingData.description;

          console.log('CompleteProfile: Creating initial profile...');
          await updateProfile(initialData);
          console.log('CompleteProfile: Initial profile created');
          
        } catch (error) {
          console.error(
            'CompleteProfile: Failed to initialize profile:',
            error
          );
          // Don't show error to user - they can still complete profile manually
        }
      }
    };

    initializeProfile();
  }, [user, profile, accountType, updateProfile]);

  // Create validation rules based on account type
  const getValidationRules = () => {
    const baseRules = {
      phone: CommonValidationRules.phone,
      country: { required: true },
      district: {
        required: false,
        custom: (value: string, allData?: Record<string, string>) => {
          if (
            allData?.country === 'BANGLADESH' &&
            (!value || value.trim().length === 0)
          ) {
            return 'This field is required';
          }
          return null;
        },
      },
      policeStation: {
        required: false,
        custom: (value: string, allData?: Record<string, string>) => {
          if (
            allData?.country === 'BANGLADESH' &&
            (!value || value.trim().length === 0)
          ) {
            return 'This field is required';
          }
          return null;
        },
      },
      state: {
        required: false,
        custom: (value: string, allData?: Record<string, string>) => {
          if (
            allData?.country !== 'BANGLADESH' &&
            (!value || value.trim().length === 0)
          ) {
            return 'This field is required';
          }
          return null;
        },
      },
      city: {
        required: false,
        custom: (value: string, allData?: Record<string, string>) => {
          if (
            allData?.country !== 'BANGLADESH' &&
            (!value || value.trim().length === 0)
          ) {
            return 'This field is required';
          }
          return null;
        },
      },
    };

    if (accountType === 'donor') {
      return {
        ...baseRules,
        name: CommonValidationRules.name,
        bloodGroup: CommonValidationRules.bloodGroup,
      };
    } else {
      // Club validation rules
      return {
        ...baseRules,
        clubName: CommonValidationRules.name,
        website: { required: false },
        description: { required: false },
      };
    }
  };

  // Form validation
  const {
    data: profileData,
    errors: profileErrors,
    touched: profileTouched,
    updateField: updateProfileField,
    touchField: touchProfileField,
    validateAll: validateProfile,
    setValidationRules,
  } = useFormValidation(
    {
      name: profile?.name === profile?.email ? '' : profile?.name || '', // Clear if it's the temporary email name
      phone: profile?.phone || '',
      bloodGroup: profile?.blood_group || '',
      clubName:
        profile?.user_type === 'club'
          ? profile?.name === profile?.email
            ? ''
            : profile?.name || ''
          : '',
      website: profile?.website || '',
      description: profile?.description || '',
      country: profile?.country || 'BANGLADESH',
      district: profile?.district || '',
      policeStation: profile?.police_station || '',
      state: profile?.state || '',
      city: profile?.city || '',
      address: profile?.address || '',
    },
    getValidationRules()
  );

  // Update validation rules when account type changes
  useEffect(() => {
    setValidationRules(getValidationRules());
    console.log('Updated validation rules for account type:', accountType);
  }, [accountType]); // Only update when accountType changes

  // Redirect to home if profile is already complete
  useEffect(() => {
    if (user && profile && !loading && checkIfProfileIsComplete()) {
      console.log('Profile is already complete, redirecting to home');
      router.replace('/(tabs)');
    }
  }, [user, profile, loading]);

  // Prevent navigation away if profile is incomplete (web only)
  useEffect(() => {
   // Skip this effect if there's no user or if we're still loading
   if (!user || loading) return;

    const preventNavigation = (e: BeforeUnloadEvent) => {
      // Only prevent navigation if we're in the middle of completing a profile
      if (user && !checkIfProfileIsComplete()) {
        e.preventDefault();
        e.returnValue =
          'You need to complete your profile before leaving this page. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Add event listener for beforeunload only on web platform
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.addEventListener
    ) {
      window.addEventListener('beforeunload', preventNavigation);
    }

    // Clean up
    return () => {
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        window.removeEventListener
      ) {
       console.log('CompleteProfile: Removing beforeunload listener');
        window.removeEventListener('beforeunload', preventNavigation);
      }
    };
  }, [user, profile, loading]); // Add loading to dependency array

  const handleCompleteProfile = async () => {
    console.log('Starting profile completion with account type:', accountType);
    console.log('Starting profile completion...');

    if (isSubmitting) {
      console.log('CompleteProfile: Already submitting, preventing duplicate submission');
      return;
    }

    if (!validateProfile()) {
      console.log('Validation failed with account type:', accountType);
      console.log('CompleteProfile: Validation failed:', profileErrors);
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please complete all required fields.',
        duration: 4000,
      });
      return;
    }

    if (!user) {
      console.log('CompleteProfile: No user found');
      showNotification({
        type: 'error',
        title: 'Authentication Error',
        message: 'Please sign in again.',
        duration: 4000,
      });
      router.replace('/auth');
      return;
    }

    setIsSubmitting(true);
    console.log('CompleteProfile: Submitting profile data...');

    try {
      console.log('Creating profile with account type:', accountType);
      const updates: any = {
        email: user.email || '', // Ensure email is always included
        name: accountType === 'donor' ? profileData.name : profileData.clubName,
        phone: profileData.phone,
        user_type: accountType,
        country: profileData.country,
        district: profileData.district,
        police_station: profileData.policeStation,
        state: profileData.state,
        city: profileData.city,
        address: profileData.address,
        website: profileData.website,
        description: profileData.description,
        is_available: accountType === 'donor' ? true : false,
      };

      // Add blood group only for donors
      if (accountType === 'donor' && profileData.bloodGroup) {
        console.log('Adding blood group for donor:', profileData.bloodGroup);
        updates.blood_group = profileData.bloodGroup;
      }

      console.log('CompleteProfile: Profile updates to send:', updates);
      console.log('CompleteProfile: User ID:', user.id);

      // Call the updateProfile function from AuthProvider
      console.log('Calling updateProfile with:', updates);
      await updateProfile(updates);

      console.log('Profile updated successfully');

      showNotification({
        type: 'success',
        title: 'Profile Completed!',
        message: `Welcome to BloodConnect! Your ${accountType} profile has been set up successfully.`,
        duration: 4000,
      });

      console.log('Redirecting to home after successful profile completion');
      // Navigate to home screen
      router.replace('/(tabs)');
    } catch (error) {
      console.error('CompleteProfile: Profile update error:', error);

      let errorMessage = 'Something went wrong. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      showNotification({
        type: 'error',
        title: 'Profile Update Failed',
        message: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
    return true;
  };

  const handleLocationChange = (field: string, value: string) => {
    updateProfileField(field, value);
  };

  const handleUserTypeChange = (newType: 'donor' | 'club') => {
    if (newType !== accountType) {
      console.log('Changing account type from', accountType, 'to', newType);
      setAccountType(newType);
    }
    setShowUserTypeModal(false);
  };

  // Attempt to go back - show warning if profile is incomplete
  const handleBackAttempt = () => {
    Alert.alert(
      'Profile Incomplete',
      'You need to complete your profile before you can use the app. Do you want to sign out instead?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Note: authService is not imported, this would need to be fixed
              // await authService.signOut();
              router.replace('/auth');
            } catch (error) {
              console.error('Error signing out:', error);
              router.replace('/auth');
            }
          },
        },
      ]
    );
  };

  if (!user) {
    console.log('No user, redirecting to auth');
    router.replace('/auth');
    return null;
  }

  // If profile is already complete, redirect to home
  if (profile && checkIfProfileIsComplete()) {
    console.log('Profile is already complete, redirecting to home');
    router.replace('/(tabs)');
    return null;
  }

  const isButtonDisabled = loading || isSubmitting;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackAttempt}
          >
            <Text style={styles.backButtonText}>Sign Out</Text>
          </TouchableOpacity>
          <Heart size={48} color="#DC2626" />
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSubtitle}>
            Help us set up your {accountType} profile
          </Text>
          
        </View>

        {/* Account Type Selection (if not already set) */}
        {!profile?.user_type && (
          <View style={styles.accountTypeSection}>
            <Text style={styles.sectionTitle}>Account Type</Text>
            <View style={styles.accountTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.accountTypeCard,
                  accountType === 'donor' && styles.accountTypeCardActive,
                ]}
                onPress={() => setAccountType('donor')}
              >
                <User
                  size={24}
                  color={accountType === 'donor' ? '#FFFFFF' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.accountTypeText,
                    accountType === 'donor' && styles.accountTypeTextActive,
                  ]}
                >
                  Blood Donor
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.accountTypeCard,
                  accountType === 'club' && styles.accountTypeCardActive,
                ]}
                onPress={() => setAccountType('club')}
              >
                <Users
                  size={24}
                  color={accountType === 'club' ? '#FFFFFF' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.accountTypeText,
                    accountType === 'club' && styles.accountTypeTextActive,
                  ]}
                >
                  Blood Donation Club
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Account Type Selector (if already set) */}
        {profile?.user_type && (
          <View style={styles.userTypeSelector}>
            <Text style={styles.userTypeSelectorLabel}>Account Type</Text>
            <TouchableOpacity 
              style={styles.userTypeSelectorButton}
              onPress={() => setShowUserTypeModal(true)}
            >
              <View style={styles.userTypeSelectorContent}>
                {accountType === 'donor' ? (
                  <>
                    <User size={20} color="#DC2626" />
                    <Text style={styles.userTypeSelectorText}>Blood Donor</Text>
                  </>
                ) : (
                  <>
                    <Users size={20} color="#DC2626" />
                    <Text style={styles.userTypeSelectorText}>Blood Donation Club</Text>
                  </>
                )}
              </View>
              <Text style={styles.userTypeSelectorArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User Type Modal */}
        <Modal
          visible={showUserTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowUserTypeModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowUserTypeModal(false)}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Account Type</Text>
              
              <View style={styles.modalContent}>
                {USER_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.modalOption,
                      accountType === type.value && styles.modalOptionSelected
                    ]}
                    onPress={() => handleUserTypeChange(type.value as 'donor' | 'club')}
                  >
                    {type.value === 'donor' ? (
                      <User size={24} color={accountType === type.value ? '#FFFFFF' : '#DC2626'} />
                    ) : (
                      <Users size={24} color={accountType === type.value ? '#FFFFFF' : '#DC2626'} />
                    )}
                    <Text style={[
                      styles.modalOptionText,
                      accountType === type.value && styles.modalOptionTextSelected
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowUserTypeModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={styles.form}>
          {accountType === 'donor' ? (
            <ValidatedInput
              label="Full Name"
              value={profileData.name}
              onChangeText={(text) => updateProfileField('name', text)}
              onBlur={() => touchProfileField('name')}
              error={profileErrors.name}
              touched={profileTouched.name}
              placeholder="Enter your full name"
              required
            />
          ) : (
            <ValidatedInput
              label="Club Name"
              value={profileData.clubName}
              onChangeText={(text) => updateProfileField('clubName', text)}
              onBlur={() => touchProfileField('clubName')}
              error={profileErrors.clubName}
              touched={profileTouched.clubName}
              placeholder="Enter club name"
              required
            />
          )}

          <ValidatedInput
            label="Phone Number"
            value={profileData.phone}
            onChangeText={(text) => updateProfileField('phone', text)}
            onBlur={() => touchProfileField('phone')}
            error={profileErrors.phone}
            touched={profileTouched.phone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            required
          />

          {accountType === 'donor' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Blood Group <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.bloodGroupGrid}>
                {BLOOD_GROUPS.map((group) => (
                  <TouchableOpacity
                    key={group}
                    style={[
                      styles.bloodGroupChip,
                      profileData.bloodGroup === group &&
                        styles.bloodGroupChipActive,
                    ]}
                    onPress={() => updateProfileField('bloodGroup', group)}
                  >
                    <Text
                      style={[
                        styles.bloodGroupChipText,
                        profileData.bloodGroup === group &&
                          styles.bloodGroupChipTextActive,
                      ]}
                    >
                      {group}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {profileTouched.bloodGroup && profileErrors.bloodGroup && (
                <Text style={styles.errorText}>{profileErrors.bloodGroup}</Text>
              )}
            </View>
          )}

          <LocationSelector
            selectedCountry={profileData.country}
            selectedDistrict={profileData.district}
            selectedPoliceStation={profileData.policeStation}
            onCountryChange={(country) =>
              handleLocationChange('country', country)
            }
            onDistrictChange={(district) =>
              handleLocationChange('district', district)
            }
            onPoliceStationChange={(policeStation) =>
              handleLocationChange('policeStation', policeStation)
            }
            onLocationInputChange={handleLocationChange}
          />

          {accountType === 'club' && (
            <>
              <ValidatedInput
                label="Website (Optional)"
                value={profileData.website}
                onChangeText={(text) => updateProfileField('website', text)}
                placeholder="Enter club website"
                keyboardType="url"
                autoCapitalize="none"
              />

              <ValidatedInput
                label="Description"
                value={profileData.description}
                onChangeText={(text) => updateProfileField('description', text)}
                placeholder="Tell us about your club's mission and activities"
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              isButtonDisabled && styles.completeButtonDisabled,
            ]}
            onPress={handleCompleteProfile}
            disabled={isButtonDisabled}
          >
            <Text style={styles.completeButtonText}>
              {isSubmitting ? 'Setting up profile...' : 'Complete Profile'}
            </Text>
          </TouchableOpacity>

          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              You must complete your profile before you can use the app.
            </Text>
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
  },
  backButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#6B7280',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  accountTypeSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  accountTypeCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  accountTypeCardActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  accountTypeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  accountTypeTextActive: {
    color: '#FFFFFF',
  },
  userTypeSelector: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  userTypeSelectorLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  userTypeSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userTypeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userTypeSelectorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#111827',
  },
  userTypeSelectorArrow: {
    fontFamily: 'Inter-Regular',
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalContent: {
    gap: 12,
    marginBottom: 24,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  modalOptionSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  modalOptionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#374151',
  },
  modalOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalCloseButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    paddingHorizontal: 24,
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#374151',
  },
  required: {
    color: '#EF4444',
  },
  bloodGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodGroupChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center',
  },
  bloodGroupChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  bloodGroupChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#374151',
  },
  bloodGroupChipTextActive: {
    color: '#FFFFFF',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  completeButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  completeButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  warningContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  warningText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#B91C1C',
    lineHeight: 20,
  },
});