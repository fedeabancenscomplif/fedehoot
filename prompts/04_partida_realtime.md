# 05 · Partida en tiempo real

Continuamos con `kahoot-clone/`. Ya tenemos la sala de espera funcionando: el host tiene una sala con su código y los jugadores se unieron. Ahora vamos a implementar el flujo completo de la partida.

## Flujo general

```
Host presiona "Comenzar"
  → servidor carga las preguntas del quiz desde Supabase
  → envía la primera pregunta a todos
  → jugadores ven las opciones y responden
  → al terminar el tiempo (o cuando todos respondieron), el servidor cierra la ronda
  → se muestran los resultados de esa pregunta
  → host avanza a la siguiente pregunta
  → ... (se repite)
  → última pregunta → fin de partida → leaderboard
```

## Lo que necesito en `server/`

### Cambiar estado de la sala a "playing"

Cuando el host emite `start_game`:
1. Cambiar `rooms[code].status = "playing"`
2. Cargar las preguntas del quiz desde Supabase (con sus respuestas, pero **sin exponer cuál es la correcta** al cliente)
3. Guardar las preguntas en la sala: `rooms[code].questions`
4. Guardar un índice de pregunta actual: `rooms[code].currentQuestion = 0`
5. Emitir la primera pregunta a todos con `question_start`

### Evento `question_start` (servidor → todos)

```js
{
  questionIndex: 0,
  total: 5,
  text: "¿Cuál es la capital de Francia?",
  answers: [
    { id: "uuid", text: "Madrid" },
    { id: "uuid", text: "París" },
    { id: "uuid", text: "Roma" },
    { id: "uuid", text: "Berlín" }
  ],
  timeLimit: 20  // segundos
}
```

Importante: **no incluir `is_correct`** en los datos que se envían a los jugadores.

### Evento `submit_answer` (jugador → servidor)

```js
{ answerId: "uuid", timeLeft: 14 }
```

El servidor:
1. Verifica que la sala esté en estado "playing"
2. Verifica que el jugador no haya respondido ya en esta ronda
3. Guarda la respuesta en `rooms[code].answers[questionIndex]`

### Cierre de ronda

El servidor puede cerrar la ronda de dos maneras:
- **Por tiempo**: usando `setTimeout` al mandar `question_start`, cerrar automáticamente al vencer el plazo
- **Todos respondieron**: si el número de respuestas llega al número de jugadores

Al cerrar la ronda, emitir `question_end` a todos:

```js
{
  correctAnswerId: "uuid",
  results: [
    { nickname: "Jugador1", answerId: "uuid", correct: true, points: 850 },
    { nickname: "Jugador2", answerId: "uuid", correct: false, points: 0 }
  ]
}
```

**Puntaje sugerido**: 1000 puntos si correcto, menos puntos cuanto más tarde respondió (por ejemplo, `Math.round(1000 * timeLeft / timeLimit)`). 0 si incorrecto o no respondió.

Acumulá los puntos en `rooms[code].scores = { nickname: totalPoints }`.

### Evento `next_question` (host → servidor)

El host emite este evento para avanzar. El servidor:
- Si hay más preguntas: incrementa el índice y emite `question_start`
- Si no quedan más: emite `game_end` con el leaderboard final

### Evento `game_end` (servidor → todos)

```js
{
  leaderboard: [
    { nickname: "Jugador1", points: 2400 },
    { nickname: "Jugador2", points: 1700 }
  ]
}
```

## Lo que necesito en `client/`

### Pantalla del host durante la partida (`/host/:code`)

- Mostrar el texto de la pregunta actual y el número (ej: "Pregunta 2 de 5")
- Barra de progreso o contador de tiempo regresivo
- Cuántos jugadores respondieron vs. total
- Al recibir `question_end`: mostrar cuál era la respuesta correcta y el ranking parcial
- Botón "Siguiente pregunta" (emite `next_question`)
- Al recibir `game_end`: redirigir a la pantalla de leaderboard final

### Pantalla del jugador durante la partida (`/player/:code`)

- Al recibir `question_start`: mostrar las 4 opciones como botones grandes (estilo Kahoot: colores distintos)
- Al presionar una opción: emitir `submit_answer` y deshabilitar los demás botones
- Barra de tiempo regresivo (sincronizada con `timeLimit`)
- Al recibir `question_end`: mostrar si acertó y cuántos puntos sumó
- Al recibir `game_end`: redirigir al leaderboard

## Verificación

Al terminar:
1. Host inicia el juego → aparece la primera pregunta en todos los dispositivos
2. Los jugadores responden → el host ve cuántos respondieron en tiempo real
3. Se cierra la ronda → todos ven la respuesta correcta y el puntaje parcial
4. Host avanza → aparece la siguiente pregunta
5. Al terminar la última pregunta → todos ven el leaderboard final con el ganador
