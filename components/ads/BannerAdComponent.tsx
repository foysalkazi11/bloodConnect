import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { adMobService } from '@/services/adMobService';

interface BannerAdComponentProps {
  size?: BannerAdSize;
  unitId?: string;
  style?: any;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({
  size = BannerAdSize.BANNER,
  unitId,
  style,
}) => {
  const testAdUnitIds = adMobService.getTestAdUnitIds();
  const adUnitId = unitId || testAdUnitIds.banner;

  const handleAdLoaded = () => {
    console.log('Banner ad loaded successfully');
  };

  const handleAdFailedToLoad = (error: any) => {
    console.error('Banner ad failed to load:', error);
  };

  const handleAdOpened = () => {
    console.log('Banner ad opened');
  };

  const handleAdClosed = () => {
    console.log('Banner ad closed');
  };

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
        onAdOpened={handleAdOpened}
        onAdClosed={handleAdClosed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
});
