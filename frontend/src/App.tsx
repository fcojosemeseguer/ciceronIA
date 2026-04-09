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
  AnalysisSetupScreen,
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
import { Dock, LiquidGlassButton } from './components/common';
import { Home, Plus, AlertTriangle, FolderOpen, LayoutDashboard, History } from 'lucide-react';
import { loadLiveDebateSession } from './utils/debatePersistence';
import { applyTheme, getStoredTheme } from './utils/theme';
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
  const { checkAuth, isAuthenticated, logout } = useAuthStore();
  const { selectedDebate, selectDebate } = useDebateHistoryStore();
  const { clearUploads } = useAnalysisStore();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [screenHistory, setScreenHistory] = useState<AppScreen[]>(['landing']);
  const [pendingRedirectAfterAuth, setPendingRedirectAfterAuth] = useState<AppScreen | null>(null);
  const [publicDashboardToken, setPublicDashboardToken] = useState<string | null>(null);
  
  // NUEVO: Estados para el sistema simplificado de debates
  const {
    currentDebate: selectedUnifiedDebate,
    selectDebate: selectUnifiedDebate,
  } = useUnifiedDebateStore();
  const [configMode, setConfigMode] = useState<DebateMode>('live');
  
  // LEGACY: Mantener compatibilidad durante transición
  const [selectedAnalysisProject, setSelectedAnalysisProject] = useState<Project | null>(null);

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
    applyTheme(getStoredTheme());
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
  }, [checkAuth]);

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
    navigateTo('auth');
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
    const persistedLiveSession = loadLiveDebateSession(debate.code);
    const resolvedDebate = persistedLiveSession
      ? { ...debate, mode: 'live' as const, status: debate.status === 'completed' ? debate.status : 'in_progress' as const }
      : debate;

    selectUnifiedDebate(resolvedDebate);
    if (resolvedDebate.status === 'draft' || resolvedDebate.status === 'in_progress') {
      navigateTo(resolvedDebate.mode === 'live' ? 'competition' : 'analysis');
      return;
    }
    navigateTo('debate-view');
  };

  const handleViewDebateDetails = (debate: Debate) => {
    const persistedLiveSession = loadLiveDebateSession(debate.code);
    selectUnifiedDebate(
      persistedLiveSession
        ? { ...debate, mode: 'live' as const, status: debate.status === 'completed' ? debate.status : 'in_progress' as const }
        : debate
    );
    navigateTo('debate-view');
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

  const handleSelectProject = (project: Project) => {
    setSelectedAnalysisProject(project);
    navigateTo('analysis');
  };

  const handleStartLiveDebate = (project: Project) => {
    setSelectedAnalysisProject(project);
    navigateTo('competition');
  };

  const handleAddAnalysis = () => {
    navigateTo('analysis');
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

  const handleBackFromAnalysis = () => {
    clearUploads();
    navigateTo('dashboard', 'replace');
  };

  // Flujo legacy
  const handleStartDebateFromLanding = () => {
    if (isAuthenticated) {
      navigateTo('dashboard');
    } else {
      handleGoToAuth('dashboard');
    }
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
  const handleFinishDebate = () => navigateTo('scoring');
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
        navigationFn();
      });
      setShowExitConfirm(true);
    } else {
      navigationFn();
    }
  };

  // Configurar items del dock - NAVEGACIÓN SIMPLIFICADA Y PREDECIBLE
  const getDockItems = () => {
    const items = [];
    
    if (currentScreen === 'dashboard') {
      items.push({
        icon: <Home className="w-6 h-6 text-white" />,
        label: 'Inicio',
        onClick: () => handleNavigationWithConfirm(handleGoToLanding)
      });
    }

    // Siempre mostrar: Ir al Dashboard (Panel de Control)
    // Excepto cuando ya estamos en el Dashboard
    if (currentScreen !== 'dashboard') {
      items.push({
        icon: <LayoutDashboard className="w-6 h-6 text-white" />,
        label: 'Panel',
        onClick: () => handleNavigationWithConfirm(() => navigateTo('dashboard', 'replace'))
      });
    }

    // Nuevo Debate - visible desde dashboard o debates
    if (currentScreen === 'dashboard' || currentScreen === 'debates') {
      items.push({
        icon: <Plus className="w-6 h-6 text-white" />,
        label: 'Nuevo Debate',
        onClick: () => handleNewDebate()
      });
    }

    // Debates Anteriores - visible cuando NO estamos ya en esa pantalla
    if (isAuthenticated && currentScreen !== 'debates') {
      items.push({
        icon: <History className="w-6 h-6 text-white" />,
        label: 'Debates',
        onClick: () => handleViewDebates()
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
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/70"></div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return (
          <LandingPage 
            onStartDebate={handleStartDebateFromLanding} 
            onLogin={() => handleGoToAuth('dashboard')} 
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
            onGoToLanding={handleGoToLanding}
            onGoToSettings={handleGoToSettings}
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
            onNewLiveDebate={handleNewLiveDebate}
            onNewAnalysis={handleNewAnalysisDebate}
          />
        );

      case 'analysis':
        return selectedUnifiedDebate ? (
          <AnalysisScreen
            debate={selectedUnifiedDebate}
            onBack={() => navigateTo('debates', 'replace')}
            onViewResults={handleViewResults}
          />
        ) : selectedAnalysisProject ? (
          // LEGACY: Soporte para proyectos antiguos
          <AnalysisScreen
            project={selectedAnalysisProject}
            onBack={() => navigateTo('debates', 'replace')}
            onViewResults={handleViewResults}
          />
        ) : (
          <DebatesScreen
            onSelectDebate={handleSelectDebateFromList}
            onViewDebateDetails={handleViewDebateDetails}
            onBack={handleGoToDashboard}
            onNewLiveDebate={handleNewLiveDebate}
            onNewAnalysis={handleNewAnalysisDebate}
          />
        );

      // NUEVAS PANTALLAS SIMPLIFICADAS
      case 'debates':
        return (
          <DebatesScreen
            onSelectDebate={handleSelectDebateFromList}
            onViewDebateDetails={handleViewDebateDetails}
            onBack={handleGoToDashboard}
            onNewLiveDebate={handleNewLiveDebate}
            onNewAnalysis={handleNewAnalysisDebate}
          />
        );

      case 'debate-config':
        return (
          <DebateConfigScreen
            mode={configMode}
            onBack={handleGoToDashboard}
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
            onNewLiveDebate={handleNewLiveDebate}
            onNewAnalysis={handleNewAnalysisDebate}
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
            onBack={() => handleNavigationWithConfirm(() => navigateTo('debates', 'replace'))}
          />
        ) : selectedAnalysisProject ? (
          // LEGACY: Soporte para proyectos antiguos
          <CompetitionScreen 
            project={selectedAnalysisProject} 
            onFinish={handleFinishDebate}
            onBack={() => handleNavigationWithConfirm(() => navigateTo('debates', 'replace'))}
          />
        ) : (
          <DebatesScreen
            onSelectDebate={handleSelectDebateFromList}
            onViewDebateDetails={handleViewDebateDetails}
            onBack={handleGoToDashboard}
            onNewLiveDebate={handleNewLiveDebate}
            onNewAnalysis={handleNewAnalysisDebate}
          />
        );

      case 'scoring':
        return <ScoringScreen onFinish={handleFinishScoring} onBack={handleGoToDashboard} />;

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
          <LandingPage onStartDebate={handleStartDebateFromLanding} onLogin={() => handleGoToAuth('dashboard')} onOpenSettings={isAuthenticated ? handleGoToSettings : undefined} />
        );

      default:
        return <LandingPage onStartDebate={handleStartDebateFromLanding} onLogin={() => handleGoToAuth('dashboard')} onOpenSettings={isAuthenticated ? handleGoToSettings : undefined} />;
    }
  };

  return (
    <div className="w-full min-h-screen overflow-y-auto">
      {renderScreen()}
      
      {showDock && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pb-4">
          <Dock
            items={getDockItems()}
            panelHeight={68}
            baseItemSize={50}
            magnification={60}
          />
        </div>
      )}

      {/* Modal de confirmación para salir del debate */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={cancelExit}
          />
          <div className="relative w-full max-w-md backdrop-blur-2xl bg-black/40 border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Pausar y salir</h3>
                <p className="text-white/50 text-sm">El debate en vivo quedará congelado</p>
              </div>
            </div>

            <p className="text-white/70 mb-6">
              Si sales ahora, el cronómetro se pausará y podrás continuar este debate después desde Debates Anteriores exactamente donde lo dejaste.
            </p>

            <div className="flex gap-3">
              <LiquidGlassButton
                onClick={cancelExit}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </LiquidGlassButton>
              
              <LiquidGlassButton
                onClick={confirmExit}
                variant="danger"
                className="flex-1"
              >
                Pausar y salir
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
