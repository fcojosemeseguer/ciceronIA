/**
 * App principal - Componente raíz de la aplicación
 * Estructura renovada según especificaciones funcionales
 */

import React, { useState, useEffect } from 'react';
import { 
  AuthScreen, 
  HomeScreen, 
  SetupScreen, 
  CompetitionScreen, 
  DebateDetailsScreen, 
  ScoringScreen, 
  LandingPage,
  AnalysisScreen,
  AnalysisResultsScreen,
  DashboardScreen,
  DebateModeScreen,
  SettingsScreen,
  AnalysisSetupScreen,
} from './components/screens';
import { useAuthStore, useAnalysisStore } from './store';
import { useDebateHistoryStore } from './store/debateHistoryStore';
import { useDebateStore } from './store/debateStore';
import { DebateHistory } from './types';
import { Dock, LiquidGlassButton } from './components/common';
import { Home, Plus, AlertTriangle, Clock, LayoutDashboard, Settings } from 'lucide-react';
import './App.css';

type AppScreen = 
  | 'landing' 
  | 'auth' 
  | 'dashboard'
  | 'debate-mode'
  | 'setup' 
  | 'competition' 
  | 'scoring' 
  | 'analysis-setup'
  | 'analysis' 
  | 'analysis-results'
  | 'home' 
  | 'debate-details'
  | 'settings';

