export const Colors = {
  primary: '#F5B800',
  primaryDark: '#D9A200',
  primaryLight: 'rgba(245,184,0,0.12)',
  accent: '#FF6B35',
  
  background: '#0e0e18',
  surface: '#181828',
  surfaceElevated: '#1e1e30',
  card: '#1a1a2e',
  
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',
  textDark: '#0e0e18',
  
  success: '#22c55e',
  successLight: 'rgba(34,197,94,0.12)',
  error: '#ef4444',
  errorLight: 'rgba(239,68,68,0.12)',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.15)',
  overlay: 'rgba(0,0,0,0.7)',
  
  white: '#FFFFFF',
  black: '#000000',
  
  // Vehicle type colors
  sedan: '#4f46e5',
  suv: '#059669',
  van: '#7c3aed',
  rideX: '#F5B800',
  rideXL: '#dc2626',
  ridePet: '#ec4899',
} as const;

export const Typography = {
  // Font sizes
  h1: 32,
  h2: 26,
  h3: 20,
  h4: 17,
  body: 15,
  bodyLarge: 17,
  bodyMedium: 15,
  bodySmall: 13,
  small: 13,
  xs: 11,
  caption: 12,
  subtitle: 14,
  button: 16,
  
  // Font families
  fontBold: '700',
  fontSemibold: '600',
  fontMedium: '500',
  fontRegular: '400',
} as const;

export const Spacing = {
  xs: 4,
  s: 8,
  sm: 8,
  m: 12,
  md: 12,
  l: 16,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const Radius = {
  s: 8,
  sm: 8,
  m: 12,
  md: 12,
  l: 16,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

