# 01 · Setup del proyecto

Vamos a construir **Fedehoot**, un clon de Kahoot: una app web de quizzes en tiempo real donde un host crea preguntas y los jugadores responden desde sus celulares, compitiendo por el puntaje más alto.

## Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Base de datos**: Supabase (PostgreSQL hosteado)
- **Tiempo real**: Socket.IO (lo agregamos en pasos posteriores)

## Lo que tiene que quedar funcionando

Al terminar este paso, el proyecto tiene que tener esta estructura:

```
kahoot-clone/
  client/    ← app de React
  server/    ← servidor de Node
```

El **frontend** muestra una pantalla inicial con el título "Fedehoot" y dos opciones:
- Un botón para ir al panel de quizzes (la vista del host)
- Un campo para ingresar un código de sala (la vista del jugador — sin lógica por ahora)

El **servidor** tiene que estar corriendo y responder a `GET /api/health` con `{ status: "ok" }`. Es la forma de saber que está vivo.

Ambas partes deben poder levantarse y conectarse sin errores en local.
