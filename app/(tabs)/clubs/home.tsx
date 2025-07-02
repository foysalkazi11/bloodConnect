import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MapPin, Plus, Search, Award, Calendar } from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { router } from 'expo-router';
import { TextAvatar } from '@/components/TextAvatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';

interface Club {
  id: string;
  name: string;
  description: string;
  website?: string;
  country: string;
  district?: string;
  police_station?: string;
  state?: string;
  city?: string;
  address?: string;
  total_members: number;
  total_donations: number;
  founded_year: number;
  created_at: string;
  updated_at: string;
  is_joined?: boolean;
  has_pending_request?: boolean;
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

  // Check if current user is a donor (not a club)
  const isDonor = profile?.user_type === 'donor';
  
  // Check if user is not signed in
  const isNotSignedIn = !user;

  useEffect(() => {
    loadClubs();
  }, [user]);

  const loadClubs = async () => {
    try {
      setLoading(true);
      
      // Fetch all clubs
      const { data: clubsData, error: clubsError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_type', 'club');
      
      if (clubsError) throw clubsError;
      
      let clubsList = clubsData || [];
      
      // If user is logged in, check which clubs they're a member of
      if (user) {
        // Get clubs the user is a member of
        const { data: memberships, error: membershipError } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('member_id', user.id)
          .eq('is_active', true);
        
        if (membershipError) throw membershipError;
        
        // Get pending join requests
        const { data: pendingRequests, error: requestsError } = await supabase
          .from('club_join_requests')
          .select('club_id')
          .eq('user_id', user.id)
          .eq('status', 'pending');
        
        if (requestsError) throw requestsError;
        
        // Mark clubs as joined or with pending requests
        const memberClubIds = new Set(memberships?.map(m => m.club_id) || []);
        const pendingClubIds = new Set(pendingRequests?.map(r => r.club_id) || []);
        
        clubsList = clubsList.map(club => ({
          ...club,
          is_joined: memberClubIds.has(club.id),
          has_pending_request: pendingClubIds.has(club.id)
        }));
      }
      
      // Calculate stats
      const totalClubs = clubsList.length;
      const totalMembers = clubsList.reduce((sum, club) => sum + (club.total_members || 0), 0);
      const totalDonations = clubsList.reduce((sum, club) => sum + (club.total_donations || 0), 0);
      
      setStats({
        totalClubs,
        totalMembers,
        totalDonations
      });
      
      // Add last activity time (mock for now)
      clubsList = clubsList.map(club => ({
        ...club,
        last_activity: getRandomTimeAgo()
      }));
      
      setClubs(clubsList);
    } catch (error) {
      console.error('Error loading clubs:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load clubs. Please try again.',
        duration: 4000
      });
      
      // Set mock data as fallback
      setClubs(getMockClubs());
      setStats({
        totalClubs: 3,
        totalMembers: 590,
        totalDonations: 4240
      });
    } finally {
      setLoading(false);
    }
  };

  const getRandomTimeAgo = () => {
    const options = ['2 hours ago', '5 hours ago', '1 day ago', '3 days ago', 'Just now'];
    return options[Math.floor(Math.random() * options.length)];
  };

  const getMockClubs = () => {
    return [
      {
        id: '1',
        name: 'Dhaka Blood Heroes',
        description: 'Dedicated to saving lives through regular blood donation drives and awareness campaigns.',
        country: 'BANGLADESH',
        district: 'DHAKA',
        police_station: 'DHANMONDI',
        total_members: 245,
        total_donations: 1250,
        founded_year: 2019,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_joined: false,
        has_pending_request: false,
        last_activity: '2 hours ago'
      },
      {
        id: '2',
        name: 'Life Savers Club',
        description: 'A community-driven club focused on emergency blood supply and donor awareness.',
        country: 'BANGLADESH',
        district: 'CHATTOGRAM',
        police_station: 'KOTWALI',
        total_members: 189,
        total_donations: 890,
        founded_year: 2020,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_joined: true,
        has_pending_request: false,
        last_activity: '1 day ago'
      },
      {
        id: '3',
        name: 'Red Cross Youth',
        description: 'Young volunteers committed to building a strong blood donation network.',
        country: 'BANGLADESH',
        district: 'SYLHET',
        police_station: 'KOTWALI',
        total_members: 156,
        total_donations: 2100,
        founded_year: 2018,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_joined: false,
        has_pending_request: false,
        last_activity: '5 hours ago'
      }
    ];
  };

