import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// Test Ad Unit IDs (replace with production IDs later)
const AD_UNIT_IDS = {
  banner: __DEV__ ? TestIds.BANNER : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  interstitial: __DEV__
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
};

interface BannerAdComponentProps {
  placement:
    | 'home_stats'
    | 'home_bottom'
    | 'search_results'
    | 'gallery_top'
    | 'profile_stats';
  style?: any;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({
  placement,
  style,
}) => {
  const [adError, setAdError] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

  if (adError) {
    return null; // Hide ad if there's an error
  }

  return (
    <View
      className="items-center justify-center py-4 bg-gray-50 rounded-xl mx-4 my-3"
      style={style}
    >
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.LARGE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // GDPR compliance
        }}
        onAdLoaded={() => {
          setAdLoaded(true);
          console.log(`Banner ad loaded: ${placement}`);
        }}
        onAdFailedToLoad={(error) => {
          console.log(`Banner ad failed to load (${placement}):`, error);
          setAdError(true);
        }}
        onAdOpened={() => {
          console.log(`Banner ad opened: ${placement}`);
        }}
      />

      {/* Show small "Ad" label for transparency */}
      {adLoaded && (
        <Text className="text-xs text-gray-500 mt-1 font-medium">
          Advertisement
        </Text>
      )}
    </View>
  );
};

interface NativeAdPlaceholderProps {
  index: number;
  placement: string;
}

// Placeholder for native ads (more complex implementation needed)
export const NativeAdPlaceholder: React.FC<NativeAdPlaceholderProps> = ({
  index,
  placement,
}) => {
  return (
    <View className="bg-blue-50 rounded-xl p-4 mx-4 my-2 border border-blue-200">
      <View className="flex-row items-center mb-3">
        <View className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3">
          <Text className="text-white text-xs font-bold">Ad</Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-blue-800">Health & Wellness</Text>
          <Text className="text-xs text-blue-600">Sponsored Content</Text>
        </View>
      </View>

      <TouchableOpacity
        className="bg-blue-100 p-3 rounded-lg"
        onPress={() => {
          console.log(`Native ad clicked: ${placement}_${index}`);
        }}
      >
        <Text className="font-semibold text-lg mb-2 text-blue-900">
          Stay Healthy, Save Lives
        </Text>
        <Text className="text-blue-700 mb-3">
          Discover health tips and wellness products for blood donors
        </Text>
        <Text className="text-blue-600 font-medium">Learn More →</Text>
      </TouchableOpacity>
    </View>
  );
};
