import React, { useState } from 'react';
import { View, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import Text from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  touched?: boolean;
  required?: boolean;
}

const StyledView = styled(View);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  isPassword = false,
  touched = false,
  required = false,
  className = '',
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = touched && error;
  const showSuccess = touched && !error && props.value && props.value.length > 0;

  const getBorderColorClass = (): string => {
    if (hasError) return 'border-error-500';
    if (showSuccess) return 'border-success-500';
    if (isFocused) return 'border-primary-500';
    return 'border-neutral-300';
  };

  const getBackgroundColorClass = (): string => {
    if (hasError) return 'bg-error-50';
    if (showSuccess) return 'bg-success-50';
    if (isFocused) return 'bg-white';
    return 'bg-neutral-50';
  };

  return (
    <StyledView className={`mb-4 ${className}`}>
      {label && (
        <StyledView className="flex-row mb-1.5">
          <Text variant="body-sm" weight="medium" color="text-neutral-700">
            {label}
          </Text>
          {required && (
            <Text variant="body-sm" weight="medium" color="text-error-500">
              {" *"}
            </Text>
          )}
        </StyledView>
      )}

      <StyledView 
        className={`
          flex-row 
          items-center 
          border 
          rounded-lg 
          px-3 
          py-2.5
          ${getBorderColorClass()} 
          ${getBackgroundColorClass()}
        `}
      >
        {leftIcon && (
          <StyledView className="mr-2">
            {leftIcon}
          </StyledView>
        )}

        <StyledTextInput
          className="flex-1 text-base text-neutral-900 font-inter-regular"
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            props.onBlur && props.onBlur(null as any);
          }}
          secureTextEntry={isPassword && !showPassword}
          style={[{ outlineStyle: 'none' }, style]}
          {...props}
        />

        {isPassword && (
          <StyledTouchableOpacity
            className="ml-2 p-1"
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={20} color="#6B7280" />
            ) : (
              <Eye size={20} color="#6B7280" />
            )}
          </StyledTouchableOpacity>
        )}

        {rightIcon && !isPassword && (
          <StyledView className="ml-2">
            {rightIcon}
          </StyledView>
        )}
      </StyledView>

      {hasError && (
        <StyledView className="flex-row items-center mt-1.5">
          <AlertCircle size={14} color="#EF4444" />
          <Text variant="caption" color="text-error-500" className="ml-1.5">
            {error}
          </Text>
        </StyledView>
      )}

      {helperText && !hasError && (
        <Text variant="caption" color="text-neutral-500" className="mt-1.5">
          {helperText}
        </Text>
      )}
    </StyledView>
  );
};

export default Input;