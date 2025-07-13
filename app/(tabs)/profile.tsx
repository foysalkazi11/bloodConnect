import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text as RNText,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
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
  Calendar as CalendarIcon,
  Phone,
  Mail,
  MapPin,
  Users as UsersMultiple,
  ArrowLeft,
  Camera,
  ChevronRight,
  ToggleLeft as ToggleLeftIcon,
  ToggleRight as ToggleRightIcon,
  UserPlus,
  Megaphone,
  CircleCheck,
  CircleX,
  MessageCircle,
  BellRing as BellIcon,
  Users,
} from 'lucide-react-native';
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

interface ClubEvent {
  id: string;
  title: string;
  start_time: string;
  location: string;
  attendees_count: number;
}

interface ClubAnnouncement {
  id: string;
  title: string;
  created_at: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
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
          <RNText style={styles.modalTitle}>Edit Profile</RNText>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalSection}>
            <RNText style={styles.modalLabel}>Name *</RNText>
            <TextInput
              style={styles.modalInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.modalSection}>
            <RNText style={styles.modalLabel}>Phone *</RNText>
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
                <RNText style={styles.modalLabel}>Website</RNText>
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
                <RNText style={styles.modalLabel}>Description</RNText>
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
            <RNText style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </RNText>
          </TouchableOpacity>

          <View style={styles.modalNote}>
            <RNText style={styles.modalNoteText}>
              * Required fields. Other profile details like location and blood
              group can be updated through the complete profile flow.
            </RNText>
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

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Club-specific states
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user && profile) {
      loadUserStats();

      // Load club-specific data if user is a club
      if (profile.user_type === 'club') {
        loadJoinRequests();
        loadClubMembers();
        loadClubEvents();
        loadClubAnnouncements();
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
        loadJoinRequests();
        loadClubMembers();
        loadClubEvents();
        loadClubAnnouncements();
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
        .select(
          `
          id,
          user_id,
          message,
          created_at,
          user_profiles:user_id(
            name,
            email,
            blood_group
          )
        `
        )
        .eq('club_id', user.id)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      // Format request data
      const formattedRequests: JoinRequest[] = (requestsData || []).map(
        (request) => ({
          id: request.id,
          user_id: request.user_id,
          user_name: request.user_profiles[0]?.name || 'Unknown User',
          user_email: request.user_profiles[0]?.email || '',
          blood_group: request.user_profiles[0]?.blood_group || 'A+',
          message: request.message,
          created_at: request.created_at,
        })
      );

      setJoinRequests(formattedRequests);
      setPendingRequestsCount(formattedRequests.length);

      // Load club members
      const { data: membersData, error: membersError } = await supabase
        .from('club_members')
        .select(
          `
          id,
          role,
          joined_at,
          user_profiles:member_id(
            id,
            name,
            email,
            blood_group
          )
        `
        )
        .eq('club_id', user.id)
        .eq('is_active', true);

      if (membersError) throw membersError;

      // Format member data
      const formattedMembers: ClubMember[] = (membersData || []).map(
        (member) => ({
          id: member.user_profiles[0]?.id,
          name: member.user_profiles[0]?.name,
          email: member.user_profiles[0]?.email,
          blood_group: member.user_profiles[0]?.blood_group,
          role: member.role,
          joined_date: member.joined_at,
          is_online: Math.random() > 0.7, // Random for demo
        })
      );

      setClubMembers(formattedMembers);

      // Check if current user is admin
      const isUserAdmin =
        membersData?.some(
          (member) =>
            member.user_profiles[0]?.id === user.id &&
            ['admin', 'moderator'].includes(member.role)
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

  const loadJoinRequests = async () => {
    if (!user || profile?.user_type !== 'club') return;

    try {
      setLoadingRequests(true);

      // Fetch pending join requests
      const { data, error } = await supabase
        .from('club_join_requests')
        .select(
          `
          id,
          user_id,
          message,
          created_at,
          user_profiles:user_id(
            name,
            email,
            blood_group
          )
        `
        )
        .eq('club_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      // Format request data
      const formattedRequests: JoinRequest[] = data.map((request) => ({
        id: request.id,
        user_id: request.user_id,
        user_name: request.user_profiles[0]?.name,
        user_email: request.user_profiles[0]?.email,
        blood_group: request.user_profiles[0]?.blood_group,
        message: request.message,
        created_at: request.created_at,
      }));

      setJoinRequests(formattedRequests);
    } catch (error) {
      console.error('Error loading join requests:', error);

      // Use mock data as fallback
      const mockRequests: JoinRequest[] = [
        {
          id: 'req1',
          user_id: 'user1',
          user_name: 'Ahmed Rahman',
          user_email: 'ahmed@example.com',
          blood_group: 'O+',
          message:
            'I would like to join your club to help with blood donation drives.',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'req2',
          user_id: 'user2',
          user_name: 'Fatima Khan',
          user_email: 'fatima@example.com',
          blood_group: 'A+',
          message:
            'I am a regular donor and would like to be part of your community.',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      setJoinRequests(mockRequests);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadClubMembers = async () => {
    if (!user || profile?.user_type !== 'club') return;

    try {
      setLoadingMembers(true);

      // Fetch club members
      const { data, error } = await supabase
        .from('club_members')
        .select(
          `
          id,
          role,
          joined_at,
          user_profiles:member_id(
            id,
            name,
            email,
            blood_group
          )
        `
        )
        .eq('club_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      // Format member data
      const formattedMembers: ClubMember[] = data.map((member) => ({
        id: member.user_profiles[0]?.id || '',
        name: member.user_profiles[0]?.name,
        email: member.user_profiles[0]?.email,
        blood_group: member.user_profiles[0]?.blood_group,
        role: member.role,
        joined_date: member.joined_at,
        is_online: Math.random() > 0.7, // Random for demo
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error loading members:', error);

      // Use mock data as fallback
      const mockMembers: ClubMember[] = [
        {
          id: 'mem1',
          name: 'Rahul Ahmed',
          email: 'rahul@example.com',
          blood_group: 'B+',
          role: 'admin',
          joined_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          is_online: true,
        },
        {
          id: 'mem2',
          name: 'Nusrat Jahan',
          email: 'nusrat@example.com',
          blood_group: 'AB-',
          role: 'member',
          joined_date: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          is_online: false,
        },
      ];

      setMembers(mockMembers);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadClubEvents = async () => {
    if (!user || profile?.user_type !== 'club') return;

    try {
      setLoadingEvents(true);

      // Fetch club events
      const { data, error } = await supabase
        .from('club_events')
        .select('id, title, start_time, location')
        .eq('club_id', user.id)
        .order('start_time', { ascending: true })
        .limit(5);
      console.log('club events', { data, error });
      if (error) throw error;

      // Get attendee counts for each event
      const eventIds = data.map((event) => event.id);
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('club_event_attendees')
        .select('event_id, count')
        .in('event_id', eventIds)
        .eq('status', 'going')
        .group('event_id');
      console.log('attendeesData', { attendeesData, attendeesError });
      if (attendeesError) throw attendeesError;

      // Create a map of event ID to attendee count
      const attendeeCounts: Record<string, number> = {};
      attendeesData?.forEach((item) => {
        attendeeCounts[item.event_id] = parseInt(item.count.toString());
      });

      // Format event data
      const formattedEvents: ClubEvent[] = data.map((event) => ({
        id: event.id,
        title: event.title,
        start_time: event.start_time,
        location: event.location,
        attendees_count: attendeeCounts[event.id] || 0,
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error loading events:', error);

      // Use mock data as fallback
      const mockEvents: ClubEvent[] = [
        {
          id: 'evt1',
          title: 'Emergency Blood Drive',
          start_time: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          location: 'Dhaka Medical College',
          attendees_count: 15,
        },
        {
          id: 'evt2',
          title: 'Monthly Club Meeting',
          start_time: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          location: 'Club Office',
          attendees_count: 8,
        },
      ];

      setEvents(mockEvents);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadClubAnnouncements = async () => {
    if (!user || profile?.user_type !== 'club') return;

    try {
      setLoadingAnnouncements(true);

      // Fetch club announcements
      const { data, error } = await supabase
        .from('club_announcements')
        .select('id, title, created_at, priority')
        .eq('club_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Format announcement data
      const formattedAnnouncements: ClubAnnouncement[] = data.map(
        (announcement) => ({
          id: announcement.id,
          title: announcement.title,
          created_at: announcement.created_at,
          priority: announcement.priority,
        })
      );

      setAnnouncements(formattedAnnouncements);
    } catch (error) {
      console.error('Error loading announcements:', error);

      // Use mock data as fallback
      const mockAnnouncements: ClubAnnouncement[] = [
        {
          id: 'ann1',
          title: 'Urgent: Blood Needed for Surgery',
          created_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
          priority: 'urgent',
        },
        {
          id: 'ann2',
          title: 'New Donation Guidelines',
          created_at: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000
          ).toISOString(),
          priority: 'medium',
        },
      ];

      setAnnouncements(mockAnnouncements);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleJoinRequest = async (
    requestId: string,
    userId: string,
    approved: boolean
  ) => {
    try {
      setActionLoading(requestId);

      // Update request status
      const { error } = await supabase
        .from('club_join_requests')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setJoinRequests(
        joinRequests.filter((request) => request.id !== requestId)
      );
      setPendingRequestsCount((prev) => prev - 1);

      // If approved, add to members list
      if (approved) {
        // The trigger will handle adding the member to club_members
        // We'll reload the members list to show the new member
        await loadClubData();
      }

      showNotification({
        type: 'success',
        title: approved ? 'Request Approved' : 'Request Rejected',
        message: approved
          ? 'User has been added to the club'
          : 'Join request has been rejected',
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

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the club?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(memberId);

              // Set member as inactive
              const { error } = await supabase
                .from('club_members')
                .update({ is_active: false })
                .eq('club_id', user?.id)
                .eq('member_id', memberId);

              if (error) throw error;

              // Update local state
              setMembers(members.filter((member) => member.id !== memberId));

              showNotification({
                type: 'success',
                title: 'Member Removed',
                message: `${memberName} has been removed from the club`,
                duration: 3000,
              });
            } catch (error) {
              console.error('Error removing member:', error);
              showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to remove member',
                duration: 4000,
              });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handlePromoteMember = async (memberId: string, memberName: string) => {
    try {
      setActionLoading(memberId);

      // Update member role
      const { error } = await supabase
        .from('club_members')
        .update({ role: 'moderator' })
        .eq('club_id', user?.id)
        .eq('member_id', memberId);

      if (error) throw error;

      // Update local state
      setMembers(
        members.map((member) =>
          member.id === memberId
            ? { ...member, role: 'moderator' as const }
            : member
        )
      );

      showNotification({
        type: 'success',
        title: 'Member Promoted',
        message: `${memberName} has been promoted to moderator`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error promoting member:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to promote member',
        duration: 4000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const navigateToSection = (section: string) => {
    if (!user) return;

    router.push(`/(tabs)/clubs/${user.id}/${section}`);
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

  const formatTimeAgo2 = (dateString: string) => {
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <RNText style={styles.headerTitle}>Profile</RNText>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.signInContainer}>
          <Heart size={64} color="#DC2626" />
          <RNText style={styles.signInTitle}>Join BloodConnect</RNText>
          <RNText style={styles.signInSubtitle}>
            Create an account to donate blood, join clubs, and save lives
          </RNText>
          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
            <RNText style={styles.signInButtonText}>{t('auth.signIn')}</RNText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push('/auth/signup')}
          >
            <RNText style={styles.signUpButtonText}>{t('auth.signUp')}</RNText>
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
          <RNText style={styles.headerTitle}>
            {profile.name.split(' ')[0]}
          </RNText>
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
              <RNText style={styles.profileName}>{profile.name}</RNText>
              <View style={styles.userTypeBadge}>
                <UsersMultiple size={12} color="#FFFFFF" />
                <RNText style={styles.userTypeText}>Club</RNText>
              </View>
              <View style={styles.contactInfo}>
                <View style={styles.contactRow}>
                  <Mail size={14} color="#6B7280" />
                  <RNText style={styles.contactText}>{profile.email}</RNText>
                </View>
                {profile.phone && (
                  <View style={styles.contactRow}>
                    <Phone size={14} color="#6B7280" />
                    <RNText style={styles.contactText}>{profile.phone}</RNText>
                  </View>
                )}
                <View style={styles.contactRow}>
                  <MapPin size={14} color="#6B7280" />
                  <RNText style={styles.contactText}>
                    {getLocationDisplay()}
                  </RNText>
                </View>
              </View>
            </View>
          </View>

          {/* Club Description */}
          {profile.description && (
            <View style={styles.descriptionSection}>
              <RNText style={styles.descriptionTitle}>About</RNText>
              <RNText style={styles.descriptionText}>
                {profile.description}
              </RNText>
              {profile.website && (
                <TouchableOpacity style={styles.websiteButton}>
                  <Globe size={16} color="#DC2626" />
                  <RNText style={styles.websiteText}>Visit Website</RNText>
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
                  <RNText style={styles.statValue}>
                    {userStats.totalDonations}
                  </RNText>
                  <RNText style={styles.statLabel}>Total Drives</RNText>
                </View>
                <View style={styles.statCard}>
                  <UsersIcon size={24} color="#DC2626" />
                  <RNText style={styles.statValue}>{clubMembers.length}</RNText>
                  <RNText style={styles.statLabel}>Active Members</RNText>
                </View>
                <View style={styles.statCard}>
                  <CalendarIcon size={24} color="#DC2626" />
                  <RNText style={styles.statValue}>
                    {userStats.lastDonation
                      ? formatTimeAgo2(userStats.lastDonation).split(' ')[0]
                      : 'Never'}
                  </RNText>
                  <RNText style={styles.statLabel}>
                    {userStats.lastDonation ? 'Last Drive' : 'No Drives'}
                  </RNText>
                </View>
              </>
            )}
          </View>

          {/* Pending Join Requests Section */}
          {pendingRequestsCount > 0 && (
            <View style={styles.joinRequestsSection}>
              <View style={styles.sectionHeader}>
                <RNText style={styles.sectionTitle}>
                  Pending Join Requests
                </RNText>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setShowJoinRequestsModal(true)}
                >
                  <RNText style={styles.viewAllText}>
                    View All ({pendingRequestsCount})
                  </RNText>
                </TouchableOpacity>
              </View>

              {joinRequests.slice(0, 2).map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <TextAvatar name={request.user_name} size={40} />
                    <View style={styles.requestInfo}>
                      <RNText style={styles.requestName}>
                        {request.user_name}
                      </RNText>
                      <RNText style={styles.requestTime}>
                        Requested {formatTimeAgo(request.created_at)}
                      </RNText>
                    </View>
                    {request.blood_group && (
                      <View style={styles.bloodGroupBadge}>
                        <RNText style={styles.bloodGroupText}>
                          {request.blood_group}
                        </RNText>
                      </View>
                    )}
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[
                        styles.rejectButton,
                        actionLoading === request.id &&
                          styles.actionButtonDisabled,
                      ]}
                      onPress={() =>
                        handleJoinRequest(request.id, request.user_id, false)
                      }
                      disabled={actionLoading !== null}
                    >
                      <CircleX size={16} color="#EF4444" />
                      <RNText style={styles.rejectButtonText}>Reject</RNText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.approveButton,
                        actionLoading === request.id &&
                          styles.actionButtonDisabled,
                      ]}
                      onPress={() =>
                        handleJoinRequest(request.id, request.user_id, true)
                      }
                      disabled={actionLoading !== null}
                    >
                      <CircleCheck size={16} color="#FFFFFF" />
                      <RNText style={styles.approveButtonText}>Approve</RNText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {pendingRequestsCount > 2 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => setShowJoinRequestsModal(true)}
                >
                  <RNText style={styles.viewMoreText}>
                    View {pendingRequestsCount - 2} more requests
                  </RNText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Club Management Section */}
          <View style={styles.clubManagementSection}>
            <RNText style={styles.sectionTitle}>Club Management</RNText>

            <View style={styles.managementGrid}>
              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => navigateToSection('members')}
              >
                <UsersIcon size={24} color="#DC2626" />
                <RNText style={styles.managementCardTitle}>Members</RNText>
                <RNText style={styles.managementCardSubtitle}>
                  {clubMembers.length} active
                </RNText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => navigateToSection('announcements')}
              >
                <Megaphone size={24} color="#DC2626" />
                <RNText style={styles.managementCardTitle}>
                  Announcements
                </RNText>
                <RNText style={styles.managementCardSubtitle}>
                  Post updates
                </RNText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => navigateToSection('events')}
              >
                <CalendarIcon size={24} color="#DC2626" />
                <RNText style={styles.managementCardTitle}>Events</RNText>
                <RNText style={styles.managementCardSubtitle}>
                  Manage drives
                </RNText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => navigateToSection('chat')}
              >
                <MessageCircle size={24} color="#DC2626" />
                <RNText style={styles.managementCardTitle}>Chat</RNText>
                <RNText style={styles.managementCardSubtitle}>
                  Communicate
                </RNText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu Options */}
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditProfile}
            >
              <View style={styles.menuItemLeft}>
                <Edit3 size={20} color="#374151" />
                <RNText style={styles.menuItemText}>Edit Profile</RNText>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <BellIcon size={20} color="#374151" />
                <RNText style={styles.menuItemText}>Notifications</RNText>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Shield size={20} color="#374151" />
                <RNText style={styles.menuItemText}>Privacy</RNText>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLanguageToggle}
            >
              <View style={styles.menuItemLeft}>
                <Globe size={20} color="#374151" />
                <RNText style={styles.menuItemText}>Language</RNText>
              </View>
              <View style={styles.languageToggle}>
                <RNText style={styles.languageText}>
                  {currentLanguage === 'en' ? 'English' : 'বাংলা'}
                </RNText>
                <ChevronRight size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Settings size={20} color="#374151" />
                <RNText style={styles.menuItemText}>Settings</RNText>
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
              <LogOut
                size={20}
                color={signOutLoading ? '#9CA3AF' : '#EF4444'}
              />
              <RNText
                style={[
                  styles.signOutText,
                  signOutLoading && styles.signOutTextDisabled,
                ]}
              >
                {signOutLoading ? 'Signing Out...' : 'Sign Out'}
              </RNText>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfoSection}>
            <RNText style={styles.appInfoText}>BloodConnect v1.0.0</RNText>
            <RNText style={styles.appInfoSubtext}>
              Connecting hearts, saving lives
            </RNText>
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
                <RNText style={styles.modalCancelText}>Close</RNText>
              </TouchableOpacity>
              <RNText style={styles.modalTitle}>Join Requests</RNText>
              <View style={styles.headerRight} />
            </View>

            <ScrollView style={styles.modalContent}>
              {joinRequests.length === 0 ? (
                <View style={styles.noRequests}>
                  <UserPlus size={48} color="#D1D5DB" />
                  <RNText style={styles.noRequestsText}>
                    No pending join requests
                  </RNText>
                </View>
              ) : (
                joinRequests.map((request) => (
                  <View key={request.id} style={styles.requestCard}>
                    {actionLoading === request.id ? (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color="#DC2626" />
                      </View>
                    ) : null}

                    <View style={styles.requestHeader}>
                      <TextAvatar name={request.user_name} size={48} />
                      <View style={styles.requestInfo}>
                        <RNText style={styles.requestName}>
                          {request.user_name}
                        </RNText>
                        <RNText style={styles.requestEmail}>
                          {request.user_email}
                        </RNText>
                        {request.blood_group && (
                          <View style={styles.bloodGroupBadge}>
                            <RNText style={styles.bloodGroupText}>
                              {request.blood_group}
                            </RNText>
                          </View>
                        )}
                      </View>
                    </View>

                    {request.message && (
                      <View style={styles.requestMessage}>
                        <RNText style={styles.requestMessageText}>
                          {request.message}
                        </RNText>
                      </View>
                    )}

                    <View style={styles.requestTime}>
                      <RNText style={styles.requestTimeText}>
                        Requested {formatTimeAgo(request.created_at)}
                      </RNText>
                    </View>

                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[
                          styles.rejectButton,
                          actionLoading !== null && styles.actionButtonDisabled,
                        ]}
                        onPress={() =>
                          handleJoinRequest(request.id, request.user_id, false)
                        }
                        disabled={actionLoading !== null}
                      >
                        <RNText style={styles.rejectButtonText}>Reject</RNText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.approveButton,
                          actionLoading !== null && styles.actionButtonDisabled,
                        ]}
                        onPress={() =>
                          handleJoinRequest(request.id, request.user_id, true)
                        }
                        disabled={actionLoading !== null}
                      >
                        <RNText style={styles.approveButtonText}>
                          Approve
                        </RNText>
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
        <RNText style={styles.headerTitle}>{profile.name.split(' ')[0]}</RNText>
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
            <RNText style={styles.profileName}>{profile.name}</RNText>
            {profile.blood_group && (
              <View style={styles.bloodGroupContainer}>
                <RNText style={styles.bloodGroupText}>
                  {profile.blood_group}
                </RNText>
              </View>
            )}
            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <Mail size={14} color="#6B7280" />
                <RNText style={styles.contactText}>{profile.email}</RNText>
              </View>
              {profile.phone && (
                <View style={styles.contactRow}>
                  <Phone size={14} color="#6B7280" />
                  <RNText style={styles.contactText}>{profile.phone}</RNText>
                </View>
              )}
              <View style={styles.contactRow}>
                <MapPin size={14} color="#6B7280" />
                <RNText style={styles.contactText}>
                  {getLocationDisplay()}
                </RNText>
              </View>
              <View style={styles.userTypeBadge}>
                <User size={12} color="#FFFFFF" />
                <RNText style={styles.userTypeText}>Donor</RNText>
              </View>
            </View>
          </View>
        </View>

        {/* Club Description */}
        {profile.user_type === 'club' && profile.description && (
          <View style={styles.descriptionSection}>
            <RNText style={styles.descriptionTitle}>About</RNText>
            <RNText style={styles.descriptionText}>
              {profile.description}
            </RNText>
            {profile.website && (
              <TouchableOpacity style={styles.websiteButton}>
                <Globe size={16} color="#DC2626" />
                <RNText style={styles.websiteText}>Visit Website</RNText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Availability Toggle (Donors only) */}
        {profile.user_type === 'donor' && (
          <View style={styles.availabilitySection}>
            <View style={styles.availabilityCard}>
              <View style={styles.availabilityInfo}>
                <RNText style={styles.availabilityTitle}>
                  Donation Availability
                </RNText>
                <RNText style={styles.availabilitySubtitle}>
                  {profile.is_available
                    ? 'You are available for donation'
                    : 'You are not available for donation'}
                </RNText>
              </View>
              <TouchableOpacity
                style={styles.availabilityToggleContainer}
                onPress={toggleAvailability}
                disabled={availabilityLoading}
              >
                {profile.is_available ? (
                  <ToggleRightIcon size={32} color="#DC2626" />
                ) : (
                  <ToggleLeftIcon size={32} color="#9CA3AF" />
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
                <RNText style={styles.statValue}>
                  {userStats.totalDonations}
                </RNText>
                <RNText style={styles.statLabel}>
                  {profile.user_type === 'donor'
                    ? 'Total Donations'
                    : 'Total Drives'}
                </RNText>
              </View>
              <View style={styles.statCard}>
                <Award size={24} color="#DC2626" />
                <RNText style={styles.statValue}>
                  {userStats.joinedClubs}
                </RNText>
                <RNText style={styles.statLabel}>
                  {profile.user_type === 'donor'
                    ? 'Clubs Joined'
                    : 'Active Members'}
                </RNText>
              </View>
              <View style={styles.statCard}>
                <CalendarIcon size={24} color="#DC2626" />
                <RNText style={styles.statValue}>
                  {userStats.lastDonation
                    ? formatTimeAgo2(userStats.lastDonation).split(' ')[0]
                    : 'Never'}
                </RNText>
                <RNText style={styles.statLabel}>
                  {userStats.lastDonation ? 'Last Donation' : 'No Donations'}
                </RNText>
              </View>
            </>
          )}
        </View>

        {/* Club Management Section - Only for club profiles */}
        {profile.user_type === 'club' && (
          <View style={styles.clubManagementSection}>
            <RNText style={styles.sectionTitle}>Club Management</RNText>

            <View style={styles.managementGrid}>
              {/* Members Management */}
              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => setShowMembersModal(true)}
              >
                <Users size={24} color="#DC2626" />
                <RNText style={styles.managementCardTitle}>Members</RNText>
                <RNText style={styles.managementCardSubtitle}>
                  {members.length} active
                </RNText>
              </TouchableOpacity>

              {/* Announcements */}
              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => setShowAnnouncementsModal(true)}
              >
                <Megaphone size={24} color="#DC2626" />
                <RNText style={styles.managementCardTitle}>
                  Announcements
                </RNText>
                <RNText style={styles.managementCardSubtitle}>
                  Post updates
                </RNText>
              </TouchableOpacity>

              {/* Events */}
              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => setShowEventsModal(true)}
              >
                <CalendarIcon size={24} color="#DC2626" />
                <RNText style={styles.managementCardTitle}>Events</RNText>
                <RNText style={styles.managementCardSubtitle}>
                  Manage drives
                </RNText>
              </TouchableOpacity>

              {/* Chat */}
              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => navigateToSection('chat')}
              >
                <MessageCircle size={24} color="#DC2626" />
                <RNText style={styles.managementCardTitle}>Chat</RNText>
                <RNText style={styles.managementCardSubtitle}>
                  Communicate
                </RNText>
              </TouchableOpacity>
            </View>

            {/* Join Requests Section */}
            {joinRequests.length > 0 && (
              <View style={styles.joinRequestsSection}>
                <View style={styles.joinRequestsHeader}>
                  <RNText style={styles.joinRequestsTitle}>
                    Join Requests
                  </RNText>
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => setShowRequestsModal(true)}
                  >
                    <RNText style={styles.viewAllButtonText}>
                      View All ({joinRequests.length})
                    </RNText>
                  </TouchableOpacity>
                </View>

                {joinRequests.slice(0, 2).map((request) => (
                  <View key={request.id} style={styles.joinRequestItem}>
                    <View style={styles.joinRequestInfo}>
                      <TextAvatar name={request.user_name} size={40} />
                      <View style={styles.joinRequestDetails}>
                        <RNText style={styles.joinRequestName}>
                          {request.user_name}
                        </RNText>
                        <RNText style={styles.joinRequestEmail}>
                          {request.user_email}
                        </RNText>
                        {request.blood_group && (
                          <View style={styles.bloodGroupBadge}>
                            <RNText style={styles.bloodGroupText}>
                              {request.blood_group}
                            </RNText>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.joinRequestActions}>
                      <TouchableOpacity
                        style={[
                          styles.rejectButton,
                          actionLoading === request.id &&
                            styles.actionButtonDisabled,
                        ]}
                        onPress={() =>
                          handleJoinRequest(request.id, request.user_id, false)
                        }
                        disabled={actionLoading !== null}
                      >
                        <CircleX size={20} color="#EF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.approveButton,
                          actionLoading === request.id &&
                            styles.actionButtonDisabled,
                        ]}
                        onPress={() =>
                          handleJoinRequest(request.id, request.user_id, true)
                        }
                        disabled={actionLoading !== null}
                      >
                        <CircleCheck size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Donor-specific sections */}
        {profile.user_type === 'donor' && (
          <View style={styles.donorSection}>
            {/* Availability toggle */}
            <View style={styles.availabilitySection}>
              <View style={styles.availabilityCard}>
                <View style={styles.availabilityInfo}>
                  <RNText style={styles.availabilityTitle}>
                    Donation Availability
                  </RNText>
                  <RNText style={styles.availabilitySubtitle}>
                    {profile.is_available
                      ? 'You are available for donation'
                      : 'You are not available for donation'}
                  </RNText>
                </View>
                <TouchableOpacity
                  style={styles.availabilityToggleContainer}
                  onPress={toggleAvailability}
                  disabled={availabilityLoading}
                >
                  {profile.is_available ? (
                    <ToggleRightIcon size={32} color="#DC2626" />
                  ) : (
                    <ToggleLeftIcon size={32} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <View style={styles.menuItemLeft}>
              <Edit3 size={20} color="#374151" />
              <RNText style={styles.menuItemText}>Edit Profile</RNText>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <BellIcon size={20} color="#374151" />
              <RNText style={styles.menuItemText}>Notifications</RNText>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Shield size={20} color="#374151" />
              <RNText style={styles.menuItemText}>Privacy</RNText>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLanguageToggle}
          >
            <View style={styles.menuItemLeft}>
              <Globe size={20} color="#374151" />
              <RNText style={styles.menuItemText}>Language</RNText>
            </View>
            <View style={styles.languageToggle}>
              <RNText style={styles.languageText}>
                {currentLanguage === 'en' ? 'English' : 'বাংলা'}
              </RNText>
              <ChevronRight size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Settings size={20} color="#374151" />
              <RNText style={styles.menuItemText}>Settings</RNText>
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
            <RNText
              style={[
                styles.signOutText,
                signOutLoading && styles.signOutTextDisabled,
              ]}
            >
              {signOutLoading ? 'Signing Out...' : 'Sign Out'}
            </RNText>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <RNText style={styles.appInfoText}>BloodConnect v1.0.0</RNText>
          <RNText style={styles.appInfoSubtext}>
            Connecting hearts, saving lives
          </RNText>
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

      {/* Join Requests Modal */}
      <Modal
        visible={showRequestsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRequestsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRequestsModal(false)}>
              <RNText style={styles.modalCancelText}>Close</RNText>
            </TouchableOpacity>
            <RNText style={styles.modalTitle}>Join Requests</RNText>
            <View style={styles.headerRight} />
          </View>

          <FlatList
            data={joinRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <UserPlus size={48} color="#D1D5DB" />
                <RNText style={styles.emptyStateTitle}>
                  No pending join requests
                </RNText>
                <RNText style={styles.emptyStateSubtitle}>
                  When users request to join your club, they'll appear here
                </RNText>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.requestCard}>
                {actionLoading === item.id ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#DC2626" />
                  </View>
                ) : null}

                <View style={styles.requestHeader}>
                  <TextAvatar name={item.user_name} size={48} />
                  <View style={styles.requestInfo}>
                    <RNText style={styles.requestName}>{item.user_name}</RNText>
                    <RNText style={styles.requestEmail}>
                      {item.user_email}
                    </RNText>
                    {item.blood_group && (
                      <View style={styles.bloodGroupBadge}>
                        <RNText style={styles.bloodGroupText}>
                          {item.blood_group}
                        </RNText>
                      </View>
                    )}
                  </View>
                </View>

                {item.message && (
                  <View style={styles.requestMessage}>
                    <RNText style={styles.requestMessageText}>
                      {item.message}
                    </RNText>
                  </View>
                )}

                <View style={styles.requestTime}>
                  <RNText style={styles.requestTimeText}>
                    Requested {formatTimeAgo(item.created_at)}
                  </RNText>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[
                      styles.rejectButton,
                      styles.fullRejectButton,
                      actionLoading !== null && styles.actionButtonDisabled,
                    ]}
                    onPress={() =>
                      handleJoinRequest(item.id, item.user_id, false)
                    }
                    disabled={actionLoading !== null}
                  >
                    <RNText style={styles.rejectButtonText}>Reject</RNText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.approveButton,
                      styles.fullApproveButton,
                      actionLoading !== null && styles.actionButtonDisabled,
                    ]}
                    onPress={() =>
                      handleJoinRequest(item.id, item.user_id, true)
                    }
                    disabled={actionLoading !== null}
                  >
                    <RNText style={styles.approveButtonText}>Approve</RNText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Members Modal */}
      <Modal
        visible={showMembersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMembersModal(false)}>
              <RNText style={styles.modalCancelText}>Close</RNText>
            </TouchableOpacity>
            <RNText style={styles.modalTitle}>Club Members</RNText>
            <View style={styles.headerRight} />
          </View>

          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Users size={48} color="#D1D5DB" />
                <RNText style={styles.emptyStateTitle}>No members yet</RNText>
                <RNText style={styles.emptyStateSubtitle}>
                  Approve join requests to add members to your club
                </RNText>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                {actionLoading === item.id ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#DC2626" />
                  </View>
                ) : null}

                <View style={styles.memberInfo}>
                  <View style={styles.avatarContainer}>
                    <TextAvatar name={item.name} size={48} />
                    {item.is_online && <View style={styles.onlineIndicator} />}
                  </View>

                  <View style={styles.memberDetails}>
                    <View style={styles.memberNameRow}>
                      <RNText style={styles.memberName}>{item.name}</RNText>
                      <View
                        style={[
                          styles.roleBadge,
                          {
                            backgroundColor:
                              item.role === 'admin'
                                ? '#F59E0B'
                                : item.role === 'moderator'
                                ? '#3B82F6'
                                : '#6B7280',
                          },
                        ]}
                      >
                        <RNText style={styles.roleText}>{item.role}</RNText>
                      </View>
                    </View>

                    <RNText style={styles.memberEmail}>{item.email}</RNText>

                    {item.blood_group && (
                      <View style={styles.memberBloodGroup}>
                        <RNText style={styles.memberBloodGroupText}>
                          {item.blood_group}
                        </RNText>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions - only show for non-admin members */}
                {item.role !== 'admin' && (
                  <View style={styles.memberActions}>
                    {item.role === 'member' && (
                      <TouchableOpacity
                        style={styles.promoteButton}
                        onPress={() => handlePromoteMember(item.id, item.name)}
                        disabled={actionLoading !== null}
                      >
                        <RNText style={styles.promoteButtonText}>
                          Promote
                        </RNText>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveMember(item.id, item.name)}
                      disabled={actionLoading !== null}
                    >
                      <RNText style={styles.removeButtonText}>Remove</RNText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Events Modal */}
      <Modal
        visible={showEventsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEventsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEventsModal(false)}>
              <RNText style={styles.modalCancelText}>Close</RNText>
            </TouchableOpacity>
            <RNText style={styles.modalTitle}>Upcoming Events</RNText>
            <TouchableOpacity onPress={() => navigateToSection('events')}>
              <RNText style={styles.modalActionText}>Manage</RNText>
            </TouchableOpacity>
          </View>

          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <CalendarIcon size={48} color="#D1D5DB" />
                <RNText style={styles.emptyStateTitle}>
                  No upcoming events
                </RNText>
                <RNText style={styles.emptyStateSubtitle}>
                  Create events to organize blood drives and meetings
                </RNText>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.eventCard}
                onPress={() => navigateToSection('events')}
              >
                <View style={styles.eventHeader}>
                  <CalendarIcon size={20} color="#DC2626" />
                  <RNText style={styles.eventDate}>
                    {formatEventDate(item.start_time)}
                  </RNText>
                </View>

                <RNText style={styles.eventTitle}>{item.title}</RNText>

                <View style={styles.eventDetails}>
                  <View style={styles.eventLocation}>
                    <MapPin size={16} color="#6B7280" />
                    <RNText style={styles.eventLocationText}>
                      {item.location}
                    </RNText>
                  </View>

                  <View style={styles.eventAttendees}>
                    <Users size={16} color="#6B7280" />
                    <RNText style={styles.eventAttendeesText}>
                      {item.attendees_count} attending
                    </RNText>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Announcements Modal */}
      <Modal
        visible={showAnnouncementsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAnnouncementsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAnnouncementsModal(false)}>
              <RNText style={styles.modalCancelText}>Close</RNText>
            </TouchableOpacity>
            <RNText style={styles.modalTitle}>Announcements</RNText>
            <TouchableOpacity
              onPress={() => navigateToSection('announcements')}
            >
              <RNText style={styles.modalActionText}>Manage</RNText>
            </TouchableOpacity>
          </View>

          <FlatList
            data={announcements}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Megaphone size={48} color="#D1D5DB" />
                <RNText style={styles.emptyStateTitle}>No announcements</RNText>
                <RNText style={styles.emptyStateSubtitle}>
                  Create announcements to keep your members informed
                </RNText>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.announcementCard}
                onPress={() => navigateToSection('announcements')}
              >
                <View style={styles.announcementHeader}>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(item.priority) },
                    ]}
                  >
                    <RNText style={styles.priorityText}>
                      {item.priority.toUpperCase()}
                    </RNText>
                  </View>
                  <RNText style={styles.announcementTime}>
                    {formatTimeAgo(item.created_at)}
                  </RNText>
                </View>

                <RNText style={styles.announcementTitle}>{item.title}</RNText>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
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
  // Club management styles
  clubManagementSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  managementCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
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
  },
  joinRequestsSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  joinRequestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  joinRequestsTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  viewAllButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewAllButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#DC2626',
  },
  joinRequestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  joinRequestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  joinRequestDetails: {
    flex: 1,
  },
  joinRequestName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  joinRequestEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  bloodGroupBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  joinRequestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  approveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullRejectButton: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  fullApproveButton: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#EF4444',
  },
  approveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  actionButtonDisabled: {
    opacity: 0.5,
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
  modalCancelText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  modalActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  emptyStateTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Request card styles
  requestCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
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
  requestTime: {
    marginBottom: 12,
  },
  requestTimeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  // Member card styles
  memberCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  memberName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  memberEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  memberBloodGroup: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  memberBloodGroupText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  memberActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  promoteButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  promoteButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#3B82F6',
  },
  removeButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#EF4444',
  },
  // Event card styles
  eventCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventDate: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#DC2626',
  },
  eventTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventLocationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  eventAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventAttendeesText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  // Announcement card styles
  announcementCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  announcementTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  announcementTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  // Donor section styles
  donorSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  // Join Requests Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#374151',
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
});
