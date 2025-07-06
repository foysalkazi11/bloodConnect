import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  CreditCard as Edit3,
  Settings,
  Bell,
  Shield,
  Globe,
  LogOut,
  Heart,
  Award,
  Users as UsersIcon,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Users as UsersMultiple,
  ArrowLeft,
  Camera,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Megaphone,
  CircleCheck,
  CircleX,
  MessageCircle,
} from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useNotification } from '@/components/NotificationSystem';
import { TextAvatar } from '@/components/TextAvatar';
import { colors } from '@/components/theme';

interface UserStats {
  totalDonations: number;
  joinedClubs: number;
  lastDonation?: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  blood_group?: string;
  message?: string;
  created_at: string;
}

interface ClubMember {
  id: string;
  name: string;
  email: string;
  blood_group?: string;
  role: 'admin' | 'moderator' | 'member';
  joined_date: string;
  is_online: boolean;
}

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: any;
  onSave: (updates: any) => void;
  loading: boolean;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  profile,
  onSave,
  loading,
}) => {
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

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
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
              (!isFormValid() || loading) && styles.saveButtonDisabled,
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
              * Required fields. Other profile details like location and blood
              group can be updated through the complete profile flow.
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
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  
  // Club-specific states
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user && profile) {
      loadUserStats();
      
      // If user is a club, load club-specific data
      if (profile.user_type === 'club') {
        loadClubData();
      }
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (user && profile) {
      loadUserStats();
      if (profile.user_type === 'club') {
        loadClubData();
      }
    }
    setRefreshing(false);
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
      const lastDonation =
        donations && donations.length > 0
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

  const loadClubData = async () => {
    if (!user || profile?.user_type !== 'club') return;
    
    try {
      // Load pending join requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('club_join_requests')
        .select(`
          id,
          user_id,
          message,
          created_at,
          user_profiles:user_id(
            name,
            email,
            blood_group
          )
        `)
        .eq('club_id', user.id)
        .eq('status', 'pending');
      
      if (requestsError) throw requestsError;
      
      // Format request data
      const formattedRequests: JoinRequest[] = (requestsData || []).map(request => ({
        id: request.id,
        user_id: request.user_id,
        user_name: request.user_profiles?.name || 'Unknown User',
        user_email: request.user_profiles?.email || '',
        blood_group: request.user_profiles?.blood_group,
        message: request.message,
        created_at: request.created_at,
      }));
      
      setJoinRequests(formattedRequests);
      setPendingRequestsCount(formattedRequests.length);
      
      // Load club members
      const { data: membersData, error: membersError } = await supabase
        .from('club_members')
        .select(`
          id,
          role,
          joined_at,
          user_profiles:member_id(
            id,
            name,
            email,
            blood_group
          )
        `)
        .eq('club_id', user.id)
        .eq('is_active', true);
      
      if (membersError) throw membersError;
      
      // Format member data
      const formattedMembers: ClubMember[] = (membersData || []).map(member => ({
        id: member.user_profiles.id,
        name: member.user_profiles.name,
        email: member.user_profiles.email,
        blood_group: member.user_profiles.blood_group,
        role: member.role,
        joined_date: member.joined_at,
        is_online: Math.random() > 0.7, // Random for demo
      }));
      
      setClubMembers(formattedMembers);
      
      // Check if current user is admin
      const isUserAdmin = membersData?.some(
        member => member.user_profiles.id === user.id && ['admin', 'moderator'].includes(member.role)
      ) || true; // Default to true for now since club owner should be admin
      
      setIsAdmin(isUserAdmin);
      
    } catch (error) {
      console.error('Error loading club data:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load club data',
        duration: 4000,
      });
    }
  };

  const handleJoinRequest = async (requestId: string, userId: string, approved: boolean) => {
    try {
      setActionLoading(requestId);
      
      // Update request status
      const { error } = await supabase
        .from('club_join_requests')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      // Update local state
      setJoinRequests(joinRequests.filter(request => request.id !== requestId));
      setPendingRequestsCount(prev => prev - 1);
      
      // If approved, add to members list
      if (approved) {
        // The trigger will handle adding the member to club_members
        // We'll reload the members list to show the new member
        await loadClubData();
      }
      
      showNotification({
        type: 'success',
        title: approved ? 'Request Approved' : 'Request Rejected',
        message: approved ? 'User has been added to the club' : 'Join request has been rejected',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error handling join request:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to process join request',
        duration: 4000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLanguageToggle = () => {
    const newLanguage = currentLanguage === 'en' ? 'bn' : 'en';
    changeLanguage(newLanguage);

    showNotification({
      type: 'success',
      title: 'Language Changed',
      message: `Language switched to ${
        newLanguage === 'en' ? 'English' : 'বাংলা'
      }`,
      duration: 3000,
    });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: performSignOut,
      },
    ]);
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
        message:
          error instanceof Error
            ? error.message
            : 'Failed to sign out. Please try again.',
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
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMonths = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

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
    const avatarId = user?.id
      ? (parseInt(user.id.slice(-3), 16) % 1000) + 1
      : 220453;
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

    return <TextAvatar name={profile?.name || 'User'} size={100} />;
  };

  const navigateToSection = (section: string) => {
    router.push(`/(tabs)/clubs/${user?.id}/${section}`);
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
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.signUpButtonText}>{t('auth.signUp')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render club profile
  if (profile.user_type === 'club') {
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

        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
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
              <View style={styles.userTypeBadge}>
                <UsersMultiple size={12} color="#FFFFFF" />
                <Text style={styles.userTypeText}>Club</Text>
              </View>
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
              </View>
            </View>
          </View>

          {/* Club Description */}
          {profile.description && (
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
                  <Text style={styles.statLabel}>Total Drives</Text>
                </View>
                <View style={styles.statCard}>
                  <UsersIcon size={24} color="#DC2626" />
                  <Text style={styles.statValue}>{clubMembers.length}</Text>
                  <Text style={styles.statLabel}>Active Members</Text>
                </View>
                <View style={styles.statCard}>
                  <Calendar size={24} color="#DC2626" />
                  <Text style={styles.statValue}>
                    {userStats.lastDonation
                      ? formatTimeAgo(userStats.lastDonation).split(' ')[0]
                      : 'Never'}
                  </Text>
                  <Text style={styles.statLabel}>
                    {userStats.lastDonation ? 'Last Drive' : 'No Drives'}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Pending Join Requests Section */}
          {pendingRequestsCount > 0 && (
            <View style={styles.joinRequestsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending Join Requests</Text>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => setShowJoinRequestsModal(true)}
                >
                  <Text style={styles.viewAllText}>View All ({pendingRequestsCount})</Text>
                </TouchableOpacity>
              </View>
              
              {joinRequests.slice(0, 2).map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <TextAvatar name={request.user_name} size={40} />
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.user_name}</Text>
                      <Text style={styles.requestTime}>Requested {formatTimeAgo(request.created_at)}</Text>
                    </View>
                    {request.blood_group && (
                      <View style={styles.bloodGroupBadge}>
                        <Text style={styles.bloodGroupText}>{request.blood_group}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                      style={[styles.rejectButton, actionLoading === request.id && styles.actionButtonDisabled]}
                      onPress={() => handleJoinRequest(request.id, request.user_id, false)}
                      disabled={actionLoading !== null}
                    >
                      <CircleX size={16} color="#EF4444" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.approveButton, actionLoading === request.id && styles.actionButtonDisabled]}
                      onPress={() => handleJoinRequest(request.id, request.user_id, true)}
                      disabled={actionLoading !== null}
                    >
                      <CircleCheck size={16} color="#FFFFFF" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              
              {pendingRequestsCount > 2 && (
                <TouchableOpacity 
                  style={styles.viewMoreButton}
                  onPress={() => setShowJoinRequestsModal(true)}
                >
                  <Text style={styles.viewMoreText}>View {pendingRequestsCount - 2} more requests</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Club Management Section */}
          <View style={styles.clubManagementSection}>
            <Text style={styles.sectionTitle}>Club Management</Text>
            
            <View style={styles.managementGrid}>
              <TouchableOpacity 
                style={styles.managementCard}
                onPress={() => navigateToSection('members')}
              >
                <UsersIcon size={24} color="#DC2626" />
                <Text style={styles.managementCardTitle}>Members</Text>
                <Text style={styles.managementCardSubtitle}>{clubMembers.length} active</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.managementCard}
                onPress={() => navigateToSection('announcements')}
              >
                <Megaphone size={24} color="#DC2626" />
                <Text style={styles.managementCardTitle}>Announcements</Text>
                <Text style={styles.managementCardSubtitle}>Post updates</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.managementCard}
                onPress={() => navigateToSection('events')}
              >
                <Calendar size={24} color="#DC2626" />
                <Text style={styles.managementCardTitle}>Events</Text>
                <Text style={styles.managementCardSubtitle}>Manage drives</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.managementCard}
                onPress={() => navigateToSection('chat')}
              >
                <MessageCircle size={24} color="#DC2626" />
                <Text style={styles.managementCardTitle}>Chat</Text>
                <Text style={styles.managementCardSubtitle}>Communicate</Text>
              </TouchableOpacity>
            </View>
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

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLanguageToggle}
            >
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
                signOutLoading && styles.signOutButtonDisabled,
              ]}
              onPress={performSignOut}
              disabled={signOutLoading}
            >
              <LogOut size={20} color={signOutLoading ? '#9CA3AF' : '#EF4444'} />
              <Text
                style={[
                  styles.signOutText,
                  signOutLoading && styles.signOutTextDisabled,
                ]}
              >
                {signOutLoading ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfoSection}>
            <Text style={styles.appInfoText}>BloodConnect v1.0.0</Text>
            <Text style={styles.appInfoSubtext}>
              Connecting hearts, saving lives
            </Text>
          </View>
        </ScrollView>

        {/* Join Requests Modal */}
        <Modal
          visible={showJoinRequestsModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowJoinRequestsModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowJoinRequestsModal(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Join Requests</Text>
              <View style={styles.headerRight} />
            </View>

            <ScrollView style={styles.modalContent}>
              {joinRequests.length === 0 ? (
                <View style={styles.noRequests}>
                  <UserPlus size={48} color="#D1D5DB" />
                  <Text style={styles.noRequestsText}>No pending join requests</Text>
                </View>
              ) : (
                joinRequests.map(request => (
                  <View key={request.id} style={styles.requestCard}>
                    {actionLoading === request.id ? (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color="#DC2626" />
                      </View>
                    ) : null}
                    
                    <View style={styles.requestHeader}>
                      <TextAvatar name={request.user_name} size={48} />
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestName}>{request.user_name}</Text>
                        <Text style={styles.requestEmail}>{request.user_email}</Text>
                        {request.blood_group && (
                          <View style={styles.bloodGroupBadge}>
                            <Text style={styles.bloodGroupText}>{request.blood_group}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    {request.message && (
                      <View style={styles.requestMessage}>
                        <Text style={styles.requestMessageText}>{request.message}</Text>
                      </View>
                    )}
                    
                    <View style={styles.requestTime}>
                      <Text style={styles.requestTimeText}>
                        Requested {formatTimeAgo(request.created_at)}
                      </Text>
                    </View>
                    
                    <View style={styles.requestActions}>
                      <TouchableOpacity 
                        style={[styles.rejectButton, actionLoading !== null && styles.actionButtonDisabled]}
                        onPress={() => handleJoinRequest(request.id, request.user_id, false)}
                        disabled={actionLoading !== null}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.approveButton, actionLoading !== null && styles.actionButtonDisabled]}
                        onPress={() => handleJoinRequest(request.id, request.user_id, true)}
                        disabled={actionLoading !== null}
                      >
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

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

  // Render donor profile (default)
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

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
              <View style={styles.userTypeBadge}>
                <User size={12} color="#FFFFFF" />
                <Text style={styles.userTypeText}>Donor</Text>
              </View>
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
                <Text style={styles.availabilityTitle}>
                  Donation Availability
                </Text>
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
                  {profile.user_type === 'donor'
                    ? 'Total Donations'
                    : 'Total Drives'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Award size={24} color="#DC2626" />
                <Text style={styles.statValue}>{userStats.joinedClubs}</Text>
                <Text style={styles.statLabel}>
                  {profile.user_type === 'donor'
                    ? 'Clubs Joined'
                    : 'Active Members'}
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
                  {userStats.lastDonation ? 'Last Donation' : 'No Donations'}
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

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLanguageToggle}
          >
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
              signOutLoading && styles.signOutButtonDisabled,
            ]}
            onPress={performSignOut}
            disabled={signOutLoading}
          >
            <LogOut size={20} color={signOutLoading ? '#9CA3AF' : '#EF4444'} />
            <Text
              style={[
                styles.signOutText,
                signOutLoading && styles.signOutTextDisabled,
              ]}
            >
              {signOutLoading ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appInfoText}>BloodConnect v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>
            Connecting hearts, saving lives
          </Text>
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
    backgroundColor: '#DC2626',
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
  // Join Requests Section
  joinRequestsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  viewAllButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewAllText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#374151',
  },
  requestCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  requestEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  requestTime: {
    marginBottom: 12,
  },
  requestTimeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  requestMessage: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  requestMessageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  rejectButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#EF4444',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  approveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  viewMoreButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewMoreText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#374151',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  noRequests: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noRequestsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
  },
  bloodGroupBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bloodGroupText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  // Club Management Section
  clubManagementSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  managementCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  managementCardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  managementCardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
