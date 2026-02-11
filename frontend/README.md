# CiceronAI - Frontend de Competición de Debate

## 🎯 Descripción

Frontend profesional y cinematográfico para una plataforma de competición de debate con juez de IA. Sistema completo de gestión de rondas, temporizadores independientes, grabación de audio automática e interfaz competitiva moderna.

## 🚀 Características Principales

### ✅ Implementado
- **Interfaz Cinematográfica**: Degradados dinámicos, glows animados y efectos visuales profesionales
- **State Machine Completo**: Gestión de estados con Zustand (Setup → Running → Paused → Finished)
- **8 Rondas de Debate**:
  - 2x Introducción (180s c/u)
  - 2x Primer Refutador (240s c/u)
  - 2x Segundo Refutador (240s c/u)
  - 2x Conclusión (180s c/u)
- **Temporizadores Independientes**: Por equipo con barra de progreso dinámica
- **Grabación de Audio Automática**: Captura automática al iniciar ronda, almacenamiento con metadatos
- **Controles Intuitivos**: Play/Pause, navegación entre rondas, cambio de equipos
- **Indicadores Visuales**: Glows dinámicos, opacity reducida, transiciones suaves
- **Pantalla de Configuración**: Personalización de nombres, tema y duraciones
- **Diseño Responsive**: Optimizado para pantallas 16:9, UI fluida

### 🔮 Preparado para Backend
- Estructura de tipos TypeScript lista para API integration
- Recordings almacenados con metadata completa (equipo, tipo ronda, orden, timestamp)
- Servicios organizados para futuras llamadas HTTP

## 📁 Estructura de Carpetas

```
src/
├── components/
│   ├── common/
│   │   ├── TeamCard.tsx         # Panel de equipo con temporizador
│   │   ├── CentralPanel.tsx     # Panel central de estado
│   │   ├── Controls.tsx         # Controles de navegación
│   │   └── index.ts
│   └── screens/
│       ├── SetupScreen.tsx      # Pantalla de configuración
│       ├── CompetitionScreen.tsx # Pantalla principal del debate
│       └── index.ts
├── hooks/
│   ├── useDebateTimer.ts        # Temporizador del debate
│   ├── useAudioRecorder.ts      # Grabadora de audio
│   ├── useAutoAudioRecording.ts # Grabación automática
│   └── index.ts
├── store/
│   └── debateStore.ts           # Zustand store (state machine)
├── types/
│   └── index.ts                 # Tipos TypeScript
├── utils/
│   └── roundsSequence.ts        # Lógica de secuencia de rondas
├── App.tsx                      # Componente raíz
├── App.css                      # Estilos globales
└── index.css                    # Tailwind + estilos cinematográficos
```

## 🛠️ Tecnologías

- **React 18** + TypeScript
- **TailwindCSS 3** - Estilos y diseño responsivo
- **Zustand** - State management (store centralizado)
- **Lucide React** - Iconografía moderna
- **Web Audio API** - Grabación de audio nativa

## 🎨 Paleta de Colores

| Color | Uso | Valor |
|-------|-----|-------|
| Rojo Equipo | Panel A, glows | `#dc2626` / `#b91c1c` |
| Azul Equipo | Panel B, glows | `#3b82f6` / `#1e40af` |
| Fondo Oscuro | Background | `#0a0e27` |
| Carbón | Paneles | `#2d3748` |

## 🚀 Instalación y Ejecución

### Requisitos
- Node.js 16+
- npm o yarn

### Setup
```bash
cd frontend
npm install
```

### Desarrollo
```bash
npm start
```
Accede a `http://localhost:3000`

### Build Producción
```bash
npm run build
```

## 📖 Uso

1. **Configuración**: 
   - Ingresa nombres de equipos y tema
   - Ajusta duraciones de rondas (opcional)
   - Click en "INICIAR DEBATE"

2. **Competición**:
   - El temporizador inicia automáticamente
   - Audio se graba automáticamente en cada turno
   - Usa Play/Pause para controlar
   - Navega con flechas entre rondas
   - Sistema alerta visualmente cuando es turno de cada equipo

3. **Audio**:
   - Se solicita permiso de micrófono al iniciar
   - Grabación automática con indicador visual
   - Archivos almacenados en memoria con metadata

## 🔧 API Hooks Principales

### `useDebateStore()`
```typescript
const {
  state,              // 'setup' | 'paused' | 'running' | 'finished'
  currentTeam,        // 'A' | 'B'
  timeRemaining,      // segundos
  isTimerRunning,     // boolean
  startDebate,        // () => void
  pauseDebate,        // () => void
  nextRound,          // () => void
  getRecordings,      // () => AudioRecording[]
} = useDebateStore();
```

### `useDebateTimer()`
Retorna temporizador sincronizado con Zustand

### `useAutoAudioRecording()`
Retorna estado de grabación y errores

## 📝 Tipos Principales

```typescript
interface DebateConfig {
  teamAName: string;
  teamBName: string;
  debateTopic: string;
  roundDurations: {
    introduccion: number;
    primerRefutador: number;
    segundoRefutador: number;
    conclusion: number;
  };
}

interface AudioRecording {
  id: string;
  team: 'A' | 'B';
  roundType: RoundType;
  order: number;
  timestamp: string;
  duration: number;
  blob: Blob;
  url: string;
}
```

## 🎬 Características Cinematográficas

- **Degradado dinámico** con destello rojo y azul
- **Glows pulsantes** en equipos activos
- **Viñeta sutil** para profundidad visual
- **Transiciones suaves** (300ms cubic-bezier)
- **Animaciones pulsantes** para indicadores en vivo
- **Shadow layering** para profundidad

## 🔮 Próximas Fases (Backend)

- [ ] Integración API para guardar recordings
- [ ] Evaluación con IA
- [ ] Dashboard de resultados
- [ ] Historial de debates
- [ ] Sistema de usuarios y autenticación
- [ ] Estadísticas y análisis

## 📄 Notas de Desarrollo

- **No hay warnings de compilación**: Código limpio y optimizado
- **TypeScript estricto**: Type-safe en toda la aplicación
- **ESLint compliant**: Sigue estándares de React
- **Responsive**: Mobile-first, optimizado para 16:9
- **Accesible**: Estructura semántica HTML5

---

**Desarrollado como frontend senior especializado en interfaces modernas y UX cinematográfico** 🎨🎬

