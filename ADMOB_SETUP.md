# AdMob Setup Guide for BloodConnect

## 🚨 Current Status: Development Mode

**The app is currently configured for development with AdMob disabled to prevent crashes.**

## 📱 Why the Android Simulator Was Crashing

The crash was caused by the AdMob SDK trying to initialize without proper App IDs. AdMob requires actual app IDs (not just test unit IDs) to initialize properly.

## 🛠 Current Development Configuration

- ✅ **Banner Ads**: Show placeholder in development
- ✅ **Native Ads**: Show placeholder in development
- ✅ **Interstitial Ads**: Disabled in development
- ✅ **Debug Panel**: Available for testing

## 🚀 Steps to Enable AdMob in Production

### Step 1: Create AdMob Account

1. Go to https://admob.google.com
2. Sign in with your Google account
3. Click "Get Started"

### Step 2: Add Your App

1. Click "Apps" in the left sidebar
2. Click "ADD APP"
3. Select "Android" and/or "iOS"
4. Enter app details:
   - **App name**: Blood Connect
   - **Platform**: Android/iOS
   - **Category**: Medical

### Step 3: Get App IDs

After creating your app, you'll get:

- **Android App ID**: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`
- **iOS App ID**: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`

### Step 4: Create Ad Units

1. Go to "Ad units" tab in your app
2. Create ad units for each format:
   - **Banner Ad Unit**
   - **Interstitial Ad Unit**
   - **Native Ad Unit** (optional)

### Step 5: Update app.json

```json
{
  "expo": {
    "react-native-google-mobile-ads": {
      "android_app_id": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
      "ios_app_id": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
    }
  }
}
```

### Step 6: Update Production Ad Unit IDs

In `services/adConfigService.ts`:

```typescript
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
```

### Step 7: Remove Development Flags

In `components/ads/AdMobComponents.tsx`, remove these development checks:

```typescript
// Remove this entire block:
if (__DEV__) {
  return (/* development placeholder */);
}
```

## 🧪 Testing in Development

Currently you can test the ad layout using placeholders:

1. **Run the app**: `npm run dev`
2. **Open Debug Panel**: Tap the red settings button
3. **View Ad Placements**: See placeholder ads throughout the app
4. **Test Ad Logic**: All tracking and placement logic works

## 📊 Revenue Estimates (Post-Setup)

With proper AdMob configuration:

- **1,000 DAU**: $50-150/month
- **5,000 DAU**: $250-750/month
- **10,000 DAU**: $500-1,500/month

## ⚠️ Important Notes

1. **App Store Approval**: Make sure ads comply with medical app guidelines
2. **User Experience**: Monitor user feedback after enabling ads
3. **Performance**: Test app performance with real ads
4. **Privacy**: Ensure GDPR compliance (currently configured)

## 🔧 Quick Fix for Current Crashes

The current configuration prevents crashes by:

- Showing placeholders instead of real ads in development
- Disabling AdMob SDK initialization
- Maintaining all ad placement logic for easy production enablement

## 📱 Testing on Device

To test on actual device with current setup:

```bash
npm run dev
# Then open Expo Go or development build
```

You should see:

- Gray placeholder banners with "[DEV] Banner Ad: placement_name"
- Blue native ad placeholders in lists
- No interstitial ads (logged to console)
- Working debug panel

---

**Ready for production?** Follow steps 1-7 above to enable real AdMob ads!
