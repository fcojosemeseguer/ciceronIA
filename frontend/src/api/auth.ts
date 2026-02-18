/**
 * Auth Service - Login y registro
 */

import apiClient from './client';
import { LoginCredentials, AuthResponse } from '../types';

export const authService = {
  /**
   * Login de usuario
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/login', credentials);
    return response.data;
  },

  /**
   * Registro de usuario
   */
  async register(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/register', credentials);
    return response.data;
  },

  /**
   * Verificar estado del servidor
   */
  async checkStatus(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/status');
    return response.data;
  },
};

export default authService;
