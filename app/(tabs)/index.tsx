import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Search, Users, Award, MapPin, Phone } from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { TextAvatar } from '@/components/TextAvatar';
import { colors } from '@/components/theme';

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
    const errorMessage = error?.message || '';
    const errorName = error?.name || '';
    const errorString = String(error);
    
    return errorMessage.includes('Failed to fetch') || 
           errorMessage.includes('CORS') ||
           errorMessage.includes('Network request failed') ||
           errorMessage.includes('NetworkError') ||
           errorMessage.includes('fetch') ||
           errorName === 'TypeError' ||
           errorName === 'NetworkError' ||
           errorString.includes('Failed to fetch') ||
           errorString.includes('TypeError: Failed to fetch');
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setConnectionError(false);

      // Test connection first with a simple query
      try {
        await supabase.from('user_profiles').select('id').limit(1);
      } catch (testError) {
        console.log('Connection test error:', testError);
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
      console.log('Error type:', typeof error);
      console.log('Error name:', error?.name);
      console.log('Error message:', error?.message);
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
          className="w-12 h-12 rounded-full border-2 border-white"
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
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Connection Error Banner */}
        {connectionError && (
          <View className="bg-warning-100 px-4 py-3 border-b border-warning-500">
            <Text className="font-medium text-warning-800 text-center text-sm">
              ⚠️ Demo Mode: Configure Supabase CORS settings to connect to live data
            </Text>
          </View>
        )}

        {/* Header */}
        <View className="flex-row justify-between items-center px-5 pt-5 pb-2.5">
          <View className="flex-1">
            <Text className="text-secondary-500 font-inter-regular text-base">{getWelcomeMessage()}</Text>
            <Text className="text-secondary-900 font-inter-bold text-2xl mt-1">BloodConnect</Text>
          </View>
          {user && profile && (
            <TouchableOpacity 
              className="relative"
              onPress={() => router.push('/profile')}
            >
              <View className="relative">
                {renderProfileAvatar()}
                <View 
                  className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${profile.is_available ? 'bg-success-500' : 'bg-error-500'}`} 
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Section */}
        <LinearGradient
          colors={['#FEE2E2', '#FECACA']}
          className="mx-5 rounded-2xl mt-5"
        >
          <View className="p-6 items-center">
            <Heart size={48} color={colors.primary[600]} className="mb-4" />
            <Text className="text-secondary-900 font-inter-bold text-2xl text-center mb-2">{t('home.title')}</Text>
            <Text className="text-secondary-500 font-inter-regular text-base text-center mb-3">{t('home.subtitle')}</Text>
            <Text className="text-primary-600 font-inter-medium text-sm text-center mb-6">{getHeroMessage()}</Text>
            
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity 
                className="flex-1 bg-primary-600 flex-row items-center justify-center py-3 rounded-xl gap-2"
                onPress={handleFindDonors}
              >
                <Search size={20} color="#FFFFFF" />
                <Text className="text-white font-inter-semibold text-sm">{t('home.callToAction')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 bg-white flex-row items-center justify-center py-3 rounded-xl border-2 border-primary-600 gap-2"
                onPress={handleBecomeDonor}
              >
                <Heart size={20} color={colors.primary[600]} />
                <Text className="text-primary-600 font-inter-semibold text-sm">
                  {user ? 'My Profile' : t('home.becomeDonor')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View className="px-5 pt-8">
          <Text className="text-secondary-900 font-inter-bold text-xl mb-4">Our Impact</Text>
          <View className="flex-row gap-3">
            {dashboardStats.map((stat, index) => (
              <View key={index} className="flex-1 bg-secondary-50 p-4 rounded-xl items-center gap-2">
                <stat.icon size={24} color={colors.primary[600]} />
                <Text className="text-secondary-900 font-inter-bold text-xl">{stat.value}</Text>
                <Text className="text-secondary-500 font-inter-regular text-xs text-center">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Blood Groups Section */}
        <View className="px-5 pt-8">
          <Text className="text-secondary-900 font-inter-bold text-xl mb-4">Blood Groups</Text>
          <View className="flex-row flex-wrap gap-3">
            {BLOOD_GROUPS.map((group, index) => (
              <TouchableOpacity 
                key={index} 
                className={`bg-primary-100 py-3 px-4 rounded-lg min-w-[60px] items-center border-2 ${user && profile && profile.blood_group === group ? 'bg-primary-600 border-primary-700' : 'border-transparent'}`}
                onPress={() => router.push(`/search?bloodGroup=${group}`)}
              >
                <Text className={`font-inter-semibold text-sm ${user && profile && profile.blood_group === group ? 'text-white' : 'text-primary-600'}`}>
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emergency Contact */}
        <View className="px-5 pt-8">
          <View className="bg-primary-50 rounded-xl p-5 flex-row items-center gap-4 border-l-4 border-l-primary-600">
            <Phone size={24} color={colors.primary[600]} />
            <View className="flex-1">
              <Text className="text-secondary-900 font-inter-semibold text-base">Emergency Blood Need?</Text>
              <Text className="text-secondary-500 font-inter-regular text-sm mt-0.5">Call our 24/7 helpline</Text>
            </View>
            <TouchableOpacity className="bg-primary-600 py-2 px-4 rounded-lg">
              <Text className="text-white font-inter-semibold text-sm">Call Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-5 pt-8 pb-8">
          <Text className="text-secondary-900 font-inter-bold text-xl mb-4">Recent Donations</Text>
          <View className="gap-3">
            {loading ? (
              // Loading placeholder
              [1, 2, 3].map((item, index) => (
                <View key={index} className="flex-row items-center bg-secondary-100 p-4 rounded-xl gap-3">
                  <View className="w-12 h-12 rounded-full bg-secondary-200" />
                  <View className="flex-1 gap-2">
                    <View className="h-3 bg-secondary-200 rounded-md w-3/4" />
                    <View className="h-3 bg-secondary-200 rounded-md w-1/2" />
                  </View>
                </View>
              ))
            ) : recentDonations.length > 0 ? (
              recentDonations.map((donation) => (
                <View key={donation.id} className="flex-row items-center bg-secondary-50 p-4 rounded-xl gap-3">
                  <View className="w-12 h-12 rounded-full overflow-hidden">
                    <TextAvatar 
                      name={donation.donor_name} 
                      size={48}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-secondary-900 font-inter-semibold text-base">{donation.donor_name}</Text>
                    <Text className="text-secondary-500 font-inter-regular text-sm">
                      Donated {donation.blood_group} • {donation.location}
                    </Text>
                    <Text className="text-secondary-400 font-inter-regular text-xs mt-0.5">
                      {formatTimeAgo(donation.donation_date)}
                    </Text>
                  </View>
                  <View className="bg-primary-600 px-2 py-1 rounded-md">
                    <Text className="text-white font-inter-semibold text-xs">{donation.blood_group}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View className="items-center py-12 gap-3">
                <Heart size={48} color={colors.secondary[300]} />
                <Text className="text-secondary-500 font-inter-semibold text-base">No recent donations</Text>
                <Text className="text-secondary-400 font-inter-regular text-sm">
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