  const handleJoinClub = async (clubId: string) => {
    if (!user) {
      // Redirect to auth if not logged in
      router.push('/auth');
      return;
    }
    
    if (!profile) {
      showNotification({
        type: 'error',
        title: 'Profile Required',
        message: 'Please complete your profile before joining a club.',
        duration: 4000
      });
      return;
    }
    
    // Check if user is a donor
    if (profile.user_type !== 'donor') {
      showNotification({
        type: 'error',
        title: 'Not Allowed',
        message: 'Only donors can join clubs. Clubs cannot join other clubs.',
        duration: 4000
      });
      return;
    }
    
    try {
      setJoinRequestLoading(clubId);
      
      // Check if already a member
      const club = clubs.find(c => c.id === clubId);
      if (club?.is_joined) {
        showNotification({
          type: 'info',
          title: 'Already a Member',
          message: 'You are already a member of this club.',
          duration: 3000
        });
        return;
      }
      
      // Check if already has a pending request
      if (club?.has_pending_request) {
        showNotification({
          type: 'info',
          title: 'Request Pending',
          message: 'You already have a pending request to join this club.',
          duration: 3000
        });
        return;
      }
      
      // Create join request
      const { error } = await supabase
        .from('club_join_requests')
        .insert({
          club_id: clubId,
          user_id: user.id,
          message: `I would like to join ${club?.name}`,
          status: 'pending'
        });
      
      if (error) throw error;
      
      // Update local state
      setClubs(clubs.map(club => 
        club.id === clubId 
          ? { ...club, has_pending_request: true }
          : club
      ));
      
      showNotification({
        type: 'success',
        title: 'Request Sent',
        message: 'Your request to join the club has been sent. Please wait for approval.',
        duration: 4000
      });
    } catch (error) {
      console.error('Error joining club:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to send join request. Please try again.',
        duration: 4000
      });
    } finally {
      setJoinRequestLoading(null);
    }
  };

  const handleCreateClub = () => {
    if (!user) {
      // Redirect to auth if not logged in
      router.push('/auth/account-type?accountType=club');
      return;
    }
    
    if (profile?.user_type === 'donor') {
      // Show message that they need to create a club account
      Alert.alert(
        'Club Account Required',
        'You need a club account to create a club. Would you like to create one?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Create Club Account',
            onPress: () => router.push('/auth/account-type?accountType=club')
          }
        ]
      );
      return;
    }
    
    // If they already have a club account, show message
    if (profile?.user_type === 'club') {
      showNotification({
        type: 'info',
        title: 'Club Account',
        message: 'You already have a club account. You can manage your club from your profile.',
        duration: 4000
      });
      return;
    }
  };

  const handleClubPress = (clubId: string) => {
    router.push(`/(tabs)/clubs/${clubId}`);
  };

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (club.district && club.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (club.police_station && club.police_station.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (club.city && club.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (club.state && club.state.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getLocationDisplay = (club: Club) => {
    if (club.country === 'BANGLADESH') {
      return `${club.police_station || ''}, ${club.district || ''}`.trim();
    } else {
      return `${club.city || ''}, ${club.state || ''}`.trim();
    }
  };

  const getJoinButtonText = (club: Club) => {
    if (club.is_joined) return 'Joined';
    if (club.has_pending_request) return 'Pending';
    return 'Join';
  };

  const getJoinButtonStyle = (club: Club) => {
    if (club.is_joined) return styles.joinButtonActive;
    if (club.has_pending_request) return styles.joinButtonPending;
    return styles.joinButton;
  };

  const getJoinButtonTextStyle = (club: Club) => {
    if (club.is_joined) return styles.joinButtonTextActive;
    if (club.has_pending_request) return styles.joinButtonTextPending;
    return styles.joinButtonText;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('clubs.title')}</Text>
        {/* Only show Create button if user is not signed in */}
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
              {searchQuery ? (
                <Text style={styles.noClubsSubtext}>Try adjusting your search criteria</Text>
              ) : (
                <Text style={styles.noClubsSubtext}>Be the first to create a club in your area</Text>
              )}
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
                    </View>
                    <View style={styles.clubInfo}>
                      <Text style={styles.clubName}>{club.name}</Text>
                      <View style={styles.locationRow}>
                        <MapPin size={14} color="#6B7280" />
                        <Text style={styles.locationText}>
                          {getLocationDisplay(club)}
                        </Text>
                      </View>
                      <Text style={styles.membersText}>
                        {club.total_members} {t('clubs.members')} • Last activity: {club.last_activity}
                      </Text>
                    </View>
                    {/* Only show Join button for donors, not for clubs */}
                    {isDonor && (
                      <TouchableOpacity
                        style={[
                          getJoinButtonStyle(club),
                          joinRequestLoading === club.id && styles.joinButtonLoading
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleJoinClub(club.id);
                        }}
                        disabled={club.is_joined || club.has_pending_request || joinRequestLoading === club.id}
                      >
                        {joinRequestLoading === club.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={getJoinButtonTextStyle(club)}>
                            {getJoinButtonText(club)}
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
                        Since {club.founded_year}
                      </Text>
                    </View>
                  </View>

                  {/* Next Event - Mocked for now */}
                  <View style={styles.nextEvent}>
                    <Text style={styles.nextEventLabel}>Next Event:</Text>
                    <Text style={styles.nextEventText}>
                      {club.id === '1' ? 'Blood Drive - Dec 25' : 
                       club.id === '2' ? 'Health Camp - Jan 5' : 
                       'Volunteer Training - Jan 10'}
                    </Text>
                  </View>
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
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
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
  noClubsSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
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
    minWidth: 70,
    alignItems: 'center',
  },
  joinButtonActive: {
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    minWidth: 70,
    alignItems: 'center',
  },
  joinButtonPending: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    minWidth: 70,
    alignItems: 'center',
  },
  joinButtonLoading: {
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    minWidth: 70,
    alignItems: 'center',
    opacity: 0.7,
  },
  joinButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#DC2626',
  },
  joinButtonTextActive: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  joinButtonTextPending: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#6B7280',
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
  nextEvent: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  nextEventLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 2,
  },
  nextEventText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#374151',
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