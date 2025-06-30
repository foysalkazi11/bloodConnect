import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TextAvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

export const TextAvatar: React.FC<TextAvatarProps> = ({
  name,
  size = 100,
  backgroundColor,
  textColor = '#FFFFFF',
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

  const initials = getInitials(name);
  const bgColor = getBackgroundColor(name);
  const fontSize = size * 0.4; // 40% of avatar size

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize,
            color: textColor,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  initials: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
  },
});

export default TextAvatar;