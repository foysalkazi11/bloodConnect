# AdMob Integration Guide for BloodConnect

## Overview

This guide explains how Google Mobile Ads are integrated into the BloodConnect app following the official [React Native Google Mobile Ads documentation](https://docs.page/invertase/react-native-google-mobile-ads).

## Configuration

### 1. Package Installation

- ✅ `react-native-google-mobile-ads` package installed via Expo
- ✅ Expo config plugin added to `app.json`

### 2. App Configuration (`app.json`)

- ✅ **AdMob App IDs**: Currently using test IDs for development
- ✅ **SKAdNetwork**: Complete list of identifiers for iOS conversion tracking
- ✅ **App Tracking Transparency**: User permission description configured
- ✅ **Static Frameworks**: Configured for compatibility with expo-build-properties

### 3. SDK Initialization

- ✅ AdMob SDK initializes automatically on app launch
- ✅ Child-friendly content settings (PG rating, COPPA compliance)
- ✅ European User Consent (GDPR) handling
- ✅ Test device configuration for development

## Available Ad Components

### 1. Banner Ads (`BannerAdComponent`)

```tsx
import { BannerAdComponent } from '@/components/ads';
import { BannerAdSize } from 'react-native-google-mobile-ads';

// Usage
<BannerAdComponent size={BannerAdSize.BANNER} />
<BannerAdComponent size={BannerAdSize.LARGE_BANNER} />
<BannerAdComponent size={BannerAdSize.MEDIUM_RECTANGLE} />
```

### 2. Interstitial Ads (`useInterstitialAd` Hook)

```tsx
import { useInterstitialAd } from '@/components/ads';

const MyComponent = () => {
  const interstitialAd = useInterstitialAd();

  const showAd = async () => {
    if (interstitialAd.isLoaded) {
      try {
        await interstitialAd.show();
      } catch (error) {
        console.error('Failed to show ad:', error);
      }
    }
  };

  return (
    <TouchableOpacity onPress={showAd} disabled={!interstitialAd.isLoaded}>
      <Text>Show Interstitial Ad</Text>
    </TouchableOpacity>
  );
};
```

### 3. Rewarded Ads (`useRewardedAd` Hook)

```tsx
import { useRewardedAd } from '@/components/ads';

const MyComponent = () => {
  const rewardedAd = useRewardedAd();

  const showRewardedAd = async () => {
    if (rewardedAd.isLoaded) {
      try {
        const reward = await rewardedAd.show();
        if (reward) {
          console.log(`User earned ${reward.amount} ${reward.type}`);
          // Grant reward to user
        }
      } catch (error) {
        console.error('Failed to show rewarded ad:', error);
      }
    }
  };

  return (
    <TouchableOpacity onPress={showRewardedAd} disabled={!rewardedAd.isLoaded}>
      <Text>Watch Ad for Reward</Text>
    </TouchableOpacity>
  );
};
```

## Recommended Ad Placements for BloodConnect

### 1. **Banner Ads**

- **Home Screen**: Bottom banner (non-intrusive)
- **Search Results**: Between search results
- **Profile Pages**: Bottom of profile content

### 2. **Interstitial Ads**

- **Navigation Transitions**: Between major sections (clubs → search)
- **After Actions**: After joining a club or completing profile
- **Time-based**: Every 3-5 minutes of active usage

### 3. **Rewarded Ads**

- **Premium Features**: Unlock advanced search filters
- **Enhanced Visibility**: Boost club/donor profiles
- **Remove Ads**: Temporary ad-free experience
- **Bonus Actions**: Extra daily blood requests for clubs

## Production Setup

### 1. Create Real AdMob Account

1. Visit [Google AdMob Console](https://admob.google.com/)
2. Create or select your app
3. Generate real Ad Unit IDs for each ad type
4. Update `app.json` with production App IDs

### 2. Update Ad Unit IDs

Replace test IDs in `services/adMobService.ts`:

```typescript
// Replace these with your real Ad Unit IDs
getProductionAdUnitIds() {
  return {
    banner: 'ca-app-pub-YOUR_PUB_ID/YOUR_BANNER_ID',
    interstitial: 'ca-app-pub-YOUR_PUB_ID/YOUR_INTERSTITIAL_ID',
    rewarded: 'ca-app-pub-YOUR_PUB_ID/YOUR_REWARDED_ID',
    // ... other ad types
  };
}
```

### 3. App Store Compliance

- ✅ **iOS**: App Tracking Transparency configured
- ✅ **Android**: Required permissions added
- ⚠️ **Play Console**: Remember to select "Yes, my app contains ads" before publishing

## Testing

### Current Setup

- Using Google's official test Ad Unit IDs
- Test device IDs configured for development
- All ad types functional and safe for testing

### Test Ad Unit IDs (Currently Used)

```typescript
Banner: ca - app - pub - 3940256099942544 / 6300978111(Android);
Banner: ca - app - pub - 3940256099942544 / 2934735716(iOS);
Interstitial: ca - app - pub - 3940256099942544 / 1033173712(Android);
Interstitial: ca - app - pub - 3940256099942544 / 4411468910(iOS);
Rewarded: ca - app - pub - 3940256099942544 / 5224354917(Android);
Rewarded: ca - app - pub - 3940256099942544 / 1712485313(iOS);
```

## Example Usage

Check `components/ads/AdExamples.tsx` for a complete demonstration of all ad types.

## Best Practices for Healthcare Apps

1. **Content Appropriateness**

   - ✅ PG-rated content only
   - ✅ COPPA compliance enabled
   - ✅ Child-directed treatment enabled

2. **User Experience**

   - Place ads strategically to avoid disrupting critical health information
   - Use rewarded ads for optional features, not essential functionality
   - Respect user privacy and consent preferences

3. **Monetization Strategy**
   - Banner ads for consistent revenue
   - Interstitial ads for natural break points
   - Rewarded ads for premium features
   - Consider ad-free subscriptions for power users

## Troubleshooting

### Common Issues

1. **Ads not showing**: Check network connection and ad unit IDs
2. **iOS build errors**: Ensure static frameworks are enabled
3. **GDPR compliance**: Verify consent management implementation
4. **Revenue optimization**: Monitor ad performance in AdMob console

### Debug Mode

- Test ads are enabled automatically in development
- Check console logs for ad loading/error events
- Use AdMob's testing tools to verify implementation

## Next Steps

1. **Create AdMob Account**: Set up your real AdMob account
2. **Generate Ad Units**: Create production ad unit IDs
3. **Implement Gradually**: Start with banner ads, then add interstitial/rewarded
4. **Monitor Performance**: Use AdMob analytics to optimize placements
5. **A/B Testing**: Test different ad placements and frequencies
