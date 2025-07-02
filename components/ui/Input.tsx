import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps, 
  TouchableOpacity 
} from 'react-native';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  required?: boolean;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  isPassword = false,
  required = false,
  style,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => {
    setIsFocused(false);
    props.onBlur?.({} as any);
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const passwordIcon = showPassword ? (
    <EyeOff size={20} color={colors.secondary[500]} />
  ) : (
    <Eye size={20} color={colors.secondary[500]} />
  );

  return (
    <View className={className} style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || isPassword) && styles.inputWithRightIcon,
            style,
          ]}
          placeholderTextColor={colors.secondary[400]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        
        {isPassword ? (
          <TouchableOpacity 
            style={styles.rightIcon} 
            onPress={togglePasswordVisibility}
          >
            {passwordIcon}
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </View>
      
      {(error || helper) && (
        <View style={styles.messageContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={colors.error[600]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : helper ? (
            <Text style={styles.helperText}>{helper}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    color: colors.secondary[700],
    marginBottom: spacing[2],
  },
  required: {
    color: colors.error[600],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary[200],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
  },
  inputContainerFocused: {
    borderColor: colors.primary[600],
  },
  inputContainerError: {
    borderColor: colors.error[600],
    backgroundColor: colors.error[50],
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.secondary[900],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  inputWithLeftIcon: {
    paddingLeft: spacing[2],
  },
  inputWithRightIcon: {
    paddingRight: spacing[2],
  },
  leftIcon: {
    paddingLeft: spacing[3],
  },
  rightIcon: {
    paddingRight: spacing[3],
  },
  messageContainer: {
    marginTop: spacing[1],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.error[600],
    marginLeft: spacing[1],
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.secondary[500],
  },
});

export default Input;