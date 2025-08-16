import mobileAds, {
  MaxAdContentRating,
  AdsConsent,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

class AdMobService {
  private isInitialized = false;
  private isInitializing = false;

  /**
   * Initialize the Google Mobile Ads SDK
   * This should be called once at app startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      console.log('AdMobService: Already initialized or initializing');
      return;
    }

    this.isInitializing = true;

    try {
      console.log('AdMobService: Initializing Google Mobile Ads SDK...');

      // Request configuration for child-friendly content (suitable for health apps)
      await mobileAds().setRequestConfiguration({
        // Update all future requests suitable for parental guidance
        maxAdContentRating: MaxAdContentRating.PG,

        // Indicates that you want your content treated as child-directed for purposes of COPPA
        tagForChildDirectedTreatment: true,

        // Indicates that you want the ad request to be handled in a manner suitable for users under the age of consent
        tagForUnderAgeOfConsent: true,

        // An array of test device IDs to allow (empty for production)
        testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
      });

      // Handle European User Consent if needed
      await this.handleUserConsent();

      // Initialize the SDK
      const adapterStatuses = await mobileAds().initialize();

      console.log('AdMobService: Initialization complete!', adapterStatuses);
      this.isInitialized = true;
    } catch (error) {
      console.error('AdMobService: Initialization failed:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Handle European User Consent (GDPR compliance)
   */
  private async handleUserConsent(): Promise<void> {
    try {
      const consentInfo = await AdsConsent.requestInfoUpdate();

      if (consentInfo.canRequestAds) {
        console.log('AdMobService: User can view ads');
        return;
      }

      if (consentInfo.status === AdsConsentStatus.REQUIRED) {
        console.log('AdMobService: User consent required');

        // Show consent form if required
        try {
          await AdsConsent.loadAndShowConsentFormIfRequired();
          console.log('AdMobService: Consent form handled');
        } catch (formError) {
          console.log(
            'AdMobService: Consent form not available or error:',
            formError
          );
        }
      }
    } catch (error) {
      console.error('AdMobService: Consent handling failed:', error);
      // Don't throw - allow ads to continue with limited functionality
    }
  }

  /**
   * Request App Tracking Transparency permission (iOS only)
   */
  async requestTrackingPermission(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      // Note: You'll need to install react-native-permissions for this
      // For now, we'll log that this should be implemented
      console.log(
        'AdMobService: App Tracking Transparency should be requested here'
      );

      // Example implementation:
      // import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
      // const result = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
      // if (result === RESULTS.DENIED) {
      //   await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
      // }
    } catch (error) {
      console.error('AdMobService: ATT request failed:', error);
    }
  }

  /**
   * Check if the SDK is initialized
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Get test ad unit IDs for development
   */
  getTestAdUnitIds() {
    return {
      banner: Platform.select({
        ios: 'ca-app-pub-3940256099942544/2934735716',
        android: 'ca-app-pub-3940256099942544/6300978111',
        default: 'ca-app-pub-3940256099942544/6300978111',
      }),
      interstitial: Platform.select({
        ios: 'ca-app-pub-3940256099942544/4411468910',
        android: 'ca-app-pub-3940256099942544/1033173712',
        default: 'ca-app-pub-3940256099942544/1033173712',
      }),
      rewarded: Platform.select({
        ios: 'ca-app-pub-3940256099942544/1712485313',
        android: 'ca-app-pub-3940256099942544/5224354917',
        default: 'ca-app-pub-3940256099942544/5224354917',
      }),
      rewardedInterstitial: Platform.select({
        ios: 'ca-app-pub-3940256099942544/6978759866',
        android: 'ca-app-pub-3940256099942544/5354046379',
        default: 'ca-app-pub-3940256099942544/5354046379',
      }),
      appOpen: Platform.select({
        ios: 'ca-app-pub-3940256099942544/5662855259',
        android: 'ca-app-pub-3940256099942544/3419835294',
        default: 'ca-app-pub-3940256099942544/3419835294',
      }),
    };
  }
}

export const adMobService = new AdMobService();
