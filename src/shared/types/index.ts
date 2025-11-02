// Global types and interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'moderator';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
  status: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType;
  children?: NavItem[];
}










