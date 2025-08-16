import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { BannerAdComponent, useInterstitialAd, useRewardedAd } from './index';

export const AdExamples: React.FC = () => {
  const interstitialAd = useInterstitialAd();
  const rewardedAd = useRewardedAd();

  const handleShowInterstitial = async () => {
    if (interstitialAd.isLoaded) {
      try {
        await interstitialAd.show();
      } catch (error) {
        Alert.alert('Error', 'Failed to show interstitial ad');
      }
    } else {
      Alert.alert('Ad Not Ready', 'Interstitial ad is still loading...');
    }
  };

  const handleShowRewarded = async () => {
    if (rewardedAd.isLoaded) {
      try {
        const reward = await rewardedAd.show();
        if (reward) {
          Alert.alert(
            'Reward Earned!',
            `You earned ${reward.amount} ${reward.type}`
          );
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to show rewarded ad');
      }
    } else {
      Alert.alert('Ad Not Ready', 'Rewarded ad is still loading...');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AdMob Integration Examples</Text>

      {/* Banner Ad Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Banner Ads</Text>

        <Text style={styles.label}>Standard Banner:</Text>
        <BannerAdComponent size={BannerAdSize.BANNER} />

        <Text style={styles.label}>Large Banner:</Text>
        <BannerAdComponent size={BannerAdSize.LARGE_BANNER} />

        <Text style={styles.label}>Medium Rectangle:</Text>
        <BannerAdComponent size={BannerAdSize.MEDIUM_RECTANGLE} />
      </View>

      {/* Interstitial Ad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interstitial Ad</Text>
        <TouchableOpacity
          style={[
            styles.button,
            !interstitialAd.isLoaded && styles.buttonDisabled,
          ]}
          onPress={handleShowInterstitial}
          disabled={!interstitialAd.isLoaded}
        >
          <Text style={styles.buttonText}>
            {interstitialAd.isLoading
              ? 'Loading...'
              : interstitialAd.isLoaded
              ? 'Show Interstitial Ad'
              : 'Ad Not Ready'}
          </Text>
        </TouchableOpacity>
        {interstitialAd.error && (
          <Text style={styles.errorText}>{interstitialAd.error}</Text>
        )}
      </View>

      {/* Rewarded Ad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rewarded Ad</Text>
        <TouchableOpacity
          style={[
            styles.button,
            styles.rewardedButton,
            !rewardedAd.isLoaded && styles.buttonDisabled,
          ]}
          onPress={handleShowRewarded}
          disabled={!rewardedAd.isLoaded}
        >
          <Text style={styles.buttonText}>
            {rewardedAd.isLoading
              ? 'Loading...'
              : rewardedAd.isLoaded
              ? 'Watch Ad for Reward'
              : 'Ad Not Ready'}
          </Text>
        </TouchableOpacity>
        {rewardedAd.error && (
          <Text style={styles.errorText}>{rewardedAd.error}</Text>
        )}
      </View>

      <Text style={styles.note}>
        Note: These are test ads. Replace with your own Ad Unit IDs for
        production.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#DC2626',
  },
  section: {
    marginBottom: 30,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
    color: '#666',
  },
  button: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  rewardedButton: {
    backgroundColor: '#10B981',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
});
