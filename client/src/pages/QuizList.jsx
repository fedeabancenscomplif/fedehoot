import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importMsg, setImportMsg] = useState('');
  const [importing, setImporting] = useState(false);
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

      {/* Banner de aviso persistencia */}
      <div className="flex items-start gap-3 bg-yellow-400/10 border border-yellow-400/40 rounded-2xl px-4 py-3 mb-6">
        <span className="text-lg mt-0.5">⚡</span>
        <div>
          <p className="font-bold text-yellow-300 text-sm mb-1">Guardá tus quizzes</p>
          <p className="text-white/70 text-sm leading-relaxed">
            El servidor se reinicia de vez en cuando y los quizzes se borran. Usá el botón <strong className="text-white">Exportar</strong> en el editor para bajar cada quiz como archivo y volvé a importarlo cuando quieras jugar.
          </p>
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
