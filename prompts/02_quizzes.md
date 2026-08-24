# 02 · CRUD de Quizzes

Continuamos con `kahoot-clone/`. Ya tenemos el setup base del cliente y el servidor del paso anterior.

## Qué vamos a hacer

Permitir crear, editar y eliminar quizzes con sus preguntas y opciones de respuesta. Por ahora no hay login: cualquiera puede ver y editar todos los quizzes.

## Estructura de datos en Supabase

Creá las siguientes tablas en el **SQL Editor** de Supabase:

```sql
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  text text not null,
  time_limit integer default 20,
  position integer not null
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  text text not null,
  is_correct boolean default false
);
```

Para que el servidor pueda leer y escribir sin restricciones, deshabilitá RLS o usá la **service role key**. Guardala en `server/.env`:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

## Lo que necesito en `server/`

Instalá el cliente de Supabase:

```bash
npm install @supabase/supabase-js dotenv
```

Inicializá el cliente en `server/src/supabase.js` usando las variables de entorno.

Creá los siguientes endpoints en Express:

```
GET    /api/quizzes              → lista todos los quizzes
POST   /api/quizzes              → crea un quiz (body: { title })
GET    /api/quizzes/:id          → trae un quiz con sus preguntas y respuestas
PUT    /api/quizzes/:id          → actualiza el título
DELETE /api/quizzes/:id          → elimina el quiz

POST   /api/quizzes/:id/questions       → agrega una pregunta
PUT    /api/quizzes/:id/questions/:qid  → actualiza una pregunta y sus respuestas
DELETE /api/quizzes/:id/questions/:qid → elimina una pregunta
```

El endpoint `GET /api/quizzes/:id` debe devolver el quiz junto con sus preguntas ordenadas por `position`, y cada pregunta con sus respuestas.

## Lo que necesito en `client/`

Instalá axios o usá `fetch` nativo para las llamadas a la API.

En `client/.env`:

```
VITE_API_URL=http://localhost:3001
```

### Página `/quizzes`

- Lista de todos los quizzes con título y fecha de creación
- Botón "Nuevo quiz" que abre un formulario inline o modal para escribir el título
- Botón "Editar" por quiz que lleva a `/quizzes/:id`
- Botón "Eliminar" con confirmación

### Página `/quizzes/:id` (editor)

- Campo para editar el título del quiz
- Lista de preguntas en orden
- Por cada pregunta:
  - Campo de texto para el enunciado
  - Cuatro opciones de respuesta (inputs de texto)
  - Selector para marcar cuál es la correcta (radio o checkbox)
  - Campo numérico para el tiempo límite en segundos (por defecto 20)
  - Botón para eliminar la pregunta
- Botón "Agregar pregunta" al final de la lista
- Botón "Guardar" que persiste todos los cambios

### Navegación

Agregá un link a `/quizzes` en la página principal (`/`) para poder acceder al panel de quizzes.

## Verificación

Al terminar:
1. Crear un quiz desde `/quizzes`
2. Editarlo: agregar 2-3 preguntas con sus opciones y respuesta correcta marcada
3. Guardar y recargar la página → los datos persisten en Supabase
4. Eliminar el quiz → desaparece de la lista
