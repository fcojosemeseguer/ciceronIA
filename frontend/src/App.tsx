/**
 * App principal - Componente raíz de la aplicación
 * Gestiona las transiciones entre pantallas de configuración y competición
 */

import React, { useState } from 'react';
import { SetupScreen, CompetitionScreen } from './components/screens';
import './App.css';

function App() {
  const [showSetup, setShowSetup] = useState(true);

  const handleStartDebate = () => {
    setShowSetup(false);
  };

  const handleFinishDebate = () => {
    setShowSetup(true);
  };

  return (
    <div className="w-screen h-screen overflow-hidden">
      {showSetup ? (
        <SetupScreen onStartDebate={handleStartDebate} />
      ) : (
        <CompetitionScreen onFinish={handleFinishDebate} />
      )}
    </div>
  );
}

export default App;


