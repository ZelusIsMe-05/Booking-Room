import { apiClient } from './apiClient';
import { ApiResponse, LoginResponseData, GetMeResponseData } from '@/types/api';

export const authService = {
  login: async (identifier: string, password: string): Promise<ApiResponse<LoginResponseData>> => {
    return apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', {
      identifier,
      password,
    });
  },

  getMe: async (): Promise<ApiResponse<GetMeResponseData>> => {
    return apiClient.get<ApiResponse<GetMeResponseData>>('/auth/me');
  },

  refresh: async (refreshToken: string): Promise<ApiResponse<{ tokenType: string; accessToken: string; accessExpiresIn: string }>> => {
    return apiClient.post<ApiResponse<{ tokenType: string; accessToken: string; accessExpiresIn: string }>>('/auth/refresh', {
      refreshToken,
    });
  },

  logout: async (refreshToken: string): Promise<ApiResponse<void>> => {
    return apiClient.post<ApiResponse<void>>('/auth/logout', {
      refreshToken,
    });
  },

  forgotPassword: async (email: string): Promise<ApiResponse<{ otpExpiresInSeconds: number }>> => {
    return apiClient.post<ApiResponse<{ otpExpiresInSeconds: number }>>('/auth/forgot-password', {
      email,
    });
  },

  resetPassword: async (params: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse<void>> => {
    return apiClient.post<ApiResponse<void>>('/auth/reset-password', params);
  },

  loginWithOAuth: async (
    provider: string,
    code: string,
    redirectUri: string
  ): Promise<ApiResponse<LoginResponseData & { isNewUser: boolean }>> => {
    return apiClient.post<ApiResponse<LoginResponseData & { isNewUser: boolean }>>(`/auth/oauth/${provider}`, {
      code,
      redirectUri,
    });
  },

  register: async (params: {
    fullName: string;
    username: string;
    email: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth: string;
    role?: 'TENANT' | 'LANDLORD';
  }): Promise<ApiResponse<{
    userId: string;
    username: string;
    email: string;
    phoneNumber: string;
    status: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth: string;
    otpExpiresInSeconds: number;
  }>> => {
    return apiClient.post('/auth/register', params);
  },

  updateProfile: async (params: {
    fullName: string;
    phoneNumber?: string | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth?: string | null;
    address?: string | null;
  }): Promise<ApiResponse<GetMeResponseData>> => {
    return apiClient.put<ApiResponse<GetMeResponseData>>('/auth/me', params);
  },

  changePassword: async (params: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse<void>> => {
    return apiClient.post<ApiResponse<void>>('/auth/change-password', params);
  },

  verifyOtp: async (email: string, otp: string): Promise<ApiResponse<{
    userId: string;
    status: string;
  }>> => {
    return apiClient.post('/auth/verify-otp', {
      email,
      otp,
    });
  },

  resendOtp: async (email: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET'): Promise<ApiResponse<{
    otpExpiresInSeconds: number;
  }>> => {
    return apiClient.post('/auth/resend-otp', {
      email,
      purpose,
    });
  },
};
