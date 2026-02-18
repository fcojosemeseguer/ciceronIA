/**
 * Auth Store - Gestión de autenticación con JWT (Backend Real)
 * Maneja login, registro, y validación de tokens
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { authService } from '../api';
import { User, AuthResponse } from '../types';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthStore extends AuthState {
  // Actions
  login: (user: string, password: string) => Promise<boolean>;
  register: (user: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
  clearError: () => void;
}

// Validar token JWT
const isTokenValid = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch {
    return false;
  }
};

// Cargar estado inicial desde localStorage
const loadInitialState = (): Partial<AuthState> => {
  const token = localStorage.getItem('ciceron_token');
  const userStr = localStorage.getItem('ciceron_user');
  
  if (token && userStr) {
    try {
      if (isTokenValid(token)) {
        const user = JSON.parse(userStr);
        return { token, user, isAuthenticated: true };
      } else {
        // Token expirado, limpiar
        localStorage.removeItem('ciceron_token');
        localStorage.removeItem('ciceron_user');
      }
    } catch {
      localStorage.removeItem('ciceron_token');
      localStorage.removeItem('ciceron_user');
    }
  }
  
  return { user: null, token: null, isAuthenticated: false };
};

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    // Estado inicial
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    ...loadInitialState(),

    // Login con backend real
    login: async (user: string, password: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const response: AuthResponse = await authService.login({
          user,
          pswd: password,
        });
        
        // Crear objeto user desde la respuesta
        const userObj: User = {
          id: user,
          email: user,
          name: response.user,
        };
        
        // Guardar en localStorage
        localStorage.setItem('ciceron_token', response.access_token);
        localStorage.setItem('ciceron_user', JSON.stringify(userObj));
        
        set({
          token: response.access_token,
          user: userObj,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        return true;
      } catch (error: any) {
        set({
          isLoading: false,
          error: error.response?.data?.detail || 'Error al iniciar sesión',
          isAuthenticated: false,
        });
        return false;
      }
    },

    // Register con backend real
    register: async (user: string, password: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const response: AuthResponse = await authService.register({
          user,
          pswd: password,
        });
        
        // Crear objeto user desde la respuesta
        const userObj: User = {
          id: user,
          email: user,
          name: response.user,
        };
        
        localStorage.setItem('ciceron_token', response.access_token);
        localStorage.setItem('ciceron_user', JSON.stringify(userObj));
        
        set({
          token: response.access_token,
          user: userObj,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        return true;
      } catch (error: any) {
        set({
          isLoading: false,
          error: error.response?.data?.detail || 'Error al registrarse',
          isAuthenticated: false,
        });
        return false;
      }
    },

    // Logout
    logout: () => {
      localStorage.removeItem('ciceron_token');
      localStorage.removeItem('ciceron_user');
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      });
    },

    // Check auth status
    checkAuth: () => {
      const { token } = get();
      
      if (!token) {
        set({ isAuthenticated: false, user: null });
        return false;
      }
      
      if (!isTokenValid(token)) {
        get().logout();
        return false;
      }
      
      return true;
    },

    // Clear error
    clearError: () => {
      set({ error: null });
    },
  }))
);

// Hook para obtener el token en las peticiones API
export const getAuthToken = (): string | null => {
  return localStorage.getItem('ciceron_token');
};

export default useAuthStore;
