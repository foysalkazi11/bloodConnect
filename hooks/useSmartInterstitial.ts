import { useEffect, useCallback } from 'react';
import { useInterstitialAd } from '@/components/ads';
import { interstitialAdManager } from '@/services/interstitialAdManager';

export const useSmartInterstitial = () => {
  const interstitialAd = useInterstitialAd();

  // Preload an ad when hook initializes
  useEffect(() => {
    if (!interstitialAd.isLoaded && !interstitialAd.isLoading) {
      interstitialAd.load();
    }
  }, []);

  const showSearchAd = useCallback(async () => {
    try {
      if (!interstitialAdManager.shouldShowSearchAd()) {
        console.log(
          'SmartInterstitial: Skipping search ad (frequency/timing rules)'
        );
        return false;
      }

      if (!interstitialAd.isLoaded) {
        console.log(
          'SmartInterstitial: Search ad not loaded, preloading for next time'
        );
        interstitialAd.load();
        return false;
      }

      console.log('SmartInterstitial: Showing search ad');
      await interstitialAd.show();

      // Preload next ad
      setTimeout(() => {
        interstitialAd.load();
      }, 1000);

      return true;
    } catch (error) {
      console.error('SmartInterstitial: Failed to show search ad:', error);
      return false;
    }
  }, [interstitialAd]);

  const showJoinAd = useCallback(async () => {
    try {
      if (!interstitialAdManager.shouldShowJoinAd()) {
        console.log('SmartInterstitial: Skipping join ad (timing rules)');
        return false;
      }

      if (!interstitialAd.isLoaded) {
        console.log(
          'SmartInterstitial: Join ad not loaded, preloading for next time'
        );
        interstitialAd.load();
        return false;
      }

      console.log('SmartInterstitial: Showing join ad');
      await interstitialAd.show();

      // Preload next ad
      setTimeout(() => {
        interstitialAd.load();
      }, 1000);

      return true;
    } catch (error) {
      console.error('SmartInterstitial: Failed to show join ad:', error);
      return false;
    }
  }, [interstitialAd]);

  const resetSearchCount = useCallback(() => {
    interstitialAdManager.resetSearchCount();
  }, []);

  const shouldShowSearchAd = useCallback(() => {
    return interstitialAdManager.shouldShowSearchAd();
  }, []);

  const getStats = useCallback(() => {
    return interstitialAdManager.getStats();
  }, []);

  return {
    showSearchAd,
    showJoinAd,
    resetSearchCount,
    getStats,
    isLoaded: interstitialAd.isLoaded,
    isLoading: interstitialAd.isLoading,
    shouldShowSearchAd,
  };
};
