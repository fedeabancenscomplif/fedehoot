# 02 · Crear y editar quizzes

El host necesita poder armar sus quizzes antes de la clase: escribir preguntas, cargar las opciones de respuesta y marcar cuál es la correcta.

Por ahora no hay login: cualquiera que acceda a la app puede ver y editar todos los quizzes. Eso lo resolvemos en la Etapa 2.

## Lo que tiene que quedar funcionando

### Panel de quizzes (`/quizzes`)

El host ve una lista de todos sus quizzes con el nombre y la fecha en que los creó. Desde acá puede:

- **Crear un quiz nuevo**: escribe el título y se agrega a la lista.
- **Editar un quiz**: lo lleva al editor.
- **Eliminar un quiz**: le pide confirmación antes de borrarlo.

### Editor de quiz (`/quizzes/:id`)

El host puede cambiar el título del quiz y gestionar sus preguntas. Cada pregunta tiene:

- Un enunciado (el texto de la pregunta)
- Cuatro opciones de respuesta
- Una respuesta marcada como correcta
- Un tiempo límite en segundos (por defecto, 20)

El host puede agregar preguntas nuevas, reordenarlas, editar cualquier campo y eliminar las que no quiera. Al presionar "Guardar", todo queda persistido.

### Persistencia

Los quizzes se guardan en **Supabase**. Necesitás crear las tablas `quizzes`, `questions` y `answers` en el SQL Editor. El servidor se conecta a Supabase con la service role key para leer y escribir sin restricciones.

## Verificación

1. El host crea un quiz, le agrega 3 preguntas con sus opciones y respuestas correctas, y guarda.
2. Recarga la página y todo sigue ahí.
3. Edita una pregunta y guarda de nuevo — el cambio persiste.
4. Elimina el quiz — desaparece de la lista.
