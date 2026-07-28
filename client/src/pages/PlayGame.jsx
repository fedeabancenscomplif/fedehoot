import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket';

const ANSWER_COLORS = ['#E21B3C', '#1368CE', '#D89E00', '#26890C'];
const ANSWER_LABELS = ['▲', '◆', '●', '■'];

function Countdown({ seconds }) {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef(null);

  useEffect(() => {
    setRemaining(seconds);
    ref.current = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(ref.current);
  }, [seconds]);

  const pct = remaining / seconds;

  return (
    <div className="flex items-center justify-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-4 border-white transition-all"
        style={{ background: `conic-gradient(white ${pct * 360}deg, rgba(255,255,255,0.2) 0deg)` }}
      >
        <span className="bg-kahoot-purple rounded-full w-9 h-9 flex items-center justify-center text-white text-base font-black">
          {remaining}
        </span>
      </div>
    </div>
  );
}

export default function PlayGame() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('lobby');
  const [players, setPlayers] = useState([]);
  const [question, setQuestion] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [myResult, setMyResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);

  const { nickname, roomCode } = state ?? {};

  useEffect(() => {
    if (!nickname || !roomCode) {
      navigate('/join');
      return;
    }

    socket.on('game:player-list', ({ players }) => setPlayers(players));

    socket.on('game:question', (q) => {
      setQuestion(q);
      setSelectedId(null);
      setMyResult(null);
      setPhase('question');
    });

    socket.on('player:answer-received', () => {
      setPhase('answered');
    });

    socket.on('player:your-result', (result) => {
      setMyResult(result);
    });

    socket.on('game:question-results', ({ leaderboard }) => {
      setLeaderboard(leaderboard);
      setPhase('results');
    });

    socket.on('game:finished', ({ leaderboard }) => {
      setFinalLeaderboard(leaderboard);
      setPhase('finished');
    });

    socket.on('game:error', ({ message }) => {
      alert(message);
      socket.disconnect();
      navigate('/');
    });

    return () => {
      socket.off('game:player-list');
      socket.off('game:question');
      socket.off('player:answer-received');
      socket.off('player:your-result');
      socket.off('game:question-results');
      socket.off('game:finished');
      socket.off('game:error');
      socket.disconnect();
    };
  }, []);

  function submitAnswer(answerId) {
    if (selectedId) return;
    setSelectedId(answerId);
    socket.emit('player:answer', { answerId });
  }

  if (phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-6xl">🎮</div>
        <div>
          <p className="text-purple-200 text-sm mb-1">Sala</p>
          <p className="font-black text-3xl tracking-widest">{roomCode}</p>
        </div>
        <div>
          <p className="text-purple-200 text-sm mb-1">Jugando como</p>
          <p className="font-black text-2xl">{nickname}</p>
        </div>
        <p className="text-purple-200 animate-pulse text-lg">Esperando que el host empiece...</p>
        <div className="text-sm text-purple-300">
          {players.length} jugador{players.length !== 1 ? 'es' : ''} en la sala
        </div>
      </div>
    );
  }

  if (phase === 'question') {
    return (
      <div className="min-h-screen flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
          <span className="text-purple-200 text-sm">
            {question.questionNumber}/{question.totalQuestions}
          </span>
          <Countdown seconds={question.timeLimit} />
          <span className="text-purple-200 text-sm invisible">x</span>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-3">
          <div className="bg-white text-gray-900 rounded-2xl p-4 text-center shadow-xl">
            <p className="text-lg font-bold">{question.text}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {question.answers.map((a, i) => (
              <button
                key={a.id}
                onClick={() => submitAnswer(a.id)}
                disabled={Boolean(selectedId)}
                className="rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-white font-bold text-3xl shadow-lg disabled:opacity-50 active:scale-95 transition-transform min-h-[100px]"
                style={{ backgroundColor: ANSWER_COLORS[i] }}
              >
                <span className="text-4xl">{ANSWER_LABELS[i]}</span>
                <span className="text-sm font-normal text-center">{a.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'answered') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center p-6">
        <div className="text-6xl animate-bounce">⏳</div>
        <p className="text-2xl font-bold">Respuesta enviada</p>
        <p className="text-purple-200">Esperando a los demás...</p>
        {selectedId && question && (
          <div
            className="rounded-2xl px-6 py-3 font-bold text-lg"
            style={{ backgroundColor: ANSWER_COLORS[question.answers.findIndex(a => a.id === selectedId)] }}
          >
            {ANSWER_LABELS[question.answers.findIndex(a => a.id === selectedId)]}
            {' '}
            {question.answers.find(a => a.id === selectedId)?.text}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'results') {
    const myPos = leaderboard.findIndex(p => p.nickname === nickname) + 1;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        {myResult ? (
          <>
            <div className="text-7xl">{myResult.isCorrect ? '✅' : '❌'}</div>
            <div>
              <p className="text-3xl font-black">
                {myResult.isCorrect ? '¡Correcto!' : 'Incorrecto'}
              </p>
              {myResult.isCorrect && (
                <p className="text-yellow-300 font-bold text-xl mt-1">
                  +{myResult.pointsEarned.toLocaleString()} puntos
                </p>
              )}
            </div>
            <div className="bg-white/10 rounded-2xl px-8 py-4">
              <p className="text-purple-200 text-sm">Puntaje total</p>
              <p className="font-black text-3xl text-yellow-300">{myResult.totalScore.toLocaleString()}</p>
              <p className="text-purple-200 text-sm mt-1">Posición #{myPos}</p>
            </div>
          </>
        ) : (
          <p className="text-2xl text-purple-200">No respondiste a tiempo</p>
        )}

        <div className="w-full max-w-xs">
          <p className="text-purple-200 text-sm mb-2">Top jugadores</p>
          {leaderboard.slice(0, 5).map((p, i) => (
            <div
              key={p.nickname}
              className={`flex justify-between px-4 py-2 rounded-lg mb-1 text-sm font-semibold ${p.nickname === nickname ? 'bg-yellow-400 text-gray-900' : 'bg-white/10'}`}
            >
              <span>#{i + 1} {p.nickname}</span>
              <span>{p.score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <p className="text-purple-200 animate-pulse text-sm">Esperando siguiente pregunta...</p>
      </div>
    );
  }

  if (phase === 'finished') {
    const myPos = finalLeaderboard.findIndex(p => p.nickname === nickname) + 1;
    const myScore = finalLeaderboard.find(p => p.nickname === nickname)?.score ?? 0;
    const podiumEmojis = ['🥇', '🥈', '🥉'];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-5xl font-black">¡Fin!</h1>
        <div className="text-6xl">{podiumEmojis[myPos - 1] ?? '🎮'}</div>
        <div>
          <p className="text-purple-200">Terminaste</p>
          <p className="font-black text-4xl">#{myPos}</p>
          <p className="text-yellow-300 font-bold text-xl">{myScore.toLocaleString()} pts</p>
        </div>

        <div className="w-full max-w-xs">
          {finalLeaderboard.slice(0, 10).map((p, i) => (
            <div
              key={p.nickname}
              className={`flex justify-between px-4 py-2 rounded-lg mb-1 text-sm font-semibold ${p.nickname === nickname ? 'bg-yellow-400 text-gray-900' : 'bg-white/10'}`}
            >
              <span>{podiumEmojis[i] ?? `#${i + 1}`} {p.nickname}</span>
              <span>{p.score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/')}
          className="bg-white text-kahoot-purple font-bold py-3 px-8 rounded-2xl"
        >
          Inicio
        </button>
      </div>
    );
  }

  return null;
}
