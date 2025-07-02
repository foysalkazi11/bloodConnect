import { colors } from 'tailwindcss/colors';

// Define the theme structure
export type ThemeColors = {
  primary: typeof colors.red;
  secondary: typeof colors.blue;
  success: typeof colors.green;
  warning: typeof colors.amber;
  error: typeof colors.red;
  neutral: typeof colors.gray;
};

// Export the theme colors for use in non-tailwind contexts
export const theme = {
  colors: {
    primary: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
      950: '#450A0A',
    },
    secondary: {
      50: '#F0F9FF',
      100: '#E0F2FE',
      200: '#BAE6FD',
      300: '#7DD3FC',
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1',
      800: '#075985',
      900: '#0C4A6E',
      950: '#082F49',
    },
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
      950: '#052E16',
    },
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
      950: '#451A03',
    },
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
      950: '#450A0A',
    },
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
      950: '#030712',
    },
  },
  fontFamily: {
    'inter-regular': 'Inter-Regular',
    'inter-medium': 'Inter-Medium',
    'inter-semibold': 'Inter-SemiBold',
    'inter-bold': 'Inter-Bold',
  },
  spacing: {
    // You can add custom spacing values here if needed
  },
  borderRadius: {
    // You can add custom border radius values here if needed
  },
};

// Helper functions to use the theme
export const getColor = (colorPath: string): string => {
  const parts = colorPath.split('.');
  let result: any = theme.colors;
  
  for (const part of parts) {
    if (result && result[part]) {
      result = result[part];
    } else {
      return '';
    }
  }
  
  return typeof result === 'string' ? result : '';
};

export default theme;