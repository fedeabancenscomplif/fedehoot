import { GameRoom } from '../game/GameRoom.js';
import { supabase } from '../db.js';

const rooms = new Map();        // roomCode → GameRoom
const socketToRoom = new Map(); // socketId → roomCode

// Coalesce bursts (e.g. a whole class joining at once) into one emit per window
const PLAYER_LIST_THROTTLE_MS = 300;
const ANSWER_COUNT_THROTTLE_MS = 200;

function genCode() {
  let code;
  do { code = Math.random().toString(36).slice(2, 8).toUpperCase(); }
  while (rooms.has(code));
  return code;
}

async function loadQuiz(quizId) {
  const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
  if (!quiz) return null;

  const { data: questions } = await supabase
    .from('questions')
    .select('*, answers(*)')
    .eq('quiz_id', quizId)
    .order('order_index');

  quiz.questions = (questions ?? []).map(q => ({
    ...q,
    answers: (q.answers ?? []).sort((a, b) => a.order_index - b.order_index),
  }));
  return quiz;
}

// Only the host renders the full player list; players just show how many joined.
// Sending the full list to everyone on every join is O(N²) messages of O(N) size.
function schedulePlayerListUpdate(io, room, roomCode) {
  if (room.playerListTimer) return;
  room.playerListTimer = setTimeout(() => {
    room.playerListTimer = null;
    if (rooms.get(roomCode) !== room) return;
    io.to(room.hostSocketId).emit('game:player-list', { players: room.getPlayerList() });
    io.to(roomCode).except(room.hostSocketId).emit('game:player-count', { count: room.players.size });
  }, PLAYER_LIST_THROTTLE_MS);
}

function scheduleAnswerCountUpdate(io, room) {
  if (room.answerCountTimer) return;
  room.answerCountTimer = setTimeout(() => {
    room.answerCountTimer = null;
    io.to(room.hostSocketId).emit('game:answer-count', {
      answered: room.currentAnswers.size,
      total: room.players.size,
    });
  }, ANSWER_COUNT_THROTTLE_MS);
}

function endQuestion(io, room, roomCode) {
  if (room.state !== 'QUESTION') return;
  const data = room.endQuestion();
  if (!data) return;

  io.to(roomCode).emit('game:question-results', {
    type: data.type,
    correctAnswerIds: data.correctAnswerIds,
    correctOrderedIds: data.correctOrderedIds,
    leaderboard: data.leaderboard,
  });
  for (const r of data.playerResults) {
    io.to(r.socketId).emit('player:your-result', {
      isCorrect: r.isCorrect,
      pointsEarned: r.pointsEarned,
      totalScore: r.totalScore,
      rank: r.rank,
      correctPositions: r.correctPositions,
      totalPositions: r.totalPositions,
    });
  }
}

export function setupSockets(io) {
  io.on('connection', (socket) => {

    socket.on('host:create-game', async ({ quizId }) => {
      // Clean up any room this socket already owns to prevent memory leak
      const existingCode = socketToRoom.get(socket.id);
      if (existingCode) {
        rooms.delete(existingCode);
        socket.leave(existingCode);
      }

      const quiz = await loadQuiz(quizId);
      if (!quiz) return socket.emit('game:error', { message: 'Quiz no encontrado' });
      if (!quiz.questions.length) return socket.emit('game:error', { message: 'El quiz no tiene preguntas' });

      const roomCode = genCode();
      const room = new GameRoom(roomCode, quiz, socket.id);
      rooms.set(roomCode, room);
      socketToRoom.set(socket.id, roomCode);
      socket.join(roomCode);

      socket.emit('game:created', {
        roomCode,
        quiz: { title: quiz.title, questionCount: quiz.questions.length },
      });
    });

    socket.on('player:join', ({ roomCode, nickname }) => {
      if (typeof nickname !== 'string' || !nickname.trim()) {
        return socket.emit('game:error', { message: 'Nombre inválido' });
      }
      const code = typeof roomCode === 'string' ? roomCode.toUpperCase() : '';
      const room = rooms.get(code);
      if (!room) return socket.emit('game:error', { message: 'Sala no encontrada' });

      const result = room.addPlayer(socket.id, nickname.trim());
      if (result.error) return socket.emit('game:error', { message: result.error });

      socketToRoom.set(socket.id, code);
      socket.join(code);

      socket.emit('player:joined', { nickname: nickname.trim(), roomCode: code });
      schedulePlayerListUpdate(io, room, code);
    });

    socket.on('player:request-state', () => {
      const roomCode = socketToRoom.get(socket.id);
      const room = rooms.get(roomCode);
      if (!room) return;
      if (room.hostSocketId === socket.id) {
        socket.emit('game:player-list', { players: room.getPlayerList() });
      } else {
        socket.emit('game:player-count', { count: room.players.size });
      }
    });

    socket.on('host:start-game', () => {
      const roomCode = socketToRoom.get(socket.id);
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;
      if (room.players.size === 0) return socket.emit('game:error', { message: 'Necesitás al menos 1 jugador' });

      const question = room.start();
      io.to(roomCode).emit('game:question', question);

      room.questionTimer = setTimeout(() => endQuestion(io, room, roomCode), question.timeLimit * 1000);
    });

    socket.on('player:answer', ({ payload }) => {
      const roomCode = socketToRoom.get(socket.id);
      const room = rooms.get(roomCode);
      if (!room) return;

      const result = room.submitAnswer(socket.id, payload);
      if (!result) return;

      socket.emit('player:answer-received');

      if (room.allAnswered()) endQuestion(io, room, roomCode);
      else scheduleAnswerCountUpdate(io, room);
    });

    socket.on('host:next-question', () => {
      const roomCode = socketToRoom.get(socket.id);
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      const result = room.nextQuestion();
      if (result.finished) {
        io.to(roomCode).emit('game:finished', { leaderboard: result.leaderboard });
        for (const [socketId, { rank, score }] of result.ranks) {
          io.to(socketId).emit('player:final-result', { rank, score });
        }
        rooms.delete(roomCode);
      } else {
        io.to(roomCode).emit('game:question', result.question);
        room.questionTimer = setTimeout(
          () => endQuestion(io, room, roomCode),
          result.question.timeLimit * 1000
        );
      }
    });

    socket.on('disconnect', () => {
      const roomCode = socketToRoom.get(socket.id);
      socketToRoom.delete(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      if (room.hostSocketId === socket.id) {
        io.to(roomCode).emit('game:error', { message: 'El host se desconectó' });
        rooms.delete(roomCode);
      } else {
        room.removePlayer(socket.id);
        schedulePlayerListUpdate(io, room, roomCode);
      }
    });
  });
}
