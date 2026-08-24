# 04 · Sala de espera con WebSockets

Continuamos con `kahoot-clone/`. Ya tenemos quizzes guardados en Supabase. Ahora vamos a crear el flujo para iniciar una partida: el host abre una sala y los jugadores se unen.

## Qué es un WebSocket (contexto)

HTTP es unidireccional: el cliente pide, el servidor responde. Con **WebSocket** se abre un canal bidireccional y persistente. El servidor puede mandar datos al cliente cuando quiera, sin esperar que éste pregunte. Es lo que hace posible que todos los jugadores vean la misma pantalla al mismo tiempo.

Vamos a usar **Socket.IO**, que es una librería que facilita trabajar con WebSockets.

## Instalación

En `server/`:
```bash
npm install socket.io
```

En `client/`:
```bash
npm install socket.io-client
```

## Lo que necesito en `server/`

### Levantar Socket.IO junto con Express

Reemplazá el `app.listen` por un servidor HTTP que comparta puerto con Socket.IO. Configurá CORS para aceptar conexiones desde `http://localhost:5173`.

### Estado de las salas en memoria

El servidor va a mantener un objeto en memoria (no en base de datos) con las salas activas:

```js
// Estructura de ejemplo
rooms = {
  "ABC123": {
    code: "ABC123",
    quizId: "uuid-del-quiz",
    hostId: "socket-id-del-host",
    players: [
      { id: "socket-id", nickname: "Jugador1" }
    ],
    status: "waiting" // "waiting" | "playing" | "finished"
  }
}
```

### Eventos de Socket.IO a implementar

**Host crea sala:**
- Evento recibido: `create_room` con `{ quizId }`
- Acción: generar un código de 6 letras único, crear la sala, unir al host al room de Socket.IO con ese código
- Evento emitido al host: `room_created` con `{ code, players: [] }`

**Jugador se une:**
- Evento recibido: `join_room` con `{ code, nickname }`
- Validaciones: sala existe, sala en estado "waiting", nickname no repetido
- Acción: agregar jugador a la sala, unirlo al room de Socket.IO
- Evento emitido a **todos en la sala**: `player_joined` con `{ players: [...] }`
- Evento emitido al jugador si hay error: `join_error` con `{ message }`

**Jugador se desconecta:**
- Detectar `disconnect`, removerlo de la sala
- Emitir `player_left` con la lista actualizada a todos en la sala

## Lo que necesito en `client/`

### Conexión a Socket.IO

Creá `src/socket.js` que exporte una instancia del cliente de Socket.IO conectando a `http://localhost:3001`.

### Flujo del host

En la página `/quizzes/:id`, agregá un botón **"Iniciar partida"**.

Al presionarlo:
1. Emitir `create_room` con el `quizId`
2. Al recibir `room_created`, navegar a `/host/:code`

**Página `/host/:code`** (sala de espera del host):
- Mostrar el código de sala en grande (para que los jugadores lo vean)
- Mostrar un QR o simplemente el código
- Lista en tiempo real de los jugadores que se van uniendo
- Botón **"Comenzar juego"** (habilitado solo si hay al menos 1 jugador)

### Flujo del jugador

En la página `/` (inicio público), el campo de código de sala ya existe. Agregá:
- Un campo para el nickname
- Botón "Unirse"
- Al presionar: emitir `join_room` con `{ code, nickname }`
- Al recibir `room_joined` (o confirmación), navegar a `/player/:code`

**Página `/player/:code`** (sala de espera del jugador):
- Mostrar "Esperando que el host inicie la partida..."
- Mostrar el nickname del jugador y los demás en la sala

## Verificación

Al terminar:
1. Host inicia sesión → entra a su quiz → "Iniciar partida" → ve el código
2. Jugador abre otra pestaña (o celular) → ingresa el código y un nickname → aparece en la lista del host
3. Si entra un segundo jugador, la lista se actualiza en tiempo real en todos los dispositivos
