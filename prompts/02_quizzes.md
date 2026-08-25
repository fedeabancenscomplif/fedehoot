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
- Un **formato** (ver abajo)
- Un tiempo límite en segundos (por defecto, 20)

El host puede agregar preguntas nuevas, reordenarlas, editar cualquier campo y eliminar las que no quiera. Al presionar "Guardar", todo queda persistido.

### Formatos de pregunta

Hay dos formatos posibles, que el host elige por pregunta:

- **Una correcta**: el jugador elige una sola opción. El host marca cuál es la correcta con un radio button. Si selecciona el radio de una opción distinta, la anterior se desmarca automáticamente.
- **Varias correctas**: puede haber dos o más respuestas correctas. El host las marca con checkboxes. Al guardar, se valida que al menos dos estén marcadas.

En ambos casos, las cuatro opciones se muestran con colores distintos (rojo, azul, amarillo, verde) igual que en Kahoot.

### Persistencia

Los quizzes se guardan en **Supabase**. Necesitás crear las tablas `quizzes`, `questions` y `answers` en el SQL Editor. El servidor se conecta a Supabase con la service role key para leer y escribir sin restricciones.

## Verificación

1. El host crea un quiz y le agrega:
   - Una pregunta de **una correcta** (marca el radio de la respuesta B).
   - Una pregunta de **varias correctas** (marca A y C con checkboxes).
2. Guarda, recarga la página y todo sigue ahí con los formatos y respuestas correctas intactos.
3. Edita una pregunta, cambia el formato de "una correcta" a "varias correctas" y guarda — el cambio persiste.
4. Elimina el quiz — desaparece de la lista.
