# Push Notifications Setup Guide

## 🚀 Quick Setup

Your BloodConnect app is now configured for push notifications! Follow these steps to enable them:

### 1. Configure Environment Variables

Add this to your `.env` file:

```env
# Push Notifications Configuration
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id
```

### 2. Get Your Expo Project ID

1. Go to [Expo Dashboard](https://expo.dev/)
2. Login with your Expo account
3. Find your project or create a new one
4. Copy the Project ID from the project settings
5. Add it to your `.env` file

### 3. Test Push Notifications

1. Build and run your app on a physical device (required for push notifications)
2. Navigate to `/debug-notifications` in your app
3. Use the debug interface to:
   - Request permissions
   - Initialize push notifications
   - Register push tokens
   - Send test notifications

## 🔧 Debug Interface

Access the debug screen by navigating to `/debug-notifications` in your app. This provides:

- **System Information**: Device type, platform, project ID status
- **Push Notification Status**: Current state and permissions
- **Actions**: Initialize, test, and troubleshoot push notifications
- **Database Tokens**: View registered push tokens

## 📱 Testing Direct Messages

Once push notifications are set up:

1. Make sure you're logged in on your device
2. Use the debug interface to register push tokens
3. Send a direct message from another account
4. You should receive a push notification

## 🐛 Troubleshooting

### No Push Tokens Found

If you see "No active push tokens found", it means:

- Push notification service wasn't initialized
- Device doesn't support push notifications (simulator)
- Permissions were denied
- Project ID is not configured

**Solution**: Use the debug interface to initialize and register tokens.

### Permissions Denied

If permissions are denied:

1. Check device notification settings
2. Ensure app has notification permissions
3. Use the debug interface to request permissions again

### Token Registration Failed

If token registration fails:

1. Check if `EXPO_PUBLIC_PROJECT_ID` is set
2. Ensure you're on a physical device
3. Check network connection
4. Try refreshing the token

## 📋 Current Status

✅ **App Configuration**: Updated with expo-notifications plugin
✅ **Database**: Push tokens table ready
✅ **Service**: Push notification service implemented
✅ **Debug Interface**: Ready for testing
✅ **Direct Messages**: Configured to send push notifications

## 🎯 Next Steps

1. Add `EXPO_PUBLIC_PROJECT_ID` to your `.env` file
2. Build and test on a physical device
3. Use the debug interface to register push tokens
4. Test direct message notifications

## 📞 Support

If you encounter issues:

1. Check the debug interface for detailed error messages
2. Verify all environment variables are set
3. Test on multiple devices if possible
4. Check Expo documentation for platform-specific requirements
