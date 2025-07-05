import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MapPin, Plus, Search, Award, Calendar } from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { router } from 'expo-router';
import { TextAvatar } from '@/components/TextAvatar';
import { Club, supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';

interface Club {
  id: string;
  name: string;
  description?: string;
  website?: string;
  country?: string;
  district?: string; 
  police_station?: string; 
  state?: string;
  city?: string;
  address?: string;
  description?: string;
  total_members: number;
  total_donations: number;
  founded_year?: number;
  is_joined?: boolean;
  is_pending?: boolean;
  has_new_posts?: boolean;
  last_activity?: string;
}

export default function ClubsScreen() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClubs: 0,
    totalMembers: 0,
    totalDonations: 0
  });
  const [joinRequestLoading, setJoinRequestLoading] = useState<string | null>(null);

  // Check if user is not signed in
  const isNotSignedIn = !user;

  useEffect(() => {
    loadClubs();
  }, [user]);

  const loadClubs = async () => {
    try {
      setLoading(true);

      // Fetch all clubs - this should always show all clubs regardless of user type
      const { data: clubsData, error: clubsError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_type', 'club')
        .order('created_at', { ascending: false });

      if (clubsError) throw clubsError;

      let clubsList = clubsData || [];

      // If user is logged in, check which clubs they're a member of but still show all clubs
      if (user) {
        try {
          // Get clubs the user is a member of
          const { data: memberships, error: membershipError } = await supabase
            .from('club_members')
            .select('club_id')
            .eq('member_id', user.id)
            .eq('is_active', true);

          // Get pending join requests
          const { data: pendingRequests, error: requestsError } = await supabase
            .from('club_join_requests')
            .select('club_id')
            .eq('user_id', user.id)
            .eq('status', 'pending');

          // Mark clubs as joined or with pending requests
          const memberClubIds = new Set(memberships?.map(m => m.club_id) || []);
          const pendingClubIds = new Set(pendingRequests?.map(r => r.club_id) || []);

          clubsList = clubsList.map(club => ({
            ...club,
            is_joined: memberClubIds.has(club.id),
            is_pending: pendingClubIds.has(club.id),
            has_new_posts: Math.random() > 0.5, // Random for demo
            last_activity: getRandomTimeAgo() // Random for demo
          }));
        } catch (e) {
          console.log('Error checking memberships:', e);
        }
      }

      // Calculate total stats
      const totalStats = {
        totalClubs: clubsList.length,
        totalMembers: clubsList.reduce((sum, club) => sum + (club.total_members || 0), 0),
        totalDonations: clubsList.reduce((sum, club) => sum + (club.total_donations || 0), 0)
      };

      setClubs(clubsList);
      setStats(totalStats);
    } catch (error) {
      console.error('Error loading clubs:', error);

      // Fallback to mock data
      const mockClubs = getMockClubs();
      setClubs(mockClubs);
      setStats({
        totalClubs: mockClubs.length,
        totalMembers: mockClubs.reduce((sum, club) => sum + club.total_members, 0),
        totalDonations: mockClubs.reduce((sum, club) => sum + club.total_donations, 0)
      });

      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load clubs. Using demo data instead.',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getRandomTimeAgo = () => {
    const options = ['Just now', '5 minutes ago', '1 hour ago', '3 hours ago', 'Today', 'Yesterday', '2 days ago'];
    return options[Math.floor(Math.random() * options.length)];
  };

  const handleJoinClub = async (clubId: string) => {
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

    // Check if already a member
    const club = clubs.find(c => c.id === clubId);
    if (club?.is_joined) {
      // Show leave confirmation
      Alert.alert(
        'Leave Club',
        `Are you sure you want to leave ${club.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: () => handleLeaveClub(clubId, club.name)
          }
        ]
      );
      return;
    }

    // Check if already has a pending request
    if (club?.is_pending) {
      showNotification({
        type: 'info',
        title: 'Request Pending',
        message: 'Your join request is still pending approval',
        duration: 4000,
      });
      return;
    }

    try {
      setJoinRequestLoading(clubId);

      // Create join request
      const { error } = await supabase
        .from('club_join_requests')
        .insert({
          club_id: clubId,
          user_id: user.id,
          message: `I would like to join this club. My blood group is ${profile.blood_group || 'not specified'}.`,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
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
        // Update local state
        setClubs(prevClubs => 
          prevClubs.map(club => 
            club.id === clubId 
              ? { ...club, is_pending: true }
              : club
          )
        );

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
      setJoinRequestLoading(null);
    }
  };

  const handleLeaveClub = async (clubId: string, clubName: string) => {
    try {
      setJoinRequestLoading(clubId);

      // Set member as inactive
      const { error } = await supabase
        .from('club_members')
        .update({ is_active: false })
        .eq('club_id', clubId)
        .eq('member_id', user?.id);

      if (error) throw error;

      // Update local state
      setClubs(prevClubs => 
        prevClubs.map(club => 
          club.id === clubId 
            ? { ...club, is_joined: false }
            : club
        )
      );

      showNotification({
        type: 'success',
        title: 'Left Club',
        message: `You have left ${clubName}`,
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
      setJoinRequestLoading(null);
    }
  };

  const handleClubPress = (clubId: string) => {
    router.push(`/(tabs)/clubs/${clubId}`);
  };

  const handleCreateClub = () => {
    if (!user) {
      showNotification({
        type: 'info',
        title: 'Authentication Required',
        message: 'Please sign in to create a club',
        duration: 4000,
      });
      router.push('/auth');
      return;
    }

    showNotification({
      type: 'info',
      title: 'Coming Soon',
      message: 'Club creation will be available soon',
      duration: 3000,
    });
  };

  // Check if current user is a donor (not a club)
  const isDonor = profile?.user_type === 'donor';

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (getLocationDisplay(club) && getLocationDisplay(club).toLowerCase().includes(searchQuery.toLowerCase())) ||
    (club.description && club.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get location display text for a club
  const getLocationDisplay = (club: Club) => {
    if (club.country === 'BANGLADESH') {
      return [club.police_station, club.district].filter(Boolean).join(', ');
    } else {
      return [club.city, club.state].filter(Boolean).join(', ');
    }
  };

  // Get mock clubs function for fallback data
  const getMockClubs = (): Club[] => {
    return [
      {
        id: '1',
        name: 'Dhaka Blood Heroes',
        district: 'DHAKA',
        police_station: 'DHANMONDI',
        country: 'BANGLADESH',
        description: 'Dedicated to saving lives through regular blood donation drives and awareness campaigns.',
        total_members: 245,
        total_donations: 1250,
        founded_year: 2019,
        is_joined: false,
        has_new_posts: true,
        last_activity: '2 hours ago',
      },
      {
        id: '2',
        name: 'Life Savers Club',
        district: 'CHATTOGRAM',
        police_station: 'KOTWALI',
        country: 'BANGLADESH',
        description: 'A community-driven club focused on emergency blood supply and donor awareness.',
        total_members: 189,
        total_donations: 890,
        founded_year: 2020,
        is_joined: true,
        has_new_posts: false,
        last_activity: '1 day ago',
      },
      {
        id: '3',
        name: 'Red Cross Youth',
        district: 'SYLHET',
        police_station: 'KOTWALI',
        country: 'BANGLADESH',
        description: 'Young volunteers committed to building a strong blood donation network.',
        total_members: 156,
        total_donations: 2100,
        founded_year: 2018,
        is_joined: false,
        has_new_posts: true,
        last_activity: '5 hours ago',
      },
    ];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('clubs.title')}</Text>
        {/* Only show Add Club button if user is not signed in */}
        {isNotSignedIn && (
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateClub}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clubs by name or location..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Stats Banner */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalClubs}</Text>
            <Text style={styles.statLabel}>Active Clubs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalMembers}</Text>
            <Text style={styles.statLabel}>Total Members</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalDonations}</Text>
            <Text style={styles.statLabel}>Total Donations</Text>
          </View>
        </View>

        {/* Clubs List */}
        <View style={styles.clubsSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DC2626" />
              <Text style={styles.loadingText}>Loading clubs...</Text>
            </View>
          ) : filteredClubs.length === 0 ? (
            <View style={styles.noClubs}>
              <Users size={48} color="#D1D5DB" />
              <Text style={styles.noClubsText}>{t('clubs.noClubs')}</Text>
            </View>
          ) : (
            <View style={styles.clubsList}>
              {filteredClubs.map((club) => (
                <TouchableOpacity
                  key={club.id}
                  style={styles.clubCard}
                  onPress={() => handleClubPress(club.id)}
                >
                  {/* Club Header */}
                  <View style={styles.clubHeader}>
                    <View style={styles.clubLogoContainer}>
                      <TextAvatar name={club.name} size={48} />
                      {club.has_new_posts && <View style={styles.newPostIndicator} />}
                    </View>
                    <View style={styles.clubInfo}>
                      <Text style={styles.clubName}>{club.name}</Text>
                      <View style={styles.locationRow}>
                        <MapPin size={14} color="#6B7280" />
                        <Text style={styles.locationText}>
                          {getLocationDisplay(club) || 'Location not specified'}
                        </Text>
                      </View>
                      <Text style={styles.membersText}>
                        {club.total_members} {t('clubs.members')} • Last activity: {club.last_activity}
                      </Text>
                    </View>
                    {/* Show Join button for donors only */}
                    {isDonor && (
                      <TouchableOpacity
                        style={[
                          styles.joinButton,
                          club.is_joined && styles.joinButtonActive,
                          club.is_pending && styles.joinButtonPending,
                          joinRequestLoading === club.id && styles.joinButtonLoading
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleJoinClub(club.id);
                        }}
                        disabled={joinRequestLoading !== null}
                      >
                        {joinRequestLoading === club.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={[
                            styles.joinButtonText,
                            (club.is_joined || club.is_pending) && styles.joinButtonTextActive
                          ]}>
                            {club.is_joined ? 'Joined' : club.is_pending ? 'Pending' : 'Join'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Club Description */}
                  <Text style={styles.clubDescription}>{club.description}</Text>

                  {/* Club Stats */}
                  <View style={styles.clubStats}>
                    <View style={styles.clubStatItem}>
                      <Award size={16} color="#DC2626" />
                      <Text style={styles.clubStatText}>
                        {club.total_donations} donations
                      </Text>
                    </View>
                    <View style={styles.clubStatItem}>
                      <Calendar size={16} color="#DC2626" />
                      <Text style={styles.clubStatText}>
                        Since {club.founded_year || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* New Posts Indicator */}
                  {club.has_new_posts && (
                    <View style={styles.newPostsBanner}>
                      <Text style={styles.newPostsText}>New posts available</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Create Club CTA - Only show if user is not signed in */}
        {isNotSignedIn && (
          <View style={styles.createClubSection}>
            <View style={styles.createClubCard}>
              <Users size={32} color="#DC2626" />
              <View style={styles.createClubText}>
                <Text style={styles.createClubTitle}>Start Your Own Club</Text>
                <Text style={styles.createClubSubtitle}>
                  Create a blood donation club in your community
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.createClubButton}
                onPress={handleCreateClub}
              >
                <Text style={styles.createClubButtonText}>{t('clubs.createClub')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
  },
  createButton: {
    backgroundColor: '#DC2626',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#DC2626',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#FCA5A5',
    marginHorizontal: 16,
  },
  clubsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  noClubs: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  noClubsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  clubsList: {
    gap: 16,
  },
  clubCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  clubLogoContainer: {
    position: 'relative',
  },
  newPostIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  membersText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#374151',
  },
  joinButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    minWidth: 80,
    alignItems: 'center',
  },
  joinButtonActive: {
    backgroundColor: '#DC2626',
  },
  joinButtonPending: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  joinButtonLoading: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
  },
  joinButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#DC2626',
  },
  joinButtonTextActive: {
    color: '#FFFFFF',
  },
  clubDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  clubStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  clubStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clubStatText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  newPostsBanner: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  newPostsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#2563EB',
  },
  createClubSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  createClubCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  createClubText: {
    flex: 1,
  },
  createClubTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  createClubSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  createClubButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createClubButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});