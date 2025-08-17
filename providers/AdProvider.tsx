import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useInterstitialAd } from '@/components/ads';
import { adFrequencyManager } from '@/services/adFrequencyManager';

interface AdContextType {
  // Interstitial Ad Methods
  showSearchAd: () => Promise<boolean>;
  showFirstTimeAd: () => Promise<boolean>;
  showJoinAd: () => Promise<boolean>;

  // Ad States
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  // Frequency Management
  resetSearchCount: () => void;
  shouldShowSearchAd: () => boolean;
  getStats: () => any;

  // Manual Controls
  loadAd: () => void;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

interface AdProviderProps {
  children: React.ReactNode;
}

export const AdProvider: React.FC<AdProviderProps> = ({ children }) => {
  const interstitialAd = useInterstitialAd();
  const [debugLogs, setDebugLogs] = useState(true);

  // Enhanced logging function
  const log = useCallback(
    (message: string, data?: any) => {
      if (debugLogs) {
        console.log(`[AdProvider] ${message}`, data || '');
      }
    },
    [debugLogs]
  );

  // Preload an ad when provider initializes
  useEffect(() => {
    if (!interstitialAd.isLoaded && !interstitialAd.isLoading) {
      log('Preloading ad on provider initialization');
      interstitialAd.load();
    }
  }, [
    interstitialAd.isLoaded,
    interstitialAd.isLoading,
    interstitialAd.load,
    log,
  ]);

  // Log ad state changes
  useEffect(() => {
    log('Ad state changed', {
      isLoaded: interstitialAd.isLoaded,
      isLoading: interstitialAd.isLoading,
      error: interstitialAd.error,
    });
  }, [
    interstitialAd.isLoaded,
    interstitialAd.isLoading,
    interstitialAd.error,
    log,
  ]);

  const showSearchAd = useCallback(async () => {
    try {
      log('Attempting to show search ad');

      // if (!adFrequencyManager.shouldShowSearchAd()) {
      //   log('Skipping search ad (frequency/timing rules)');
      //   return false;
      // }

      if (!interstitialAd.isLoaded) {
        log('Search ad not loaded, preloading for next time');
        interstitialAd.load();
        return false;
      }

      log('Showing search ad');
      await interstitialAd.show();

      // Preload next ad
      setTimeout(() => {
        log('Preloading next ad after search ad');
        interstitialAd.load();
      }, 1000);

      return true;
    } catch (error) {
      log('Failed to show search ad', error);
      return false;
    }
  }, [interstitialAd, log]);

  const showFirstTimeAd = useCallback(
    async (retryCount = 0) => {
      try {
        log('Attempting to show first-time ad', {
          isLoaded: interstitialAd.isLoaded,
          retryCount,
        });

        if (!interstitialAd.isLoaded) {
          log('First-time ad not loaded, preloading...');

          // Load the ad if not already loading
          if (!interstitialAd.isLoading) {
            interstitialAd.load();
          }

          // Retry after a delay if we haven't exceeded retry limit
          if (retryCount < 3) {
            log(
              `Retrying first-time ad in 2 seconds (attempt ${
                retryCount + 1
              }/3)`
            );
            setTimeout(() => {
              showFirstTimeAd(retryCount + 1);
            }, 2000);
          } else {
            log('Max retries reached for first-time ad');
          }

          return false;
        }

        log('Showing first-time visit ad');
        await interstitialAd.show();

        // Preload next ad
        setTimeout(() => {
          log('Preloading next ad after first-time ad');
          interstitialAd.load();
        }, 1000);

        return true;
      } catch (error) {
        log('Failed to show first-time ad', error);
        return false;
      }
    },
    [interstitialAd, log]
  );

  const showJoinAd = useCallback(async () => {
    try {
      log('Attempting to show join ad');

      if (!adFrequencyManager.shouldShowJoinAd()) {
        log('Skipping join ad (timing rules)');
        return false;
      }

      if (!interstitialAd.isLoaded) {
        log('Join ad not loaded, preloading for next time');
        interstitialAd.load();
        return false;
      }

      log('Showing join ad');
      await interstitialAd.show();

      // Preload next ad
      setTimeout(() => {
        log('Preloading next ad after join ad');
        interstitialAd.load();
      }, 1000);

      return true;
    } catch (error) {
      log('Failed to show join ad', error);
      return false;
    }
  }, [interstitialAd, log]);

  const resetSearchCount = useCallback(() => {
    log('Resetting search count');
    adFrequencyManager.resetSearchCount();
  }, [log]);

  const shouldShowSearchAd = useCallback(() => {
    const should = adFrequencyManager.shouldShowSearchAd();
    log('Checking if should show search ad', { should });
    return should;
  }, [log]);

  const getStats = useCallback(() => {
    const stats = adFrequencyManager.getStats();
    log('Getting ad stats', stats);
    return stats;
  }, [log]);

  const loadAd = useCallback(() => {
    log('Manual ad load requested');
    interstitialAd.load();
  }, [interstitialAd.load, log]);

  const value: AdContextType = {
    // Interstitial Ad Methods
    showSearchAd,
    showFirstTimeAd,
    showJoinAd,

    // Ad States
    isLoaded: interstitialAd.isLoaded,
    isLoading: interstitialAd.isLoading,
    error: interstitialAd.error,

    // Frequency Management
    resetSearchCount,
    shouldShowSearchAd,
    getStats,

    // Manual Controls
    loadAd,
  };

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
};

export const useAds = (): AdContextType => {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
};
