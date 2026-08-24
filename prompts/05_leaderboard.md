# 06 · Leaderboard y pulido final

Continuamos con `kahoot-clone/`. Ya tenemos la partida completa funcionando. Este es el paso final: la pantalla de resultados y algunos detalles de UX que hacen que la app se sienta terminada.

## Lo que necesito en `client/`

### Pantalla de leaderboard final

Creá la página `/results/:code` (o mostrala como estado dentro de las pantallas de host/jugador al recibir `game_end`).

**Para el host y el jugador — mostrar:**
- Podio con los 3 primeros (con nombre y puntaje)
- Lista completa del ranking con posición, nickname y puntos totales
- El jugador actual resaltado en su propia posición
- Botón "Volver al inicio" tanto para el jugador como para el host

**Detalles visuales sugeridos:**
- 1er lugar: ícono de trofeo o corona, color dorado
- 2do y 3er: colores plata y bronce
- Animación de entrada de los nombres (podés hacerlo con CSS)

### Mejoras de UX durante la partida

Ahora que el flujo funciona, pulí estos detalles:

**Cuenta regresiva visual:**
- La barra de tiempo del jugador y del host deben decrementar suavemente (con CSS `transition` o `requestAnimationFrame`)
- Cuando queden 5 segundos, la barra cambia de color (verde → rojo)

**Feedback al responder:**
- Al presionar una opción, el botón seleccionado se ilumina
- Los demás botones se atenúan
- Si el tiempo se acaba sin responder, mostrar "¡Tiempo!" y deshabilitar los botones

**Pantalla de espera entre preguntas:**
- Entre `question_end` y el próximo `question_start`, mostrar una pantalla de transición con el ranking actual (top 3) durante 3-4 segundos antes de que el host avance manualmente

**Manejo de desconexión:**
- Si el host se desconecta, emitir `host_disconnected` a todos los jugadores y mostrar "El host abandonó la partida"
- Si un jugador se desconecta durante la partida, el servidor lo marca como inactivo pero la partida continúa

### Pantalla de error / sala no encontrada

Si un jugador intenta unirse con un código que no existe o que ya terminó, mostrar una pantalla amigable de error en lugar de quedarse colgado.

## Ideas opcionales (si queda tiempo)

Estos no son requisitos, pero hacen el demo más divertido:

- **QR code en la pantalla del host**: para que los jugadores scaneen y vayan directo a la URL de unión. Podés usar la librería `qrcode.react`.
- **Sonidos**: un beep al cambiar de pregunta, un sonido de victoria al mostrar el leaderboard.
- **Confetti** al mostrar el ganador: librería `canvas-confetti`.
- **Modo oscuro**: toggle en la esquina superior que cambie el theme de la app.

## Verificación final

Al terminar, el flujo completo debería funcionar sin interrupciones:

1. Host se loguea con Google
2. Crea un quiz con 3 preguntas y sus opciones
3. Inicia una partida → ve el código
4. 2-3 jugadores se unen desde distintas pestañas
5. Host comienza → todos ven las preguntas en tiempo real
6. Al terminar → leaderboard con el ganador resaltado
7. Todos vuelven al inicio sin errores
