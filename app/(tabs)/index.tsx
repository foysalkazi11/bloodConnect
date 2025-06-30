import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Search, Users, Award, MapPin, Phone } from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { TextAvatar } from '@/components/TextAvatar';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface DashboardStats {
  totalDonors: number;
  totalClubs: number;
  totalDonations: number;
}

interface RecentDonation {
  id: string;
  donor_name: string;
  blood_group: string;
  location: string;
  donation_date: string;
  avatar_url?: string;
}

export default function HomeScreen() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDonors: 0,
    totalClubs: 0,
    totalDonations: 0,
  });
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const isCorsError = (error: any) => {
    return error?.message?.includes('Failed to fetch') || 
           error?.message?.includes('CORS') ||
           error?.message?.includes('Network request failed');
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setConnectionError(false);

      // Test connection first with a simple query
      try {
        await supabase.from('user_profiles').select('id').limit(1);
      } catch (testError) {
        if (isCorsError(testError)) {
          console.log('CORS error detected. Using fallback data.');
          setConnectionError(true);
          setStats({
            totalDonors: 1247,
            totalClubs: 89,
            totalDonations: 3456,
          });
          setRecentDonations([
            {
              id: '1',
              donor_name: 'Ahmed Rahman',
              blood_group: 'O+',
              location: 'Dhaka Medical College',
              donation_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: '2',
              donor_name: 'Fatima Khan',
              blood_group: 'A+',
              location: 'Chittagong General Hospital',
              donation_date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: '3',
              donor_name: 'Mohammad Ali',
              blood_group: 'B-',
              location: 'Sylhet MAG Osmani Medical',
              donation_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
          ]);
          setLoading(false);
          return;
        }
        throw testError;
      }

      // Load stats with error handling
      const [donorsResult, clubsResult, donationsResult] = await Promise.allSettled([
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact' })
          .eq('user_type', 'donor'),
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact' })
          .eq('user_type', 'club'),
        supabase
          .from('donations')
          .select('id', { count: 'exact' })
      ]);

      // Handle stats results with fallbacks
      const totalDonors = donorsResult.status === 'fulfilled' ? (donorsResult.value.count || 0) : 0;
      const totalClubs = clubsResult.status === 'fulfilled' ? (clubsResult.value.count || 0) : 0;
      const totalDonations = donationsResult.status === 'fulfilled' ? (donationsResult.value.count || 0) : 0;

      setStats({
        totalDonors,
        totalClubs,
        totalDonations,
      });

      // Load recent donations with error handling
      try {
        const { data: donations, error } = await supabase
          .from('donations')
          .select(`
            id,
            blood_group,
            location,
            donation_date,
            user_profiles!inner(name)
          `)
          .order('donation_date', { ascending: false })
          .limit(3);

        if (!error && donations) {
          const formattedDonations: RecentDonation[] = donations.map(donation => ({
            id: donation.id,
            donor_name: donation.user_profiles.name,
            blood_group: donation.blood_group,
            location: donation.location,
            donation_date: donation.donation_date,
            avatar_url: `https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop`,
          }));
          setRecentDonations(formattedDonations);
        } else {
          console.log('Could not load recent donations:', error?.message);
          setRecentDonations([]);
        }
      } catch (donationError) {
        console.log('Error loading recent donations:', donationError);
        setRecentDonations([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (isCorsError(error)) {
        setConnectionError(true);
        // Set demo data for CORS error
        setStats({
          totalDonors: 1247,
          totalClubs: 89,
          totalDonations: 3456,
        });
        setRecentDonations([
          {
            id: '1',
            donor_name: 'Ahmed Rahman',
            blood_group: 'O+',
            location: 'Dhaka Medical College',
            donation_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            donor_name: 'Fatima Khan',
            blood_group: 'A+',
            location: 'Chittagong General Hospital',
            donation_date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '3',
            donor_name: 'Mohammad Ali',
            blood_group: 'B-',
            location: 'Sylhet MAG Osmani Medical',
            donation_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        ]);
      } else {
        // Set default values on other errors
        setStats({
          totalDonors: 0,
          totalClubs: 0,
          totalDonations: 0,
        });
        setRecentDonations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const dashboardStats = [
    { label: t('home.stats.donors'), value: stats.totalDonors.toLocaleString(), icon: Heart },
    { label: t('home.stats.clubs'), value: stats.totalClubs.toLocaleString(), icon: Users },
    { label: t('home.stats.donations'), value: stats.totalDonations.toLocaleString(), icon: Award },
  ];

  const handleFindDonors = () => {
    router.push('/search');
  };

  const handleBecomeDonor = () => {
    if (user) {
      router.push('/profile');
    } else {
      router.push('/auth');
    }
  };

  const getWelcomeMessage = () => {
    if (user && profile) {
      const name = profile.name.split(' ')[0]; // Get first name
      return `Welcome back, ${name}!`;
    }
    return t('common.welcome');
  };

  const getHeroMessage = () => {
    if (user && profile) {
      if (profile.user_type === 'donor') {
        return profile.is_available 
          ? "You're available to help save lives" 
          : "Update your availability to help more people";
      } else {
        return "Continue making a difference in your community";
      }
    }
    return t('home.heroMessage');
  };

  const getProfileImage = () => {
    // Generate a consistent avatar based on user ID
    const avatarId = user?.id ? parseInt(user.id.slice(-3), 16) % 1000 + 1 : 220453;
    return `https://images.pexels.com/photos/${avatarId}/pexels-photo-${avatarId}.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop`;
  };

  const renderProfileAvatar = () => {
    if (!user || !profile) return null;

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
        name={profile.name || 'User'} 
        size={48}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Connection Error Banner */}
        {connectionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              ⚠️ Demo Mode: Configure Supabase CORS settings to connect to live data
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.welcomeText}>{getWelcomeMessage()}</Text>
            <Text style={styles.appTitle}>BloodConnect</Text>
          </View>
          {user && profile && (
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/profile')}
            >
              <View style={styles.avatarContainer}>
                {renderProfileAvatar()}
                <View style={[
                  styles.availabilityIndicator,
                  { backgroundColor: profile.is_available ? '#10B981' : '#EF4444' }
                ]} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Section */}
        <LinearGradient
          colors={['#FEE2E2', '#FECACA']}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <Heart size={48} color="#DC2626" style={styles.heroIcon} />
            <Text style={styles.heroTitle}>{t('home.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('home.subtitle')}</Text>
            <Text style={styles.heroMessage}>{getHeroMessage()}</Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleFindDonors}
              >
                <Search size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>{t('home.callToAction')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleBecomeDonor}
              >
                <Heart size={20} color="#DC2626" />
                <Text style={styles.secondaryButtonText}>
                  {user ? 'My Profile' : t('home.becomeDonor')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Our Impact</Text>
          <View style={styles.statsGrid}>
            {dashboardStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <stat.icon size={24} color="#DC2626" />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Blood Groups Section */}
        <View style={styles.bloodGroupsSection}>
          <Text style={styles.sectionTitle}>Blood Groups</Text>
          <View style={styles.bloodGroupsGrid}>
            {BLOOD_GROUPS.map((group, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.bloodGroupCard,
                  user && profile && profile.blood_group === group && styles.bloodGroupCardActive
                ]}
                onPress={() => router.push(`/search?bloodGroup=${group}`)}
              >
                <Text style={[
                  styles.bloodGroupText,
                  user && profile && profile.blood_group === group && styles.bloodGroupTextActive
                ]}>
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencySection}>
          <View style={styles.emergencyCard}>
            <Phone size={24} color="#DC2626" />
            <View style={styles.emergencyText}>
              <Text style={styles.emergencyTitle}>Emergency Blood Need?</Text>
              <Text style={styles.emergencySubtitle}>Call our 24/7 helpline</Text>
            </View>
            <TouchableOpacity style={styles.emergencyButton}>
              <Text style={styles.emergencyButtonText}>Call Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Donations</Text>
          <View style={styles.activityList}>
            {loading ? (
              // Loading placeholder
              [1, 2, 3].map((item, index) => (
                <View key={index} style={[styles.activityItem, styles.loadingItem]}>
                  <View style={styles.loadingAvatar} />
                  <View style={styles.loadingContent}>
                    <View style={styles.loadingLine} />
                    <View style={[styles.loadingLine, styles.loadingLineShort]} />
                  </View>
                </View>
              ))
            ) : recentDonations.length > 0 ? (
              recentDonations.map((donation) => (
                <View key={donation.id} style={styles.activityItem}>
                  <View style={styles.activityAvatar}>
                    <TextAvatar 
                      name={donation.donor_name} 
                      size={48}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>{donation.donor_name}</Text>
                    <Text style={styles.activityDetails}>
                      Donated {donation.blood_group} • {donation.location}
                    </Text>
                    <Text style={styles.activityTime}>
                      {formatTimeAgo(donation.donation_date)}
                    </Text>
                  </View>
                  <View style={styles.bloodGroupBadge}>
                    <Text style={styles.bloodGroupBadgeText}>{donation.blood_group}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <Heart size={48} color="#D1D5DB" />
                <Text style={styles.emptyActivityText}>No recent donations</Text>
                <Text style={styles.emptyActivitySubtext}>
                  Be the first to make a difference!
                </Text>
              </View>
            )}
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
  errorBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  appTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#111827',
    marginTop: 4,
  },
  profileButton: {
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  availabilityIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroSection: {
    marginHorizontal: 20,
    borderRadius: 16,
    marginTop: 20,
  },
  heroContent: {
    padding: 24,
    alignItems: 'center',
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroMessage: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DC2626',
    gap: 8,
  },
  secondaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#DC2626',
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
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
  bloodGroupsSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  bloodGroupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bloodGroupCard: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bloodGroupCardActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  bloodGroupText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#DC2626',
  },
  bloodGroupTextActive: {
    color: '#FFFFFF',
  },
  emergencySection: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  emergencyCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  emergencyText: {
    flex: 1,
  },
  emergencyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  emergencySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emergencyButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  activitySection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  loadingItem: {
    backgroundColor: '#F3F4F6',
  },
  loadingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
  },
  loadingContent: {
    flex: 1,
    gap: 8,
  },
  loadingLine: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  loadingLineShort: {
    width: '60%',
  },
  activityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  activityDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  activityTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bloodGroupBadge: {
    backgroundColor: '#DC2626',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  bloodGroupBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyActivityText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
  },
  emptyActivitySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
});