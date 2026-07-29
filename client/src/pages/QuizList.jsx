import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importMsg, setImportMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();
  const { user, signInWithGoogle, signOut, getToken } = useAuth();

  async function authFetch(url, opts = {}) {
    const token = await getToken();
    const headers = { ...(opts.headers ?? {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...opts, headers });
  }

  async function loadQuizzes() {
    setLoading(true);
    const res = await authFetch('/api/quizzes');
    const data = await res.json();
    setQuizzes(data);
    setLoading(false);
  }

  useEffect(() => {
    if (user === undefined) return; // still loading auth
    loadQuizzes();
  }, [user]);

  async function deleteQuiz(id) {
    if (!confirm('¿Eliminar este quiz?')) return;
    await authFetch(`/api/quizzes/${id}`, { method: 'DELETE' });
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
      const res = await authFetch('/api/quizzes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setImportMsg(`✓ ${result.imported} quiz${result.imported !== 1 ? 'zes' : ''} importado${result.imported !== 1 ? 's' : ''}`);
      await loadQuizzes();
    } catch (err) {
      setImportMsg(`✗ ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  const isLoggedIn = user !== null && user !== undefined;

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/')} className="text-purple-200 hover:text-white text-sm mb-1">← Inicio</button>
          <h1 className="text-3xl font-black">Mis Quizzes</h1>
        </div>
        <div className="flex gap-2 items-center">
          {user === undefined ? null : isLoggedIn ? (
            <button
              onClick={signOut}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors"
              title={user.email}
            >
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-6 h-6 rounded-full inline mr-1" />
              ) : null}
              Salir
            </button>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 bg-white text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition-colors shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar con Google
            </button>
          )}
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

      {/* Auth banner */}
      {user === null && (
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-400/40 rounded-2xl px-4 py-3 mb-6">
          <span className="text-lg mt-0.5">👤</span>
          <div>
            <p className="font-bold text-blue-300 text-sm mb-1">Modo invitado</p>
            <p className="text-white/70 text-sm leading-relaxed">
              Tus quizzes se borran automáticamente después de 24 horas. <button onClick={signInWithGoogle} className="text-blue-300 underline hover:text-white">Entrá con Google</button> para guardarlos de forma permanente y que solo vos los veas.
            </p>
          </div>
        </div>
      )}
      {isLoggedIn && (
        <div className="flex items-start gap-3 bg-green-500/10 border border-green-400/40 rounded-2xl px-4 py-3 mb-6">
          <span className="text-lg mt-0.5">✓</span>
          <div>
            <p className="font-bold text-green-300 text-sm">Sesión iniciada como {user.user_metadata?.full_name ?? user.email}</p>
            <p className="text-white/70 text-sm">Tus quizzes son privados y se guardan de forma permanente.</p>
          </div>
        </div>
      )}

      {importMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${importMsg.startsWith('✓') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {importMsg}
        </div>
      )}

      {(loading || user === undefined) && <p className="text-purple-200">Cargando...</p>}

      {!loading && user !== undefined && quizzes.length === 0 && (
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
