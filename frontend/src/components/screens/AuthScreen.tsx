/**
 * AuthScreen - Pantalla de Login/Registro
 * Usa nombre de usuario (no email) según el backend
 */

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Lock, User, Loader2, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { LiquidGlassButton } from '../common';
import { validateUsername, validatePassword, getUsernameRequirements, getPasswordRequirements } from '../../utils/authValidation';

interface AuthScreenProps {
  onAuthenticated: () => void;
  onBack?: () => void;
  redirectTo?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, onBack, redirectTo }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [validationError, setValidationError] = useState('');

  const { login, register, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    // Validar usuario
    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setValidationError(usernameError);
      return;
    }

    // Validar contraseña
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }

    let success;
    if (isLogin) {
      success = await login(formData.username, formData.password);
    } else {
      success = await register(formData.username, formData.password);
    }

    if (success) {
      onAuthenticated();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
    if (validationError) setValidationError('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearError();
    setValidationError('');
    setFormData({ username: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Botón volver */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Volver</span>
          </button>
        )}

          {/* Formulario */}
          <div className="
            backdrop-blur-xl
            bg-white/5
            border border-white/10
            rounded-3xl
            p-8
            shadow-[0_8px_32px_rgba(0,0,0,0.3)]
          ">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo de nombre de usuario */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Nombre de usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="tu_usuario"
                    className="
                      w-full pl-10 pr-4 py-3
                      bg-white/5
                      border border-white/10
                      rounded-xl
                      text-white placeholder-white/30
                      focus:outline-none focus:border-[#4A5568]
                      transition-colors
                      appearance-none
                      bg-transparent
                    "
                    required
                    minLength={3}
                    maxLength={20}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </div>
                <p className="text-xs text-white/40 mt-1">{getUsernameRequirements()}</p>
              </div>

              {/* Campo de contraseña */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="
                      w-full pl-10 pr-12 py-3
                      bg-white/5
                      border border-white/10
                      rounded-xl
                      text-white placeholder-white/30
                      focus:outline-none focus:border-[#4A5568]
                      transition-colors
                      appearance-none
                      bg-transparent
                    "
                    required
                    minLength={8}
                    maxLength={32}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">{getPasswordRequirements()}</p>
              </div>

              {/* Error de validación */}
              {validationError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{validationError}</p>
                </div>
              )}

              {/* Error del servidor */}
              {error && (
                <div className="p-3 bg-[#1F2A33]/50 border border-[#1F2A33] rounded-lg">
                  <p className="text-sm text-white/80 text-center">{error}</p>
                </div>
              )}

              {/* Botón de submit */}
              <LiquidGlassButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <span>{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</span>
                )}
              </LiquidGlassButton>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-sm text-white/40">o</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Toggle mode */}
            <p className="text-center text-white/60">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button
                type="button"
                onClick={toggleMode}
                className="text-white/70 hover:text-white font-medium transition-colors underline underline-offset-2"
              >
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-white/40 text-sm mt-8">
            © 2026 CiceronAI. Todos los derechos reservados.
          </p>
        </div>
      </div>
  );
};
