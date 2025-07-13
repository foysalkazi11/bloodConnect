/**
 * BloodConnect Theme Configuration
 * Centralized theme system for consistent design across the application
 * Optimized for medical/healthcare context with professional styling
 */

// Color palette optimized for BloodConnect (blood donation app)
export const colors = {
  // Primary colors - Red shades (blood theme)
  primary: {
    50: '#FEF2F2', // Very light red background
    100: '#FEE2E2', // Light red background
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Standard red
    600: '#DC2626', // Main brand red
    700: '#B91C1C', // Dark red
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A', // Very dark red
  },

  // Neutral colors - Gray shades (professional medical UI)
  secondary: {
    50: '#F9FAFB', // Light backgrounds
    100: '#F3F4F6', // Card backgrounds
    200: '#E5E7EB',
    300: '#D1D5DB', // Borders
    400: '#9CA3AF',
    500: '#6B7280', // Tertiary text
    600: '#4B5563',
    700: '#374151', // Secondary text
    800: '#1F2937',
    900: '#111827', // Primary text
    950: '#030712',
  },

  // Success colors - Green shades (approvals, donations)
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A', // Main success green
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },

  // Warning colors - Amber shades (pending requests)
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Main warning amber
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  // Error colors - Red shades (rejections, alerts)
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Main error red
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },

  // Info colors - Blue shades (informational)
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main info blue
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },

  // Common colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Typography - Inter font family for professional look
export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};

// Font sizes following design system
export const fontSizes = {
  xs: 12, // Small labels, badges
  sm: 14, // Caption, metadata
  md: 16, // Body text (main content)
  lg: 18, // Card titles (H3)
  xl: 20, // Section headers (H2)
  '2xl': 24, // Page titles (H1)
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
};

// Consistent spacing scale
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12, // Standard gap
  3.5: 14,
  4: 16, // Standard padding
  5: 20, // Large padding (px-5)
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
};

// Border radius for consistent rounded corners
export const borderRadius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12, // Standard card radius (rounded-xl)
  '2xl': 16,
  '3xl': 20,
  full: 9999, // Fully rounded (badges, avatars)
};

// Shadow system for depth and hierarchy
export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Z-index scale for layering
export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  auto: 'auto',
};

// Animation durations for smooth interactions
export const animationDurations = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Screen breakpoints for responsive design
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Main theme object combining all elements
export const theme = {
  colors,
  fonts,
  fontSizes,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  animationDurations,
  breakpoints,
};

// Utility function to safely access nested theme values
export function getThemeValue(path: string): any {
  const parts = path.split('.');
  let value: any = theme;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      console.warn(`Theme value not found: ${path}`);
      return undefined;
    }
  }

  return value;
}

// Helper function for color access (backward compatibility)
export const getColor = (colorPath: string): string => {
  const color = getThemeValue(`colors.${colorPath}`);
  return typeof color === 'string' ? color : '';
};

// BloodConnect specific theme shortcuts
export const bloodConnectTheme = {
  // Primary brand colors
  brand: {
    primary: colors.primary[600], // #DC2626
    primaryLight: colors.primary[50], // #FEF2F2
    primaryDark: colors.primary[700], // #B91C1C
  },

  // Text colors
  text: {
    primary: colors.secondary[900], // #111827
    secondary: colors.secondary[700], // #374151
    tertiary: colors.secondary[500], // #6B7280
    white: colors.white,
  },

  // Background colors
  background: {
    primary: colors.white,
    secondary: colors.secondary[50], // #F9FAFB
    card: colors.secondary[100], // #F3F4F6
  },

  // Border colors
  border: {
    default: colors.secondary[300], // #D1D5DB
    light: colors.secondary[100], // #F3F4F6
  },

  // Status colors
  status: {
    success: colors.success[600], // #16A34A
    warning: colors.warning[500], // #F59E0B
    error: colors.error[500], // #EF4444
    info: colors.info[500], // #3B82F6
  },
};

export default theme;
