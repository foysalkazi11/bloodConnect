import React, { useState } from 'react';
import { View, TextInputProps } from 'react-native';
import { Eye, EyeOff, CircleAlert as AlertCircle } from 'lucide-react-native';
import { Input } from './ui';

interface ValidatedInputProps
  extends Omit<TextInputProps, 'onChangeText' | 'onBlur'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  isPassword?: boolean;
  required?: boolean;
  helpText?: string;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  touched,
  isPassword = false,
  required = false,
  helpText,
  style,
  ...props
}) => {
  const hasError = touched && error;
  const showSuccess = touched && !error && value.length > 0;

  const rightIcon = hasError ? (
    <AlertCircle size={20} color="#EF4444" />
  ) : undefined;

  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      error={error}
      touched={touched}
      isPassword={isPassword}
      required={required}
      helperText={helpText}
      rightIcon={rightIcon}
      style={style}
      {...props}
    />
  );
};

export default ValidatedInput;
