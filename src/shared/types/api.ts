// API Types for Urvann External API and Internal Auth

// Generic API Response type
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'team_member';
  avatar?: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface RegisterResponse {
  user: AuthUser;
  token: string;
}

export interface RefreshTokenResponse {
  token: string;
}

export interface LogoutResponse {
  message: string;
}

// Urvann External API Types
export interface UrvannFilter {
  field: string;
  operator: string;
  value: string;
}

export interface UrvannProductsRequest {
  filters: UrvannFilter[];
  fields: Record<string, number>;
  limit: number;
}

export interface UrvannProductsResponse {
  data: any[];
  total: number;
}

export interface CategoryProductCount {
  category: string;
  hubCounts: Record<string, number>; // e.g. { "bgl s1": 100, "s2": 50 }
}