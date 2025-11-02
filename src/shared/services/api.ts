// API service utilities
import { API_ENDPOINTS } from '../constants';
import type { ApiResponse, LoginResponse, RegisterResponse, RefreshTokenResponse, LogoutResponse } from '../types/api';

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    // Use environment variables for API URL
    this.baseURL = typeof window !== 'undefined' 
      ? '/api'  // Client-side: use relative URLs
      : 'http://localhost:3000/api';  // Server-side: use full URL
      
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData.code
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'An unknown error occurred',
        0
      );
    }
  }

  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    console.log('API Service - Auth token set:', `Bearer ${token.substring(0, 20)}...`);
  }

  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }
}

// Create a singleton instance
export const apiService = new ApiService();

// Auth service
export const authService = {
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
  },

  async register(userData: { name: string; email: string; password: string }): Promise<ApiResponse<RegisterResponse>> {
    return apiService.post<ApiResponse<RegisterResponse>>('/auth/register', userData);
  },

  async logout(): Promise<ApiResponse<LogoutResponse>> {
    return apiService.post<ApiResponse<LogoutResponse>>('/auth/logout');
  },

  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    return apiService.post<ApiResponse<RefreshTokenResponse>>('/auth/refresh');
  },
};

// User service
export const userService = {
  async getUsers(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const endpoint = `/users${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiService.get(endpoint);
  },

  async getUser(id: string) {
    return apiService.get(`/users/${id}`);
  },

  async createUser(userData: any) {
    return apiService.post('/users', userData);
  },

  async updateUser(id: string, userData: any) {
    return apiService.put(`/users/${id}`, userData);
  },

  async deleteUser(id: string) {
    return apiService.delete(`/users/${id}`);
  },
};

// Analytics service
export const analyticsService = {
  async getDashboardData() {
    return apiService.get('/analytics/dashboard');
  },

  async getReports(params?: { startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const endpoint = `/analytics/reports${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiService.get(endpoint);
  },
};
