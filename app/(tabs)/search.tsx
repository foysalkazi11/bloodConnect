import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search as SearchIcon,
  MapPin,
  Phone,
  Mail,
  Clock,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { supabase } from '@/lib/supabase';
import { TextAvatar } from '@/components/TextAvatar';
import { useNotification } from '@/components/NotificationSystem';
import { getAvatarUrl } from '@/utils/avatarUtils';
import useProgressivePermissions from '@/hooks/useProgressivePermissions';
import { useAds } from '@/providers/AdProvider';
import ContextualPermissionRequest from '@/components/ContextualPermissionRequest';
import { useDebounce } from '@/hooks/useDebounce';

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface Donor {
  id: string;
  name: string;
  blood_group: string;
  country: string;
  district?: string;
  police_station?: string;
  state?: string;
  city?: string;
  last_donation?: string;
  is_available: boolean;
  phone?: string;
  email: string;
  avatar_url?: string;
}

interface LocationFilter {
  district?: string;
  police_station?: string;
  state?: string;
  city?: string;
}

interface District {
  value: string;
  id: string;
}

interface PoliceStation {
  id: string;
  name: string;
  districtId: string;
}

export default function SearchScreen() {
  const { t } = useI18n();
  const { showNotification } = useNotification();
  const {
    currentRequest,
    isVisible,
    triggerPermissionRequest,
    handleAccept,
    handleDecline,
    handleSkip,
    handleCustomize,
  } = useProgressivePermissions();
  const { showSearchAd, showFirstTimeAd, resetSearchCount } = useAds();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>({});
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [policeStations, setPoliceStations] = useState<PoliceStation[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedPoliceStation, setSelectedPoliceStation] = useState('');
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showPoliceStationDropdown, setShowPoliceStationDropdown] =
    useState(false);
  const [districtSearchQuery, setDistrictSearchQuery] = useState('');
  const [policeStationSearchQuery, setPoliceStationSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;
  const flatListRef = useRef<FlatList>(null);
  const filterCountRef = useRef(0);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Load districts from the data file
  useEffect(() => {
    try {
      const districtsBDData = require('@/assets/data/districtsBD.json');
      setDistricts(districtsBDData.content);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  }, []);

  // Load police stations based on selected district
  useEffect(() => {
    if (selectedDistrict) {
      try {
        const policeStationsData = require('@/assets/data/policeStations.json');

        // Find district ID
        const district = districts.find((d) => d.value === selectedDistrict);

        if (district) {
          // Filter police stations by district ID
          const filteredStations = policeStationsData.content.filter(
            (station: PoliceStation) => station.districtId === district.id
          );

          setPoliceStations(filteredStations);
          setSelectedPoliceStation('');
        }
      } catch (error) {
        console.error('Error loading police stations:', error);
      }
    } else {
      setPoliceStations([]);
      setSelectedPoliceStation('');
    }
  }, [selectedDistrict, districts]);

  // Initial data load
  useEffect(() => {
    loadDonors();
  }, []);

  // Show first-time interstitial ad
  useEffect(() => {
    // Show interstitial ad on first visit to search page
    const timer = setTimeout(() => {
      showFirstTimeAd();
    }, 2000); // 2 second delay to let the page load

    return () => clearTimeout(timer);
  }, []);

  //Reset filter count when component unmounts
  useEffect(() => {
    return () => {
      filterCountRef.current = 0;
      resetSearchCount();
    };
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [
    selectedBloodGroup,
    debouncedSearchQuery,
    showAvailableOnly,
    donors,
    locationFilter,
  ]);

  const loadDonors = async (reset = true) => {
    if (loading || (loadingMore && !reset)) return;

    if (reset) {
      setLoading(true);
      setPage(0);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      const currentPage = reset ? 0 : page;

      // Create query to fetch donors
      let query = supabase
        .from('user_profiles')
        .select(
          'id, name, email, phone, blood_group, country, district, police_station, state, city, is_available, avatar_url'
        )
        .eq('user_type', 'donor')
        .order('created_at', { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Get last donation date for each donor
      const donorsWithLastDonation = await Promise.all(
        (data || []).map(async (donor) => {
          try {
            const { data: donations, error: donationError } = await supabase
              .from('donations')
              .select('donation_date')
              .eq('donor_id', donor.id)
              .order('donation_date', { ascending: false })
              .limit(1);

            if (donationError) throw donationError;

            return {
              ...donor,
              last_donation:
                donations && donations.length > 0
                  ? donations[0].donation_date
                  : undefined,
            };
          } catch (err) {
            console.error('Error fetching donation date:', err);
            return donor;
          }
        })
      );

      if (reset) {
        setDonors(donorsWithLastDonation);
      } else {
        setDonors([...donors, ...donorsWithLastDonation]);
      }

      setHasMore(data?.length === pageSize);
      setPage(currentPage + 1);
    } catch (err) {
      console.error('Error loading donors:', err);
      setError('Failed to load donors. Please try again.');

      // Use mock data if there's an error (e.g., CORS issues in development)
      if (reset) {
        const mockDonors = getMockDonors();
        setDonors(mockDonors);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const getMockDonors = (): Donor[] => {
    return [
      {
        id: '1',
        name: 'Ahmed Rahman',
        blood_group: 'B+',
        country: 'BANGLADESH',
        district: 'DHAKA',
        police_station: 'DHANMONDI',
        last_donation: new Date(
          Date.now() - 90 * 24 * 60 * 60 * 1000
        ).toISOString(),
        is_available: true,
        phone: '+880 1234567890',
        email: 'ahmed@example.com',
        avatar_url:
          'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=56&h=56&fit=crop',
      },
      {
        id: '2',
        name: 'Fatima Khatun',
        blood_group: 'A+',
        country: 'BANGLADESH',
        district: 'DHAKA',
        police_station: 'GULSHAN',
        last_donation: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000
        ).toISOString(),
        is_available: true,
        phone: '+880 1987654321',
        email: 'fatima@example.com',
        avatar_url:
          'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=56&h=56&fit=crop',
      },
      {
        id: '3',
        name: 'Mohammad Ali',
        blood_group: 'O-',
        country: 'BANGLADESH',
        district: 'CHATTOGRAM',
        police_station: 'KOTWALI',
        last_donation: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        is_available: false,
        phone: '+880 1555666777',
        email: 'ali@example.com',
        avatar_url:
          'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=56&h=56&fit=crop',
      },
      {
        id: '4',
        name: 'Sarah Ahmed',
        blood_group: 'AB+',
        country: 'UNITED STATES OF AMERICA',
        state: 'California',
        city: 'Los Angeles',
        last_donation: new Date(
          Date.now() - 120 * 24 * 60 * 60 * 1000
        ).toISOString(),
        is_available: true,
        phone: '+1 555-123-4567',
        email: 'sarah@example.com',
        avatar_url:
          'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=56&h=56&fit=crop',
      },
    ];
  };

  const applyFilters = () => {
    let filtered = [...donors];

    // Filter by blood group
    if (selectedBloodGroup !== 'All') {
      filtered = filtered.filter(
        (donor) => donor.blood_group === selectedBloodGroup
      );
    }

    // Filter by search query (name or location)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((donor) => {
        const nameMatch = donor.name.toLowerCase().includes(query);
        const districtMatch = donor.district?.toLowerCase().includes(query);
        const policeStationMatch = donor.police_station
          ?.toLowerCase()
          .includes(query);
        const stateMatch = donor.state?.toLowerCase().includes(query);
        const cityMatch = donor.city?.toLowerCase().includes(query);

        return (
          nameMatch ||
          districtMatch ||
          policeStationMatch ||
          stateMatch ||
          cityMatch
        );
      });
    }

    // Filter by availability
    if (showAvailableOnly) {
      filtered = filtered.filter((donor) => donor.is_available);
    }

    // Filter by location
    if (locationFilter.district) {
      filtered = filtered.filter(
        (donor) => donor.district === locationFilter.district
      );

      if (locationFilter.police_station) {
        filtered = filtered.filter(
          (donor) => donor.police_station === locationFilter.police_station
        );
      }
    }

    if (locationFilter.state) {
      filtered = filtered.filter(
        (donor) => donor.state === locationFilter.state
      );

      if (locationFilter.city) {
        filtered = filtered.filter(
          (donor) => donor.city === locationFilter.city
        );
      }
    }

    setFilteredDonors(filtered);

    // Count filter applications and show interstitial ad every 5th time
    filterCountRef.current++;
    console.log(`Filter applied ${filterCountRef.current} times`);

    if (filterCountRef.current % 5 === 0) {
      // Show interstitial ad after a small delay to let results render
      setTimeout(() => {
        showSearchAd();
      }, 1000);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDonors();
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      loadDonors(false);
    }
  };

  const handleSearch = (text: string) => {
    console.log('Search input changed:', text);
    console.log('Current searchQuery:', searchQuery);
    setSearchQuery(text);
  };

  const handleBloodGroupSelect = (group: string) => {
    setSelectedBloodGroup(group);

    // Trigger emergency notification permission when user searches for specific blood group
    if (group !== 'All') {
      triggerPermissionRequest({
        trigger: 'emergency_request',
        metadata: {
          searchedBloodGroup: group,
          context: 'blood_search',
        },
      });
    }

    // Scroll to top when changing filters
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleAvailabilityToggle = () => {
    setShowAvailableOnly(!showAvailableOnly);
    // Scroll to top when changing filters
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleLocationFilter = () => {
    setShowLocationModal(true);
  };

  const applyLocationFilter = () => {
    const newFilter: LocationFilter = {};

    if (selectedDistrict) {
      newFilter.district = selectedDistrict;

      if (selectedPoliceStation) {
        newFilter.police_station = selectedPoliceStation;
      }
    }

    setLocationFilter(newFilter);
    setShowLocationModal(false);

    // Scroll to top when applying filters
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const clearLocationFilter = () => {
    setSelectedDistrict('');
    setSelectedPoliceStation('');
    setLocationFilter({});
    setShowLocationModal(false);
  };

  const handleContactDonor = (donor: Donor, method: 'call' | 'email') => {
    if (!donor.is_available) {
      showNotification({
        type: 'warning',
        title: 'Donor Unavailable',
        message: 'This donor is currently not available for donation.',
        duration: 3000,
      });
      return;
    }

    if (method === 'call' && donor.phone) {
      if (Platform.OS === 'web') {
        window.location.href = `tel:${donor.phone}`;
      }
      showNotification({
        type: 'info',
        title: 'Calling Donor',
        message: `Calling ${donor.name} at ${donor.phone}`,
        duration: 3000,
      });
    } else if (method === 'email') {
      if (Platform.OS === 'web') {
        window.location.href = `mailto:${donor.email}?subject=Blood%20Donation%20Request&body=Hello%20${donor.name},%0A%0AI%20am%20in%20need%20of%20${donor.blood_group}%20blood%20donation.%20Please%20contact%20me%20if%20you%20are%20available%20to%20donate.%0A%0AThank%20you.`;
      }
      showNotification({
        type: 'info',
        title: 'Email Donor',
        message: `Opening email to ${donor.name}`,
        duration: 3000,
      });
    }
  };

  const formatLastDonation = (dateString?: string) => {
    if (!dateString) return 'No donation record';

    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays < 30) {
      return `${diffInDays} days ago`;
    } else {
      const diffInMonths = Math.floor(diffInDays / 30);
      return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
    }
  };

  const getLocationDisplay = (donor: Donor) => {
    if (donor.country === 'BANGLADESH') {
      return donor.police_station && donor.district
        ? `${donor.police_station}, ${donor.district}`
        : donor.district || 'Location not specified';
    } else {
      return donor.city && donor.state
        ? `${donor.city}, ${donor.state}`
        : donor.state || donor.city || 'Location not specified';
    }
  };

  // Render donor items without ads
  const renderDonorItem = ({ item }: { item: Donor; index: number }) => {
    return renderDonorCard(item);
  };

  const renderDonorCard = (item: Donor) => (
    <View style={styles.donorCard}>
      <View style={styles.donorHeader}>
        {item.avatar_url ? (
          <Image
            source={{ uri: getAvatarUrl(item, 56) }}
            style={styles.donorAvatar}
            onError={() => {}}
          />
        ) : (
          <TextAvatar name={item.name} size={56} />
        )}
        <View style={styles.donorInfo}>
          <View style={styles.donorNameRow}>
            <Text style={styles.donorName}>{item.name}</Text>
            <View
              style={[
                styles.bloodGroupBadge,
                { backgroundColor: item.is_available ? '#DC2626' : '#9CA3AF' },
              ]}
            >
              <Text style={styles.bloodGroupText}>{item.blood_group}</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.locationText}>{getLocationDisplay(item)}</Text>
          </View>
          <View style={styles.statusRow}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.statusText}>
              Last donation: {formatLastDonation(item.last_donation)}
            </Text>
            <View
              style={[
                styles.availabilityStatus,
                { backgroundColor: item.is_available ? '#10B981' : '#EF4444' },
              ]}
            />
          </View>
        </View>
      </View>

      <View style={styles.donorActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.phoneButton,
            !item.is_available && styles.actionButtonDisabled,
          ]}
          onPress={() => handleContactDonor(item, 'call')}
          disabled={!item.is_available}
        >
          <Phone size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.emailButton,
            !item.is_available && styles.actionButtonDisabled,
          ]}
          onPress={() => handleContactDonor(item, 'email')}
          disabled={!item.is_available}
        >
          <Mail size={16} color={item.is_available ? '#DC2626' : '#9CA3AF'} />
          <Text
            style={[
              styles.emailButtonText,
              !item.is_available && styles.emailButtonTextDisabled,
            ]}
          >
            Email
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderListHeader = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or location..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
            autoCapitalize="none"
            multiline={false}
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Blood Group Filter */}
      <Text style={styles.filterTitle}>{t('search.bloodGroup')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.bloodGroupContainer}
      >
        {BLOOD_GROUPS.map((group) => (
          <TouchableOpacity
            key={group}
            style={[
              styles.filterChip,
              selectedBloodGroup === group && styles.filterChipActive,
            ]}
            onPress={() => handleBloodGroupSelect(group)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedBloodGroup === group && styles.filterChipTextActive,
              ]}
            >
              {group}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Location Filter */}
      <View style={styles.locationFilterContainer}>
        <Text style={styles.filterTitle}>Location</Text>
        <TouchableOpacity
          style={styles.locationFilterButton}
          onPress={handleLocationFilter}
        >
          <Text
            style={[
              styles.locationFilterButtonText,
              Object.keys(locationFilter).length === 0 &&
                styles.locationFilterPlaceholder,
            ]}
          >
            {Object.keys(locationFilter).length > 0
              ? `${locationFilter.district || ''} ${
                  locationFilter.police_station || ''
                }`
              : 'Select location'}
          </Text>
          <ChevronDown size={20} color="#6B7280" />
        </TouchableOpacity>

        {Object.keys(locationFilter).length > 0 && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={clearLocationFilter}
          >
            <Text style={styles.clearFilterText}>Clear filter</Text>
            <X size={16} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>

      {/* Availability Toggle */}
      <TouchableOpacity
        style={styles.availabilityToggle}
        onPress={handleAvailabilityToggle}
      >
        <View
          style={[styles.checkbox, showAvailableOnly && styles.checkboxActive]}
        >
          {showAvailableOnly && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.availabilityText}>{t('search.availability')}</Text>
      </TouchableOpacity>

      {/* Results Header */}
      <Text style={styles.resultsTitle}>
        {t('search.results')} ({filteredDonors.length})
      </Text>
    </>
  );

  const renderListEmpty = () => (
    <View style={styles.noResults}>
      <SearchIcon size={48} color="#D1D5DB" />
      <Text style={styles.noResultsText}>{t('search.noResults')}</Text>
      <Text style={styles.noResultsSubtext}>
        Try adjusting your search criteria or filters
      </Text>
    </View>
  );

  const renderListFooter = () => {
    if (!hasMore && donors.length > 0) {
      return (
        <View style={styles.listFooter}>
          <Text style={styles.endOfResultsText}>End of results</Text>
        </View>
      );
    }

    if (loadingMore) {
      return (
        <View style={styles.listFooter}>
          <ActivityIndicator size="small" color="#DC2626" />
          <Text style={styles.loadingMoreText}>Loading more donors...</Text>
        </View>
      );
    }

    return null;
  };

  // Filter districts based on search query
  const filteredDistricts = districts.filter((district) =>
    district.value.toLowerCase().includes(districtSearchQuery.toLowerCase())
  );

  // Filter police stations based on search query
  const filteredPoliceStations = policeStations.filter((station) =>
    station.name.toLowerCase().includes(policeStationSearchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('search.title')}</Text>
        <Text style={styles.headerSubtitle}>Find donors in your area</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadDonors()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredDonors}
          renderItem={renderDonorItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderListEmpty}
          ListFooterComponent={renderListFooter}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Location Filter Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* District Selection */}
              <View style={styles.filterField}>
                <Text style={styles.filterFieldLabel}>District</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowDistrictDropdown(!showDistrictDropdown);
                    setShowPoliceStationDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownButtonText,
                      !selectedDistrict && styles.dropdownPlaceholder,
                    ]}
                  >
                    {selectedDistrict || 'Select district'}
                  </Text>
                  <ChevronDown size={20} color="#6B7280" />
                </TouchableOpacity>

                {showDistrictDropdown && (
                  <View style={styles.dropdownContainer}>
                    <View style={styles.dropdownSearchContainer}>
                      <SearchIcon size={16} color="#6B7280" />
                      <TextInput
                        style={styles.dropdownSearchInput}
                        placeholder="Search districts..."
                        value={districtSearchQuery}
                        onChangeText={setDistrictSearchQuery}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <ScrollView
                      style={styles.dropdownList}
                      nestedScrollEnabled={true}
                    >
                      {filteredDistricts.map((district) => (
                        <TouchableOpacity
                          key={district.id}
                          style={[
                            styles.dropdownItem,
                            selectedDistrict === district.value &&
                              styles.dropdownItemSelected,
                          ]}
                          onPress={() => {
                            setSelectedDistrict(district.value);
                            setShowDistrictDropdown(false);
                            setDistrictSearchQuery('');
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selectedDistrict === district.value &&
                                styles.dropdownItemTextSelected,
                            ]}
                          >
                            {district.value}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {filteredDistricts.length === 0 && (
                        <View style={styles.noResultsDropdown}>
                          <Text style={styles.noResultsDropdownText}>
                            No districts found
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Police Station Selection (only if district is selected) */}
              {selectedDistrict && (
                <View style={styles.filterField}>
                  <Text style={styles.filterFieldLabel}>Police Station</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowPoliceStationDropdown(!showPoliceStationDropdown);
                      setShowDistrictDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownButtonText,
                        !selectedPoliceStation && styles.dropdownPlaceholder,
                      ]}
                    >
                      {selectedPoliceStation || 'Select police station'}
                    </Text>
                    <ChevronDown size={20} color="#6B7280" />
                  </TouchableOpacity>

                  {showPoliceStationDropdown && (
                    <View style={styles.dropdownContainer}>
                      <View style={styles.dropdownSearchContainer}>
                        <SearchIcon size={16} color="#6B7280" />
                        <TextInput
                          style={styles.dropdownSearchInput}
                          placeholder="Search police stations..."
                          value={policeStationSearchQuery}
                          onChangeText={setPoliceStationSearchQuery}
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <ScrollView
                        style={styles.dropdownList}
                        nestedScrollEnabled={true}
                      >
                        {filteredPoliceStations.map((station) => (
                          <TouchableOpacity
                            key={station.id}
                            style={[
                              styles.dropdownItem,
                              selectedPoliceStation === station.name &&
                                styles.dropdownItemSelected,
                            ]}
                            onPress={() => {
                              setSelectedPoliceStation(station.name);
                              setShowPoliceStationDropdown(false);
                              setPoliceStationSearchQuery('');
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                selectedPoliceStation === station.name &&
                                  styles.dropdownItemTextSelected,
                              ]}
                            >
                              {station.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {filteredPoliceStations.length === 0 && (
                          <View style={styles.noResultsDropdown}>
                            <Text style={styles.noResultsDropdownText}>
                              No police stations found
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowLocationModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalApplyButton}
                  onPress={applyLocationFilter}
                >
                  <Text style={styles.modalApplyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Progressive Permission Request Modal */}
      <ContextualPermissionRequest
        visible={isVisible}
        request={currentRequest}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onSkip={handleSkip}
        onCustomize={handleCustomize}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchSection: {
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
  filterTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
  },
  filterScroll: {
    marginBottom: 8,
  },
  bloodGroupContainer: {
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  locationFilterContainer: {
    marginBottom: 16,
  },
  locationFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationFilterButtonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
  },
  locationFilterPlaceholder: {
    color: '#9CA3AF',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
  },
  clearFilterText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#DC2626',
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  availabilityText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#374151',
  },
  resultsTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  noResultsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  donorCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  donorHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  donorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  donorInfo: {
    flex: 1,
  },
  donorNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  donorName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  bloodGroupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bloodGroupText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  availabilityStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  donorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  phoneButton: {
    backgroundColor: '#DC2626',
  },
  emailButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  actionButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  emailButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#DC2626',
  },
  emailButtonTextDisabled: {
    color: '#9CA3AF',
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  endOfResultsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  modalContent: {
    padding: 16,
  },
  filterField: {
    marginBottom: 16,
  },
  filterFieldLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownButtonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#111827',
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dropdownSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  dropdownSearchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#111827',
  },
  dropdownList: {
    maxHeight: 150,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemSelected: {
    backgroundColor: '#FEE2E2',
  },
  dropdownItemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextSelected: {
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
  },
  noResultsDropdown: {
    padding: 12,
    alignItems: 'center',
  },
  noResultsDropdownText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCancelButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  modalApplyButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalApplyButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
