import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, CreditCard as Edit3, Settings, Bell, Shield, Globe, LogOut, Heart, Award, Calendar, Phone, Mail, MapPin, Users, ArrowLeft, Camera, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useNotification } from '@/components/NotificationSystem';
import { TextAvatar } from '@/components/TextAvatar';

interface UserStats {
  totalDonations: number;
  joinedClubs: number;
  lastDonation?: string;
}

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: any;
  onSave: (updates: any) => void;
  loading: boolean;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose, profile, onSave, loading }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setWebsite(profile.website || '');
      setDescription(profile.description || '');
    }
  }, [profile]);

  const handleSave = () => {
    const updates: any = {
      name: name.trim(),
      phone: phone.trim(),
    };

    if (profile?.user_type === 'club') {
      updates.website = website.trim();
      updates.description = description.trim();
    }

    onSave(updates);
  };

  const isFormValid = () => {
    return name.trim().length > 0 && phone.trim().length > 0;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalBackButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Phone *</Text>
            <TextInput
              style={styles.modalInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          {profile?.user_type === 'club' && (
            <>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Website</Text>
                <TextInput
                  style={styles.modalInput}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="Enter website URL"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell us about your club"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}

          <TouchableOpacity 
            style={[
              styles.saveButton, 
              (!isFormValid() || loading) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!isFormValid() || loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          <View style={styles.modalNote}>
            <Text style={styles.modalNoteText}>
              * Required fields. Other profile details like location and blood group can be updated through the complete profile flow.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default function ProfileScreen() {
  const { t, currentLanguage, changeLanguage } = useI18n();
  const { user, profile, signOut, updateProfile } = useAuth();
  const { showNotification } = useNotification();
  const [userStats, setUserStats] = useState<UserStats>({
    totalDonations: 0,
    joinedClubs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    if (user && profile) {
      loadUserStats();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      // Load user donations
      const { data: donations, count: donationCount } = await supabase
        .from('donations')
        .select('donation_date', { count: 'exact' })
        .eq('donor_id', user.id)
        .order('donation_date', { ascending: false });

      // For clubs, we'll count total members (this would need a proper club membership system)
      // For now, we'll use a placeholder
      const joinedClubs = profile?.user_type === 'club' ? 1 : 0;

      // Get last donation date
      const lastDonation = donations && donations.length > 0 
        ? donations[0].donation_date 
        : undefined;

      setUserStats({
        totalDonations: donationCount || 0,
        joinedClubs,
        lastDonation,
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageToggle = () => {
    const newLanguage = currentLanguage === 'en' ? 'bn' : 'en';
    changeLanguage(newLanguage);
    
    showNotification({
      type: 'success',
      title: 'Language Changed',
      message: `Language switched to ${newLanguage === 'en' ? 'English' : 'বাংলা'}`,
      duration: 3000,
    });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: performSignOut,
        },
      ]
    );
  };

  const performSignOut = async () => {
    if (signOutLoading) {
      console.log('Sign out already in progress, ignoring duplicate request');
      return;
    }

    console.log('Profile: Starting sign out process...');
    setSignOutLoading(true);
    
    try {
      // Show immediate feedback
      showNotification({
        type: 'info',
        title: 'Signing Out',
        message: 'Please wait...',
        duration: 2000,
      });

      // Call the sign out function from AuthProvider
      console.log('Profile: Calling signOut from AuthProvider...');
      await signOut();
      
      console.log('Profile: Sign out successful, showing success notification');
      
      // Show success notification
      showNotification({
        type: 'success',
        title: 'Signed Out',
        message: 'You have been successfully signed out.',
        duration: 3000,
      });

      // Navigate to home tab with a small delay to ensure state is cleared
      console.log('Profile: Navigating to home...');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
      
    } catch (error) {
      console.error('Profile: Sign out error:', error);
      
      showNotification({
        type: 'error',
        title: 'Sign Out Failed',
        message: error instanceof Error ? error.message : 'Failed to sign out. Please try again.',
        duration: 4000,
      });
    } finally {
      setSignOutLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/auth');
  };

  const toggleAvailability = async () => {
    if (!user || !profile || availabilityLoading) return;

    setAvailabilityLoading(true);
    try {
      const newAvailability = !profile.is_available;
      await updateProfile({ is_available: newAvailability });
      
      showNotification({
        type: 'success',
        title: 'Availability Updated',
        message: newAvailability 
          ? 'You are now available for blood donation' 
          : 'You are no longer available for blood donation',
        duration: 4000,
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update availability. Please try again.',
        duration: 4000,
      });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  const handleSaveProfile = async (updates: any) => {
    setProfileUpdateLoading(true);
    try {
      await updateProfile(updates);
      showNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        duration: 3000,
      });
      setEditModalVisible(false);
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update profile. Please try again.',
        duration: 4000,
      });
    } finally {
      setProfileUpdateLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMonths = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (diffInMonths < 1) return 'This month';
    if (diffInMonths === 1) return '1 month ago';
    return `${diffInMonths} months ago`;
  };

  const getLocationDisplay = () => {
    if (!profile) return 'Location not set';
    
    if (profile.country === 'BANGLADESH') {
      const parts = [];
      if (profile.police_station) parts.push(profile.police_station);
      if (profile.district) parts.push(profile.district);
      return parts.length > 0 ? parts.join(', ') : 'Location not complete';
    } else {
      const parts = [];
      if (profile.city) parts.push(profile.city);
      if (profile.state) parts.push(profile.state);
      return parts.length > 0 ? parts.join(', ') : 'Location not complete';
    }
  };

  const getProfileImage = () => {
    // Generate a consistent avatar based on user ID
    const avatarId = user?.id ? parseInt(user.id.slice(-3), 16) % 1000 + 1 : 220453;
    return `https://images.pexels.com/photos/${avatarId}/pexels-photo-${avatarId}.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop`;
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)');
    }
  };

  const renderAvatar = () => {
    if (!imageError) {
      return (
        <Image 
          source={{ uri: getProfileImage() }} 
          style={styles.profileAvatar}
          onError={() => setImageError(true)}
        />
      );
    }
    
    return (
      <TextAvatar 
        name={profile?.name || 'User'} 
        size={100}
      />
    );
  };

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.signInContainer}>
          <Heart size={64} color="#DC2626" />
          <Text style={styles.signInTitle}>Join BloodConnect</Text>
          <Text style={styles.signInSubtitle}>
            Create an account to donate blood, join clubs, and save lives
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
            <Text style={styles.signInButtonText}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signUpButton} onPress={() => router.push('/auth/signup')}>
            <Text style={styles.signUpButtonText}>{t('auth.signUp')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.name.split(' ')[0]}</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Mail size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {renderAvatar()}
            <TouchableOpacity style={styles.cameraButton}>
              <Camera size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            {profile.blood_group && (
              <View style={styles.bloodGroupContainer}>
                <Text style={styles.bloodGroupText}>{profile.blood_group}</Text>
              </View>
            )}
            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <Mail size={14} color="#6B7280" />
                <Text style={styles.contactText}>{profile.email}</Text>
              </View>
              {profile.phone && (
                <View style={styles.contactRow}>
                  <Phone size={14} color="#6B7280" />
                  <Text style={styles.contactText}>{profile.phone}</Text>
                </View>
              )}
              <View style={styles.contactRow}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.contactText}>{getLocationDisplay()}</Text>
              </View>
              {profile.user_type === 'club' && (
                <View style={styles.userTypeBadge}>
                  <Users size={12} color="#FFFFFF" />
                  <Text style={styles.userTypeText}>Club</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Club Description */}
        {profile.user_type === 'club' && profile.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>About</Text>
            <Text style={styles.descriptionText}>{profile.description}</Text>
            {profile.website && (
              <TouchableOpacity style={styles.websiteButton}>
                <Globe size={16} color="#DC2626" />
                <Text style={styles.websiteText}>Visit Website</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Availability Toggle (Donors only) */}
        {profile.user_type === 'donor' && (
          <View style={styles.availabilitySection}>
            <View style={styles.availabilityCard}>
              <View style={styles.availabilityInfo}>
                <Text style={styles.availabilityTitle}>Donation Availability</Text>
                <Text style={styles.availabilitySubtitle}>
                  {profile.is_available 
                    ? 'You are available for donation' 
                    : 'You are not available for donation'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.availabilityToggleContainer}
                onPress={toggleAvailability}
                disabled={availabilityLoading}
              >
                {profile.is_available ? (
                  <ToggleRight size={32} color="#DC2626" />
                ) : (
                  <ToggleLeft size={32} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.statsSection}>
          {loading ? (
            // Loading placeholders
            [1, 2, 3].map((_, index) => (
              <View key={index} style={[styles.statCard, styles.loadingCard]}>
                <View style={styles.loadingIcon} />
                <View style={styles.loadingValue} />
                <View style={styles.loadingLabel} />
              </View>
            ))
          ) : (
            <>
              <View style={styles.statCard}>
                <Heart size={24} color="#DC2626" />
                <Text style={styles.statValue}>{userStats.totalDonations}</Text>
                <Text style={styles.statLabel}>
                  {profile.user_type === 'donor' ? 'Total Donations' : 'Total Drives'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Award size={24} color="#DC2626" />
                <Text style={styles.statValue}>{userStats.joinedClubs}</Text>
                <Text style={styles.statLabel}>
                  {profile.user_type === 'donor' ? 'Clubs Joined' : 'Active Members'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Calendar size={24} color="#DC2626" />
                <Text style={styles.statValue}>
                  {userStats.lastDonation 
                    ? formatTimeAgo(userStats.lastDonation).split(' ')[0]
                    : 'Never'}
                </Text>
                <Text style={styles.statLabel}>
                  {userStats.lastDonation 
                    ? 'Last Donation' 
                    : 'No Donations'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <View style={styles.menuItemLeft}>
              <Edit3 size={20} color="#374151" />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Bell size={20} color="#374151" />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Shield size={20} color="#374151" />
              <Text style={styles.menuItemText}>Privacy</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLanguageToggle}>
            <View style={styles.menuItemLeft}>
              <Globe size={20} color="#374151" />
              <Text style={styles.menuItemText}>Language</Text>
            </View>
            <View style={styles.languageToggle}>
              <Text style={styles.languageText}>
                {currentLanguage === 'en' ? 'English' : 'বাংলা'}
              </Text>
              <ChevronRight size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Settings size={20} color="#374151" />
              <Text style={styles.menuItemText}>Settings</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <TouchableOpacity 
            style={[
              styles.signOutButton,
              signOutLoading && styles.signOutButtonDisabled
            ]} 
            onPress={handleSignOut}
            disabled={signOutLoading}
          >
            <LogOut size={20} color={signOutLoading ? "#9CA3AF" : "#EF4444"} />
            <Text style={[
              styles.signOutText,
              signOutLoading && styles.signOutTextDisabled
            ]}>
              {signOutLoading ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appInfoText}>BloodConnect v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Connecting hearts, saving lives</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        profile={profile}
        onSave={handleSaveProfile}
        loading={profileUpdateLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  signInTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    textAlign: 'center',
  },
  signInSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  signInButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  signInButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
    width: '100%',
    alignItems: 'center',
  },
  signUpButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#DC2626',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    textAlign: 'center',
  },
  bloodGroupContainer: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bloodGroupText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  contactInfo: {
    alignItems: 'center',
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  userTypeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  descriptionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  descriptionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  descriptionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
  },
  websiteText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#DC2626',
  },
  availabilitySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  availabilityCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityInfo: {
    flex: 1,
  },
  availabilityTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  availabilitySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  availabilityToggleContainer: {
    padding: 4,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  loadingCard: {
    backgroundColor: '#F3F4F6',
  },
  loadingIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
  },
  loadingValue: {
    width: 32,
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  loadingLabel: {
    width: 60,
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#111827',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#374151',
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#DC2626',
  },
  signOutSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  signOutButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  signOutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#EF4444',
  },
  signOutTextDisabled: {
    color: '#9CA3AF',
  },
  appInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 4,
  },
  appInfoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  appInfoSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#D1D5DB',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalNote: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalNoteText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});