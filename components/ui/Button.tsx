import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { colors, fonts, fontSizes, spacing, borderRadius } from '@/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled = false,
  className = '',
  style,
  ...props
}) => {
  // Get styles based on variant and size
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.button_fullWidth,
    (disabled || loading) && styles.button_disabled,
    (disabled || loading) && styles[`button_disabled_${variant}`],
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    (disabled || loading) && styles.text_disabled,
    (disabled || loading) && styles[`text_disabled_${variant}`],
  ];

  return (
    <TouchableOpacity
      className={className}
      style={buttonStyles}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary[600]}
        />
      ) : (
        <View style={styles.contentContainer}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={textStyles}>{children}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  button_primary: {
    backgroundColor: colors.primary[600],
  },
  button_secondary: {
    backgroundColor: colors.secondary[100],
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary[600],
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  button_link: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  button_sm: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  button_md: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  button_lg: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
  },
  button_fullWidth: {
    width: '100%',
  },
  button_disabled: {
    opacity: 0.6,
  },
  button_disabled_primary: {
    backgroundColor: colors.secondary[400],
  },
  button_disabled_secondary: {},
  button_disabled_outline: {
    borderColor: colors.secondary[400],
  },
  button_disabled_ghost: {},
  button_disabled_link: {},
  text: {
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
  text_primary: {
    color: colors.white,
  },
  text_secondary: {
    color: colors.secondary[900],
  },
  text_outline: {
    color: colors.primary[600],
  },
  text_ghost: {
    color: colors.primary[600],
  },
  text_link: {
    color: colors.primary[600],
  },
  text_sm: {
    fontSize: fontSizes.sm,
  },
  text_md: {
    fontSize: fontSizes.md,
  },
  text_lg: {
    fontSize: fontSizes.lg,
  },
  text_disabled: {},
  text_disabled_primary: {
    color: colors.white,
  },
  text_disabled_secondary: {
    color: colors.secondary[500],
  },
  text_disabled_outline: {
    color: colors.secondary[500],
  },
  text_disabled_ghost: {
    color: colors.secondary[500],
  },
  text_disabled_link: {
    color: colors.secondary[500],
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing[2],
  },
  iconRight: {
    marginLeft: spacing[2],
  },
});

export default Button;
