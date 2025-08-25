#!/bin/bash

# BloodLink Production Build Script
# This script builds and prepares the app for app store submission

echo "🩸 BloodLink Production Build Script"
echo "====================================="

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed. Please install it first:"
    echo "npm install -g @expo/eas-cli"
    exit 1
fi

# Check if logged in to Expo
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to Expo. Please run: eas login"
    exit 1
fi

echo "✅ Environment check passed"

# Build for Android
echo "📱 Building Android app..."
eas build --platform android --profile production

if [ $? -eq 0 ]; then
    echo "✅ Android build completed successfully"
else
    echo "❌ Android build failed"
    exit 1
fi

# Build for iOS
echo "🍎 Building iOS app..."
eas build --platform ios --profile production

if [ $? -eq 0 ]; then
    echo "✅ iOS build completed successfully"
else
    echo "❌ iOS build failed"
    exit 1
fi

echo ""
echo "🎉 Production builds completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test the builds on real devices"
echo "2. Submit to app stores:"
echo "   - Android: eas submit --platform android --profile production"
echo "   - iOS: eas submit --platform ios --profile production"
echo ""
echo "📋 Remember to:"
echo "- Update app store descriptions"
echo "- Upload screenshots and assets"
echo "- Set up app store accounts"
echo "- Configure pricing and availability"
