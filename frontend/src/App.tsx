/**
 * App principal - Componente raíz de la aplicación
 * Gestiona las transiciones entre pantallas de configuración y competición
 */

import React, { useState, useEffect } from 'react';
import { SetupScreen, CompetitionScreen } from './components/screens';
import './App.css';

function App() {
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    // Debug logs
    console.log('🎬 CiceronAI App mounted');
    console.log('📱 Window size:', window.innerWidth, 'x', window.innerHeight);
    
    return () => {
      console.log('🎬 CiceronAI App unmounted');
    };
  }, []);

  const handleStartDebate = () => {
    console.log('✅ Starting competition screen...');
    setShowSetup(false);
  };

  const handleFinishDebate = () => {
    console.log('🏁 Finishing debate, returning to setup...');
    setShowSetup(true);
  };

  return (
    <div className="w-full h-screen overflow-hidden">
      {showSetup ? (
        <SetupScreen onStartDebate={handleStartDebate} />
      ) : (
        <CompetitionScreen onFinish={handleFinishDebate} />
      )}
    </div>
  );
}

export default App;



