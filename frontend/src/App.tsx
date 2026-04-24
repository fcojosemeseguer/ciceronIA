/**
 * App principal - Componente raíz de la aplicación
 * Estructura renovada según especificaciones funcionales
 * VERSIÓN SIMPLIFICADA: Unificación de proyectos y debates
 */

import React, { useState, useEffect } from 'react';
import { 
  AuthScreen, 
  HomeScreen, 
  SetupScreen, 
  CompetitionScreen, 
  DebateDetailsScreen as LegacyDebateDetailsScreen, 
  ScoringScreen, 
  LandingPage,
  AnalysisScreen,
  AnalysisResultsScreen,
  DashboardScreen,
  DebateModeScreen,
  SettingsScreen,
  PublicDashboardScreen,
  // Nuevos componentes
  DebatesScreen,
  DebateConfigScreen,
  DebateDetailsScreenNew,
} from './components/screens';
import { useAuthStore, useAnalysisStore } from './store';
import { useDebateHistoryStore } from './store/debateHistoryStore';
import { useDebateStore } from './store/debateStore';
import { useDebateStore as useUnifiedDebateStore } from './store/debateStoreUnified';
import { DebateHistory, Project, Debate, DebateMode } from './types';
import { Dock } from './components/common';
import { AlertTriangle } from 'lucide-react';
import { loadLiveDebateSession } from './utils/debatePersistence';
import { clearAnalysisDraft, saveAnalysisDraft } from './utils/debatePersistence';
import { loadDebateTeamColors } from './utils/debateColors';
import { initThemeSync } from './utils/theme';
import { debatesService } from './api';
import { saveDebateMetadata } from './utils/debateMetadata';
import backIcon from './assets/icons/icon-back.svg';
import leftIcon from './assets/icons/icon-left.svg';
import dashboardIcon from './assets/icons/icon-dashboard.svg';
import settingsIcon from './assets/icons/icon-settings.svg';
import './App.css';

