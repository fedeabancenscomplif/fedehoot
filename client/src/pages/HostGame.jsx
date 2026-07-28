import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';

const ANSWER_COLORS = ['#E21B3C', '#1368CE', '#D89E00', '#26890C'];
const ANSWER_LABELS = ['▲', '◆', '●', '■'];

const TYPE_LABELS = {
  single:   'Una correcta',
  multiple: 'Varias correctas',
  order:    'Ordenar',
};

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
  const r = 45;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke="white" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="text-2xl font-black text-white">{remaining}</span>
    </div>
  );
}

function Leaderboard({ leaderboard }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
      {leaderboard.slice(0, 10).map((p, i) => (
        <div
          key={p.nickname}
          className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3"
          style={{ opacity: 1 - i * 0.07 }}
        >
          <span className="text-2xl w-8 text-center">{medals[i] ?? `${i + 1}.`}</span>
          <span className="flex-1 font-bold text-lg">{p.nickname}</span>
          <span className="font-black text-yellow-300 text-xl">{p.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function HostGame() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('loading');
  const [roomCode, setRoomCode] = useState('');
  const [quizInfo, setQuizInfo] = useState(null);
  const [players, setPlayers] = useState([]);
  const [question, setQuestion] = useState(null);
  const [answerCount, setAnswerCount] = useState({ answered: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);

  useEffect(() => {
    socket.connect();
    socket.emit('host:create-game', { quizId });

    socket.on('game:created', ({ roomCode, quiz }) => {
      setRoomCode(roomCode);
      setQuizInfo(quiz);
      setPhase('lobby');
    });

    socket.on('game:player-list', ({ players }) => setPlayers(players));

    socket.on('game:question', (q) => {
      setQuestion(q);
      setAnswerCount({ answered: 0, total: 0 });
      setResults(null);
      setPhase('question');
    });

    socket.on('game:answer-count', (count) => setAnswerCount(count));

    socket.on('game:question-results', (data) => {
      setResults(data);
      setPhase('results');
    });

    socket.on('game:finished', ({ leaderboard }) => {
      setFinalLeaderboard(leaderboard);
      setPhase('finished');
    });

    socket.on('game:error', ({ message }) => {
      alert(message);
      navigate('/quizzes');
    });

    return () => {
      socket.off('game:created');
      socket.off('game:player-list');
      socket.off('game:question');
      socket.off('game:answer-count');
      socket.off('game:question-results');
      socket.off('game:finished');
      socket.off('game:error');
      socket.disconnect();
    };
  }, [quizId]);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-purple-200">Creando sala...</p>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-center">
          <p className="text-purple-200 font-semibold mb-2">Código de sala</p>
          <div className="text-7xl font-black tracking-widest bg-white text-kahoot-purple px-8 py-4 rounded-2xl shadow-xl">
            {roomCode}
          </div>
          <p className="text-purple-200 mt-2 text-sm">
            Los jugadores entran en <strong className="text-white">fedehoot-production.up.railway.app/join</strong>
          </p>
        </div>

        <div className="w-full max-w-md">
          <p className="text-purple-200 text-sm mb-2 font-semibold">
            Jugadores ({players.length})
          </p>
          {players.length === 0 ? (
            <p className="text-center py-8 text-purple-300">Esperando jugadores...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <span key={p.nickname} className="bg-white/20 rounded-full px-4 py-2 font-semibold">
                  {p.nickname}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-purple-200 text-sm mb-3">{quizInfo?.title} · {quizInfo?.questionCount} preguntas</p>
          <button
            onClick={() => socket.emit('host:start-game')}
            disabled={players.length === 0}
            className="bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed font-black text-2xl px-12 py-5 rounded-2xl transition-colors shadow-xl"
          >
            ¡Empezar!
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'question') {
    const type = question.type ?? 'single';
    return (
      <div className="min-h-screen flex flex-col p-6 gap-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-purple-200 font-semibold">
              {question.questionNumber}/{question.totalQuestions}
            </span>
            {type !== 'single' && (
              <span className="ml-3 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">
                {TYPE_LABELS[type]}
              </span>
            )}
          </div>
          <Countdown seconds={question.timeLimit} />
          <span className="text-purple-200 font-semibold">
            {answerCount.answered}/{answerCount.total || players.length} respondieron
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-white text-gray-900 rounded-2xl p-6 text-center shadow-xl mb-8">
            <p className="text-2xl font-bold">{question.text}</p>
          </div>

          {type === 'order' ? (
            <div className="flex flex-col gap-3 max-w-lg mx-auto w-full">
              <p className="text-purple-200 text-sm text-center">Los jugadores ordenarán estos elementos</p>
              {question.answers.map((a, i) => (
                <div
                  key={a.id}
                  className="rounded-2xl p-4 flex items-center gap-3 text-white font-bold text-lg shadow-lg bg-white/15"
                >
                  <span className="text-white/40 font-black">·</span>
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {question.answers.map((a, i) => (
                <div
                  key={a.id}
                  className="rounded-2xl p-5 flex items-center gap-3 text-white font-bold text-lg shadow-lg"
                  style={{ backgroundColor: ANSWER_COLORS[i] }}
                >
                  <span className="text-2xl">{ANSWER_LABELS[i]}</span>
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const isLast = question.questionNumber === question.totalQuestions;
    const type = results?.type ?? question?.type ?? 'single';

    return (
      <div className="min-h-screen flex flex-col p-6 gap-6">
        <div className="text-center mb-2">
          <p className="text-purple-200 font-semibold mb-3">Respuesta correcta</p>

          {type === 'order' ? (
            <div className="max-w-md mx-auto">
              {(results?.correctOrderedIds ?? []).map((id, i) => {
                const answer = question.answers.find(a => a.id === id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-4 bg-green-500 rounded-xl p-4 mb-2 font-bold text-lg"
                  >
                    <span className="font-black text-2xl w-8 text-center">{i + 1}</span>
                    <span>{answer?.text}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            question.answers.map((a, i) => {
              const isCorrect = results?.correctAnswerIds?.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`rounded-xl p-4 mb-2 flex items-center gap-3 font-bold text-lg transition-opacity ${isCorrect ? '' : 'opacity-30'}`}
                  style={{ backgroundColor: ANSWER_COLORS[i] }}
                >
                  <span>{ANSWER_LABELS[i]}</span>
                  <span>{a.text}</span>
                  {isCorrect && <span className="ml-auto">✓</span>}
                </div>
              );
            })
          )}
        </div>

        <div className="flex-1">
          <p className="text-purple-200 font-semibold mb-3 text-center">Tabla de posiciones</p>
          <Leaderboard leaderboard={results?.leaderboard ?? []} />
        </div>

        <div className="text-center">
          <button
            onClick={() => socket.emit('host:next-question')}
            className="bg-yellow-400 text-gray-900 font-black text-xl px-10 py-4 rounded-2xl hover:bg-yellow-300 transition-colors shadow-xl"
          >
            {isLast ? 'Ver podio final' : 'Siguiente pregunta →'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const top = finalLeaderboard.slice(0, 3);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
        <h1 className="text-5xl font-black">¡Fin del juego!</h1>

        <div className="flex items-end gap-4 mb-4">
          {[top[1], top[0], top[2]].map((p, podiumIndex) => {
            if (!p) return <div key={podiumIndex} className="w-24" />;
            const heights = ['h-28', 'h-36', 'h-20'];
            const medals = ['🥈', '🥇', '🥉'];
            return (
              <div key={p.nickname} className="flex flex-col items-center gap-2">
                <span className="text-4xl">{medals[podiumIndex]}</span>
                <span className="font-bold text-sm text-center max-w-[80px] break-words">{p.nickname}</span>
                <div
                  className={`w-24 ${heights[podiumIndex]} bg-white/20 rounded-t-xl flex items-center justify-center font-black text-yellow-300`}
                >
                  {p.score.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        <Leaderboard leaderboard={finalLeaderboard} />

        <button
          onClick={() => navigate('/quizzes')}
          className="bg-white text-kahoot-purple font-bold py-3 px-8 rounded-2xl hover:bg-purple-100 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return null;
}
