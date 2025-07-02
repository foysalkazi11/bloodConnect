import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator, View } from 'react-native';
import { styled } from 'nativewind';
import Text from './Text';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledView = styled(View);

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-600 border border-primary-600';
      case 'secondary':
        return 'bg-secondary-600 border border-secondary-600';
      case 'outline':
        return 'bg-transparent border border-primary-600';
      case 'ghost':
        return 'bg-transparent border border-transparent';
      default:
        return 'bg-primary-600 border border-primary-600';
    }
  };

  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm':
        return 'py-2 px-3';
      case 'md':
        return 'py-3 px-4';
      case 'lg':
        return 'py-4 px-6';
      default:
        return 'py-3 px-4';
    }
  };

  const getTextColor = (): string => {
    if (disabled) {
      return 'text-neutral-400';
    }
    
    switch (variant) {
      case 'primary':
      case 'secondary':
        return 'text-white';
      case 'outline':
        return 'text-primary-600';
      case 'ghost':
        return 'text-primary-600';
      default:
        return 'text-white';
    }
  };

  const getDisabledClasses = (): string => {
    if (!disabled) return '';
    
    switch (variant) {
      case 'primary':
      case 'secondary':
        return 'bg-neutral-200 border-neutral-200';
      case 'outline':
        return 'border-neutral-300';
      case 'ghost':
        return 'opacity-50';
      default:
        return 'bg-neutral-200 border-neutral-200';
    }
  };

  const getWidthClass = (): string => {
    return fullWidth ? 'w-full' : '';
  };

  // Combine all classes
  const combinedClasses = `
    rounded-xl
    flex-row
    items-center
    justify-center
    ${getSizeClasses()}
    ${getVariantClasses()}
    ${getDisabledClasses()}
    ${getWidthClass()}
    ${className}
  `;

  return (
    <StyledTouchableOpacity
      className={combinedClasses}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' || variant === 'ghost' ? '#DC2626' : '#FFFFFF'} 
        />
      ) : (
        <StyledView className="flex-row items-center justify-center">
          {leftIcon && <StyledView className="mr-2">{leftIcon}</StyledView>}
          
          {typeof children === 'string' ? (
            <Text 
              variant="button" 
              weight="semibold" 
              color={getTextColor()}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          
          {rightIcon && <StyledView className="ml-2">{rightIcon}</StyledView>}
        </StyledView>
      )}
    </StyledTouchableOpacity>
  );
};

export default Button;