function App() {
  const { checkAuth, isAuthenticated, logout } = useAuthStore();
  const { selectedDebate, selectDebate } = useDebateHistoryStore();
  const { clearUploads } = useAnalysisStore();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [screenHistory, setScreenHistory] = useState<AppScreen[]>(['landing']);
  const [pendingRedirectAfterAuth, setPendingRedirectAfterAuth] = useState<AppScreen | null>(null);
  
  // Configuración del análisis de grabados
  const [analysisConfig, setAnalysisConfig] = useState<{
    teamAName: string;
    teamBName: string;
    debateTopic: string;
    debateType: string;
  } | null>(null);

  // Función para navegar guardando historial
  const navigateTo = (screen: AppScreen) => {
    if (screen !== currentScreen) {
      setScreenHistory(prev => [...prev, screen]);
      setCurrentScreen(screen);
    }
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
    checkAuth();
    setIsAuthChecked(true);
  }, [checkAuth]);

  // Navegación básica
  const handleGoToLanding = () => navigateTo('landing');
  const handleGoToDashboard = () => navigateTo('dashboard');
  
  // Auth
  const handleAuthenticated = () => {
    if (pendingRedirectAfterAuth) {
      navigateTo(pendingRedirectAfterAuth);
      setPendingRedirectAfterAuth(null);
    } else {
      navigateTo('dashboard');
    }
  };
  
  const handleGoToAuth = (redirectTo?: AppScreen) => {
    if (redirectTo) {
      setPendingRedirectAfterAuth(redirectTo);
    }
    navigateTo('auth');
  };

  // Dashboard flows
  const handleNewDebate = () => {
    navigateTo('debate-mode');
  };

  const handleAnalyzeRecorded = () => {
    if (!isAuthenticated) {
      handleGoToAuth('analysis-setup');
      return;
    }
    navigateTo('analysis-setup');
  };

  const handleAnalysisConfigured = (config: {
    teamAName: string;
    teamBName: string;
    debateTopic: string;
    debateType: string;
  }) => {
    setAnalysisConfig(config);
    navigateTo('analysis');
  };

  const handleBackFromAnalysisSetup = () => {
    setAnalysisConfig(null);
    navigateTo('dashboard');
  };

  const handleViewHistory = () => {
    navigateTo('home');
  };

  // Debate Mode Selection
  const handleSelectLiveDebate = () => {
    navigateTo('setup');
  };

  const handleSelectRecordedDebate = () => {
    if (!isAuthenticated) {
      handleGoToAuth('analysis-setup');
      return;
    }
    navigateTo('analysis-setup');
  };

  // Analysis - Análisis de debates grabados
  const handleViewResults = () => {
    navigateTo('analysis-results');
  };

  const handleBackFromAnalysis = () => {
    clearUploads();
    navigateTo('dashboard');
  };

  // Flujo legacy (mantener para compatibilidad)
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
    navigateTo('home');
  };

  // Estados para confirmación de salida
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const confirmExit = () => {
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
    setShowExitConfirm(false);
  };

  const cancelExit = () => {
    setPendingNavigation(null);
    setShowExitConfirm(false);
  };

  const handleStartDebate = () => navigateTo('competition');
  const handleFinishDebate = () => navigateTo('scoring');
  const handleFinishScoring = () => navigateTo('dashboard');

  const { state: debateState } = useDebateStore();

  const isDebateActive = () => {
    return currentScreen === 'competition' && (debateState === 'running' || debateState === 'paused');
  };

  const handleNavigationWithConfirm = (navigationFn: () => void) => {
    if (isDebateActive()) {
      setPendingNavigation(() => navigationFn);
      setShowExitConfirm(true);
    } else {
      navigationFn();
    }
  };

  // Configurar items del dock
  const getDockItems = () => {
    const items = [];
    
    // Botón principal dinámico: Inicio/Panel con comportamiento toggle
    if (isAuthenticated) {
      if (currentScreen === 'dashboard') {
        // En Dashboard: mostrar Inicio (si vuelves a pulsar, va atrás)
        items.push({
          icon: <Home className="w-6 h-6 text-white" />,
          label: 'Inicio',
          onClick: () => handleNavigationWithConfirm(() => goBack())
        });
      } else {
        // En otras páginas: mostrar Panel (si vuelves a pulsar, va atrás)
        items.push({
          icon: <LayoutDashboard className="w-6 h-6 text-white" />,
          label: 'Panel',
          onClick: () => handleNavigationWithConfirm(() => goBack())
        });
      }
    } else {
      // No autenticado: siempre mostrar Inicio
      items.push({
        icon: <Home className="w-6 h-6 text-white" />,
        label: 'Inicio',
        onClick: () => handleNavigationWithConfirm(() => {
          if (currentScreen === 'landing') {
            goBack();
          } else {
            handleGoToLanding();
          }
        })
      });
    }

    // Nuevo Debate - visible en dashboard y home
    if (currentScreen === 'dashboard' || currentScreen === 'home') {
      items.push({
        icon: <Plus className="w-6 h-6 text-white" />,
        label: 'Nuevo Debate',
        onClick: () => handleNewDebate()
      });
    }

    // Historial - visible SOLO cuando está en el Panel de Control
    if (isAuthenticated && currentScreen === 'dashboard') {
      items.push({
        icon: <Clock className="w-6 h-6 text-white" />,
        label: 'Historial',
        onClick: () => navigateTo('home')
      });
    }

    // Configuración del perfil (con comportamiento toggle)
    items.push({
      icon: <Settings className="w-6 h-6 text-white" />,
      label: 'Configuración',
      onClick: () => handleNavigationWithConfirm(() => {
        if (currentScreen === 'settings') {
          goBack();
        } else {
          navigateTo('settings');
        }
      })
    });

    return items;
  };

  // Determinar si mostrar el dock
  const showDock = [
    'dashboard',
    'home', 
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00E5FF]"></div>
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

      case 'analysis-setup':
        return (
          <AnalysisSetupScreen
            onConfigured={handleAnalysisConfigured}
            onBack={handleBackFromAnalysisSetup}
          />
        );

      case 'analysis':
        return (
          <AnalysisScreen
            config={analysisConfig}
            onBack={handleBackFromAnalysis}
            onViewResults={handleViewResults}
          />
        );

      case 'analysis-results':
        return (
          <AnalysisResultsScreen
            onBack={() => setCurrentScreen('analysis')}
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
        return <CompetitionScreen onFinish={handleFinishDebate} />;

      case 'scoring':
        return <ScoringScreen onFinish={handleFinishScoring} onBack={handleGoToDashboard} />;

      case 'debate-details':
        return selectedDebate ? (
          <DebateDetailsScreen debate={selectedDebate} onBack={handleBackToHome} />
        ) : (
          <HomeScreen onNewDebate={handleNewDebate} onViewDebate={handleViewDebate} onBack={handleGoToDashboard} />
        );

      case 'settings':
        return <SettingsScreen onBack={handleGoToDashboard} />;

      default:
        return <LandingPage onStartDebate={handleStartDebateFromLanding} onLogin={() => handleGoToAuth('dashboard')} />;
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
                <h3 className="text-xl font-bold text-white">¿Salir del debate?</h3>
                <p className="text-white/50 text-sm">El debate está en curso</p>
              </div>
            </div>

            <p className="text-white/70 mb-6">
              Si sales ahora, perderás el progreso del debate actual. ¿Estás seguro de que quieres salir?
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
                Salir
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
