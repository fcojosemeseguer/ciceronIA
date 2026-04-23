import { useCallback, useState } from 'react';
import { dashboardService } from '../api';

export interface DashboardShareState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  url?: string;
}

const IDLE_STATE: DashboardShareState = {
  status: 'idle',
};

export const useDashboardShareLink = (debateCode: string) => {
  const [shareState, setShareState] = useState<DashboardShareState>(IDLE_STATE);

  const createShareLink = useCallback(async () => {
    if (!debateCode) {
      setShareState({
        status: 'error',
        message: 'Este debate aun no tiene codigo para compartir.',
      });
      return;
    }

    setShareState({
      status: 'loading',
      message: 'Generando enlace compartido...',
    });

    try {
      const link = await dashboardService.createShareLink(debateCode, {});
      setShareState({
        status: 'success',
        message: 'Enlace listo para compartir.',
        url: link.public_url,
      });
    } catch (error: any) {
      setShareState({
        status: 'error',
        message: error?.response?.data?.detail || 'No se pudo generar el enlace compartido.',
      });
    }
  }, [debateCode]);

  const copyShareLink = useCallback(async () => {
    if (!shareState.url) return;

    try {
      await navigator.clipboard.writeText(shareState.url);
      setShareState((prev) => ({
        ...prev,
        status: 'success',
        message: 'Enlace copiado al portapapeles.',
      }));
    } catch {
      setShareState((prev) => ({
        ...prev,
        status: 'error',
        message: 'No se pudo copiar el enlace automaticamente.',
      }));
    }
  }, [shareState.url]);

  const openShareLink = useCallback(() => {
    if (!shareState.url) return;
    window.open(shareState.url, '_blank', 'noopener,noreferrer');
  }, [shareState.url]);

  const dismissShareLink = useCallback(() => {
    setShareState(IDLE_STATE);
  }, []);

  return {
    shareState,
    createShareLink,
    copyShareLink,
    openShareLink,
    dismissShareLink,
  };
};

export default useDashboardShareLink;
