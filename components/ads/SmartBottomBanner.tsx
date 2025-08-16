import React, { useState, useEffect, useRef } from 'react';
import { View, Animated, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { BannerAdComponent } from './BannerAdComponent';

interface SmartBottomBannerProps {
  scrollY?: Animated.Value;
  unitId?: string;
  enabled?: boolean;
}

export const SmartBottomBanner: React.FC<SmartBottomBannerProps> = ({
  scrollY,
  unitId,
  enabled = true,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Banner height calculation
  const bannerHeight = Platform.select({
    ios: 50,
    android: 50,
    default: 50,
  });

  const totalHeight = bannerHeight + insets.bottom;

  useEffect(() => {
    if (!scrollY || !enabled) return;

    const listener = scrollY.addListener(({ value }) => {
      const currentScrollY = value;
      const scrollDiff = currentScrollY - lastScrollY;

      // Hide banner when scrolling down (threshold: 20px)
      // Show banner when scrolling up or near top
      if (scrollDiff > 20 && currentScrollY > 100 && isVisible) {
        // Scrolling down - hide banner
        setIsVisible(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: totalHeight,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else if ((scrollDiff < -10 || currentScrollY < 50) && !isVisible) {
        // Scrolling up or near top - show banner
        setIsVisible(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }

      setLastScrollY(currentScrollY);
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [
    scrollY,
    lastScrollY,
    isVisible,
    enabled,
    fadeAnim,
    translateY,
    totalHeight,
  ]);

  if (!enabled) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        paddingBottom: insets.bottom,
        transform: [{ translateY }],
        opacity: fadeAnim,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
      }}
    >
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <BannerAdComponent
          size={BannerAdSize.BANNER}
          unitId={unitId}
          style={{
            width: Dimensions.get('window').width - 32,
          }}
        />
      </View>
    </Animated.View>
  );
};
