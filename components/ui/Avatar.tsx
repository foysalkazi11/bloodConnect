import React from 'react';
import { View, Text, Image, StyleSheet, ViewProps } from 'react-native';
import { colors, fonts, fontSizes } from '../theme';

interface AvatarProps extends ViewProps {
  size?: number;
  source?: { uri: string } | null;
  name?: string;
  backgroundColor?: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 40,
  source,
  name,
  backgroundColor,
  style,
  className = '',
  ...props
}) => {
  // Generate initials from name
  const getInitials = (fullName: string): string => {
    if (!fullName || fullName.trim().length === 0) return '?';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Generate consistent color based on name
  const getBackgroundColor = (fullName: string): string => {
    if (backgroundColor) return backgroundColor;
    
    const colors = [
      '#DC2626', // Red
      '#EA580C', // Orange
      '#D97706', // Amber
      '#65A30D', // Lime
      '#059669', // Emerald
      '#0891B2', // Cyan
      '#2563EB', // Blue
      '#7C3AED', // Violet
      '#C026D3', // Fuchsia
      '#E11D48', // Rose
    ];
    
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = name ? getInitials(name) : '?';
  const bgColor = name ? getBackgroundColor(name) : colors.secondary[400];
  const fontSize = size * 0.4; // 40% of avatar size

  return (
    <View
      className={className}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
      {...props}
    >
      {source?.uri ? (
        <Image
          source={source}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <Text style={[styles.initials, { fontSize }]}>
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontFamily: fonts.bold,
    color: colors.white,
  },
});

export default Avatar;