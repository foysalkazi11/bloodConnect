import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
} from 'react-native';
import { colors, fonts, fontSizes } from '@/theme';

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body'
  | 'body-sm'
  | 'body-lg'
  | 'caption'
  | 'label';

export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: string;
  className?: string;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  weight = 'regular',
  color,
  style,
  className = '',
  ...props
}) => {
  return (
    <RNText
      className={className}
      style={[styles[variant], styles[weight], color ? { color } : {}, style]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  // Variants
  h1: {
    fontSize: fontSizes['4xl'],
    lineHeight: fontSizes['4xl'] * 1.2,
    color: colors.secondary[900],
  },
  h2: {
    fontSize: fontSizes['3xl'],
    lineHeight: fontSizes['3xl'] * 1.2,
    color: colors.secondary[900],
  },
  h3: {
    fontSize: fontSizes['2xl'],
    lineHeight: fontSizes['2xl'] * 1.2,
    color: colors.secondary[900],
  },
  h4: {
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * 1.2,
    color: colors.secondary[900],
  },
  h5: {
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.2,
    color: colors.secondary[900],
  },
  h6: {
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.2,
    color: colors.secondary[900],
  },
  body: {
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    color: colors.secondary[700],
  },
  'body-sm': {
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    color: colors.secondary[700],
  },
  'body-lg': {
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.5,
    color: colors.secondary[700],
  },
  caption: {
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    color: colors.secondary[500],
  },
  label: {
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.2,
    color: colors.secondary[700],
  },

  // Weights
  regular: {
    fontFamily: fonts.regular,
  },
  medium: {
    fontFamily: fonts.medium,
  },
  semibold: {
    fontFamily: fonts.semiBold,
  },
  bold: {
    fontFamily: fonts.bold,
  },
});

export default Text;
