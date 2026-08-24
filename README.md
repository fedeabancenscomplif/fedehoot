# FedeHoot!

Clon de Kahoot self-hosteable para jugar trivia en tiempo real con amigos.

## Features

- Crear y editar quizzes con hasta 4 respuestas por pregunta y tiempo configurable (10–60s)
- **3 tipos de pregunta** (ver abajo)
- Sala de espera con código de 6 letras y **QR code** para unirse escaneando
- **Imágenes en preguntas** por URL pública
- Sincronización en tiempo real via WebSockets
- Puntuación basada en velocidad: máximo 1000 puntos por pregunta, decrece con el tiempo
- Leaderboard entre preguntas y podio final
- **Login con Google** — quizzes privados y permanentes
- **Modo invitado** — sin login, quizzes se borran automáticamente después de 24h


## Tipos de pregunta

| Tipo | Descripción | UX del jugador |
|---|---|---|
| **Una correcta** | Una sola respuesta es correcta | Toca una de las 4 opciones de color |
| **Varias correctas** | Múltiples respuestas pueden ser correctas | Toca todas las que crea correctas y presiona "Confirmar". Requiere seleccionar exactamente las correctas para puntuar |
| **Ordenar** | Los elementos deben ordenarse de cierta forma | Toca los elementos en el orden correcto. Al ubicar todos, se envía automáticamente. Puntuación parcial por posiciones acertadas |

## Imágenes en preguntas

En el editor hay un campo opcional de URL de imagen. Pegá la dirección de cualquier imagen pública (clic derecho → *Copiar dirección de imagen*) y aparece un preview en vivo. Durante el juego la imagen se muestra arriba del texto tanto en la pantalla del host como en el celular del jugador.

## QR code para unirse

En la sala de espera el host ve un QR que los jugadores pueden escanear. El QR lleva directo a la pantalla de unirse con el código ya precargado.

## Stack

| Capa | Tecnología |
|---|---|
| Cliente | React 18 + Vite + Tailwind CSS |
| Servidor | Node.js + Express + Socket.io |
| Base de datos | Supabase (Postgres) |
| Auth | Supabase Auth — Google OAuth |
| Hosting frontend | Vercel — CDN global, deploy automático en cada push a `main` |
| Hosting backend | Railway — proceso persistente (necesario para WebSockets) |

## Requisitos (desarrollo local)

- Node.js 22 o superior
- Una cuenta en [supabase.com](https://supabase.com) con un proyecto creado

## Instalación

```bash
git clone <repo-url>
cd fedehoot

npm install --prefix server
npm install --prefix client
```

Crear `server/.env` con las credenciales del proyecto Supabase:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Crear `client/.env.local` con las mismas credenciales (prefijo `VITE_` para que Vite las exponga al browser):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Las credenciales se encuentran en **Supabase Dashboard → Settings → API**.

## Base de datos

Las migraciones están en `supabase/migrations/`. Para aplicarlas manualmente, correr cada archivo en **Supabase Dashboard → SQL Editor**, o usar la [CLI de Supabase](https://supabase.com/docs/reference/cli).

## Correr en local

```bash
# Terminal 1 — servidor (puerto 3001)
cd server && npm run dev

# Terminal 2 — cliente (puerto 5173)
cd client && npm run dev
```

Abrir `http://localhost:5173` en el browser.

## Estructura del proyecto

```
fedehoot/
├── supabase/
│   └── migrations/          # Migraciones SQL
├── server/
│   └── src/
│       ├── index.js          # Express + Socket.io + guest cleanup
│       ├── db.js             # Supabase client + getUserFromRequest
│       ├── game/
│       │   └── GameRoom.js   # Máquina de estados del juego
│       ├── routes/
│       │   └── quizzes.js    # REST API con ownership checks
│       └── sockets/
│           └── index.js      # Handlers de WebSocket
└── client/
    └── src/
        ├── hooks/
        │   └── useAuth.js      # Google OAuth hook
        ├── pages/
        │   ├── Home.jsx
        │   ├── QuizList.jsx    # Lista de quizzes + login/logout
        │   ├── QuizEditor.jsx
        │   ├── HostGame.jsx
        │   ├── JoinGame.jsx
        │   └── PlayGame.jsx
        ├── supabase.js         # Supabase client (browser)
        └── socket.js
```

## Flujo del juego

```
Host crea sala → jugadores se unen con código o QR
    → host apreta Empezar
        → pregunta + timer
            → jugadores responden (o se acaba el tiempo)
                → respuesta correcta + puntajes
                    → leaderboard → siguiente pregunta
                        → ... → podio final
```

## API REST

Todos los endpoints de escritura requieren header `Authorization: Bearer <token>` cuando el usuario está logueado. Sin token, los quizzes se crean como invitado.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/quizzes` | Listar quizzes del usuario (o invitados si no hay token) |
| GET | `/api/quizzes/:id` | Obtener quiz con preguntas (sin revelar respuestas) |
| GET | `/api/quizzes/:id/edit` | Obtener quiz con respuestas (para el editor) |
| POST | `/api/quizzes` | Crear quiz |
| PUT | `/api/quizzes/:id` | Actualizar quiz |
| DELETE | `/api/quizzes/:id` | Eliminar quiz |
| GET | `/api/quizzes/export` | Exportar todos los quizzes como JSON |
| POST | `/api/quizzes/import` | Importar quizzes desde JSON |

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

## Deploy (Vercel + Railway + Supabase)

El frontend vive en Vercel y el backend en Railway. Ambos hacen deploy automático en cada push a `main`. Las llamadas a `/api/*` que llegan a Vercel se redirigen al backend de Railway via proxy (configurado en `vercel.json`).

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Aplicar las migraciones de `supabase/migrations/` en el SQL Editor
3. Activar Google OAuth: **Authentication → Providers → Google**
   - Crear credenciales en [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Pegar Client ID y Client Secret en Supabase
4. Configurar URLs: **Authentication → URL Configuration**
   - Site URL: `https://<tu-app>.vercel.app`
   - Redirect URLs: `https://<tu-app>.vercel.app/**`

### 2. Vercel (frontend)

1. Conectar el repo de GitHub en [vercel.com](https://vercel.com)
2. Vercel detecta el `vercel.json` automáticamente — no hace falta configurar build ni output directory
3. Agregar estas variables de entorno en Vercel → Settings → Environment Variables:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` (sin trailing slash) |
| `VITE_SUPABASE_ANON_KEY` | anon key del proyecto |

> **Importante:** las variables con prefijo `VITE_` son de build time. Después de agregarlas hay que hacer un redeploy para que tomen efecto.

### 3. Railway (backend)

1. Conectar el repo de GitHub en [railway.app](https://railway.app)
2. Railway usa el `railway.json` del repo para buildear y arrancar solo el servidor
3. Agregar estas variables de entorno:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` (sin trailing slash) |
| `SUPABASE_ANON_KEY` | anon key del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key del proyecto |

4. Copiar la URL pública del servicio en Railway (ej: `https://fedehoot-production.up.railway.app`) y pegarla en el `vercel.json` como destino del proxy de `/api/*`.

### 4. Google Cloud Console

En **OAuth consent screen**, configurar el nombre de la app para que aparezca "FedeHoot" en la pantalla de login de Google en vez del ID del proyecto.
