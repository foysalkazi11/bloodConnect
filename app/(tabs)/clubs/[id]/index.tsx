import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Users,
  Award,
  Calendar,
  Bell,
  Settings,
  UserPlus,
  MessageCircle,
  Phone,
  Mail,
  Globe,
  Info,
} from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';
import { TextAvatar } from '@/components/TextAvatar';
import { supabase } from '@/lib/supabase';

interface ClubDetails {
  id: string;
  name: string;
  description?: string;
  website?: string;
  country: string;
  district?: string;
  police_station?: string;
  state?: string;
  city?: string;
  address?: string;
  phone?: string;
  email: string;
  total_members: number;
  total_donations: number;
  founded_year: number;
  created_at: string;
  updated_at: string;
  owner_id?: string;
}

interface ClubStats {
  total_members: number;
  total_donations: number;
  total_events: number;
  total_announcements: number;
}

interface JoinRequestStatus {
  isPending: boolean;
  isMember: boolean;
  memberRole?: 'admin' | 'moderator' | 'member';
  isOwner: boolean;
}

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();

  const [club, setClub] = useState<ClubDetails | null>(null);
  const [stats, setStats] = useState<ClubStats>({
    total_members: 0,
    total_donations: 0,
    total_events: 0,
    total_announcements: 0,
  });
  const [loading, setLoading] = useState(true);
  const [joinRequestStatus, setJoinRequestStatus] = useState<JoinRequestStatus>(
    {
      isPending: false,
      isMember: false,
      memberRole: undefined,
      isOwner: false,
    }
  );
  const [pendingJoinRequests, setPendingJoinRequests] = useState<number>(0);
  const [joinRequestLoading, setJoinRequestLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    loadClubDetails();
  }, [id, user]);

  const loadClubDetails = async () => {
    try {
      setLoading(true);

      // Fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .eq('user_type', 'club')
        .single();

      if (clubError) {
        console.error('Error loading club details:', clubError);
        throw clubError;
      }

      if (!clubData) {
        showNotification({
          type: 'error',
          title: 'Club Not Found',
          message: 'The club you are looking for does not exist.',
          duration: 4000,
        });
        router.replace('/clubs');
        return;
      }

      setClub(clubData);

      // Check if user is authenticated
      if (user) {
        // Check if user is a member of this club
        const { data: memberData, error: memberError } = await supabase
          .from('club_members')
          .select('role')
          .eq('club_id', id)
          .eq('member_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (memberError && !memberError.message.includes('PGRST116')) {
          console.error('Error checking membership:', memberError);
        }

        // Check if user has a pending join request
        const { data: requestData, error: requestError } = await supabase
          .from('club_join_requests')
          .select('status')
          .eq('club_id', id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (requestError && !requestError.message.includes('PGRST116')) {
          console.error('Error checking join request:', requestError);
        }

        // Check if user is the owner of the club
        const isOwner = user.id === clubData.id;

        setJoinRequestStatus({
          isPending: !!requestData,
          isMember: !!memberData,
          memberRole: memberData?.role as
            | 'admin'
            | 'moderator'
            | 'member'
            | undefined,
          isOwner,
        });

        // If user is admin or moderator, fetch pending join requests count
        if (
          isOwner ||
          (memberData && ['admin', 'moderator'].includes(memberData.role))
        ) {
          const { count, error: countError } = await supabase
            .from('club_join_requests')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', id)
            .eq('status', 'pending');

          if (!countError) {
            setPendingJoinRequests(count || 0);
          }
        }

        // Check if user has access to this club page
        const hasAccess = isOwner || !!memberData;

        if (!hasAccess && profile?.user_type !== 'club') {
          setAccessDenied(true);
        }
      } else {
        // If not authenticated, deny access
        setAccessDenied(true);
      }

      // Fetch club stats
      const [membersResult, eventsResult, announcementsResult] =
        await Promise.all([
          supabase
            .from('club_members')
            .select('id', { count: 'exact', head: true })
            .eq('club_id', id)
            .eq('is_active', true),
          supabase
            .from('club_events')
            .select('id', { count: 'exact', head: true })
            .eq('club_id', id),
          supabase
            .from('club_announcements')
            .select('id', { count: 'exact', head: true })
            .eq('club_id', id),
        ]);

      setStats({
        total_members: membersResult.count || 0,
        total_donations: clubData.total_donations || 0,
        total_events: eventsResult.count || 0,
        total_announcements: announcementsResult.count || 0,
      });
    } catch (error) {
      console.error('Error in loadClubDetails:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load club details. Please try again.',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async () => {
    if (!user) {
      showNotification({
        type: 'info',
        title: 'Authentication Required',
        message: 'Please sign in to join clubs',
        duration: 4000,
      });
      router.push('/auth');
      return;
    }

    if (!profile) {
      showNotification({
        type: 'info',
        title: 'Profile Required',
        message: 'Please complete your profile to join clubs',
        duration: 4000,
      });
      router.push('/complete-profile');
      return;
    }

    // Check if user is a club (clubs can't join other clubs)
    if (profile.user_type === 'club') {
      showNotification({
        type: 'info',
        title: 'Not Available',
        message: 'Clubs cannot join other clubs',
        duration: 4000,
      });
      return;
    }

    try {
      setJoinRequestLoading(true);

      // Create join request
      const { error } = await supabase.from('club_join_requests').insert({
        club_id: id,
        user_id: user.id,
        message: `I would like to join ${club?.name}`,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          // Unique violation
          showNotification({
            type: 'info',
            title: 'Already Requested',
            message: 'You have already requested to join this club',
            duration: 4000,
          });
        } else {
          throw error;
        }
      } else {
        setJoinRequestStatus({
          ...joinRequestStatus,
          isPending: true,
        });

        showNotification({
          type: 'success',
          title: 'Request Sent',
          message: 'Your request to join the club has been sent',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error joining club:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to send join request',
        duration: 4000,
      });
    } finally {
      setJoinRequestLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!user) return;

    Alert.alert('Leave Club', 'Are you sure you want to leave this club?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            setJoinRequestLoading(true);

            // Set member as inactive
            const { error } = await supabase
              .from('club_members')
              .update({ is_active: false })
              .eq('club_id', id)
              .eq('member_id', user.id);

            if (error) throw error;

            setJoinRequestStatus({
              ...joinRequestStatus,
              isMember: false,
              memberRole: undefined,
            });

            showNotification({
              type: 'success',
              title: 'Left Club',
              message: 'You have left the club',
              duration: 3000,
            });
          } catch (error) {
            console.error('Error leaving club:', error);
            showNotification({
              type: 'error',
              title: 'Error',
              message: 'Failed to leave club',
              duration: 4000,
            });
          } finally {
            setJoinRequestLoading(false);
          }
        },
      },
    ]);
  };

  const handleManageRequests = () => {
    router.push(`/(tabs)/clubs/${id}/members?tab=requests`);
  };

  const getLocationDisplay = () => {
    if (!club) return '';

    if (club.country === 'BANGLADESH') {
      return [club.police_station, club.district].filter(Boolean).join(', ');
    } else {
      return [club.city, club.state].filter(Boolean).join(', ');
    }
  };

  const getJoinButtonText = () => {
    if (joinRequestStatus.isMember) return 'Member';
    if (joinRequestStatus.isPending) return 'Pending';
    return 'Join Club';
  };

  const getJoinButtonStyle = () => {
    if (joinRequestStatus.isMember) return styles.joinButtonActive;
    if (joinRequestStatus.isPending) return styles.joinButtonPending;
    return styles.joinButton;
  };

  const getJoinButtonTextStyle = () => {
    if (joinRequestStatus.isMember) return styles.joinButtonTextActive;
    if (joinRequestStatus.isPending) return styles.joinButtonTextPending;
    return styles.joinButtonText;
  };

  const navigateToSection = (section: string) => {
    router.push(`/(tabs)/clubs/${id}/${section}`);
  };

  const handleMessageClub = () => {
    if (!club?.id) return;
    router.push(`/(tabs)/clubs/${id}/direct-message/${club.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading club details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (accessDenied) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Club Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.accessDeniedContainer}>
          <Users size={64} color="#D1D5DB" />
          <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
          <Text style={styles.accessDeniedText}>
            You need to be a member of this club to view its details.
          </Text>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoinClub}
            disabled={joinRequestLoading || joinRequestStatus.isPending}
          >
            {joinRequestLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.joinButtonText}>
                {joinRequestStatus.isPending
                  ? 'Request Pending'
                  : 'Request to Join'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Club not found</Text>
          <TouchableOpacity
            style={styles.backToClubsButton}
            onPress={() => router.replace('/clubs')}
          >
            <Text style={styles.backToClubsButtonText}>Back to Clubs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Club Details</Text>
          {joinRequestStatus.isOwner ||
          joinRequestStatus.memberRole === 'admin' ? (
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={24} color="#111827" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Club Profile */}
        <View style={styles.clubProfile}>
          <View style={styles.clubAvatarContainer}>
            <TextAvatar name={club.name} size={80} />
          </View>

          <Text style={styles.clubName}>{club.name}</Text>

          <View style={styles.locationContainer}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.locationText}>{getLocationDisplay()}</Text>
          </View>

          {club.description && (
            <Text style={styles.description}>{club.description}</Text>
          )}

          {/* Join/Leave Button */}
          {!joinRequestStatus.isOwner && profile?.user_type !== 'club' && (
            <TouchableOpacity
              style={[
                getJoinButtonStyle(),
                joinRequestLoading && styles.joinButtonLoading,
              ]}
              onPress={
                joinRequestStatus.isMember ? handleLeaveClub : handleJoinClub
              }
              disabled={joinRequestLoading || joinRequestStatus.isPending}
            >
              {joinRequestLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={getJoinButtonTextStyle()}>
                  {getJoinButtonText()}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Pending Join Requests Badge (for admins) */}
          {(joinRequestStatus.isOwner ||
            ['admin', 'moderator'].includes(
              joinRequestStatus.memberRole || ''
            )) &&
            pendingJoinRequests > 0 && (
              <TouchableOpacity
                style={styles.pendingRequestsBadge}
                onPress={handleManageRequests}
              >
                <UserPlus size={16} color="#FFFFFF" />
                <Text style={styles.pendingRequestsText}>
                  {pendingJoinRequests} pending request
                  {pendingJoinRequests !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}

          {/* Club Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Users size={20} color="#DC2626" />
              <Text style={styles.statValue}>{stats.total_members}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Award size={20} color="#DC2626" />
              <Text style={styles.statValue}>{stats.total_donations}</Text>
              <Text style={styles.statLabel}>Donations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Calendar size={20} color="#DC2626" />
              <Text style={styles.statValue}>{stats.total_events}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
          </View>

          {/* Message Club Button (for members only, not owners) */}
          {joinRequestStatus.isMember && !joinRequestStatus.isOwner && (
            <TouchableOpacity
              style={styles.messageClubButton}
              onPress={handleMessageClub}
            >
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.messageClubButtonText}>Message Club</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Club Management Section (only for members) */}
        {(joinRequestStatus.isMember || joinRequestStatus.isOwner) && (
          <View style={styles.managementSection}>
            <Text style={styles.sectionTitle}>Club Management</Text>

            <View style={styles.managementGrid}>
              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => navigateToSection('members')}
              >
                <Users size={24} color="#DC2626" />
                <Text style={styles.managementCardTitle}>Members</Text>
                <Text style={styles.managementCardSubtitle}>
                  {stats.total_members} active
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.managementCard}
                onPress={() => navigateToSection('announcements')}
              >
                <Bell size={24} color="#DC2626" />
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
        )}

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.contactCard}>
            {club.phone && (
              <View style={styles.contactItem}>
                <Phone size={20} color="#DC2626" />
                <Text style={styles.contactText}>{club.phone}</Text>
              </View>
            )}

            <View style={styles.contactItem}>
              <Mail size={20} color="#DC2626" />
              <Text style={styles.contactText}>{club.email}</Text>
            </View>

            {club.website && (
              <View style={styles.contactItem}>
                <Globe size={20} color="#DC2626" />
                <Text style={styles.contactText}>{club.website}</Text>
              </View>
            )}

            {club.address && (
              <View style={styles.contactItem}>
                <MapPin size={20} color="#DC2626" />
                <Text style={styles.contactText}>{club.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.aboutCard}>
            <View style={styles.aboutItem}>
              <Info size={20} color="#DC2626" />
              <Text style={styles.aboutLabel}>Founded</Text>
              <Text style={styles.aboutText}>{club.founded_year || 'N/A'}</Text>
            </View>

            <View style={styles.aboutItem}>
              <Award size={20} color="#DC2626" />
              <Text style={styles.aboutLabel}>Total Donations</Text>
              <Text style={styles.aboutText}>{club.total_donations || 0}</Text>
            </View>

            <View style={styles.aboutItem}>
              <Users size={20} color="#DC2626" />
              <Text style={styles.aboutLabel}>Member Count</Text>
              <Text style={styles.aboutText}>{stats.total_members}</Text>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubProfile: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  clubAvatarContainer: {
    marginBottom: 16,
  },
  clubName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  joinButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  joinButtonActive: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
    marginBottom: 16,
  },
  joinButtonPending: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  joinButtonLoading: {
    backgroundColor: '#9CA3AF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  joinButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  joinButtonTextActive: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
  joinButtonTextPending: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#B45309',
  },
  pendingRequestsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  pendingRequestsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
    marginTop: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#FCA5A5',
  },
  messageClubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  messageClubButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  managementSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
  },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  managementCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  managementCardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  managementCardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  contactSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  contactCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 12,
  },
  aboutSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  aboutCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 12,
    width: 120,
  },
  aboutText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#DC2626',
    marginBottom: 16,
  },
  backToClubsButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backToClubsButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
