/**
 * Theme Configuration
 * Set ENABLE_CHRISTMAS_THEME to true to enable Christmas & New Year theme
 * Theme will be applied to login page and dashboard pages only
 */
export const THEME_CONFIG = {
  ENABLE_CHRISTMAS_THEME: true, // Set to false to disable Christmas theme
} as const;

export const CHRISTMAS_COLORS = {
  primary: '#DC2626', // Red-600
  secondary: '#B91C1C', // Red-700
  accent: '#EF4444', // Red-500
  light: '#FEE2E2', // Red-100
  dark: '#991B1B', // Red-800
  gold: '#F59E0B', // Amber-500
  green: '#16A34A', // Green-600
  white: '#FFFFFF',
  background: '#FEF2F2', // Red-50
  gradient: {
    from: '#DC2626',
    via: '#B91C1C',
    to: '#991B1B',
  },
} as const;



