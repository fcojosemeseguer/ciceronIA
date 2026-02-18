/**
 * Validaciones de autenticación según reglas del backend
 */

/**
 * Valida el nombre de usuario según reglas del backend:
 * - 3-20 caracteres
 * - Solo letras, números y guiones bajos
 */
export const validateUsername = (username: string): string | null => {
  if (username.length < 3) {
    return 'El usuario debe tener al menos 3 caracteres';
  }
  if (username.length > 20) {
    return 'El usuario debe tener máximo 20 caracteres';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'El usuario solo puede contener letras, números y guiones bajos';
  }
  return null;
};

/**
 * Valida la contraseña según reglas del backend:
 * - 8-32 caracteres
 * - Solo letras, números y guiones bajos
 * - Al menos una letra
 * - Al menos un número
 */
export const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (password.length > 32) {
    return 'La contraseña debe tener máximo 32 caracteres';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(password)) {
    return 'La contraseña solo puede contener letras, números y guiones bajos';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'La contraseña debe incluir al menos una letra';
  }
  if (!/[0-9]/.test(password)) {
    return 'La contraseña debe incluir al menos un número';
  }
  return null;
};

/**
 * Obtiene los requisitos de contraseña como texto
 */
export const getPasswordRequirements = (): string => {
  return '8-32 caracteres, letras, números y guiones bajos. Debe incluir al menos una letra y un número.';
};

/**
 * Obtiene los requisitos de usuario como texto
 */
export const getUsernameRequirements = (): string => {
  return '3-20 caracteres, solo letras, números y guiones bajos';
};
