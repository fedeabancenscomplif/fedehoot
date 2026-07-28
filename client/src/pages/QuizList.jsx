import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importMsg, setImportMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/quizzes')
      .then(r => r.json())
      .then(data => { setQuizzes(data); setLoading(false); });
  }, []);

  async function deleteQuiz(id) {
    if (!confirm('¿Eliminar este quiz?')) return;
    await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
    setQuizzes(prev => prev.filter(q => q.id !== id));
  }

  async function exportQuiz(id, title) {
    const quiz = await fetch(`/api/quizzes/${id}`).then(r => r.json());
    const payload = [{
      title: quiz.title,
      questions: quiz.questions.map(q => ({
        text: q.text,
        time_limit: q.time_limit,
        answers: q.answers.map(a => ({ text: a.text, is_correct: Boolean(a.is_correct) })),
      })),
    }];
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportMsg('');
    try {
      const data = JSON.parse(await file.text());
      const res = await fetch('/api/quizzes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setImportMsg(`✓ ${result.imported} quiz${result.imported !== 1 ? 'zes' : ''} importado${result.imported !== 1 ? 's' : ''}`);
      const updated = await fetch('/api/quizzes').then(r => r.json());
      setQuizzes(updated);
    } catch (err) {
      setImportMsg(`✗ ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/')} className="text-purple-200 hover:text-white text-sm mb-1">← Inicio</button>
          <h1 className="text-3xl font-black">Mis Quizzes</h1>
        </div>
        <div className="flex gap-2">
          <label className={`flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            ↑ Importar
            <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button
            onClick={() => navigate('/quizzes/new')}
            className="bg-yellow-400 text-gray-900 font-bold py-2 px-5 rounded-xl hover:bg-yellow-300 transition-colors"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {importMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${importMsg.startsWith('✓') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {importMsg}
        </div>
      )}

      {loading && <p className="text-purple-200">Cargando...</p>}

      {!loading && quizzes.length === 0 && (
        <div className="text-center py-16 text-purple-200">
          <p className="text-xl mb-2">No tenés quizzes todavía</p>
          <p className="text-sm mb-6">Creá uno nuevo o importá un archivo JSON</p>
          <button
            onClick={() => navigate('/quizzes/new')}
            className="bg-white text-kahoot-purple font-bold py-3 px-6 rounded-xl"
          >
            Crear mi primer quiz
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {quizzes.map(quiz => (
          <div key={quiz.id} className="bg-white/10 rounded-2xl p-4 flex items-center justify-between gap-2">
            <h3 className="font-bold text-lg truncate">{quiz.title}</h3>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => navigate(`/quizzes/${quiz.id}/edit`)}
                className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => exportQuiz(quiz.id, quiz.title)}
                className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                title="Exportar como JSON"
              >
                ↓
              </button>
              <button
                onClick={() => navigate(`/host/${quiz.id}`)}
                className="text-sm bg-green-500 hover:bg-green-400 font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                Jugar
              </button>
              <button
                onClick={() => deleteQuiz(quiz.id)}
                className="text-sm bg-red-500/70 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
