import { Platform } from 'react-native';

export interface AdConfiguration {
  enabled: boolean;
  bannerAds: {
    enabled: boolean;
    frequency: number; // seconds between banner refreshes
    placements: string[];
  };
  interstitialAds: {
    enabled: boolean;
    minInterval: number; // minimum seconds between ads
    triggers: string[];
  };
  nativeAds: {
    enabled: boolean;
    frequency: number; // every N items in lists
  };
  targeting: {
    personalizedAds: boolean;
    healthContentOnly: boolean;
    locationBased: boolean;
  };
}

const DEFAULT_CONFIG: AdConfiguration = {
  enabled: true,
  bannerAds: {
    enabled: true,
    frequency: 60, // 1 minute
    placements: [
      'home_stats',
      'home_bottom',
      'search_results',
      'gallery_top',
      'profile_stats',
    ],
  },
  interstitialAds: {
    enabled: true,
    minInterval: 180, // 3 minutes
    triggers: [
      'donor_contact',
      'profile_complete',
      'club_join',
      'blood_search',
    ],
  },
  nativeAds: {
    enabled: true,
    frequency: 8, // every 8 items
  },
  targeting: {
    personalizedAds: false, // Healthcare privacy compliance
    healthContentOnly: true,
    locationBased: true, // City-level only
  },
};

export class AdConfigService {
  private static config: AdConfiguration = DEFAULT_CONFIG;

  static getConfig(): AdConfiguration {
    return { ...this.config };
  }

  static updateConfig(updates: Partial<AdConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }

  static isBannerEnabled(placement: string): boolean {
    return (
      this.config.enabled &&
      this.config.bannerAds.enabled &&
      this.config.bannerAds.placements.includes(placement)
    );
  }

  static isInterstitialEnabled(trigger: string): boolean {
    return (
      this.config.enabled &&
      this.config.interstitialAds.enabled &&
      this.config.interstitialAds.triggers.includes(trigger)
    );
  }

  static isNativeAdEnabled(): boolean {
    return this.config.enabled && this.config.nativeAds.enabled;
  }

  static getNativeAdFrequency(): number {
    return this.config.nativeAds.frequency;
  }

  static getInterstitialMinInterval(): number {
    return this.config.interstitialAds.minInterval * 1000; // Convert to milliseconds
  }

  static getAdRequestOptions() {
    return {
      requestNonPersonalizedAdsOnly: !this.config.targeting.personalizedAds,
      contentUrl: this.config.targeting.healthContentOnly
        ? 'health-wellness'
        : undefined,
      keywords: this.config.targeting.healthContentOnly
        ? ['health', 'wellness', 'medical', 'donation']
        : [],
    };
  }

  // Respect user's app tracking settings on iOS
  static async checkTrackingPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      try {
        // This would require additional setup for App Tracking Transparency
        // For now, we default to non-personalized ads
        return false;
      } catch {
        return false;
      }
    }
    return !this.config.targeting.personalizedAds;
  }

  // Get appropriate test IDs for development
  static getTestIds() {
    return {
      banner: 'ca-app-pub-3940256099942544/6300978111',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
      native: 'ca-app-pub-3940256099942544/2247696110',
    };
  }

  // Production ad unit IDs (replace with your actual IDs)
  static getProductionIds() {
    return {
      android: {
        banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        native: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      },
      ios: {
        banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        native: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      },
    };
  }

  static getAdUnitId(type: 'banner' | 'interstitial' | 'native'): string {
    if (__DEV__) {
      return this.getTestIds()[type];
    }

    const platformIds =
      Platform.OS === 'ios'
        ? this.getProductionIds().ios
        : this.getProductionIds().android;

    return platformIds[type];
  }

  // Analytics tracking
  static trackAdEvent(
    event: 'impression' | 'click' | 'error',
    adType: string,
    placement?: string
  ) {
    console.log(
      `Ad Event: ${event} - ${adType}${placement ? ` (${placement})` : ''}`
    );

    // Here you can integrate with your analytics service
    // Example: Firebase Analytics, Mixpanel, etc.
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'ad_interaction', {
        event_category: 'ads',
        event_label: `${adType}_${event}`,
        custom_parameter_1: placement || 'unknown',
      });
    }
  }

  // Revenue tracking
  static trackRevenue(
    amount: number,
    currency: string = 'USD',
    adType: string
  ) {
    console.log(`Ad Revenue: ${amount} ${currency} from ${adType}`);

    // Integrate with revenue tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: `ad_${Date.now()}`,
        value: amount,
        currency: currency,
        item_category: 'advertising',
        item_name: adType,
      });
    }
  }

  // User feedback and optimization
  static reportAdFeedback(
    feedback: 'relevant' | 'irrelevant' | 'intrusive' | 'appropriate',
    placement: string
  ) {
    console.log(`Ad Feedback: ${feedback} for ${placement}`);

    // Use feedback to optimize ad placements
    // Could trigger configuration updates
  }

  // A/B testing support
  static getAdVariant(): 'control' | 'variant_a' | 'variant_b' {
    const random = Math.random();
    if (random < 0.33) return 'control';
    if (random < 0.66) return 'variant_a';
    return 'variant_b';
  }
}
