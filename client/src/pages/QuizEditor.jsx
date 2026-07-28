import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { randomUUID } from '../utils';

const ANSWER_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
const ANSWER_LABELS = ['A', 'B', 'C', 'D'];

function newQuestion() {
  return {
    _id: randomUUID(),
    text: '',
    time_limit: 20,
    answers: ['', '', '', ''],
    correctIndex: 0,
  };
}

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([newQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/quizzes/${id}`)
      .then(r => r.json())
      .then(quiz => {
        setTitle(quiz.title);
        setQuestions(quiz.questions.map(q => ({
          _id: q.id,
          text: q.text,
          time_limit: q.time_limit,
          answers: q.answers.map(a => a.text),
          correctIndex: q.answers.findIndex(a => a.is_correct),
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
      if (filled.length < 2) return setError(`Pregunta ${i + 1}: necesitás al menos 2 respuestas`);
      if (!q.answers[q.correctIndex]?.trim()) return setError(`Pregunta ${i + 1}: la respuesta correcta no puede estar vacía`);
    }

    setSaving(true);
    const payload = {
      title,
      questions: questions.map(q => ({
        text: q.text.trim(),
        time_limit: q.time_limit,
        answers: q.answers
          .map((text, i) => ({ text: text.trim(), is_correct: i === q.correctIndex }))
          .filter(a => a.text),
      })),
    };

    const url = isEdit ? `/api/quizzes/${id}` : '/api/quizzes';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
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
                  <button
                    onClick={() => removeQuestion(qi)}
                    className="text-red-300 hover:text-red-200 text-sm"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>

            <input
              value={q.text}
              onChange={e => updateQuestion(qi, 'text', e.target.value)}
              placeholder="¿Cuál es la pregunta?"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-white mb-4"
            />

            <div className="grid grid-cols-2 gap-2">
              {q.answers.map((answer, ai) => (
                <label
                  key={ai}
                  className={`flex items-center gap-2 rounded-xl p-3 cursor-pointer transition-opacity ${ANSWER_COLORS[ai]} ${q.correctIndex === ai ? 'ring-4 ring-white' : 'opacity-80'}`}
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-kahoot-dark/90 backdrop-blur flex justify-end gap-3">
        <button
          onClick={() => navigate('/quizzes')}
          className="px-6 py-3 rounded-xl text-purple-200 hover:text-white font-semibold"
        >
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar quiz'}
        </button>
      </div>
    </div>
  );
}
