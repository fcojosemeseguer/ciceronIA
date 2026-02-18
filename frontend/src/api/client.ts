/**
 * API Client - Configuración base de Axios con interceptores JWT
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Crear instancia de axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos
});

// Interceptor para agregar token JWT a las peticiones
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('ciceron_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
apiClient.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    // No redirigir para errores de login/register (401 es respuesta válida para credenciales incorrectas)
    const isAuthEndpoint = error.config?.url?.includes('/login') || error.config?.url?.includes('/register');
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token expirado o inválido - solo redirigir si no es endpoint de auth
      localStorage.removeItem('ciceron_token');
      localStorage.removeItem('ciceron_user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
