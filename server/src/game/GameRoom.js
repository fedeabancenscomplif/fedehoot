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
    this.currentAnswers = new Map(); // socketId → { answerId, timeMs }
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
    return {
      questionNumber: this.currentQuestionIndex + 1,
      totalQuestions: this.quiz.questions.length,
      text: q.text,
      timeLimit: q.time_limit,
      answers: q.answers.map(a => ({ id: a.id, text: a.text })),
    };
  }

  submitAnswer(socketId, answerId) {
    if (this.state !== 'QUESTION') return null;
    if (this.currentAnswers.has(socketId)) return null;
    const timeMs = Date.now() - this.questionStartTime;
    this.currentAnswers.set(socketId, { answerId, timeMs });
    return { answeredCount: this.currentAnswers.size, playerCount: this.players.size };
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
    const correct = q.answers.find(a => a.is_correct);
    const timeLimitMs = q.time_limit * 1000;

    const playerResults = [];
    for (const [socketId, player] of this.players) {
      const answer = this.currentAnswers.get(socketId);
      let pointsEarned = 0;
      let isCorrect = false;

      if (answer && answer.answerId === correct.id) {
        isCorrect = true;
        const timeRatio = Math.max(0, 1 - answer.timeMs / timeLimitMs);
        pointsEarned = Math.round(500 + 500 * timeRatio);
      }

      player.score += pointsEarned;
      playerResults.push({ socketId, nickname: player.nickname, isCorrect, pointsEarned, totalScore: player.score });
    }

    return {
      correctAnswerId: correct.id,
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
