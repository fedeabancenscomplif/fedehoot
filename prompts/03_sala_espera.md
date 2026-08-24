# 03 · Sala de espera

El host arranca una partida desde el editor de su quiz y comparte un código con los jugadores. Los jugadores se unen desde sus celulares sin necesidad de registrarse, y el host ve cómo van entrando en tiempo real.

Para esto vamos a usar **Socket.IO**, que abre un canal de comunicación bidireccional y persistente entre el servidor y los clientes. A diferencia de HTTP (donde el cliente siempre tiene que pedir), con WebSockets el servidor puede avisar a todos al mismo tiempo — por ejemplo, cuando un nuevo jugador se une a la sala.

## Lo que tiene que quedar funcionando

### Vista del host

Desde el editor de un quiz, el host presiona **"Iniciar partida"**. Aparece una pantalla de sala de espera que muestra:

- El **código de sala** en grande (ej: `"KXMT4P"`) para que los jugadores lo puedan ver desde la pantalla del proyector.
- La **lista de jugadores** que van entrando, actualizada en tiempo real sin recargar la página.
- Un botón **"Comenzar juego"**, habilitado solo cuando hay al menos un jugador.

### Vista del jugador

El jugador abre la app, ingresa el código de sala y un nickname, y presiona **"Unirse"**. Si el código existe y la partida todavía no empezó, entra a una pantalla que dice algo como "Esperando que el host inicie la partida..." y muestra los nicknames de los demás jugadores conectados.

Si el código no existe o la partida ya comenzó, el jugador ve un mensaje de error claro.

### Estado de las salas

Las salas se guardan en memoria en el servidor (no en la base de datos). Cuando el servidor se reinicia, las salas activas se pierden — eso está bien por ahora.

## Verificación

1. El host entra a un quiz y presiona "Iniciar partida" — aparece el código.
2. Un jugador abre la app en otra pestaña o celular, ingresa el código y un nickname — aparece en la lista del host al instante.
3. Entra un segundo jugador — la lista se actualiza en todos los dispositivos sin recargar.
4. Si un jugador escribe un código que no existe, ve un mensaje de error.
