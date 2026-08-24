# 05 · Resultados y pulido

Pantalla de resultados al finalizar la partida y mejoras de experiencia que hacen que todo se sienta más como un producto terminado.

## Pantalla de resultados finales

Cuando termina la última pregunta, todos los participantes ven el leaderboard final.

**Para el jugador:** su posición en el ranking, cuántos puntos hizo y quién ganó. Si quedó primero, que se note.

**Para el host:** el ranking completo con nombres y puntajes. Un botón para volver al panel de quizzes y poder arrancar otra partida.

El podio (1°, 2°, 3°) tiene que estar visualmente diferenciado — no hace falta que sea elaborado, pero tiene que ser fácil identificar al ganador de un vistazo.

## Mejoras de UX durante la partida

Estos detalles hacen la diferencia entre una demo y algo que se siente terminado:

**Barra de tiempo con feedback visual:** cambia de color (por ejemplo, verde → amarillo → rojo) a medida que se acaba el tiempo. Que el cambio sea suave, no abrupto.

**Feedback al responder:** cuando el jugador toca una opción, el botón seleccionado se ilumina y los demás se atenúan. Deja claro que la respuesta fue registrada.

**Si el tiempo se acaba sin responder:** aparece un mensaje del tipo "¡Tiempo!" y los botones quedan deshabilitados.

**Transición entre preguntas:** después de mostrar el resultado de cada ronda, hay una pausa de 3-4 segundos con el ranking parcial antes de que el host pueda avanzar. Evita que la partida se sienta apresurada.

## Ideas opcionales (si queda tiempo)

Estas no son requisitos, pero hacen el demo más divertido:

- **QR code** en la pantalla del host con el link directo para unirse, en vez de tener que tipear el código a mano.
- **Confetti** cuando aparece el ganador.
- **Modo oscuro** con un toggle en algún lugar de la app.

## Verificación final

Flujo completo de punta a punta:

1. El host crea un quiz con 3 preguntas.
2. Inicia la partida — aparece el código.
3. Dos o tres jugadores se unen desde distintas pestañas o dispositivos.
4. Juegan las tres rondas.
5. Al terminar, todos ven el leaderboard con el ganador resaltado.
6. El host puede volver y arrancar otra partida.
