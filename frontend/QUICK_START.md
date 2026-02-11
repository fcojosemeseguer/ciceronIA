# ⚡ CÓMO USAR LA APP - Guía Rápida

## 🚀 Iniciar el Servidor

```bash
cd frontend
npm start
```

Se abrirá automáticamente en `http://localhost:3000`

---

## 📋 Pantalla 1: Configuración

### Paso 1: Completa el Formulario
```
┌─────────────────────────────────────────────┐
│  COMPETICIÓN DE DEBATE                      │
│  Configuración Inicial                      │
├─────────────────────────────────────────────┤
│  [Nombre Equipo A]        [Nombre Equipo B] │
│  Ej: Rojos                Ej: Azules        │
│                                             │
│  [        Tema del Debate        ]          │
│  Ej: "¿Es importante la educación?"         │
├─────────────────────────────────────────────┤
│  ⏱️ Duraciones (segundos)                    │
│  Intro: 180  Ref1: 240  Ref2: 240 Conc: 180│
├─────────────────────────────────────────────┤
│         [▶ INICIAR DEBATE]                  │
│  Total: 8 rondas, ~24 minutos               │
└─────────────────────────────────────────────┘
```

### Paso 2: Hacer Click en "INICIAR DEBATE"
- Se abrirá la pantalla de competición
- Permite al micrófono
- ¡Listo!

---

## 🎮 Pantalla 2: Competición

### Layout en Desktop
```
┌─────────────────────────────────────────────┐
│  Tema: "¿Es importante la educación?"       │
├───────────┬──────────┬───────────────────┤
│  ROJOS    │ CENTRAL  │  AZULES           │
│  (Rojo)   │  Intro 1 │  (Azul)           │
│  ⏱️ 3:45  │  Ronda   │  ⏱️ 3:45          │
│  📊 ▓▓▓░░ │  1/8     │  📊 ▓▓▓░░         │
│ EN TURNO  │ ROJOS    │ Inactivo          │
├───────────┴──────────┴───────────────────┤
│  ← TURNO A | ▶ PLAY/PAUSE | TURNO B →    │
│  🎤 Grabando... | Estado: ► EN DIRECTO  │
└─────────────────────────────────────────┘
```

### Layout en Móvil
```
┌─────────────────┐
│ Tema: "Educar?" │
├─────────────────┤
│  ROJOS          │
│  ⏱️ 3:45        │
│ 📊 ▓▓▓░░        │
├─────────────────┤
│  CENTRAL        │
│  Ronda 1/8      │
│  Intro - ROJOS  │
├─────────────────┤
│  AZULES         │
│  ⏱️ 3:45        │
│ 📊 ▓▓▓░░        │
├─────────────────┤
│ ← A | ▶ | B →  │
│ 🎤 Grabando...  │
└─────────────────┘
```

---

## 🎯 Controles Principales

### Botones
| Botón | Función |
|-------|---------|
| **← Turno A** | Volver a turno anterior (Rojo) |
| **▶ / ⏸** | Play/Pause el debate |
| **Turno B →** | Avanzar a siguiente turno (Azul) |

### Indicadores
| Indicador | Significado |
|-----------|------------|
| 🎤 Grabando... | Audio se está grabando |
| ⏱️ 3:45 | Tiempo restante en el turno |
| 📊 ▓▓▓░░ | Barra de progreso del turno |
| Glow Rojo | Equipo A está hablando |
| Glow Azul | Equipo B está hablando |
| Opaco | Equipo inactivo |

---

## 📍 Secuencia de Rondas

La competición tiene **8 rondas** en este orden:

```
1️⃣  Introducción - Equipo A (180s)  [Rojos hablan]
2️⃣  Introducción - Equipo B (180s)  [Azules hablan]
3️⃣  Refutador 1 - Equipo A (240s)   [Rojos hablan]
4️⃣  Refutador 1 - Equipo B (240s)   [Azules hablan]
5️⃣  Refutador 2 - Equipo A (240s)   [Rojos hablan]
6️⃣  Refutador 2 - Equipo B (240s)   [Azules hablan]
7️⃣  Conclusión - Equipo B (180s)    [Azules hablan]
8️⃣  Conclusión - Equipo A (180s)    [Rojos hablan]

Total: ~24 minutos
```

---

## 🎬 Cómo Funciona

### Automático
- ✅ El temporizador decrementa automáticamente
- ✅ Audio se graba automáticamente
- ✅ Al llegar a 0s, se pausa automáticamente
- ✅ En la ronda 8, finaliza el debate

### Manual
- ⏸ Puedes pausar/reanudar en cualquier momento
- ← → Puedes ir atrás/adelante entre rondas
- 🎤 Las grabaciones se guardan con metadatos

---

## 🧪 Testing Rápido

### Sin Llenar Formulario
Abre consola (F12) y ejecuta:
```javascript
debateDebug.initDebate()
debateDebug.startDebate()
```

¡La competición inicia al instante! (con datos de prueba)

### Debug Útil
```javascript
debateDebug.getState()        // Ver estado actual
debateDebug.pauseDebate()     // Pausar
debateDebug.nextRound()       // Siguiente ronda
debateDebug.getRecordings()   // Ver grabaciones
```

---

## 📱 Compatibilidad

✅ **Desktop** (1920x1080 - Óptimo)  
✅ **Laptop** (1366x768)  
✅ **Tablet** (iPad, Surface)  
✅ **Mobile** (iPhone, Android)  

Redimensiona la ventana para ver cómo se adapta el layout

---

## ⚠️ Posibles Issues

### "No aparece botón INICIAR DEBATE"
→ Abre F12 Console y ejecuta: `debateDebug.help()`

### "No funciona el audio"
→ Abre F12 Console y busca errores  
→ Verifica que permitiste el micrófono  
→ En HTTPS necesitas https://

### "Layout se ve roto en móvil"
→ Recarga la página (Ctrl+Shift+R)  
→ Verifica que no estés en modo desktop

### "Botones no responden"
→ Abre F12 Console y ejecuta: `debateDebug.getState()`  
→ Debería mostrar el estado actual

---

## 🎁 Extras

### Personalizar Debate
```javascript
debateDebug.initDebate(
  'Real Madrid',           // Equipo A
  'Barcelona',             // Equipo B
  'Messi vs Cristiano'     // Tema
)
debateDebug.startDebate()
```

### Ver Grabaciones
```javascript
const recs = debateDebug.getRecordings()
console.table(recs)
```

### Ir a Ronda Específica
```javascript
// Iniciar desde ronda 5
debateDebug.nextRound()
debateDebug.nextRound()
debateDebug.nextRound()
debateDebug.nextRound()
```

---

## 📞 Soporte

- 📖 Documentación: Lee `README.md`, `DEVELOPMENT.md`, `FIXES_AND_RESPONSIVE.md`
- 🔍 Debug: Usa `debateDebug.*` en consola (F12)
- 💻 Dev Tools: Abre F12 para logs y errores

---

**¡Listo para competir!** 🚀🎬