type AppScreen = 
  | 'landing' 
  | 'auth' 
  | 'dashboard'
  | 'debate-mode'
  | 'setup' 
  | 'competition' 
  | 'scoring' 
  | 'projects'
  | 'project-details'
  | 'analysis-setup'
  | 'analysis' 
  | 'analysis-results'
  | 'home' 
  | 'debate-details'
  | 'settings'
  | 'public-dashboard'
  // Nuevas pantallas simplificadas
  | 'debates'            // Reemplaza 'projects'
  | 'debate-config'      // Nueva pantalla de configuración
  | 'debate-view';       // Reemplaza 'project-details'

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const { selectedDebate, selectDebate } = useDebateHistoryStore();
  const { clearUploads, uploads } = useAnalysisStore();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [screenHistory, setScreenHistory] = useState<AppScreen[]>(['landing']);
  const [pendingRedirectAfterAuth, setPendingRedirectAfterAuth] = useState<AppScreen | null>(null);
  const [publicDashboardToken, setPublicDashboardToken] = useState<string | null>(null);
  const [isAppEntryTransitionActive, setIsAppEntryTransitionActive] = useState(false);
  const [competitionDashboardView, setCompetitionDashboardView] = useState(false);
  const [analysisDashboardView, setAnalysisDashboardView] = useState(false);
  
  // NUEVO: Estados para el sistema simplificado de debates
  const {
    currentDebate: selectedUnifiedDebate,
    selectDebate: selectUnifiedDebate,
    updateDebate: updateUnifiedDebate,
  } = useUnifiedDebateStore();
  const [configMode, setConfigMode] = useState<DebateMode>('live');
  
  // LEGACY: Mantener compatibilidad durante transición
  const [selectedAnalysisProject] = useState<Project | null>(null);

  // Función para navegar guardando historial
  type NavigationMode = 'push' | 'replace' | 'reset';

  const navigateTo = (screen: AppScreen, mode: NavigationMode = 'push') => {
    if (screen === currentScreen && mode !== 'reset') {
      return;
    }

    setScreenHistory((prev) => {
      switch (mode) {
        case 'replace':
          return prev.length > 0 ? [...prev.slice(0, -1), screen] : [screen];
        case 'reset':
          return [screen];
        case 'push':
        default:
          return [...prev, screen];
      }
    });

    setCurrentScreen(screen);
  };

  // Función para volver atrás
  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop(); // Eliminar pantalla actual
      const previousScreen = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setCurrentScreen(previousScreen);
    }
  };

  useEffect(() => {
    const cleanupThemeSync = initThemeSync();
    checkAuth();
    const path = window.location.pathname;
    const publicDashboardMatch = path.match(/^\/public\/dashboard\/([^/]+)$/);

    if (publicDashboardMatch?.[1]) {
      setPublicDashboardToken(decodeURIComponent(publicDashboardMatch[1]));
      setCurrentScreen('public-dashboard');
      setScreenHistory(['public-dashboard']);
    } else if (path === '/auth') {
      setCurrentScreen('auth');
      setScreenHistory(['auth']);
    }

    setIsAuthChecked(true);
    return cleanupThemeSync;
  }, [checkAuth]);

  useEffect(() => {
    if (currentScreen !== 'competition' && competitionDashboardView) {
      setCompetitionDashboardView(false);
    }
  }, [currentScreen, competitionDashboardView]);

  useEffect(() => {
    if (currentScreen !== 'analysis' && analysisDashboardView) {
      setAnalysisDashboardView(false);
    }
  }, [currentScreen, analysisDashboardView]);

  // Navegación básica
  const handleGoToLanding = () => navigateTo('landing', 'replace');
  const handleGoToDashboard = () => navigateTo('dashboard', 'replace');
  const handleGoToSettings = () => navigateTo('settings');
  
  // Auth
  const handleAuthenticated = () => {
    if (pendingRedirectAfterAuth) {
      navigateTo(pendingRedirectAfterAuth, 'replace');
      setPendingRedirectAfterAuth(null);
    } else {
      navigateTo('dashboard', 'replace');
    }
  };
  
  const handleGoToAuth = (redirectTo?: AppScreen) => {
    if (redirectTo) {
      setPendingRedirectAfterAuth(redirectTo);
    }
    const goAuth = () => navigateTo('auth');
    if (currentScreen === 'landing' && !isAppEntryTransitionActive) {
      runAppEntryTransition(goAuth);
      return;
    }
    goAuth();
  };

  // NUEVOS HANDLERS - Flujo simplificado
  
  // Handler para iniciar nuevo debate (en vivo)
  const handleNewLiveDebate = () => {
    setConfigMode('live');
    navigateTo('debate-config');
  };

  // Handler para analizar grabación
  const handleNewAnalysisDebate = () => {
    setConfigMode('analysis');
    navigateTo('debate-config');
  };

  // Handler cuando se completa la configuración y se inicia el debate
  const handleDebateConfigured = (debate: Debate) => {
    selectUnifiedDebate(debate);
    if (debate.mode === 'live') {
      navigateTo('competition');
    } else {
      navigateTo('analysis');
    }
  };

  // Handler para ver lista de debates anteriores
  const handleViewDebates = () => {
    navigateTo('debates');
  };

  // Handler para seleccionar un debate de la lista
  const handleSelectDebateFromList = (debate: Debate) => {
    const savedColors = loadDebateTeamColors(debate.code);
    const debateWithColors = savedColors ? { ...debate, ...savedColors } : debate;
    const persistedLiveSession = loadLiveDebateSession(debate.code);
    const isCompleted = debate.status.trim().toLowerCase() === 'completed';
    const resolvedDebate = persistedLiveSession
      ? { ...debateWithColors, mode: 'live' as const, status: isCompleted ? 'completed' as const : 'in_progress' as const }
      : debateWithColors;

    selectUnifiedDebate(resolvedDebate);
    if (resolvedDebate.mode === 'live' && resolvedDebate.status === 'completed') {
      navigateTo('scoring');
      return;
    }
    if (resolvedDebate.status === 'draft' || resolvedDebate.status === 'in_progress') {
      navigateTo(resolvedDebate.mode === 'live' ? 'competition' : 'analysis');
      return;
    }
    navigateTo('debate-view');
  };

  const handleViewDebateDetails = (debate: Debate) => {
    const savedColors = loadDebateTeamColors(debate.code);
    const debateWithColors = savedColors ? { ...debate, ...savedColors } : debate;
    const persistedLiveSession = loadLiveDebateSession(debate.code);
    const isCompleted = debate.status.trim().toLowerCase() === 'completed';
    const resolvedDebate = (
      persistedLiveSession
        ? { ...debateWithColors, mode: 'live' as const, status: isCompleted ? 'completed' as const : 'in_progress' as const }
        : debateWithColors
    );
    selectUnifiedDebate(resolvedDebate);
    navigateTo('scoring');
  };

  // LEGACY HANDLERS (mantener durante transición)
  
  // Dashboard flows - LEGACY
  const handleNewDebate = () => {
    navigateTo('debate-mode');
  };

  const handleAnalyzeRecorded = () => {
    if (!isAuthenticated) {
      handleGoToAuth('debate-mode');
      return;
    }
    setConfigMode('analysis');
    navigateTo('debate-config');
  };

  const handleViewHistory = () => {
    navigateTo('home');
  };

  // Debate Mode Selection - LEGACY
  const handleSelectLiveDebate = () => {
    setConfigMode('live');
    navigateTo('debate-config');
  };

  const handleSelectRecordedDebate = () => {
    if (!isAuthenticated) {
      handleGoToAuth('debate-mode');
      return;
    }
    setConfigMode('analysis');
    navigateTo('debate-config');
  };

  // Analysis
  const handleViewResults = () => {
    navigateTo('analysis-results');
  };

  const getCurrentAnalysisDebateCode = () =>
    selectedUnifiedDebate?.code || selectedAnalysisProject?.code || '';

  const ANALYSIS_SAVED_KEY_PREFIX = 'ciceronia.analysisSavedOnce.';
  const markAnalysisSavedOnce = (debateCode: string) => {
    if (!debateCode || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(`${ANALYSIS_SAVED_KEY_PREFIX}${debateCode}`, '1');
    } catch {
      // ignore
    }
  };
  const hasAnalysisSavedOnce = (debateCode: string) => {
    if (!debateCode || typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(`${ANALYSIS_SAVED_KEY_PREFIX}${debateCode}`) === '1';
    } catch {
      return false;
    }
  };

  const hasAnalysisActivity = () =>
    uploads.some(
      (upload) =>
        !!upload.file ||
        !!upload.persistedFileName ||
        !!upload.result ||
        upload.status !== 'pending'
    );

  const [showAnalysisExitChoice, setShowAnalysisExitChoice] = useState(false);
  const [isDeletingAnalysisDebate, setIsDeletingAnalysisDebate] = useState(false);
  const [analysisExitAllowDelete, setAnalysisExitAllowDelete] = useState(true);

  const exitAnalysisWithSave = () => {
    const debateCode = getCurrentAnalysisDebateCode();
    if (debateCode) {
      markAnalysisSavedOnce(debateCode);
    }
    if (debateCode && hasAnalysisActivity()) {
      saveAnalysisDraft(debateCode, uploads);
    }
    clearUploads();
    setShowAnalysisExitChoice(false);
    navigateTo('dashboard', 'replace');
  };

  const exitAnalysisWithDelete = async () => {
    const debateCode = getCurrentAnalysisDebateCode();
    setIsDeletingAnalysisDebate(true);
    try {
      if (debateCode) {
        await debatesService.deleteDebate(debateCode);
        clearAnalysisDraft(debateCode);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(`${ANALYSIS_SAVED_KEY_PREFIX}${debateCode}`);
        }
      }
      clearUploads();
      setShowAnalysisExitChoice(false);
      navigateTo('dashboard', 'replace');
    } catch (error) {
      console.error('No se pudo eliminar el debate de analisis', error);
    } finally {
      setIsDeletingAnalysisDebate(false);
    }
  };

  const handleAnalysisBack = () => {
    const debateCode = getCurrentAnalysisDebateCode();
    if (hasAnalysisActivity()) {
      exitAnalysisWithSave();
      return;
    }
    setAnalysisExitAllowDelete(!hasAnalysisSavedOnce(debateCode));
    setShowAnalysisExitChoice(true);
  };

  // Flujo legacy
  const runAppEntryTransition = (navigate: () => void) => {
    setIsAppEntryTransitionActive(true);
    window.setTimeout(() => {
      navigate();
    }, 180);
    window.setTimeout(() => {
      setIsAppEntryTransitionActive(false);
    }, 620);
  };

  const handleStartDebateFromLanding = () => {
    runAppEntryTransition(() => {
      if (isAuthenticated) {
        navigateTo('dashboard');
      } else {
        handleGoToAuth('dashboard');
      }
    });
  };

  const handleLoginFromLanding = () => {
    runAppEntryTransition(() => {
      handleGoToAuth('dashboard');
    });
  };

  const handleViewDebate = (debate: DebateHistory) => {
    selectDebate(debate);
    navigateTo('debate-details');
  };

  const handleBackToHome = () => {
    selectDebate(null);
    navigateTo('home', 'replace');
  };

  // Estados para confirmación de salida
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const confirmExit = () => {
    const navigation = pendingNavigation;
    setPendingNavigation(null);
    setShowExitConfirm(false);
    navigation?.();
  };

  const cancelExit = () => {
    setPendingNavigation(null);
    setShowExitConfirm(false);
  };

  const handleStartDebate = () => navigateTo('competition');
  const handleFinishDebate = async () => {
    const debateCode = selectedUnifiedDebate?.code;
    if (debateCode) {
      const completedAt = new Date().toISOString();
      saveDebateMetadata(debateCode, { finished: true, finished_at: completedAt });
      try {
        await updateUnifiedDebate(debateCode, { status: 'completed', completed_at: completedAt });
      } catch (error) {
        console.error('No se pudo actualizar el estado del debate al finalizar', error);
      }
      selectUnifiedDebate({
        ...selectedUnifiedDebate,
        status: 'completed',
        completed_at: completedAt,
      });
    }
    navigateTo('scoring');
  };
  const handleFinishScoring = () => navigateTo('dashboard');

  const { state: debateState, pauseDebate } = useDebateStore();

  const isDebateActive = () => {
    return currentScreen === 'competition' && (debateState === 'running' || debateState === 'paused');
  };

  const freezeLiveDebate = () => {
    if (!isDebateActive()) {
      return;
    }

    pauseDebate();

    if (
      selectedUnifiedDebate &&
      selectedUnifiedDebate.mode === 'live' &&
      selectedUnifiedDebate.status === 'draft'
    ) {
      const updatedDebate = {
        ...selectedUnifiedDebate,
        status: 'in_progress' as const,
      };

      selectUnifiedDebate(updatedDebate);
    }
  };

  const handleNavigationWithConfirm = (navigationFn: () => void) => {
    if (isDebateActive()) {
      setPendingNavigation(() => () => {
        freezeLiveDebate();
        window.setTimeout(() => {
          navigationFn();
        }, 450);
      });
      setShowExitConfirm(true);
    } else {
      navigationFn();
    }
  };

  // Configurar items del dock - NAVEGACIÓN SIMPLIFICADA Y PREDECIBLE
  const getDockItems = () => {
    const iconClass = 'h-8 w-8';
    const items: Array<{ icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }> = [];

    if (currentScreen === 'dashboard' && isAuthenticated) {
      items.push({
        icon: <img src={leftIcon} alt="" className={iconClass} aria-hidden />,
        label: 'Salir',
        onClick: () => navigateTo('landing', 'replace'),
      });
    } else if (currentScreen !== 'dashboard') {
      items.push({
        icon: <img src={backIcon} alt="" className={iconClass} aria-hidden />,
        label: 'Volver',
        onClick: () =>
          currentScreen === 'competition'
            ? handleNavigationWithConfirm(() => navigateTo('dashboard', 'replace'))
            : currentScreen === 'analysis'
              ? handleAnalysisBack()
            : handleNavigationWithConfirm(goBack),
      });
    }

    if (currentScreen === 'competition' || currentScreen === 'analysis') {
      items.push({
        icon: <img src={dashboardIcon} alt="" className={iconClass} aria-hidden />,
        label: 'Dashboard',
        active: currentScreen === 'competition' ? competitionDashboardView : analysisDashboardView,
        onClick: () =>
          currentScreen === 'competition'
            ? setCompetitionDashboardView((prev) => !prev)
            : setAnalysisDashboardView((prev) => !prev),
      });
    }

    if (isAuthenticated) {
      items.push({
        icon: <img src={settingsIcon} alt="" className={iconClass} aria-hidden />,
        label: 'Ajustes',
        onClick: () => handleGoToSettings(),
      });
    }

    return items;
  };

  // Determinar si mostrar el dock
  const showDock = [
    'dashboard',
    'home', 
    'debates',           // NUEVO
    'debate-config',     // NUEVO
    'debate-view',       // NUEVO
    'analysis', 
    'analysis-results',
    'setup', 
    'competition', 
    'scoring', 
    'debate-details',
    'debate-mode',
    'settings'
  ].includes(currentScreen);

  if (!isAuthChecked) {
    return (
      <div className="app-shell w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--app-text-muted)' }}></div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return (
          <LandingPage 
            onStartDebate={handleStartDebateFromLanding} 
            onLogin={handleLoginFromLanding} 
            onOpenSettings={isAuthenticated ? handleGoToSettings : undefined}
          />
        );

      case 'auth':
        return (
          <AuthScreen 
            onAuthenticated={handleAuthenticated} 
            onBack={handleGoToLanding} 
            redirectTo={pendingRedirectAfterAuth || undefined} 
          />
        );

      case 'dashboard':
        return (
          <DashboardScreen
            onNewDebate={handleNewDebate}
            onAnalyzeRecorded={handleAnalyzeRecorded}
            onViewHistory={handleViewHistory}
            // Nuevos handlers
            onNewLiveDebate={handleNewLiveDebate}
            onNewAnalysis={handleNewAnalysisDebate}
            onViewDebates={handleViewDebates}
          />
        );

      case 'debate-mode':
        return (
          <DebateModeScreen
            onSelectLive={handleSelectLiveDebate}
            onSelectRecorded={handleSelectRecordedDebate}
            onBack={handleGoToDashboard}
          />
        );

      case 'projects':
      case 'project-details':
        return (
          <DebatesScreen
            onSelectDebate={handleSelectDebateFromList}
            onViewDebateDetails={handleViewDebateDetails}
            onBack={handleGoToDashboard}
          />
        );

      case 'analysis':
        return selectedUnifiedDebate ? (
          <AnalysisScreen
            debate={selectedUnifiedDebate}
            onBack={handleAnalysisBack}
            onViewResults={handleViewResults}
            dashboardView={analysisDashboardView}
            onDashboardViewChange={setAnalysisDashboardView}
          />
        ) : selectedAnalysisProject ? (
          // LEGACY: Soporte para proyectos antiguos
          <AnalysisScreen
            project={selectedAnalysisProject}
            onBack={handleAnalysisBack}
            onViewResults={handleViewResults}
            dashboardView={analysisDashboardView}
            onDashboardViewChange={setAnalysisDashboardView}
          />
        ) : (
          <DebatesScreen
            onSelectDebate={handleSelectDebateFromList}
            onViewDebateDetails={handleViewDebateDetails}
            onBack={handleGoToDashboard}
          />
        );

      // NUEVAS PANTALLAS SIMPLIFICADAS
      case 'debates':
        return (
          <DebatesScreen
            onSelectDebate={handleSelectDebateFromList}
            onViewDebateDetails={handleViewDebateDetails}
            onBack={handleGoToDashboard}
          />
        );

      case 'debate-config':
        return (
          <DebateConfigScreen
            mode={configMode}
            onBack={() => navigateTo('debate-mode', 'replace')}
            onGoDashboard={handleGoToDashboard}
            onGoDebateMode={() => navigateTo('debate-mode', 'replace')}
            onStartLive={handleDebateConfigured}
            onStartAnalysis={handleDebateConfigured}
          />
        );

      case 'debate-view':
        return selectedUnifiedDebate ? (
          <DebateDetailsScreenNew
            debate={selectedUnifiedDebate}
            onBack={() => navigateTo('debates', 'replace')}
            onContinue={
              selectedUnifiedDebate.status === 'draft' || selectedUnifiedDebate.status === 'in_progress'
                ? () => navigateTo(selectedUnifiedDebate.mode === 'live' ? 'competition' : 'analysis')
                : undefined
            }
          />
        ) : (
          <DebatesScreen
            onSelectDebate={handleSelectDebateFromList}
            onViewDebateDetails={handleViewDebateDetails}
            onBack={handleGoToDashboard}
          />
        );

      case 'analysis-results':
        return (
          <AnalysisResultsScreen
            onBack={() => navigateTo('analysis', 'replace')}
          />
        );

      case 'home':
        return (
          <HomeScreen 
            onNewDebate={handleNewDebate} 
            onViewDebate={handleViewDebate} 
            onBack={handleGoToDashboard} 
          />
        );

      case 'setup':
        return <SetupScreen onStartDebate={handleStartDebate} onBack={handleGoToDashboard} />;

      case 'competition':
        return selectedUnifiedDebate ? (
          <CompetitionScreen 
            debate={selectedUnifiedDebate} 
            onFinish={handleFinishDebate}
            dashboardView={competitionDashboardView}
            onDashboardViewChange={setCompetitionDashboardView}
            onBack={() => handleNavigationWithConfirm(() => navigateTo('debates', 'replace'))}
          />
        ) : selectedAnalysisProject ? (
          // LEGACY: Soporte para proyectos antiguos
          <CompetitionScreen 
            project={selectedAnalysisProject} 
            onFinish={handleFinishDebate}
            dashboardView={competitionDashboardView}
            onDashboardViewChange={setCompetitionDashboardView}
            onBack={() => handleNavigationWithConfirm(() => navigateTo('debates', 'replace'))}
          />
        ) : (
          <DebatesScreen
            onSelectDebate={handleSelectDebateFromList}
            onViewDebateDetails={handleViewDebateDetails}
            onBack={handleGoToDashboard}
          />
        );

      case 'scoring':
        return <ScoringScreen debate={selectedUnifiedDebate || undefined} onFinish={handleFinishScoring} onBack={handleGoToDashboard} />;

      case 'debate-details':
        return selectedDebate ? (
          <LegacyDebateDetailsScreen debate={selectedDebate} onBack={handleBackToHome} />
        ) : (
          <HomeScreen onNewDebate={handleNewDebate} onViewDebate={handleViewDebate} onBack={handleGoToDashboard} />
        );

      case 'settings':
        return <SettingsScreen onBack={handleGoToDashboard} />;

      case 'public-dashboard':
        return publicDashboardToken ? (
          <PublicDashboardScreen
            token={publicDashboardToken}
            onBack={() => {
              setPublicDashboardToken(null);
              navigateTo('landing', 'replace');
            }}
          />
        ) : (
          <LandingPage onStartDebate={handleStartDebateFromLanding} onLogin={handleLoginFromLanding} onOpenSettings={isAuthenticated ? handleGoToSettings : undefined} />
        );

      default:
        return <LandingPage onStartDebate={handleStartDebateFromLanding} onLogin={handleLoginFromLanding} onOpenSettings={isAuthenticated ? handleGoToSettings : undefined} />;
    }
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden overflow-y-auto">
      {renderScreen()}

      {isAppEntryTransitionActive && (
        <div className="app-entry-transition fixed inset-0 z-[120] pointer-events-none">
          <div className="app-entry-transition__veil" />
          <div className="app-entry-transition__core" />
          <div className="app-entry-transition__ring" />
        </div>
      )}
      
      {showDock && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pb-4">
          <Dock
            items={getDockItems()}
            panelHeight={76}
            baseItemSize={58}
            magnification={60}
          />
        </div>
      )}

      {/* Modal de confirmación para salir del debate */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={cancelExit} />
            <div className="relative w-full max-w-md rounded-[20px] border-[3px] border-[#1C1D1F] bg-[#F0F0EE] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E6C068]/30">
                <AlertTriangle className="h-6 w-6 text-[#2C2C2C]" />
              </div>
              <div>
                <h3 className="text-[30px] leading-none text-[#2C2C2C]">Pausar y salir</h3>
                <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>El debate en vivo quedará congelado</p>
              </div>
            </div>

            <p className="mb-6" style={{ color: 'var(--app-text-muted)' }}>
              Si sales ahora, el cronómetro se pausará y podrás continuar este debate después desde Debates Anteriores exactamente donde lo dejaste.
            </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelExit}
                  className="flex-1 rounded-[12px] border border-[#2C2C2C]/20 bg-[#ECECE9] px-4 py-3 text-[20px] text-[#2C2C2C]"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 rounded-[12px] border-0 bg-[#C44536] px-4 py-3 text-[20px] text-white"
                >
                  Pausar y salir
                </button>
              </div>
          </div>
        </div>
      )}

      {showAnalysisExitChoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAnalysisExitChoice(false)} />
          <div className="relative w-full max-w-md rounded-[20px] border-[3px] border-[#1C1D1F] bg-[#F0F0EE] p-6">
            <h3 className="mb-3 text-[30px] leading-none text-[#2C2C2C]">Salir del analisis</h3>
            <p className="mb-5 text-[20px] text-[#2C2C2C]/75">
              {analysisExitAllowDelete
                ? 'Este debate aun no tiene audios. Puedes guardarlo como borrador o eliminarlo.'
                : 'Este debate ya fue guardado antes. Puedes salir o cancelar.'}
            </p>
            <div className="grid gap-3">
              <button
                onClick={exitAnalysisWithSave}
                className="w-full rounded-[12px] border-0 bg-[#3A7D44] px-4 py-3 text-[20px] text-white"
                disabled={isDeletingAnalysisDebate}
              >
                {analysisExitAllowDelete ? 'Salir y guardar' : 'Salir'}
              </button>
              {analysisExitAllowDelete && (
                <button
                  onClick={exitAnalysisWithDelete}
                  className="w-full rounded-[12px] border-0 bg-[#C44536] px-4 py-3 text-[20px] text-white"
                  disabled={isDeletingAnalysisDebate}
                >
                  {isDeletingAnalysisDebate ? 'Eliminando...' : 'Salir y eliminar'}
                </button>
              )}
              <button
                onClick={() => setShowAnalysisExitChoice(false)}
                className="w-full rounded-[12px] border border-[#2C2C2C]/20 bg-[#ECECE9] px-4 py-3 text-[20px] text-[#2C2C2C]"
                disabled={isDeletingAnalysisDebate}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
