import { useEffect, useState } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { adMobService } from '@/services/adMobService';

interface UseInterstitialAdResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  show: () => Promise<void>;
  load: () => void;
}

export const useInterstitialAd = (unitId?: string): UseInterstitialAdResult => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);

  const testAdUnitIds = adMobService.getTestAdUnitIds();
  const adUnitId = unitId || testAdUnitIds.interstitial;

  useEffect(() => {
    const ad = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Interstitial ad loaded');
      setIsLoaded(true);
      setIsLoading(false);
      setError(null);
    });

    const unsubscribeError = ad.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.error('Interstitial ad error:', error);
        setIsLoaded(false);
        setIsLoading(false);
        setError(error.message || 'Failed to load ad');
      }
    );

    const unsubscribeOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
      console.log('Interstitial ad opened');
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Interstitial ad closed');
      setIsLoaded(false);
      // Automatically load a new ad
      load();
    });

    setInterstitial(ad);

    // Clean up listeners on unmount
    return () => {
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeOpened();
      unsubscribeClosed();
    };
  }, [adUnitId]);

  const load = () => {
    if (!interstitial) return;

    setIsLoading(true);
    setError(null);
    interstitial.load();
  };

  const show = async (): Promise<void> => {
    if (!interstitial || !isLoaded) {
      throw new Error('Interstitial ad is not loaded');
    }

    try {
      await interstitial.show();
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      throw error;
    }
  };

  // Load the first ad
  useEffect(() => {
    if (interstitial && !isLoaded && !isLoading) {
      load();
    }
  }, [interstitial]);

  return {
    isLoaded,
    isLoading,
    error,
    show,
    load,
  };
};
