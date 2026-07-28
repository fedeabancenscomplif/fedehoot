# FedeHoot!

Clon de Kahoot self-hosteable para jugar trivia en tiempo real con amigos en la misma red o en internet.

## Features

- Crear y editar quizzes con hasta 4 respuestas por pregunta y tiempo configurable (10–60s)
- **3 tipos de pregunta** (ver abajo)
- Sala de espera con código de 6 letras para que se unan los jugadores
- Sincronización en tiempo real via WebSockets
- Puntuación basada en velocidad: máximo 1000 puntos por pregunta, decrece con el tiempo
- Leaderboard entre preguntas y podio final
- Funciona desde el celular en la misma red WiFi o por internet via Railway


## Tipos de pregunta

| Tipo | Descripción | UX del jugador |
|---|---|---|
| **Una correcta** | Una sola respuesta es correcta | Toca una de las 4 opciones de color |
| **Varias correctas** | Múltiples respuestas pueden ser correctas | Toca todas las que crea correctas y presiona "Confirmar". Requiere seleccionar exactamente las correctas para puntuar |
| **Ordenar** | Los elementos deben ordenarse de cierta forma (ej: de mayor a menor precio) | Toca los elementos en el orden correcto. Al ubicar todos, se envía automáticamente. Puntuación parcial por posiciones acertadas |

## Stack

| Capa | Tecnología |
|---|---|
| Servidor | Node.js + Express + Socket.io |
| Base de datos | SQLite via `node:sqlite` (built-in Node 22+, sin dependencias nativas) |
| Cliente | React 18 + Vite + Tailwind CSS |

## Requisitos

- Node.js 22 o superior

## Instalación

```bash
git clone <repo-url>
cd fedehoot

# Instalar dependencias de server y client
npm install --prefix server
npm install --prefix client
```

## Correr en local

```bash
# Terminal 1 — servidor (puerto 3001)
cd server && npm run dev

# Terminal 2 — cliente (puerto 5173)
cd client && npm run dev
```

Abrir `http://localhost:5173` en el browser.

### Jugar desde el celular (misma red WiFi)

Desde el celu entrar a `http://<IP-de-tu-Mac>:5173`.

Para ver tu IP local:
```bash
ipconfig getifaddr en0
```

## Estructura del proyecto

```
fedehoot/
├── server/
│   └── src/
│       ├── index.js          # Express + Socket.io
│       ├── db.js             # SQLite setup
│       ├── game/
│       │   └── GameRoom.js   # Máquina de estados del juego
│       ├── routes/
│       │   └── quizzes.js    # REST API (CRUD quizzes)
│       └── sockets/
│           └── index.js      # Handlers de WebSocket
└── client/
    └── src/
        ├── pages/
        │   ├── Home.jsx        # Landing
        │   ├── QuizList.jsx    # Lista de quizzes
        │   ├── QuizEditor.jsx  # Crear/editar quiz
        │   ├── HostGame.jsx    # Vista del host
        │   ├── JoinGame.jsx    # Unirse con código
        │   └── PlayGame.jsx    # Vista del jugador
        └── socket.js           # Singleton Socket.io client
```

## Flujo del juego

```
Host crea sala → jugadores se unen con código
    → host apreta Empezar
        → pregunta + timer
            → jugadores responden (o se acaba el tiempo)
                → respuesta correcta + puntajes
                    → leaderboard → siguiente pregunta
                        → ... → podio final
```

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/quizzes` | Listar quizzes |
| GET | `/api/quizzes/:id` | Obtener quiz con preguntas |
| POST | `/api/quizzes` | Crear quiz |
| PUT | `/api/quizzes/:id` | Actualizar quiz |
| DELETE | `/api/quizzes/:id` | Eliminar quiz |

## Eventos WebSocket

### Cliente → Servidor
| Evento | Payload |
|---|---|
| `host:create-game` | `{ quizId }` |
| `host:start-game` | — |
| `host:next-question` | — |
| `player:join` | `{ roomCode, nickname }` |
| `player:answer` | `{ payload }` — string para una correcta, array de IDs para varias/ordenar |
| `player:request-state` | — |

### Servidor → Cliente
| Evento | Descripción |
|---|---|
| `game:created` | Sala creada, devuelve `roomCode` |
| `game:player-list` | Lista actualizada de jugadores |
| `game:question` | Nueva pregunta (sin revelar respuesta correcta) |
| `game:answer-count` | Cuántos respondieron hasta ahora (solo al host) |
| `game:question-results` | Respuesta(s) correcta(s) + leaderboard |
| `player:joined` | Confirmación de entrada a la sala |
| `player:answer-received` | Confirmación de respuesta enviada |
| `player:your-result` | Resultado individual (correcto/incorrecto + puntos) |
| `game:finished` | Fin del juego + leaderboard final |
| `game:error` | Error (sala no encontrada, host desconectado, etc.) |

## Deploy

### Preparar para producción

Antes de deployar, hacer el build del cliente y configurar Express para servir los archivos estáticos:

```bash
cd client && npm run build
```

Agregar en `server/src/index.js` antes del `httpServer.listen`:
```js
import { join } from 'path';
app.use(express.static(join(__dirname, '../../client/dist')));
app.get('*', (req, res) =>
  res.sendFile(join(__dirname, '../../client/dist/index.html'))
);
```

### Railway

1. Hacer push del repo a GitHub
2. Entrar a [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Configurar variable de entorno: `PORT=3001`
4. Railway detecta Node.js automáticamente

Plan Hobby ($5/mes, incluye $5 de créditos — para uso ocasional suele alcanzar).

### Fly.io

```bash
brew install flyctl
flyctl auth login
flyctl launch
flyctl volumes create data --size 1  # para persistir el SQLite
```

Tiene un free tier genuino (3 VMs compartidas).
