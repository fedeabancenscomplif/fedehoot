import { Router } from 'express';
import { supabase, randomUUID, getUserFromRequest } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const user = await getUserFromRequest(req);
  let query = supabase
    .from('quizzes')
    .select('id, title, created_at')
    .order('created_at', { ascending: false });
  if (user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.is('user_id', null);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/export', async (req, res) => {
  const user = await getUserFromRequest(req);
  let query = supabase.from('quizzes').select('id, title').order('created_at');
  if (user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.is('user_id', null);
  }
  const { data: quizzes } = await query;
  const result = [];
  for (const quiz of quizzes ?? []) {
    const full = await loadFullQuiz(quiz.id);
    if (!full) continue;
    result.push({
      title: full.title,
      questions: full.questions.map(q => ({
        text: q.text,
        time_limit: q.time_limit,
        type: q.type ?? 'single',
        image_url: q.image_url ?? null,
        answers: q.answers.map(a => ({ text: a.text, is_correct: Boolean(a.is_correct) })),
      })),
    });
  }
  res.setHeader('Content-Disposition', 'attachment; filename="fedehoot-quizzes.json"');
  res.json(result);
});

router.post('/import', async (req, res) => {
  const quizzes = req.body;
  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    return res.status(400).json({ error: 'El archivo debe contener un array de quizzes' });
  }
  if (quizzes.length > 50) {
    return res.status(400).json({ error: 'Máximo 50 quizzes por importación' });
  }
  const user = await getUserFromRequest(req);
  let count = 0;
  try {
    for (const quiz of quizzes) {
      if (!quiz.title?.trim() || !Array.isArray(quiz.questions) || quiz.questions.length === 0) continue;
      if (quiz.questions.length > 50) continue;
      const quizId = randomUUID();
      const { error } = await supabase.from('quizzes').insert({
        id: quizId,
        title: quiz.title.trim(),
        user_id: user?.id ?? null,
      });
      if (error) throw error;
      await saveQuestions(quizId, quiz.questions);
      count++;
    }
  } catch (e) {
    return res.status(400).json({ error: 'Formato inválido: ' + e.message });
  }
  res.json({ imported: count });
});

router.get('/:id/edit', async (req, res) => {
  const quiz = await loadFullQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'No encontrado' });
  const user = await getUserFromRequest(req);
  if (quiz.user_id !== null && quiz.user_id !== user?.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  res.json(quiz);
});

router.get('/:id', async (req, res) => {
  const quiz = await loadFullQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'No encontrado' });
  for (const q of quiz.questions) {
    q.answers = q.answers.map(({ is_correct: _, ...a }) => a);
  }
  res.json(quiz);
});

router.post('/', async (req, res) => {
  const { title, questions = [] } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'El título es requerido' });
  const user = await getUserFromRequest(req);
  const quizId = randomUUID();
  const { error } = await supabase.from('quizzes').insert({
    id: quizId,
    title: title.trim(),
    user_id: user?.id ?? null,
  });
  if (error) return res.status(500).json({ error: error.message });
  await saveQuestions(quizId, questions);
  res.status(201).json({ id: quizId });
});

router.put('/:id', async (req, res) => {
  const { data: existing } = await supabase.from('quizzes').select('user_id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  const user = await getUserFromRequest(req);
  if (existing.user_id !== null && existing.user_id !== user?.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const { title, questions = [] } = req.body;
  if (title?.trim()) {
    await supabase.from('quizzes').update({ title: title.trim() }).eq('id', req.params.id);
  }
  await supabase.from('questions').delete().eq('quiz_id', req.params.id);
  await saveQuestions(req.params.id, questions);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const { data: existing } = await supabase.from('quizzes').select('user_id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  const user = await getUserFromRequest(req);
  if (existing.user_id !== null && existing.user_id !== user?.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  await supabase.from('quizzes').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

async function loadFullQuiz(id) {
  const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', id).single();
  if (!quiz) return null;
  const { data: questions } = await supabase
    .from('questions')
    .select('*, answers(*)')
    .eq('quiz_id', id)
    .order('order_index');
  quiz.questions = (questions ?? []).map(q => ({
    ...q,
    answers: (q.answers ?? []).sort((a, b) => a.order_index - b.order_index),
  }));
  return quiz;
}

async function saveQuestions(quizId, questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qId = randomUUID();
    const { error } = await supabase.from('questions').insert({
      id: qId,
      quiz_id: quizId,
      text: q.text,
      time_limit: q.time_limit ?? 20,
      type: q.type ?? 'single',
      image_url: q.image_url ?? null,
      order_index: i,
    });
    if (error) throw error;
    const answersToInsert = (q.answers ?? []).map((a, j) => ({
      id: randomUUID(),
      question_id: qId,
      text: a.text,
      is_correct: Boolean(a.is_correct),
      order_index: j,
    }));
    if (answersToInsert.length > 0) {
      const { error: aErr } = await supabase.from('answers').insert(answersToInsert);
      if (aErr) throw aErr;
    }
  }
}

export default router;
