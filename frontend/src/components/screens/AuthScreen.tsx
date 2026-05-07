/**
 * AuthScreen - Pantalla de Login/Registro
 * Estetica unificada con el resto de la app.
 */

import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { BrandHeader, LiquidGlassButton } from '../common';
import {
  getPasswordRequirements,
  getUsernameRequirements,
  validatePassword,
  validateUsername,
} from '../../utils/authValidation';

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

    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setValidationError(usernameError);
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }

    const success = isLogin
      ? await login(formData.username, formData.password)
      : await register(formData.username, formData.password);

    if (success) onAuthenticated();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) clearError();
    if (validationError) setValidationError('');
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    clearError();
    setValidationError('');
    setFormData({ username: '', password: '' });
  };

  return (
    <div className="app-shell min-h-screen overflow-y-auto">
      <div className="mx-auto w-full max-w-[1040px] px-5 py-8 pb-20 sm:px-8">
        <BrandHeader className="mb-8" />

        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-[#1C1D1F] bg-[#F5F5F3] px-4 py-2 text-[#2C2C2C] transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </button>
        )}

        <div className="mx-auto max-w-[520px] rounded-[20px] border-[3px] border-[#1C1D1F] bg-[#ECECE9] p-6 sm:p-7">
          <h1 className="mb-2 text-center text-[38px] leading-none text-[#2C2C2C] sm:text-[46px]">
            {isLogin ? 'Iniciar sesion' : 'Crear cuenta'}
          </h1>
          <p className="mb-6 text-center text-[16px] text-[#5E5E5E]">
            {redirectTo ? 'Accede para continuar en la app' : 'Accede a tu cuenta de CICERONIA'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-[18px] font-medium text-[#2C2C2C]">Nombre de usuario</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A8A8A]" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="tu_usuario"
                  className="w-full rounded-[14px] border border-[#CFCFCD] bg-white py-3 pl-10 pr-4 text-[18px] text-[#2C2C2C] outline-none placeholder:text-[#9A9A9A] focus:border-[#1C1D1F]"
                  required
                  minLength={3}
                  maxLength={20}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
              <p className="mt-1 text-xs text-[#7A7A7A]">{getUsernameRequirements()}</p>
            </div>

            <div>
              <label className="mb-1 block text-[18px] font-medium text-[#2C2C2C]">Contrasena</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A8A8A]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full rounded-[14px] border border-[#CFCFCD] bg-white py-3 pl-10 pr-12 text-[18px] text-[#2C2C2C] outline-none placeholder:text-[#9A9A9A] focus:border-[#1C1D1F]"
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
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] transition-colors hover:text-[#2C2C2C]"
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-[#7A7A7A]">{getPasswordRequirements()}</p>
            </div>

            {validationError && (
              <div className="flex items-center gap-2 rounded-xl border border-[#C44536]/40 bg-[#C44536]/10 px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#C44536]" />
                <p className="text-sm text-[#A63A2D]">{validationError}</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-[#C44536]/40 bg-[#C44536]/10 px-3 py-2">
                <p className="text-sm text-[#A63A2D]">{error}</p>
              </div>
            )}

            <LiquidGlassButton
              type="submit"
              variant="primary"
              className="mt-2 w-full rounded-[14px] border-0 bg-[#3A7D44] py-3 text-[20px] font-semibold text-[#F5F5F3]"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Procesando...
                </span>
              ) : isLogin ? (
                'Iniciar sesion'
              ) : (
                'Crear cuenta'
              )}
            </LiquidGlassButton>
          </form>

          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#CFCFCD]" />
            <span className="text-sm text-[#7A7A7A]">o</span>
            <div className="h-px flex-1 bg-[#CFCFCD]" />
          </div>

          <p className="text-center text-[#5E5E5E]">
            {isLogin ? 'No tienes cuenta?' : 'Ya tienes cuenta?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-semibold text-[#2C2C2C] underline underline-offset-2 transition-opacity hover:opacity-80"
            >
              {isLogin ? 'Registrate' : 'Inicia sesion'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
