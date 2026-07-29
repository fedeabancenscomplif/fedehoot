import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { randomUUID } from '../utils';

const ANSWER_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
const ANSWER_LABELS = ['A', 'B', 'C', 'D'];

const QUESTION_TYPES = [
  { value: 'single',   label: 'Una correcta',    icon: '●' },
  { value: 'multiple', label: 'Varias correctas', icon: '■' },
  { value: 'order',    label: 'Ordenar',          icon: '≡' },
];

function newQuestion() {
  return {
    _id: randomUUID(),
    type: 'single',
    text: '',
    time_limit: 20,
    answers: ['', '', '', ''],
    correctIndex: 0,
    correctIndices: [],
    imageUrl: '',
  };
}

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { getToken } = useAuth();

  async function authFetch(url, opts = {}) {
    const token = await getToken();
    const headers = { ...(opts.headers ?? {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...opts, headers });
  }

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([newQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    authFetch(`/api/quizzes/${id}/edit`)
      .then(r => r.json())
      .then(quiz => {
        setTitle(quiz.title);
        setQuestions(quiz.questions.map(q => ({
          _id: q.id,
          type: q.type ?? 'single',
          text: q.text,
          time_limit: q.time_limit,
          answers: q.answers.map(a => a.text),
          correctIndex: q.answers.findIndex(a => a.is_correct),
          correctIndices: q.answers.map((a, i) => a.is_correct ? i : -1).filter(i => i >= 0),
          imageUrl: q.image_url ?? '',
        })));
      });
  }, [id]);

  function updateQuestion(index, field, value) {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  }

  function updateAnswer(qIndex, aIndex, value) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const answers = [...q.answers];
      answers[aIndex] = value;
      return { ...q, answers };
    }));
  }

  function toggleCorrectIndex(qIndex, aIndex) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const has = q.correctIndices.includes(aIndex);
      return {
        ...q,
        correctIndices: has
          ? q.correctIndices.filter(ci => ci !== aIndex)
          : [...q.correctIndices, aIndex],
      };
    }));
  }

  function moveAnswer(qIndex, aIndex, dir) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const answers = [...q.answers];
      const target = aIndex + dir;
      if (target < 0 || target >= answers.length) return q;
      [answers[aIndex], answers[target]] = [answers[target], answers[aIndex]];
      return { ...q, answers };
    }));
  }

  function addQuestion() {
    setQuestions(prev => [...prev, newQuestion()]);
  }

  function removeQuestion(index) {
    if (questions.length === 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setError('');
    if (!title.trim()) return setError('El título es requerido');

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return setError(`Pregunta ${i + 1}: el texto es requerido`);
      const filled = q.answers.filter(a => a.trim());
      if (filled.length < 2) return setError(`Pregunta ${i + 1}: necesitás al menos 2 opciones`);
      if (q.type === 'single' && !q.answers[q.correctIndex]?.trim()) {
        return setError(`Pregunta ${i + 1}: seleccioná la respuesta correcta`);
      }
      if (q.type === 'multiple') {
        if (q.correctIndices.length < 2) return setError(`Pregunta ${i + 1}: marcá al menos 2 respuestas correctas`);
        if (q.correctIndices.some(ci => !q.answers[ci]?.trim())) {
          return setError(`Pregunta ${i + 1}: una respuesta correcta está vacía`);
        }
      }
    }

    setSaving(true);
    const payload = {
      title,
      questions: questions.map(q => {
        const filledAnswers = q.answers.map((text, i) => ({ text: text.trim(), i })).filter(a => a.text);
        return {
          text: q.text.trim(),
          time_limit: q.time_limit,
          type: q.type,
          image_url: q.imageUrl.trim() || null,
          answers: filledAnswers.map(({ text, i }) => ({
            text,
            is_correct: q.type === 'single'
              ? i === q.correctIndex
              : q.type === 'multiple'
              ? q.correctIndices.includes(i)
              : false,
          })),
        };
      }),
    };

    const url = isEdit ? `/api/quizzes/${id}` : '/api/quizzes';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      navigate('/quizzes');
    } else {
      const data = await res.json();
      setError(data.error ?? 'Error al guardar');
    }
  }

  async function exportQuiz() {
    const quiz = await authFetch(`/api/quizzes/${id}/edit`).then(r => r.json());
    const payload = [{
      title: quiz.title,
      questions: quiz.questions.map(q => ({
        text: q.text,
        time_limit: q.time_limit,
        type: q.type ?? 'single',
        image_url: q.image_url ?? null,
        answers: q.answers.map(a => ({ text: a.text, is_correct: Boolean(a.is_correct) })),
      })),
    }];
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto pb-32">
      <div className="mb-6">
        <button onClick={() => navigate('/quizzes')} className="text-purple-200 hover:text-white text-sm mb-2">
          ← Volver
        </button>
        <h1 className="text-3xl font-black">{isEdit ? 'Editar Quiz' : 'Nuevo Quiz'}</h1>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-purple-200 mb-1">Título del quiz</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ej: Geografía mundial"
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-white text-lg"
        />
      </div>

      <div className="flex flex-col gap-6">
        {questions.map((q, qi) => (
          <div key={q._id} className="bg-white/10 rounded-2xl p-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-purple-200">Pregunta {qi + 1}</span>
              <div className="flex items-center gap-3">
                <label className="text-sm text-purple-200">
                  Tiempo:
                  <select
                    value={q.time_limit}
                    onChange={e => updateQuestion(qi, 'time_limit', Number(e.target.value))}
                    className="ml-2 bg-white/20 rounded-lg px-2 py-1 text-white"
                  >
                    {[10, 15, 20, 30, 45, 60].map(t => (
                      <option key={t} value={t}>{t}s</option>
                    ))}
                  </select>
                </label>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qi)} className="text-red-300 hover:text-red-200 text-lg leading-none">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Type selector */}
            <div className="flex rounded-xl overflow-hidden border border-white/20 mb-4">
              {QUESTION_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => updateQuestion(qi, 'type', t.value)}
                  className={`flex-1 py-2 px-1 text-xs font-bold transition-colors ${q.type === t.value ? 'bg-white text-purple-900' : 'text-white/50 hover:text-white'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Question text */}
            <input
              value={q.text}
              onChange={e => updateQuestion(qi, 'text', e.target.value)}
              placeholder="¿Cuál es la pregunta?"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-white mb-4"
            />

            {/* Image URL */}
            <div className="mb-4">
              <input
                value={q.imageUrl}
                onChange={e => updateQuestion(qi, 'imageUrl', e.target.value)}
                placeholder="URL de imagen (opcional) — buscá la imagen, clic derecho → copiar dirección"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-purple-300/70 focus:outline-none focus:border-white text-sm"
              />
              {q.imageUrl.trim() && (
                <div className="mt-2 rounded-xl overflow-hidden max-h-40 bg-black/20">
                  <img
                    src={q.imageUrl.trim()}
                    alt="preview"
                    className="w-full object-contain max-h-40"
                    onError={e => { e.target.style.display = 'none'; }}
                    onLoad={e => { e.target.style.display = ''; }}
                  />
                </div>
              )}
            </div>

            {/* Single choice */}
            {q.type === 'single' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {q.answers.map((answer, ai) => (
                    <label
                      key={ai}
                      className={`flex items-center gap-2 rounded-xl p-3 cursor-pointer ${ANSWER_COLORS[ai]} ${q.correctIndex === ai ? 'ring-4 ring-white' : 'opacity-80'}`}
                    >
                      <input
                        type="radio"
                        name={`correct-${q._id}`}
                        checked={q.correctIndex === ai}
                        onChange={() => updateQuestion(qi, 'correctIndex', ai)}
                        className="accent-white"
                      />
                      <span className="font-bold mr-1">{ANSWER_LABELS[ai]}</span>
                      <input
                        value={answer}
                        onChange={e => updateAnswer(qi, ai, e.target.value)}
                        placeholder={`Respuesta ${ANSWER_LABELS[ai]}`}
                        className="flex-1 bg-transparent border-b border-white/40 text-white placeholder-white/60 focus:outline-none focus:border-white text-sm"
                        onClick={e => e.stopPropagation()}
                      />
                    </label>
                  ))}
                </div>
                <p className="text-xs text-purple-200 mt-2">Seleccioná el radio de la respuesta correcta</p>
              </>
            )}

            {/* Multiple choice */}
            {q.type === 'multiple' && (
              <>
                <p className="text-xs text-purple-200 mb-2">Marcá todas las respuestas correctas (mínimo 2)</p>
                <div className="grid grid-cols-2 gap-2">
                  {q.answers.map((answer, ai) => {
                    const isMarked = q.correctIndices.includes(ai);
                    return (
                      <label
                        key={ai}
                        className={`flex items-center gap-2 rounded-xl p-3 cursor-pointer ${ANSWER_COLORS[ai]} ${isMarked ? 'ring-4 ring-white' : 'opacity-80'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isMarked}
                          onChange={() => toggleCorrectIndex(qi, ai)}
                          className="accent-white"
                        />
                        <span className="font-bold mr-1">{ANSWER_LABELS[ai]}</span>
                        <input
                          value={answer}
                          onChange={e => updateAnswer(qi, ai, e.target.value)}
                          placeholder={`Opción ${ANSWER_LABELS[ai]}`}
                          className="flex-1 bg-transparent border-b border-white/40 text-white placeholder-white/60 focus:outline-none focus:border-white text-sm"
                          onClick={e => e.stopPropagation()}
                        />
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            {/* Order */}
            {q.type === 'order' && (
              <>
                <p className="text-xs text-purple-200 mb-2">El orden de arriba hacia abajo es la respuesta correcta. Usá las flechas para reordenar.</p>
                <div className="flex flex-col gap-2">
                  {q.answers.map((answer, ai) => (
                    <div key={ai} className="flex items-center gap-2">
                      <span className="text-white/50 font-black text-sm w-5 text-center">{ai + 1}</span>
                      <input
                        value={answer}
                        onChange={e => updateAnswer(qi, ai, e.target.value)}
                        placeholder={`Elemento ${ai + 1}`}
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-purple-300 focus:outline-none focus:border-white text-sm"
                      />
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveAnswer(qi, ai, -1)}
                          disabled={ai === 0}
                          className="text-white/50 hover:text-white disabled:opacity-20 text-xs leading-tight py-0.5 px-1"
                        >▲</button>
                        <button
                          onClick={() => moveAnswer(qi, ai, 1)}
                          disabled={ai === q.answers.length - 1}
                          className="text-white/50 hover:text-white disabled:opacity-20 text-xs leading-tight py-0.5 px-1"
                        >▼</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="mt-4 w-full border-2 border-dashed border-white/30 rounded-2xl py-4 text-purple-200 hover:border-white/60 hover:text-white transition-colors font-semibold"
      >
        + Agregar pregunta
      </button>

      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-400 rounded-xl px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-kahoot-dark/90 backdrop-blur flex justify-between items-center gap-3">
        <button
          onClick={() => navigate('/quizzes')}
          className="px-6 py-3 rounded-xl text-purple-200 hover:text-white font-semibold"
        >
          Cancelar
        </button>
        <div className="flex gap-3">
          {isEdit && (
            <button
              onClick={exportQuiz}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              ↓ Exportar
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}
