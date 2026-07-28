import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) setRoomCode(code.toUpperCase());
  }, []);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function join(e) {
    e.preventDefault();
    setError('');
    if (!roomCode.trim()) return setError('Ingresá el código de sala');
    if (!nickname.trim()) return setError('Ingresá tu nombre');

    setLoading(true);
    socket.connect();

    socket.once('player:joined', ({ nickname: nick, roomCode: code }) => {
      navigate('/play', { state: { nickname: nick, roomCode: code } });
    });

    socket.once('game:error', ({ message }) => {
      setError(message);
      setLoading(false);
      socket.disconnect();
    });

    socket.emit('player:join', { roomCode: roomCode.trim(), nickname: nickname.trim() });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <button onClick={() => navigate('/')} className="text-purple-200 hover:text-white text-sm mb-8 self-start">
        ← Inicio
      </button>

      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-black mb-8 text-center">Unirme al juego</h1>

        <form onSubmit={join} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-purple-200 mb-1">Código de sala</label>
            <input
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white placeholder-purple-300 focus:outline-none focus:border-white text-2xl font-black text-center tracking-widest uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-purple-200 mb-1">Tu nombre</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="¿Cómo te llamás?"
              maxLength={20}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white placeholder-purple-300 focus:outline-none focus:border-white text-xl"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400 rounded-xl px-4 py-3 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-400 text-gray-900 font-black text-xl py-4 rounded-2xl hover:bg-yellow-300 disabled:opacity-50 transition-colors mt-2 shadow-xl"
          >
            {loading ? 'Conectando...' : '¡Entrar!'}
          </button>
        </form>
      </div>
    </div>
  );
}
