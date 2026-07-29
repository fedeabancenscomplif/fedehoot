import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-tight mb-2">FedeHoot!</h1>
        <p className="text-purple-200 text-lg">Jugá a las preguntas, ahora gratis.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={() => navigate('/quizzes')}
          className="flex-1 bg-white text-kahoot-purple font-bold text-xl py-5 px-6 rounded-2xl shadow-lg hover:scale-105 transition-transform"
        >
          Crear / Hostear
        </button>
        <button
          onClick={() => navigate('/join')}
          className="flex-1 bg-yellow-400 text-gray-900 font-bold text-xl py-5 px-6 rounded-2xl shadow-lg hover:scale-105 transition-transform"
        >
          Unirme
        </button>
      </div>
    </div>
  );
}
