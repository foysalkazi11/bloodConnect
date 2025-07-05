import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';
import { Text } from './ui';

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
    <View className="mb-5">
      <Text variant="body-sm" weight="medium" color="text-neutral-700" className="mb-1.5">
        {label}
      </Text>
      
      <TouchableOpacity
        className={`
          flex-row items-center justify-between
          bg-neutral-50 border rounded-lg px-4 py-3
          ${disabled ? 'border-neutral-200 bg-neutral-100' : 'border-neutral-300'}
        `}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text 
          color={!displayValue ? 'text-neutral-400' : 'text-neutral-900'}
        >
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
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl pt-5">
            <View className="flex-row justify-between items-center px-5 pb-4 border-b border-neutral-200">
              <Text variant="h5" weight="semibold">Select {label}</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-neutral-50 rounded-lg px-4 py-3 mx-5 my-5">
              <Search size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-base text-neutral-900 font-inter-regular"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <ScrollView className="max-h-80" nestedScrollEnabled={true}>
              {filteredData.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  className={`
                    px-5 py-4 border-b border-neutral-100
                    ${item[searchKey] === value ? 'bg-primary-50' : ''}
                  `}
                  onPress={() => {
                    onSelect(item[searchKey]);
                    setIsVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text 
                    weight={item[searchKey] === value ? 'semibold' : 'regular'}
                    color={item[searchKey] === value ? 'text-primary-600' : 'text-neutral-800'}
                  >
                    {item[displayKey]}
                  </Text>
                </TouchableOpacity>
              ))}
              {filteredData.length === 0 && (
                <View className="py-12 items-center">
                  <Text color="text-neutral-500">No results found</Text>
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
    <View>
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
        <View className="gap-5">
          <View>
            <Text variant="body-sm" weight="medium" color="text-neutral-700" className="mb-1.5">
              State/Province
            </Text>
            <TextInput
              className="bg-neutral-50 border border-neutral-300 rounded-lg px-4 py-3 text-base text-neutral-900 font-inter-regular"
              value={otherLocationInputs.state}
              onChangeText={(text) => handleOtherLocationChange('state', text)}
              placeholder="Enter state or province"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View>
            <Text variant="body-sm" weight="medium" color="text-neutral-700" className="mb-1.5">
              City
            </Text>
            <TextInput
              className="bg-neutral-50 border border-neutral-300 rounded-lg px-4 py-3 text-base text-neutral-900 font-inter-regular"
              value={otherLocationInputs.city}
              onChangeText={(text) => handleOtherLocationChange('city', text)}
              placeholder="Enter city"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View>
            <Text variant="body-sm" weight="medium" color="text-neutral-700" className="mb-1.5">
              Address
            </Text>
            <TextInput
              className="bg-neutral-50 border border-neutral-300 rounded-lg px-4 py-3 text-base text-neutral-900 font-inter-regular min-h-20"
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

export default LocationSelector;