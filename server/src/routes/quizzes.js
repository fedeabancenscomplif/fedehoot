import { Router } from 'express';
import { db, randomUUID } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const quizzes = db.prepare('SELECT id, title, created_at FROM quizzes ORDER BY created_at DESC').all();
  res.json(quizzes);
});

router.get('/:id', (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'No encontrado' });

  const questions = db.prepare(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index'
  ).all(req.params.id);
  for (const q of questions) {
    q.answers = db.prepare(
      'SELECT * FROM answers WHERE question_id = ? ORDER BY order_index'
    ).all(q.id);
  }
  quiz.questions = questions;
  res.json(quiz);
});

router.post('/', (req, res) => {
  const { title, questions = [] } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'El título es requerido' });

  const quizId = randomUUID();
  transaction(() => {
    db.prepare('INSERT INTO quizzes (id, title) VALUES (?, ?)').run(quizId, title.trim());
    saveQuestions(quizId, questions);
  });
  res.status(201).json({ id: quizId });
});

router.put('/:id', (req, res) => {
  const { title, questions = [] } = req.body;
  if (!db.prepare('SELECT id FROM quizzes WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  transaction(() => {
    if (title?.trim()) {
      db.prepare('UPDATE quizzes SET title = ? WHERE id = ?').run(title.trim(), req.params.id);
    }
    db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(req.params.id);
    saveQuestions(req.params.id, questions);
  });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function transaction(fn) {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function saveQuestions(quizId, questions) {
  const insertQ = db.prepare(
    'INSERT INTO questions (id, quiz_id, text, time_limit, order_index) VALUES (?, ?, ?, ?, ?)'
  );
  const insertA = db.prepare(
    'INSERT INTO answers (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)'
  );
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qId = randomUUID();
    insertQ.run(qId, quizId, q.text, q.time_limit ?? 20, i);
    for (let j = 0; j < (q.answers ?? []).length; j++) {
      const a = q.answers[j];
      insertA.run(randomUUID(), qId, a.text, a.is_correct ? 1 : 0, j);
    }
  }
}

export default router;
