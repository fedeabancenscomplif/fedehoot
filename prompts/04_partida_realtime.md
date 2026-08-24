# 04 · Partida en tiempo real

El host inicia el juego y todas las pantallas — la del proyector y la de cada jugador — se sincronizan al mismo tiempo. Las preguntas se muestran una por una, los jugadores tienen un tiempo límite para responder, y al cerrar cada ronda todos ven quién acertó y cómo van los puntajes.

## Lo que tiene que quedar funcionando

### Inicio de la partida

El host presiona "Comenzar juego" desde la sala de espera. El servidor carga las preguntas del quiz desde Supabase y arranca la primera ronda.

### Durante cada pregunta

**Pantalla del host (proyector):**
- Muestra el enunciado de la pregunta y el número de ronda (ej: "Pregunta 2 de 5").
- Una barra de tiempo que se consume visualmente durante el tiempo límite.
- Un contador de cuántos jugadores ya respondieron.

**Pantalla del jugador (celular):**
- Muestra las cuatro opciones como botones grandes con colores distintos.
- Al tocar una opción, los demás botones se deshabilitan — no se puede cambiar la respuesta.
- La barra de tiempo corre en sincronía con el host.

### Cierre de cada ronda

Cuando se acaba el tiempo (o todos respondieron), el servidor cierra la ronda. Todos ven:
- Cuál era la respuesta correcta.
- Cuántos puntos sumó cada jugador en esta ronda (más puntos cuanto más rápido respondió).
- El ranking parcial (top 3 o todos).

El host presiona "Siguiente" para avanzar a la próxima pregunta.

### Puntaje

Respuesta correcta: hasta 1000 puntos, proporcional a la velocidad. Respuesta incorrecta o sin responder: 0 puntos. Los puntos se acumulan ronda a ronda.

### Fin de la partida

Después de la última pregunta, todos ven la pantalla de resultados finales (ver paso 05).

## Detalles de UX importantes

- El servidor **no manda cuál es la respuesta correcta** hasta que cierra la ronda — para que el cliente no pueda hacer trampa.
- Si un jugador se desconecta durante la partida, la partida sigue sin él.
- Si el host se desconecta, todos los jugadores ven un aviso de que la partida terminó.

## Verificación

1. El host inicia el juego → aparece la primera pregunta en todos los dispositivos al mismo tiempo.
2. Los jugadores responden → el host ve el contador actualizarse en tiempo real.
3. Se acaba el tiempo → todos ven la respuesta correcta y el puntaje parcial.
4. El host avanza → aparece la siguiente pregunta.
5. Al terminar la última pregunta → todos pasan a la pantalla de resultados.
