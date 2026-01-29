/**
 * Debug helper - Herramienta para debuggear desde la consola
 * Expone funciones útiles en window.debateDebug
 */

import { useDebateStore } from '../store/debateStore';

export const setupDebug = () => {
  // Exponer store en window para debugging
  const store = useDebateStore;
  
  (window as any).debateDebug = {
    // Getter de estado actual
    getState: () => store.getState(),
    
    // Acciones de control
    initDebate: (teamA = 'Rojos', teamB = 'Azules', topic = 'Tema Test') => {
      store.getState().initializeDebate({
        teamAName: teamA,
        teamBName: teamB,
        debateTopic: topic,
        roundDurations: {
          introduccion: 10,  // 10s para testing
          primerRefutador: 15,
          segundoRefutador: 15,
          conclusion: 10,
        },
      });
      console.log('✅ Debate initialized');
    },
    
    startDebate: () => {
      store.getState().startDebate();
      console.log('▶ Debate started');
    },
    
    pauseDebate: () => {
      store.getState().pauseDebate();
      console.log('⏸ Debate paused');
    },
    
    resumeDebate: () => {
      store.getState().resumeDebate();
      console.log('▶ Debate resumed');
    },
    
    nextRound: () => {
      store.getState().nextRound();
      console.log('⏭ Next round');
    },
    
    previousRound: () => {
      store.getState().previousRound();
      console.log('⏮ Previous round');
    },
    
    finishDebate: () => {
      store.getState().finishDebate();
      console.log('✓ Debate finished');
    },
    
    getRecordings: () => {
      const recordings = store.getState().getRecordings();
      console.log('🎙️ Recordings:', recordings);
      return recordings;
    },
    
    // Info útil
    help: () => {
      console.log(`
🎬 CiceronAI Debug Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
getState()              - Ver estado actual
initDebate()            - Inicializar debate
startDebate()           - Iniciar debate
pauseDebate()           - Pausar debate
resumeDebate()          - Reanudar debate
nextRound()             - Siguiente ronda
previousRound()         - Ronda anterior
finishDebate()          - Finalizar debate
getRecordings()         - Ver grabaciones
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ejemplo rápido:
  debateDebug.initDebate()
  debateDebug.startDebate()
  debateDebug.pauseDebate()
      `);
    },
  };

  console.log('🎬 Debug mode enabled! Type: debateDebug.help()');
};
