import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, AlertCircle, ArrowLeft, Send } from 'lucide-react';
import { RoomState, Scenario } from '../types';
import { allScenarios } from '../data/scenarios';
import { Language, translations } from '../i18n';

interface ClassroomStudentProps {
  initialCode?: string;
  onExit: () => void;
  lang: Language;
}

export const ClassroomStudent: React.FC<ClassroomStudentProps> = ({
  initialCode = '',
  onExit,
  lang
}) => {
  const t = translations[lang];

  const [inputCode, setInputCode] = useState(initialCode);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [votedVariantId, setVotedVariantId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Check URL query param for auto-join (?room=123456)
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !inputCode) {
      setInputCode(roomParam);
      handleJoin(roomParam);
    }
  }, []);

  const handleJoin = (codeToJoin: string) => {
    const cleanCode = codeToJoin.trim();
    if (!cleanCode) return;

    setIsJoining(true);
    setErrorMsg('');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = process.env.NODE_ENV === 'development'
      ? `${protocol}//${window.location.hostname}:3000`
      : `${protocol}//${host}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (e) {
      setErrorMsg('Не вдалося зʼєднатися з локальним сервером кімнат.');
      setIsJoining(false);
      return;
    }

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode: cleanCode
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'JOINED_SUCCESS' || data.type === 'ROOM_UPDATE') {
          setRoom(data.room);
          setIsJoining(false);
          // If stage changed, reset votedVariantId
          if (room && room.currentNodeId !== data.room.currentNodeId) {
            setVotedVariantId(null);
          }
        } else if (data.type === 'VOTE_ACCEPTED') {
          setVotedVariantId(data.variantId);
        } else if (data.type === 'SESSION_CLOSED') {
          setErrorMsg('Викладач завершив сесію.');
          setRoom(null);
        } else if (data.type === 'ERROR') {
          setErrorMsg(data.message || 'Помилка входу');
          setIsJoining(false);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    socket.onerror = () => {
      setErrorMsg('Сервер кімнати недоступний або код вказано неправильно.');
      setIsJoining(false);
    };

    setWs(socket);
  };

  const handleVote = (varId: string) => {
    if (!ws || !room || votedVariantId || !room.votingActive) return;

    ws.send(JSON.stringify({
      type: 'SUBMIT_VOTE',
      roomCode: room.code,
      variantId: varId
    }));
  };

  // Find scenario and current node from local data
  const currentScenario = allScenarios.find(s => s.id === room?.scenarioId);
  const currentNode = currentScenario?.vuzly.find(v => v.id === room?.currentNodeId);

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Top back button */}
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.briefing.backToCatalog}
      </button>

      {/* Screen 1: Enter Room Code */}
      {!room ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">
              {t.classroom.studentTitle}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {t.classroom.joinPrompt}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl py-3 px-4 text-center font-mono text-2xl tracking-widest text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />

            <button
              onClick={() => handleJoin(inputCode)}
              disabled={isJoining || inputCode.length < 6}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                inputCode.length === 6 && !isJoining
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer'
                  : 'bg-navy-800 text-slate-500 border border-navy-700 cursor-not-allowed'
              }`}
            >
              <span>{isJoining ? 'Підключення...' : t.classroom.joinBtn}</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-3 border-t border-navy-800 text-[11px] text-slate-400">
            {t.classroom.anonymousNotice}
          </div>
        </div>
      ) : (
        /* Screen 2: Student Vote Interface */
        <div className="p-5 sm:p-6 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl space-y-5">
          {/* Room Header */}
          <div className="flex items-center justify-between pb-3 border-b border-navy-800 text-xs">
            <span className="font-mono text-slate-400">
              Кімната: <strong className="text-emerald-400">{room.code}</strong>
            </span>
            <span className="font-mono px-2 py-0.5 rounded bg-navy-800 text-slate-300">
              Етап {room.currentNodeId}
            </span>
          </div>

          {/* Question */}
          {currentNode && (
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                {currentNode.zapytannia}
              </h2>
              {currentNode.tekst && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentNode.tekst}
                </p>
              )}
            </div>
          )}

          {/* Voting Options */}
          {currentNode && (
            <div className="space-y-2.5">
              {currentNode.varianty.map((v) => {
                const isVoted = votedVariantId === v.id;
                const isDisabled = !room.votingActive || !!votedVariantId;

                return (
                  <button
                    key={v.id}
                    onClick={() => handleVote(v.id)}
                    disabled={isDisabled}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isVoted
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                        : isDisabled
                        ? 'bg-navy-950/50 border-navy-800 text-slate-400 opacity-70 cursor-not-allowed'
                        : 'bg-navy-950 border-navy-800 text-slate-200 hover:bg-navy-850 hover:border-emerald-500/50 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                      isVoted
                        ? 'bg-emerald-500 text-navy-950'
                        : 'bg-navy-800 text-slate-300 border border-navy-700'
                    }`}>
                      {v.id}
                    </span>
                    <span className="text-xs sm:text-sm leading-relaxed">
                      {v.tekst}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Post-Vote Notice */}
          {votedVariantId && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{t.classroom.votedThanks}</span>
            </div>
          )}

          {!room.votingActive && !votedVariantId && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center">
              Голосування на цьому етапі закрито викладачем.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
