/**
 * App principal - Componente raíz de la aplicación
 * Gestiona las transiciones entre pantallas
 */

import React, { useState, useEffect } from 'react';
import { AuthScreen, HomeScreen, SetupScreen, CompetitionScreen, DebateDetailsScreen, ScoringScreen, LandingPage } from './components/screens';
import { useAuthStore } from './store/authStore';
import { useDebateHistoryStore } from './store/debateHistoryStore';
import { useDebateStore } from './store/debateStore';
import { DebateHistory } from './types';
import { Dock, LiquidGlassButton } from './components/common';
import { Home, ArrowLeft, UserCircle, Settings, Plus, AlertTriangle } from 'lucide-react';
import './App.css';

type AppScreen = 'landing' | 'auth' | 'home' | 'setup' | 'competition' | 'scoring' | 'debate-details';

function App() {
  const { checkAuth } = useAuthStore();
  const { selectedDebate, selectDebate } = useDebateHistoryStore();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');

  useEffect(() => {
    checkAuth();
    setIsAuthChecked(true);
  }, [checkAuth]);

  const handleGoToLanding = () => setCurrentScreen('landing');
  const [pendingRedirectAfterAuth, setPendingRedirectAfterAuth] = useState<'home' | null>(null);
  const handleAuthenticated = () => {
    if (pendingRedirectAfterAuth) {
      setCurrentScreen(pendingRedirectAfterAuth);
      setPendingRedirectAfterAuth(null);
    } else {
      setCurrentScreen('landing');
    }
  };
  const handleGoToAuth = (redirectTo?: 'home') => {
    if (redirectTo) {
      setPendingRedirectAfterAuth(redirectTo);
    }
    setCurrentScreen('auth');
  };
  const handleNewDebate = () => setCurrentScreen('setup');
  const handleStartDebateFromLanding = () => setCurrentScreen('home');
  
  const handleViewDebate = (debate: DebateHistory) => {
    selectDebate(debate);
    setCurrentScreen('debate-details');
  };

  const handleBackToHome = () => {
    selectDebate(null);
    setCurrentScreen('home');
  };

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

  const handleStartDebate = () => setCurrentScreen('competition');
  const handleFinishDebate = () => setCurrentScreen('scoring');
  const handleFinishScoring = () => setCurrentScreen('home');

  // Determinar si mostrar el dock (solo en pantallas de la app, no en landing/auth)
  const showDock = ['home', 'setup', 'competition', 'scoring', 'debate-details'].includes(currentScreen);

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

  // Configurar items del dock según la pantalla actual
  const getDockItems = () => {
    const items = [];
    
    // Home - siempre visible
    items.push({
      icon: <Home className="w-6 h-6 text-white" />,
      label: 'Inicio',
      onClick: () => handleNavigationWithConfirm(() => handleGoToLanding())
    });

    // Nuevo Debate - solo en la pantalla de Panel del Juez (home)
    if (currentScreen === 'home') {
      items.push({
        icon: <Plus className="w-6 h-6 text-white" />,
        label: 'Nuevo Debate',
        onClick: () => handleNewDebate()
      });
    }

    // Back - solo si no estamos en home
    if (currentScreen !== 'home') {
      items.push({
        icon: <ArrowLeft className="w-6 h-6 text-white" />,
        label: 'Volver',
        onClick: () => {
          handleNavigationWithConfirm(() => {
            if (currentScreen === 'setup') handleBackToHome();
            else if (currentScreen === 'competition') handleBackToHome();
            else if (currentScreen === 'scoring') handleBackToHome();
            else if (currentScreen === 'debate-details') handleBackToHome();
          });
        }
      });
    }

    // Profile
    items.push({
      icon: <UserCircle className="w-6 h-6 text-white" />,
      label: 'Perfil',
      onClick: () => alert('Perfil - Próximamente')
    });

    // Settings
    items.push({
      icon: <Settings className="w-6 h-6 text-white" />,
      label: 'Configuración',
      onClick: () => alert('Configuración - Próximamente')
    });

    return items;
  };

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
        return <LandingPage onStartDebate={handleStartDebateFromLanding} onLogin={handleGoToAuth} />;

      case 'auth':
        return <AuthScreen onAuthenticated={handleAuthenticated} onBack={handleGoToLanding} redirectTo={pendingRedirectAfterAuth} />;
      case 'home':
        return <HomeScreen onNewDebate={handleNewDebate} onViewDebate={handleViewDebate} onBack={handleGoToLanding} />;
      case 'setup':
        return <SetupScreen onStartDebate={handleStartDebate} onBack={handleBackToHome} />;
      case 'competition':
        return <CompetitionScreen onFinish={handleFinishDebate} />;
      case 'scoring':
        return <ScoringScreen onFinish={handleFinishScoring} onBack={handleBackToHome} />;
      case 'debate-details':
        return selectedDebate ? (
          <DebateDetailsScreen debate={selectedDebate} onBack={handleBackToHome} />
        ) : (
          <HomeScreen onNewDebate={handleNewDebate} onViewDebate={handleViewDebate} onBack={handleGoToLanding} />
        );
      default:
        return <LandingPage onStartDebate={handleStartDebateFromLanding} onLogin={handleGoToAuth} />;
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden">
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
