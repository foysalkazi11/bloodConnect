import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';

// Import data
import countriesData from '@/assets/data/countries.json';
import districtsBDData from '@/assets/data/districtsBD.json';
import policeStationsData from '@/assets/data/policeStations.json';

interface Country {
  value: string;
  id: string;
}

interface District {
  value: string;
  id: string;
}

interface PoliceStation {
  id: string;
  name: string;
  districtId: string;
  rpoId: string;
}

interface LocationSelectorProps {
  selectedCountry: string;
  selectedDistrict: string;
  selectedPoliceStation: string;
  onCountryChange: (country: string) => void;
  onDistrictChange: (district: string) => void;
  onPoliceStationChange: (policeStation: string) => void;
  onLocationInputChange?: (field: string, value: string) => void;
}

interface DropdownProps {
  label: string;
  value: string;
  placeholder: string;
  data: any[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  searchKey?: string;
  displayKey?: string;
}

const SearchableDropdown: React.FC<DropdownProps> = ({
  label,
  value,
  placeholder,
  data,
  onSelect,
  disabled = false,
  searchKey = 'value',
  displayKey = 'value'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter(item => 
    item[searchKey].toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedItem = data.find(item => item[searchKey] === value);
  const displayValue = selectedItem ? selectedItem[displayKey] : '';

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdown, disabled && styles.dropdownDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.dropdownText, !displayValue && styles.placeholderText]}>
          {displayValue || placeholder}
        </Text>
        <ChevronDown size={20} color={disabled ? "#9CA3AF" : "#6B7280"} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${label.toLowerCase()}...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <ScrollView style={styles.optionsList}>
              {filteredData.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    item[searchKey] === value && styles.selectedOption
                  ]}
                  onPress={() => {
                    onSelect(item[searchKey]);
                    setIsVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    item[searchKey] === value && styles.selectedOptionText
                  ]}>
                    {item[displayKey]}
                  </Text>
                </TouchableOpacity>
              ))}
              {filteredData.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No results found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedCountry,
  selectedDistrict,
  selectedPoliceStation,
  onCountryChange,
  onDistrictChange,
  onPoliceStationChange,
  onLocationInputChange
}) => {
  const [countries] = useState<Country[]>(countriesData.content);
  const [districts] = useState<District[]>(districtsBDData.content);
  const [policeStations] = useState<PoliceStation[]>(policeStationsData.content);
  const [otherLocationInputs, setOtherLocationInputs] = useState({
    state: '',
    city: '',
    address: ''
  });

  const isBangladesh = selectedCountry === 'BANGLADESH';

  // Filter police stations based on selected district
  const filteredPoliceStations = policeStations.filter(
    station => station.districtId === getDistrictId(selectedDistrict)
  );

  function getDistrictId(districtName: string): string {
    const district = districts.find(d => d.value === districtName);
    return district ? district.id : '';
  }

  // Reset dependent selections when country changes
  useEffect(() => {
    if (selectedCountry !== 'BANGLADESH') {
      onDistrictChange('');
      onPoliceStationChange('');
    }
  }, [selectedCountry]);

  // Reset police station when district changes
  useEffect(() => {
    onPoliceStationChange('');
  }, [selectedDistrict]);

  const handleOtherLocationChange = (field: string, value: string) => {
    setOtherLocationInputs(prev => ({ ...prev, [field]: value }));
    onLocationInputChange?.(field, value);
  };

  return (
    <View style={styles.container}>
      {/* Country Selection */}
      <SearchableDropdown
        label="Country"
        value={selectedCountry}
        placeholder="Select country"
        data={countries}
        onSelect={onCountryChange}
        searchKey="value"
        displayKey="value"
      />

      {/* Bangladesh-specific location fields */}
      {isBangladesh && (
        <>
          <SearchableDropdown
            label="District"
            value={selectedDistrict}
            placeholder="Select district"
            data={districts}
            onSelect={onDistrictChange}
            disabled={!selectedCountry}
            searchKey="value"
            displayKey="value"
          />

          <SearchableDropdown
            label="Police Station"
            value={selectedPoliceStation}
            placeholder="Select police station"
            data={filteredPoliceStations}
            onSelect={onPoliceStationChange}
            disabled={!selectedDistrict}
            searchKey="name"
            displayKey="name"
          />
        </>
      )}

      {/* Other countries location fields */}
      {!isBangladesh && selectedCountry && (
        <View style={styles.otherLocationContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>State/Province</Text>
            <TextInput
              style={styles.input}
              value={otherLocationInputs.state}
              onChangeText={(text) => handleOtherLocationChange('state', text)}
              placeholder="Enter state or province"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={otherLocationInputs.city}
              onChangeText={(text) => handleOtherLocationChange('city', text)}
              placeholder="Enter city"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={otherLocationInputs.address}
              onChangeText={(text) => handleOtherLocationChange('address', text)}
              placeholder="Enter detailed address"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  dropdownContainer: {
    gap: 8,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#374151',
  },
  dropdown: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  dropdownText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
  },
  optionsList: {
    flex: 1,
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#FEE2E2',
  },
  optionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#374151',
  },
  selectedOptionText: {
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  otherLocationContainer: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  input: {
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
  textArea: {
    minHeight: 80,
  },
});