# Etapa 2 · Autenticación con Supabase + Google

> **Este paso es independiente del flujo principal.** Se puede hacer después de terminar los pasos 01–05. Agrega login con Google para que solo el dueño de cada quiz pueda editarlo.

Continuamos con el proyecto `kahoot-clone/`. Ya tenemos el CRUD de quizzes y la partida funcionando.

## Qué vamos a hacer

Agregar login con Google usando **Supabase Auth**. Solo el host (quien crea quizzes) necesita cuenta. Los jugadores se unen sin registrarse.

## Configuración previa necesaria

1. Creá un proyecto en [supabase.com](https://supabase.com)
2. En el dashboard de Supabase, habilitá el provider de **Google** en Authentication → Providers
3. Configurá las credenciales OAuth de Google (Google Cloud Console → APIs & Services → Credentials)
4. En Supabase → Authentication → URL Configuration, agregá `http://localhost:5173` como Redirect URL

Vas a necesitar dos variables de entorno en `client/.env`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Lo que necesito que hagas en `client/`

### Instalación

```bash
npm install @supabase/supabase-js
```

### Cliente de Supabase

Creá `src/supabase.js` que inicialice y exporte el cliente de Supabase usando las variables de entorno.

### Páginas y rutas

Usá `react-router-dom` para manejar las rutas. Creá las siguientes páginas:

- **`/login`** — botón "Iniciar sesión con Google". Si el usuario ya está logueado, redirigir a `/quizzes`.
- **`/quizzes`** — página protegida (solo accesible con sesión activa). Por ahora puede mostrar solo el texto "Mis Quizzes" y un botón de cerrar sesión.
- **`/`** — página pública de bienvenida con un botón para ir a `/login` y un campo para unirse a una partida con código (solo el campo por ahora, sin lógica).

### Protección de rutas

Creá un componente `ProtectedRoute` que redirija a `/login` si no hay sesión activa.

### Sesión persistente

Al cargar la app, verificá si ya hay una sesión activa de Supabase y guardala en estado global (podés usar Context o simplemente props).

## Verificación

Al terminar:
1. Entrar a `http://localhost:5173/login` y ver el botón de Google
2. Hacer click → flujo de OAuth de Google → volver a la app logueado
3. Entrar a `/quizzes` sin sesión → redirigir a `/login`
4. El botón de cerrar sesión limpia la sesión y vuelve a `/login`
