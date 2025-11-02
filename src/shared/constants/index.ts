// Application constants
export const APP_CONFIG = {
  name: 'Urvann Growth Automation',
  version: '1.0.0',
  description: 'Growth automation platform for Urvann',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
  },
  users: {
    list: '/api/users',
    create: '/api/users',
    update: '/api/users/:id',
    delete: '/api/users/:id',
  },
  analytics: {
    dashboard: '/api/analytics/dashboard',
    reports: '/api/analytics/reports',
  },
} as const;

// Routes
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  analytics: '/analytics',
  settings: '/settings',
  profile: '/profile',
  login: '/auth/login',
  register: '/auth/register',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  theme: 'urvann-theme',
  user: 'urvann-user',
  token: 'urvann-token',
  preferences: 'urvann-preferences',
} as const;

// Validation rules
export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
  },
} as const;

// UI constants
export const UI_CONFIG = {
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
  },
} as const;










