import React from 'react';
import { View, ViewProps } from 'react-native';
import { styled } from 'nativewind';

export interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const StyledView = styled(View);

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'elevated':
        return 'bg-white border border-neutral-100 shadow-sm';
      case 'outlined':
        return 'bg-white border border-neutral-200';
      case 'filled':
        return 'bg-neutral-50';
      default:
        return 'bg-white border border-neutral-100 shadow-sm';
    }
  };

  const getPaddingClasses = (): string => {
    switch (padding) {
      case 'none':
        return 'p-0';
      case 'sm':
        return 'p-3';
      case 'md':
        return 'p-4';
      case 'lg':
        return 'p-6';
      default:
        return 'p-4';
    }
  };

  // Combine all classes
  const combinedClasses = `
    rounded-xl
    overflow-hidden
    ${getVariantClasses()}
    ${getPaddingClasses()}
    ${className}
  `;

  return (
    <StyledView className={combinedClasses} {...props}>
      {children}
    </StyledView>
  );
};

export default Card;