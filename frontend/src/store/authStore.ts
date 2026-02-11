/**
 * Auth Store - Gestión de autenticación con JWT
 * Maneja login, registro, y validación de tokens
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthStore extends AuthState {
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
  clearError: () => void;
}

// Base de datos de usuarios simulada (en producción esto estaría en el backend)
const mockUsersDB: Array<{ email: string; password: string; name: string }> = [
  { email: 'admin@ciceron.ai', password: 'Admin123!', name: 'Administrador' },
  { email: 'demo@example.com', password: 'Demo2024!', name: 'Usuario Demo' },
  { email: 'test@test.com', password: 'TestPass1!', name: 'Test User' },
];

// Simulación de API - En producción, esto sería una llamada real al backend
const mockAuthAPI = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    // Simulación de delay de red
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Validación básica
    if (!email || !password) {
      throw new Error('Email y contraseña son requeridos');
    }
    
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    
    // Verificar credenciales contra "base de datos" simulada
    const userRecord = mockUsersDB.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!userRecord) {
      throw new Error('Usuario no encontrado. Verifica tu email o regístrate.');
    }
    
    if (userRecord.password !== password) {
      throw new Error('Contraseña incorrecta. Inténtalo de nuevo.');
    }
    
    // Simular error de servidor aleatorio (10% de probabilidad)
    if (Math.random() < 0.1) {
      throw new Error('Error del servidor. Por favor, inténtalo más tarde.');
    }
    
    // Generar token JWT simulado
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: userRecord.email,
      name: userRecord.name,
    };
    
    // Crear payload JWT
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: Date.now() / 1000,
      exp: (Date.now() / 1000) + (24 * 60 * 60), // 24 horas
    };
    
    // Token simulado (en producción viene del backend)
    const token = btoa(JSON.stringify({
      header: { alg: 'HS256', typ: 'JWT' },
      payload,
      signature: 'mock-signature'
    }));
    
    return { token, user };
  },
  
  register: async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!name || !email || !password) {
      throw new Error('Todos los campos son requeridos');
    }
    
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('El formato del email no es válido');
    }
    
    // Verificar si el email ya existe
    const existingUser = mockUsersDB.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
    }
    
    // Simular error de servidor aleatorio (5% de probabilidad)
    if (Math.random() < 0.05) {
      throw new Error('Error del servidor al crear la cuenta. Inténtalo más tarde.');
    }
    
    // Agregar nuevo usuario a la "base de datos"
    mockUsersDB.push({ email: email.toLowerCase(), password, name });
    
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: email.toLowerCase(),
      name,
    };
    
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: Date.now() / 1000,
      exp: (Date.now() / 1000) + (24 * 60 * 60),
    };
    
    const token = btoa(JSON.stringify({
      header: { alg: 'HS256', typ: 'JWT' },
      payload,
      signature: 'mock-signature'
    }));
    
    return { token, user };
  }
};

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

    // Login
    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const { token, user } = await mockAuthAPI.login(email, password);
        
        // Guardar en localStorage
        localStorage.setItem('ciceron_token', token);
        localStorage.setItem('ciceron_user', JSON.stringify(user));
        
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        return true;
      } catch (error: any) {
        set({
          isLoading: false,
          error: error.message || 'Error al iniciar sesión',
          isAuthenticated: false,
        });
        return false;
      }
    },

    // Register
    register: async (name: string, email: string, password: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const { token, user } = await mockAuthAPI.register(name, email, password);
        
        localStorage.setItem('ciceron_token', token);
        localStorage.setItem('ciceron_user', JSON.stringify(user));
        
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        return true;
      } catch (error: any) {
        set({
          isLoading: false,
          error: error.message || 'Error al registrarse',
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


