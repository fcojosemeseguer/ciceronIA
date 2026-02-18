/**
 * Utilidades para manejo de errores
 */

/**
 * Extrae un mensaje de error legible de cualquier tipo de error
 * Maneja errores de Axios, validación de FastAPI/Pydantic, y errores genéricos
 */
export const extractErrorMessage = (error: any): string => {
  if (!error) return 'Error desconocido';
  
  // Si es string, retornarlo directamente
  if (typeof error === 'string') return error;
  
  const detail = error.response?.data?.detail;
  
  // Si detail es string, usarlo directamente
  if (typeof detail === 'string') return detail;
  
  // Si es array de errores de validación (FastAPI/Pydantic)
  if (Array.isArray(detail)) {
    return detail.map((err: any) => {
      if (typeof err === 'string') return err;
      if (err?.msg) return err.msg;
      return String(err);
    }).join(', ');
  }
  
  // Si es objeto con propiedad msg (error de validación único)
  if (detail?.msg) return detail.msg;
  
  // Si es objeto con propiedad message
  if (error.message) return error.message;
  
  // Si es objeto, convertir a string
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Error desconocido';
    }
  }
  
  return String(error);
};

export default extractErrorMessage;
