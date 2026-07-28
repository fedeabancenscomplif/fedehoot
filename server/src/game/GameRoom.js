function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class GameRoom {
  constructor(roomCode, quiz, hostSocketId) {
    this.roomCode = roomCode;
    this.quiz = quiz;
    this.hostSocketId = hostSocketId;
    this.state = 'LOBBY';
    this.players = new Map(); // socketId → { nickname, score }
    this.currentQuestionIndex = -1;
    this.questionTimer = null;
    this.questionStartTime = null;
    this.currentAnswers = new Map(); // socketId → { payload, timeMs }
  }

  addPlayer(socketId, nickname) {
    if (this.state !== 'LOBBY') return { error: 'La partida ya empezó' };
    const taken = [...this.players.values()].some(p => p.nickname === nickname);
    if (taken) return { error: 'Ese nombre ya está en uso' };
    this.players.set(socketId, { nickname, score: 0 });
    return { ok: true };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  getPlayerList() {
    return [...this.players.values()].map(p => ({ nickname: p.nickname, score: p.score }));
  }

  start() {
    if (this.state !== 'LOBBY') return null;
    this.currentQuestionIndex = 0;
    this.state = 'QUESTION';
    return this._buildQuestionPayload();
  }

  _buildQuestionPayload() {
    const q = this.quiz.questions[this.currentQuestionIndex];
    if (!q) return null;
    this.currentAnswers.clear();
    this.questionStartTime = Date.now();

    const type = q.type ?? 'single';
    let answers = q.answers.map(a => ({ id: a.id, text: a.text }));
    if (type === 'order') answers = shuffle(answers);

    return {
      questionNumber: this.currentQuestionIndex + 1,
      totalQuestions: this.quiz.questions.length,
      text: q.text,
      timeLimit: q.time_limit,
      type,
      answers,
    };
  }

  submitAnswer(socketId, payload) {
    if (this.state !== 'QUESTION') return null;
    if (this.currentAnswers.has(socketId)) return null;
    const timeMs = Date.now() - this.questionStartTime;
    this.currentAnswers.set(socketId, { payload, timeMs });
    return { answered: this.currentAnswers.size, total: this.players.size };
  }

  allAnswered() {
    return this.players.size > 0 && this.currentAnswers.size >= this.players.size;
  }

  endQuestion() {
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }
    if (this.state !== 'QUESTION') return null;
    this.state = 'RESULTS';

    const q = this.quiz.questions[this.currentQuestionIndex];
    const timeLimitMs = q.time_limit * 1000;
    const type = q.type ?? 'single';

    let correctAnswerIds = [];
    let correctOrderedIds = [];

    if (type === 'single') {
      const c = q.answers.find(a => a.is_correct);
      if (c) correctAnswerIds = [c.id];
    } else if (type === 'multiple') {
      correctAnswerIds = q.answers.filter(a => a.is_correct).map(a => a.id);
    } else if (type === 'order') {
      correctOrderedIds = [...q.answers].sort((a, b) => a.order_index - b.order_index).map(a => a.id);
      correctAnswerIds = correctOrderedIds;
    }

    const playerResults = [];
    for (const [socketId, player] of this.players) {
      const answer = this.currentAnswers.get(socketId);
      let pointsEarned = 0;
      let isCorrect = false;
      let correctPositions = 0;
      const totalPositions = type === 'order' ? correctOrderedIds.length : 0;

      if (answer) {
        const timeRatio = Math.max(0, 1 - answer.timeMs / timeLimitMs);

        if (type === 'single') {
          isCorrect = answer.payload === correctAnswerIds[0];
          if (isCorrect) pointsEarned = Math.round(500 + 500 * timeRatio);

        } else if (type === 'multiple') {
          const correctSet = new Set(correctAnswerIds);
          const selectedSet = new Set(Array.isArray(answer.payload) ? answer.payload : []);
          const allCorrect = [...correctSet].every(id => selectedSet.has(id));
          const noWrong = [...selectedSet].every(id => correctSet.has(id));
          isCorrect = allCorrect && noWrong;
          if (isCorrect) pointsEarned = Math.round(500 + 500 * timeRatio);

        } else if (type === 'order') {
          const playerOrder = Array.isArray(answer.payload) ? answer.payload : [];
          for (let i = 0; i < correctOrderedIds.length; i++) {
            if (playerOrder[i] === correctOrderedIds[i]) correctPositions++;
          }
          isCorrect = correctPositions === correctOrderedIds.length;
          const accuracy = correctOrderedIds.length > 0 ? correctPositions / correctOrderedIds.length : 0;
          pointsEarned = Math.round(accuracy * (500 + 500 * timeRatio));
        }
      }

      player.score += pointsEarned;
      playerResults.push({
        socketId,
        nickname: player.nickname,
        isCorrect,
        pointsEarned,
        totalScore: player.score,
        correctPositions,
        totalPositions,
      });
    }

    return {
      type,
      correctAnswerIds,
      correctOrderedIds,
      playerResults,
      leaderboard: this.getLeaderboard(),
    };
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= this.quiz.questions.length) {
      this.state = 'FINISHED';
      return { finished: true, leaderboard: this.getLeaderboard() };
    }
    this.state = 'QUESTION';
    return { finished: false, question: this._buildQuestionPayload() };
  }

  getLeaderboard() {
    return [...this.players.values()]
      .map(p => ({ nickname: p.nickname, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }
}
