# 🚀 Quick Start Guide - CiceronAI Frontend

## Comenzar a Desarrollar Inmediatamente

### 1. Instalar Dependencias
```bash
cd frontend
npm install
```

### 2. Iniciar Servidor de Desarrollo
```bash
npm start
```
Se abrirá automáticamente en `http://localhost:3000`

### 3. Estructura de la App

```
┌─────────────────────────────────────────────┐
│          PANTALLA DE CONFIGURACIÓN          │
├─────────────────────────────────────────────┤
│ • Nombres de equipos (A/B)                  │
│ • Tema del debate                           │
│ • Duraciones de rondas configurables        │
│ • Botón INICIAR DEBATE                      │
└─────────────────────────────────────────────┘
              ↓ (al hacer click)
┌─────────────────────────────────────────────┐
│      PANTALLA PRINCIPAL DE COMPETICIÓN      │
├──────────────┬──────────────┬──────────────┤
│   EQUIPO A   │   CENTRAL    │   EQUIPO B   │
│  [Rojo]      │  [Tema]      │   [Azul]     │
│  ⏱ Timer    │  [Ronda]     │  ⏱ Timer    │
│  📊 Progreso │  [Estado]    │  📊 Progreso │
├──────────────┴──────────────┴──────────────┤
│  ← TURNO A  |  ▶ PLAY/PAUSE  |  TURNO B →  │
│  🎤 Grabando... (indicador automático)     │
├──────────────────────────────────────────────┤
│  Estado: ► EN DIRECTO | Ronda 1/8           │
└─────────────────────────────────────────────┘
```

## 📚 Arquitectura de Código

### State Management (Zustand)
```
useDebateStore (debateStore.ts)
├── Estado Global
│   ├── config: DebateConfig
│   ├── state: 'setup'|'running'|'paused'|'finished'
│   ├── currentRoundIndex: 0-7
│   ├── timeRemaining: segundos
│   └── recordings: AudioRecording[]
├── Acciones
│   ├── initializeDebate()
│   ├── startDebate()
│   ├── pauseDebate()
│   ├── nextRound()
│   ├── previousRound()
│   └── addRecording()
└── Getters
    ├── getCurrentRound()
    ├── getTeamName()
    ├── canGoToNextRound()
    └── canGoToPreviousRound()
```

### Componentes
```
App (raíz)
├── SetupScreen (configuración inicial)
└── CompetitionScreen (competición)
    ├── TeamCard (Panel equipo A)
    ├── CentralPanel (Estado central)
    ├── TeamCard (Panel equipo B)
    └── Controls (Botones navegación)
```

### Hooks Personalizados
```
useDebateTimer()
  ├── Sincroniza tiempo global
  ├── Decrementa cada segundo
  └── Detiene en 0

useAudioRecorder()
  ├── Acceso al micrófono
  ├── Inicia/Detiene grabación
  └── Retorna Blob + metadata

useAutoAudioRecording()
  ├── Escucha cambios de estado
  ├── Inicia grabación automáticamente
  ├── Detiene cuando tiempo=0 o pausa
  └── Guarda en store
```

## 🎮 Flujo de Uso

### Setup
1. Usuario ingresa nombres de equipos
2. Selecciona tema
3. Ajusta duraciones (opcional)
4. Click "INICIAR DEBATE"
5. Se solicita permiso de micrófono

### Competición
1. **Ronda 1**: Equipo A - Introducción (180s)
   - Timer corre automáticamente
   - Audio se graba automáticamente
   - Barra de progreso se llena roja
   - Glow rojo pulsa en panel A

2. **Ronda 2**: Equipo B - Introducción (180s)
   - Cambio automático al terminar tiempo
   - Panel A se atenúa, Panel B se ilumina

3. ... Continúa con 6 rondas más

8. **Ronda 8**: Equipo A - Conclusión (180s)
   - Al terminar, debate finaliza automáticamente
   - Vuelve a pantalla de configuración

