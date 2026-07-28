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
        className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-4 border-white"
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

  // single
  const [selectedId, setSelectedId] = useState(null);
  // multiple
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [multiSubmitted, setMultiSubmitted] = useState(false);
  // order
  const [rankedIds, setRankedIds] = useState([]);
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const [myResult, setMyResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);

  const { nickname, roomCode } = state ?? {};

  // Auto-submit when all items are ranked for order type
  useEffect(() => {
    if (
      !orderSubmitted &&
      question?.type === 'order' &&
      rankedIds.length > 0 &&
      rankedIds.length === question?.answers?.length
    ) {
      setOrderSubmitted(true);
      socket.emit('player:answer', { payload: rankedIds });
      setPhase('answered');
    }
  }, [rankedIds.length]);

  useEffect(() => {
    if (!nickname || !roomCode) {
      navigate('/join');
      return;
    }

    socket.on('game:player-list', ({ players }) => setPlayers(players));
    socket.on('game:question', (q) => {
      setQuestion(q);
      setSelectedId(null);
      setSelectedIds(new Set());
      setMultiSubmitted(false);
      setRankedIds([]);
      setOrderSubmitted(false);
      setMyResult(null);
      setPhase('question');
    });
    socket.on('player:answer-received', () => setPhase('answered'));
    socket.on('player:your-result', (result) => setMyResult(result));
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

    socket.emit('player:request-state');

    return () => {
      socket.off('game:player-list');
      socket.off('game:question');
      socket.off('player:answer-received');
      socket.off('player:your-result');
      socket.off('game:question-results');
      socket.off('game:finished');
      socket.off('game:error');
    };
  }, []);

  function leave() {
    socket.disconnect();
    navigate('/');
  }

  function submitSingle(answerId) {
    if (selectedId) return;
    setSelectedId(answerId);
    socket.emit('player:answer', { payload: answerId });
  }

  function toggleMultiple(id) {
    if (multiSubmitted) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function confirmMultiple() {
    if (multiSubmitted || selectedIds.size === 0) return;
    setMultiSubmitted(true);
    socket.emit('player:answer', { payload: [...selectedIds] });
  }

  function handleOrderTap(id) {
    if (orderSubmitted) return;
    setRankedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      return [...prev, id];
    });
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
        <button onClick={leave} className="text-xs text-purple-400 hover:text-purple-200 mt-4">
          Salir
        </button>
      </div>
    );
  }

  if (phase === 'question') {
    const type = question.type ?? 'single';

    const header = (
      <div className="flex items-center justify-between">
        <span className="text-purple-200 text-sm">{question.questionNumber}/{question.totalQuestions}</span>
        <Countdown seconds={question.timeLimit} />
        <span className="text-purple-200 text-sm invisible">x</span>
      </div>
    );

    const questionBox = (
      <div>
        {question.imageUrl && (
          <div className="rounded-2xl overflow-hidden max-h-48 bg-black/20 mb-2 shadow-xl">
            <img src={question.imageUrl} alt="" className="w-full object-contain max-h-48 mx-auto" />
          </div>
        )}
        <div className="bg-white text-gray-900 rounded-2xl p-4 text-center shadow-xl">
          <p className="text-lg font-bold">{question.text}</p>
        </div>
      </div>
    );

    if (type === 'single') {
      return (
        <div className="min-h-screen flex flex-col p-4 gap-4">
          {header}
          <div className="flex-1 flex flex-col justify-center gap-3">
            {questionBox}
            <div className="grid grid-cols-2 gap-3">
              {question.answers.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => submitSingle(a.id)}
                  disabled={Boolean(selectedId)}
                  className="rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-white font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-transform min-h-[100px]"
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

    if (type === 'multiple') {
      return (
        <div className="min-h-screen flex flex-col p-4 gap-4">
          {header}
          <div className="flex-1 flex flex-col justify-center gap-3">
            {questionBox}
            <p className="text-center text-sm text-purple-200">
              Seleccioná <strong className="text-white">todas las correctas</strong> y confirmá
            </p>
            <div className="grid grid-cols-2 gap-3">
              {question.answers.map((a, i) => {
                const isSelected = selectedIds.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleMultiple(a.id)}
                    disabled={multiSubmitted}
                    className={`rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-white font-bold shadow-lg active:scale-95 transition-all min-h-[100px] ${isSelected ? 'ring-4 ring-white' : 'opacity-70'}`}
                    style={{ backgroundColor: ANSWER_COLORS[i] }}
                  >
                    <span className="text-4xl">{isSelected ? '✓' : ANSWER_LABELS[i]}</span>
                    <span className="text-sm font-normal text-center">{a.text}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={confirmMultiple}
              disabled={multiSubmitted || selectedIds.size === 0}
              className="bg-yellow-400 text-gray-900 font-black text-xl py-4 rounded-2xl hover:bg-yellow-300 disabled:opacity-50 transition-colors shadow-xl"
            >
              {multiSubmitted ? 'Enviado ✓' : 'Confirmar selección'}
            </button>
          </div>
        </div>
      );
    }

    if (type === 'order') {
      const allPlaced = rankedIds.length === question.answers.length;
      return (
        <div className="min-h-screen flex flex-col p-4 gap-4">
          {header}
          <div className="flex-1 flex flex-col justify-center gap-3">
            {questionBox}
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-sm text-purple-200">
                Tocá los elementos <strong className="text-white">en el orden correcto</strong>, del primero al último
              </p>
              <p className="text-xs text-purple-300 mt-1">
                {rankedIds.length === 0
                  ? 'Empezá tocando el que va primero'
                  : allPlaced
                  ? '¡Listo! Enviando...'
                  : `Posición ${rankedIds.length + 1} de ${question.answers.length}`}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {question.answers.map((a) => {
                const rank = rankedIds.indexOf(a.id) + 1;
                return (
                  <button
                    key={a.id}
                    onClick={() => handleOrderTap(a.id)}
                    disabled={orderSubmitted}
                    className={`flex items-center gap-4 rounded-2xl p-4 text-left font-bold transition-all active:scale-95 ${
                      rank > 0 ? 'bg-yellow-400 text-gray-900' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2 flex-shrink-0 ${
                      rank > 0 ? 'border-gray-900/30 bg-gray-900/10' : 'border-white/30'
                    }`}>
                      {rank || '·'}
                    </div>
                    <span className="text-base">{a.text}</span>
                    {rank > 0 && (
                      <span className="ml-auto text-xs opacity-60">Tocá para quitar</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  if (phase === 'answered') {
    const type = question?.type ?? 'single';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center p-6">
        <div className="text-6xl animate-bounce">⏳</div>
        <p className="text-2xl font-bold">Respuesta enviada</p>
        <p className="text-purple-200">Esperando a los demás...</p>
        {type === 'single' && selectedId && question && (
          <div
            className="rounded-2xl px-6 py-3 font-bold text-lg"
            style={{ backgroundColor: ANSWER_COLORS[question.answers.findIndex(a => a.id === selectedId)] }}
          >
            {question.answers.find(a => a.id === selectedId)?.text}
          </div>
        )}
        {type === 'multiple' && selectedIds.size > 0 && question && (
          <div className="flex flex-wrap gap-2 justify-center max-w-xs">
            {question.answers.filter(a => selectedIds.has(a.id)).map((a, idx) => (
              <span
                key={a.id}
                className="rounded-xl px-4 py-2 font-bold text-sm"
                style={{ backgroundColor: ANSWER_COLORS[question.answers.indexOf(a)] }}
              >
                {a.text}
              </span>
            ))}
          </div>
        )}
        {type === 'order' && rankedIds.length > 0 && question && (
          <div className="flex flex-col gap-2 text-left w-full max-w-xs">
            {rankedIds.map((id, i) => {
              const a = question.answers.find(a => a.id === id);
              return (
                <div key={id} className="flex items-center gap-3 bg-yellow-400/20 rounded-xl px-4 py-2">
                  <span className="font-black text-yellow-300">{i + 1}</span>
                  <span className="text-sm font-semibold">{a?.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'results') {
    const myPos = leaderboard.findIndex(p => p.nickname === nickname) + 1;
    const type = question?.type ?? 'single';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        {myResult ? (
          <>
            <div className="text-7xl">
              {type === 'order' && !myResult.isCorrect && myResult.correctPositions > 0
                ? '🟡'
                : myResult.isCorrect ? '✅' : '❌'}
            </div>
            <div>
              <p className="text-3xl font-black">
                {type === 'order' && !myResult.isCorrect
                  ? myResult.correctPositions > 0
                    ? `${myResult.correctPositions}/${myResult.totalPositions} en orden`
                    : 'Sin aciertos'
                  : myResult.isCorrect ? '¡Correcto!' : 'Incorrecto'}
              </p>
              {myResult.pointsEarned > 0 && (
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

        <button onClick={leave} className="bg-white text-kahoot-purple font-bold py-3 px-8 rounded-2xl">
          Inicio
        </button>
      </div>
    );
  }

  return null;
}
