import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { colors, fonts, fontSizes, spacing, borderRadius } from '@/theme';

type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  label: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  label,
  style,
  className = '',
  ...props
}) => {
  return (
    <View
      className={className}
      style={[
        styles.badge,
        styles[`badge_${variant}`],
        styles[`badge_${size}`],
        style,
      ]}
      {...props}
    >
      <Text
        style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`]]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badge_primary: {
    backgroundColor: colors.primary[100],
  },
  badge_secondary: {
    backgroundColor: colors.secondary[100],
  },
  badge_success: {
    backgroundColor: colors.success[100],
  },
  badge_warning: {
    backgroundColor: colors.warning[100],
  },
  badge_error: {
    backgroundColor: colors.error[100],
  },
  badge_info: {
    backgroundColor: colors.info[100],
  },
  badge_sm: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
  },
  badge_md: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  badge_lg: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  text: {
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  text_primary: {
    color: colors.primary[700],
  },
  text_secondary: {
    color: colors.secondary[700],
  },
  text_success: {
    color: colors.success[700],
  },
  text_warning: {
    color: colors.warning[700],
  },
  text_error: {
    color: colors.error[700],
  },
  text_info: {
    color: colors.info[700],
  },
  text_sm: {
    fontSize: fontSizes.xs,
  },
  text_md: {
    fontSize: fontSizes.sm,
  },
  text_lg: {
    fontSize: fontSizes.md,
  },
});

export default Badge;
