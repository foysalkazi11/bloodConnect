import { useEffect, useState } from 'react';
import {
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { adMobService } from '@/services/adMobService';

interface RewardedAdReward {
  type: string;
  amount: number;
}

interface UseRewardedAdResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  show: () => Promise<RewardedAdReward | null>;
  load: () => void;
}

export const useRewardedAd = (unitId?: string): UseRewardedAdResult => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewardedAd, setRewardedAd] = useState<RewardedAd | null>(null);
  const [lastReward, setLastReward] = useState<RewardedAdReward | null>(null);

  const testAdUnitIds = adMobService.getTestAdUnitIds();
  const adUnitId = unitId || testAdUnitIds.rewarded;

  useEffect(() => {
    const ad = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Rewarded ad loaded');
      setIsLoaded(true);
      setIsLoading(false);
      setError(null);
    });

    const unsubscribeError = ad.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.error('Rewarded ad error:', error);
        setIsLoaded(false);
        setIsLoading(false);
        setError(error.message || 'Failed to load ad');
      }
    );

    const unsubscribeOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
      console.log('Rewarded ad opened');
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Rewarded ad closed');
      setIsLoaded(false);
      // Automatically load a new ad
      load();
    });

    const unsubscribeEarnedReward = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('User earned reward:', reward);
        setLastReward(reward);
      }
    );

    setRewardedAd(ad);

    // Clean up listeners on unmount
    return () => {
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeOpened();
      unsubscribeClosed();
      unsubscribeEarnedReward();
    };
  }, [adUnitId]);

  const load = () => {
    if (!rewardedAd) return;

    setIsLoading(true);
    setError(null);
    setLastReward(null);
    rewardedAd.load();
  };

  const show = async (): Promise<RewardedAdReward | null> => {
    if (!rewardedAd || !isLoaded) {
      throw new Error('Rewarded ad is not loaded');
    }

    try {
      setLastReward(null);
      await rewardedAd.show();

      // Return the reward that was earned (will be set by the event listener)
      return lastReward;
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      throw error;
    }
  };

  // Load the first ad
  useEffect(() => {
    if (rewardedAd && !isLoaded && !isLoading) {
      load();
    }
  }, [rewardedAd]);

  return {
    isLoaded,
    isLoading,
    error,
    show,
    load,
  };
};
