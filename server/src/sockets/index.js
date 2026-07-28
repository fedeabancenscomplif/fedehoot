import { GameRoom } from '../game/GameRoom.js';
import { db } from '../db.js';

const rooms = new Map();        // roomCode → GameRoom
const socketToRoom = new Map(); // socketId → roomCode

function genCode() {
  let code;
  do { code = Math.random().toString(36).slice(2, 8).toUpperCase(); }
  while (rooms.has(code));
  return code;
}

function loadQuiz(quizId) {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
  if (!quiz) return null;
  const questions = db.prepare(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index'
  ).all(quizId);
  for (const q of questions) {
    q.answers = db.prepare(
      'SELECT * FROM answers WHERE question_id = ? ORDER BY order_index'
    ).all(q.id);
  }
  quiz.questions = questions;
  return quiz;
}

function endQuestion(io, room, roomCode) {
  if (room.state !== 'QUESTION') return;
  const data = room.endQuestion();
  if (!data) return;

  io.to(roomCode).emit('game:question-results', {
    correctAnswerId: data.correctAnswerId,
    leaderboard: data.leaderboard,
  });
  for (const r of data.playerResults) {
    io.to(r.socketId).emit('player:your-result', {
      isCorrect: r.isCorrect,
      pointsEarned: r.pointsEarned,
      totalScore: r.totalScore,
    });
  }
}

export function setupSockets(io) {
  io.on('connection', (socket) => {

    socket.on('host:create-game', ({ quizId }) => {
      const quiz = loadQuiz(quizId);
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
      const code = roomCode?.toUpperCase();
      const room = rooms.get(code);
      if (!room) return socket.emit('game:error', { message: 'Sala no encontrada' });

      const result = room.addPlayer(socket.id, nickname.trim());
      if (result.error) return socket.emit('game:error', { message: result.error });

      socketToRoom.set(socket.id, code);
      socket.join(code);

      socket.emit('player:joined', { nickname: nickname.trim(), roomCode: code });
      io.to(code).emit('game:player-list', { players: room.getPlayerList() });
    });

    // El jugador pide el estado actual al montar PlayGame
    socket.on('player:request-state', () => {
      const roomCode = socketToRoom.get(socket.id);
      const room = rooms.get(roomCode);
      if (!room) return;
      socket.emit('game:player-list', { players: room.getPlayerList() });
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

    socket.on('player:answer', ({ answerId }) => {
      const roomCode = socketToRoom.get(socket.id);
      const room = rooms.get(roomCode);
      if (!room) return;

      const result = room.submitAnswer(socket.id, answerId);
      if (!result) return;

      socket.emit('player:answer-received');
      io.to(room.hostSocketId).emit('game:answer-count', result);

      if (room.allAnswered()) endQuestion(io, room, roomCode);
    });

    socket.on('host:next-question', () => {
      const roomCode = socketToRoom.get(socket.id);
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      const result = room.nextQuestion();
      if (result.finished) {
        io.to(roomCode).emit('game:finished', { leaderboard: result.leaderboard });
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
        io.to(roomCode).emit('game:player-list', { players: room.getPlayerList() });
      }
    });
  });
}
