import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { styled } from 'nativewind';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'body-sm' | 'caption' | 'button';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
}

const StyledText = styled(RNText);

export const Text: React.FC<TextProps> = ({ 
  variant = 'body', 
  weight = 'regular', 
  color = 'text-neutral-900',
  className = '',
  children,
  ...props 
}) => {
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'h1':
        return 'text-4xl';
      case 'h2':
        return 'text-3xl';
      case 'h3':
        return 'text-2xl';
      case 'h4':
        return 'text-xl';
      case 'h5':
        return 'text-lg';
      case 'h6':
        return 'text-base';
      case 'body':
        return 'text-base';
      case 'body-sm':
        return 'text-sm';
      case 'caption':
        return 'text-xs';
      case 'button':
        return 'text-base';
      default:
        return 'text-base';
    }
  };

  const getWeightClasses = (): string => {
    switch (weight) {
      case 'regular':
        return 'font-inter-regular';
      case 'medium':
        return 'font-inter-medium';
      case 'semibold':
        return 'font-inter-semibold';
      case 'bold':
        return 'font-inter-bold';
      default:
        return 'font-inter-regular';
    }
  };

  // Combine all classes
  const combinedClasses = `${getVariantClasses()} ${getWeightClasses()} ${color} ${className}`;

  return (
    <StyledText className={combinedClasses} {...props}>
      {children}
    </StyledText>
  );
};

export default Text;