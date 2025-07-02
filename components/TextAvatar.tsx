import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';

interface TextAvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
}

const StyledView = styled(View);
const StyledText = styled(Text);

export const TextAvatar: React.FC<TextAvatarProps> = ({
  name,
  size = 100,
  backgroundColor,
  textColor = '#FFFFFF',
  className = '',
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
      'bg-primary-600', // Red
      'bg-orange-600', // Orange
      'bg-amber-600', // Amber
      'bg-lime-600', // Lime
      'bg-emerald-600', // Emerald
      'bg-cyan-600', // Cyan
      'bg-blue-600', // Blue
      'bg-violet-600', // Violet
      'bg-fuchsia-600', // Fuchsia
      'bg-rose-600', // Rose
    ];
    
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name);
  const bgColorClass = getBackgroundColor(name);
  const fontSize = size * 0.4; // 40% of avatar size

  return (
    <StyledView
      className={`items-center justify-center shadow-sm ${bgColorClass} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
    >
      <StyledText
        className="font-inter-bold"
        style={{
          fontSize,
          color: textColor,
        }}
      >
        {initials}
      </StyledText>
    </StyledView>
  );
};

export default TextAvatar;