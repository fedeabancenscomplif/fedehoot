# 03 · CRUD de Quizzes

Continuamos con `kahoot-clone/`. Ya tenemos auth con Supabase y las rutas base del cliente.

## Qué vamos a hacer

Permitir que el host cree, edite y elimine quizzes con sus preguntas y opciones de respuesta.

## Estructura de datos en Supabase

Creá las siguientes tablas en el **SQL Editor** de Supabase:

```sql
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  user_id uuid references auth.users(id) on delete cascade,
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

Activá **Row Level Security (RLS)** en la tabla `quizzes` para que cada usuario solo vea y edite sus propios quizzes:

```sql
alter table quizzes enable row level security;

create policy "users see their own quizzes"
  on quizzes for all
  using (auth.uid() = user_id);
```

## Lo que necesito en `server/`

Creá los siguientes endpoints en Express. El servidor se conecta a Supabase usando la **service role key** (no la anon key) para poder leer/escribir sin restricciones de RLS. Guardala en `server/.env` como `SUPABASE_SERVICE_ROLE_KEY`.

```
GET    /api/quizzes          → lista los quizzes del usuario autenticado
POST   /api/quizzes          → crea un quiz nuevo (body: { title })
GET    /api/quizzes/:id      → trae un quiz con sus preguntas y respuestas
PUT    /api/quizzes/:id      → actualiza título del quiz
DELETE /api/quizzes/:id      → elimina el quiz

POST   /api/quizzes/:id/questions        → agrega una pregunta al quiz
PUT    /api/quizzes/:id/questions/:qid   → actualiza una pregunta
DELETE /api/quizzes/:id/questions/:qid  → elimina una pregunta
```

Para identificar al usuario, los endpoints reciben el JWT de Supabase en el header `Authorization: Bearer <token>`. Verificalo con el cliente de Supabase del servidor antes de procesar el request.

## Lo que necesito en `client/`

### Página `/quizzes`

- Lista de quizzes del usuario con título y fecha de creación
- Botón "Nuevo quiz" que abre un modal o inline form para escribir el título
- Botón "Editar" por quiz que lleva a `/quizzes/:id`
- Botón "Eliminar" con confirmación

### Página `/quizzes/:id` (editor)

- Campo para editar el título del quiz
- Lista de preguntas en orden
- Por cada pregunta:
  - Campo de texto para la pregunta
  - Cuatro opciones de respuesta (inputs de texto)
  - Un selector para marcar cuál es la correcta
  - Campo numérico para el tiempo límite (segundos)
  - Botón para eliminar la pregunta
- Botón "Agregar pregunta" al final de la lista
- Botón "Guardar" que persiste todos los cambios

## Verificación

Al terminar:
1. Crear un quiz desde `/quizzes`
2. Editarlo: agregar 2-3 preguntas con sus opciones y respuesta correcta
3. Guardar y recargar la página → los datos persisten
4. Eliminar el quiz → desaparece de la lista