## 🔌 Integración Backend (Próxima Fase)

### Estructura de Datos Lista para Enviar

```typescript
// Cada grabación tiene esta estructura
{
  id: "recording_1708345600000",
  team: "A",
  roundType: "Introducción",
  order: 1,
  timestamp: "2024-02-19T12:30:00Z",
  duration: 175.3,
  blob: Blob,  // Audio raw
  url: "blob:http://localhost:3000/..."
}
```

### Cómo Conectar API

1. En `useAutoAudioRecording.ts`, al terminar grabación:
```typescript
const response = await fetch('/api/debates/recordings', {
  method: 'POST',
  body: formData,  // multipart/form-data con blob
});
```

2. En `App.tsx`, al finalizar debate:
```typescript
const handleFinishDebate = async () => {
  const recordings = useDebateStore.getState().getRecordings();
  await fetch('/api/debates/complete', {
    method: 'POST',
    body: JSON.stringify({ recordings })
  });
  setShowSetup(true);
};
```

## 🎨 Personalización Visual

### Cambiar Colores

**En `tailwind.config.js`:**
```javascript
colors: {
  "red-team": "#dc2626",      // Cambiar aquí
  "blue-team": "#3b82f6",     // Cambiar aquí
  "dark-bg": "#0a0e27",       // Cambiar fondo
}
```

**En `src/index.css`:**
```css
@keyframes glow-red {
  0%, 100% {
    box-shadow: 0 0 20px rgba(220, 38, 38, 0.5);  /* Color glow */
  }
}
```

### Cambiar Duraciones de Rondas

**En `src/utils/roundsSequence.ts`:**
```typescript
const defaultDurations = {
  introduccion: 120,       // cambiar 180 a 120
  primerRefutador: 180,    // cambiar 240 a 180
  segundoRefutador: 180,
  conclusion: 120,
};
```

## 🐛 Debugging

### Ver Estado Global en Consola
```javascript
// En Developer Tools Console
useDebateStore.getState()
```

### Logging de Cambios
```javascript
// En App.tsx
useDebateStore.subscribe(
  (state) => console.log('State changed:', state)
);
```

### Audio Debug
```javascript
// En useAudioRecorder.ts agregar
console.log('Recording started:', mediaRecorder);
console.log('Audio blob size:', blob.size);
```

## 📦 Build Producción

```bash
npm run build
```

Genera carpeta `build/` lista para deploy. Tamaño final:
- JS: 67 KB (gzip)
- CSS: 4 KB (gzip)
- Total: ~71 KB

## ✅ Checklist de Verificación

- [ ] App se inicia sin errores
- [ ] Pantalla de setup funciona
- [ ] Se pueden ingresar nombres
- [ ] Timer cuenta hacia atrás
- [ ] Audio se graba (revisar permisos del navegador)
- [ ] Cambio de turnos automático
- [ ] Glow rojo/azul cambia según turno
- [ ] Botones de navegación funcionan
- [ ] Pantalla responsive en 16:9

## 📝 Notas Importantes

1. **Micrófono**: Requiere HTTPS en producción (o localhost en dev)
2. **Audio**: Se guarda en memoria (blob), implementar API para persistencia
3. **Estado**: Se reinicia al recargar página (agregar localStorage si es necesario)
4. **Compatibilidad**: Chrome, Firefox, Edge. Safari puede tener limitaciones con Web Audio API

## 🚨 Errores Comunes

**"Error al acceder al micrófono"**
- Verificar permisos del navegador
- En HTTPS: permitir en settings de seguridad
- En localhost: debe funcionar sin configuración

**"Timer no decrementa"**
- Verificar que `isTimerRunning` esté en true
- Revisar que `useDebateTimer()` se llama en componente

**"No se graba audio"**
- Micrófono conectado y habilitado
- Permiso otorgado al navegador
- Estado debe ser 'running'

---

¡Todo listo para comenzar desarrollo! 🎬
