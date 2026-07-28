import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
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

  function exportAll() {
    window.open('/api/quizzes/export', '_blank');
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    setImportMsg('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/quizzes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setImportMsg(`✓ ${result.imported} quiz${result.imported !== 1 ? 'zes' : ''} importado${result.imported !== 1 ? 's' : ''}`);
      // Recargar lista
      const updated = await fetch('/api/quizzes').then(r => r.json());
      setQuizzes(updated);
    } catch (err) {
      setImportMsg(`✗ Error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={() => navigate('/')} className="text-purple-200 hover:text-white text-sm mb-1">← Inicio</button>
          <h1 className="text-3xl font-black">Mis Quizzes</h1>
        </div>
        <button
          onClick={() => navigate('/quizzes/new')}
          className="bg-yellow-400 text-gray-900 font-bold py-2 px-5 rounded-xl hover:bg-yellow-300 transition-colors"
        >
          + Nuevo
        </button>
      </div>

      {/* Barra de export/import */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={exportAll}
          disabled={quizzes.length === 0}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          ↓ Exportar JSON
        </button>

        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${importing ? 'opacity-50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}>
          ↑ Importar JSON
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            disabled={importing}
            onChange={handleImport}
          />
        </label>

        {importMsg && (
          <span className={`text-sm font-semibold ${importMsg.startsWith('✓') ? 'text-green-300' : 'text-red-300'}`}>
            {importMsg}
          </span>
        )}
      </div>

      {loading && <p className="text-purple-200">Cargando...</p>}

      {!loading && quizzes.length === 0 && (
        <div className="text-center py-16 text-purple-200">
          <p className="text-xl mb-4">No tenés quizzes todavía</p>
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
          <div key={quiz.id} className="bg-white/10 rounded-2xl p-4 flex items-center justify-between">
            <h3 className="font-bold text-lg">{quiz.title}</h3>
            <div className="flex gap-2">
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
