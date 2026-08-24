# 01 · Setup del proyecto

Vamos a construir **Fedehoot**, un clon de Kahoot: una app web de quizzes en tiempo real.

## Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Tiempo real**: Socket.IO (lo vamos a usar más adelante)
- **Base de datos**: Supabase (PostgreSQL)

## Lo que necesito que armes en este paso

Creá la estructura base del proyecto con dos carpetas separadas dentro de una carpeta raíz llamada `kahoot-clone/`:

```
kahoot-clone/
  client/    ← app de React
  server/    ← servidor de Node
```

### `client/`

Inicializá un proyecto de React con Vite y TailwindCSS v3. Usá el template de React (no TypeScript). Configurá Tailwind correctamente con el archivo `tailwind.config.js` y los estilos globales en `index.css`.

La app debe tener una página inicial simple que muestre el título **"Fedehoot"** centrado en la pantalla.

### `server/`

Creá un servidor Express básico:

- Escuchá en el puerto `3001` (o en `process.env.PORT` si existe)
- Que tenga un endpoint `GET /api/health` que devuelva `{ status: "ok" }`
- Instalá las dependencias: `express`, `cors`, `dotenv`

### Archivos de configuración raíz

- `.gitignore` que excluya `node_modules`, `.env`, `dist`
- Un `README.md` mínimo con el nombre del proyecto

## Verificación

Al terminar, debería poder:
1. Correr `npm run dev` dentro de `client/` y ver la pantalla con "Fedehoot"
2. Correr `node src/index.js` dentro de `server/` y hacer `curl localhost:3001/api/health` y recibir `{ status: "ok" }`
