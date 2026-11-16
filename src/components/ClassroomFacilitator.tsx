import { localizeScenario } from '../i18n/content';
import { ui, localizeMessage } from '../i18n/ui';
import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Users, Play, Square, ArrowRight, ShieldCheck, 
  HelpCircle, Monitor, RefreshCw, X, MessageSquare, 
  Sparkles, AlertCircle, BarChart3, Trash2
} from 'lucide-react';
import { Scenario, RoomState, Variant } from '../types';
import { BalanceIndicators } from './BalanceIndicators';
import { Language, translations } from '../i18n';

interface ClassroomFacilitatorProps {
  scenario: Scenario;
  onExit: () => void;
  lang: Language;
}

export const ClassroomFacilitator: React.FC<ClassroomFacilitatorProps> = ({
  scenario: sourceScenario,
  onExit,
  lang
}) => {
  const scenario = localizeScenario(sourceScenario, lang);
  const t = translations[lang];

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const [selectedVariantForAdvance, setSelectedVariantForAdvance] = useState<Variant | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(ui(lang, 'm4'));

  // Connect to WebSocket server
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // In local dev without backend running on 5173, fallback to port 3000
    const wsUrl = process.env.NODE_ENV === 'development'
      ? `${protocol}//${window.location.hostname}:3000`
      : `${protocol}//${host}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (e) {
      setStatusMessage(ui(lang, 'm5'));
      return;
    }

    socket.onopen = () => {
      setStatusMessage(ui(lang, 'm6'));
      socket.send(JSON.stringify({
        type: 'CREATE_ROOM',
        scenarioId: scenario.id,
        startNodeId: scenario.pochatkovyi_vuzol
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ROOM_CREATED' || data.type === 'ROOM_UPDATE') {
          setRoom(data.room);
          setStatusMessage('');
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    socket.onerror = (e) => {
      console.warn('WS error', e);
      setStatusMessage(ui(lang, 'm7'));
    };

    setWs(socket);

    return () => {
      if (socket) socket.close();
    };
  }, [scenario.id, scenario.pochatkovyi_vuzol]);

  // Generate QR code when room code is assigned
  useEffect(() => {
    if (room?.code) {
      const joinUrl = `${window.location.origin}/?room=${room.code}`;
      QRCode.toDataURL(joinUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#0c1424', light: '#ffffff' }
      }).then(url => setQrDataUrl(url)).catch(() => {});
    }
  }, [room?.code]);

  const toggleVoting = () => {
    if (!ws || !room) return;
    ws.send(JSON.stringify({
      type: 'TOGGLE_VOTING',
      roomCode: room.code
    }));
  };

  const advanceToNext = (varItem: Variant) => {
    if (!ws || !room) return;
    ws.send(JSON.stringify({
      type: 'NEXT_STAGE',
      roomCode: room.code,
      variantId: varItem.id,
      nextNodeId: varItem.nastupnyi_vuzol
    }));
    setSelectedVariantForAdvance(null);
  };

  const closeRoomSession = () => {
    if (!ws || !room) return;
    ws.send(JSON.stringify({
      type: 'CLOSE_SESSION',
      roomCode: room.code
    }));
    onExit();
  };

  const currentNode = scenario.vuzly.find(v => v.id === room?.currentNodeId);

  // If server is not running, provide Mock offline facilitator mode so that demo works 100% anytime!
  const isMock = !ws || ws.readyState !== WebSocket.OPEN;

  const handleStartMockRoom = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const mockRoom: RoomState = {
      code,
      scenarioId: scenario.id,
      currentNodeId: scenario.pochatkovyi_vuzol,
      votingActive: true,
      votes: { 'A': 14, 'B': 18, 'C': 4 },
      totalVotes: 36,
      participantsCount: 36,
      history: [],
      discussionIndex: 0.78,
      createdAt: Date.now()
    };
    setRoom(mockRoom);
    setStatusMessage('');
  };

  return (
    <div className={`transition-all duration-300 ${isProjectorMode ? 'bg-black text-white p-6 sm:p-12' : 'max-w-6xl mx-auto px-4 sm:px-6 py-8'}`}>
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-lg bg-navy-850 hover:bg-navy-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              {t.classroom.facilitatorTitle}: {scenario.nazva}
            </h1>
            <p className="text-xs text-slate-400">
              {t.classroom.anonymousNotice}
            </p>
          </div>
        </div>

        {/* Projector Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsProjectorMode(!isProjectorMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex flex-wrap items-center gap-2 transition-colors border ${
              isProjectorMode
                ? 'bg-amber-500 text-navy-950 border-amber-400 font-bold'
                : 'bg-navy-800 hover:bg-navy-700 text-slate-300 border-navy-700'
            }`}
          >
            <Monitor className="w-4 h-4" />
            {t.classroom.projectorMode}
          </button>

          <button
            onClick={closeRoomSession}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t.classroom.closeSessionBtn}
          </button>
        </div>
      </div>

      {/* Offline server warning fallback */}
      {statusMessage && !room && (
        <div className="p-6 rounded-xl bg-navy-900 border border-amber-500/30 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <div className="text-sm text-slate-200">{localizeMessage(statusMessage, lang)}</div>
          <button
            onClick={handleStartMockRoom}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            {ui(lang, 'm8')}{' '}</button>
        </div>
      )}

      {/* Main Facilitator Dashboard */}
      {room && currentNode && (
        <div className="space-y-6">
          {/* Room Header Strip: Code, QR, Participants, Voting State */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-750 shadow-xl">
            {/* Room Code */}
            <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t.classroom.roomCodeLabel}
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-widest">
                {room.code}
              </span>
            </div>

            {/* Participants Count */}
            <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 text-center flex flex-col justify-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t.classroom.participantsLabel}
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-white flex items-center justify-center gap-2">
                <Users className="w-6 h-6 text-indigo-400" />
                {room.participantsCount || 0}
              </span>
            </div>

            {/* Voting Control */}
            <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 flex flex-col justify-center gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">{ui(lang, 'm9')}{' '}</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  room.votingActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {room.votingActive ? ui(lang, 'm10') : ui(lang, 'm11')}
                </span>
              </div>
              <button
                onClick={toggleVoting}
                className={`w-full py-2 px-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 ${
                  room.votingActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {room.votingActive ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    {t.classroom.stopVoting}
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {t.classroom.startVoting}
                  </>
                )}
              </button>
            </div>

            {/* QR Code for smartphone join */}
            <div className="p-2.5 rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-center">
              {qrDataUrl ? (
                <div className="text-center">
                  <img src={qrDataUrl} alt="Room QR" className="w-20 h-20 mx-auto rounded bg-white p-1" />
                  <span className="text-[10px] text-slate-400 mt-1 block">{ui(lang, 'm12')}{' '}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">{ui(lang, 'm13')}{' '}</span>
              )}
            </div>
          </div>

          {/* Current Stage Question & Projector Display */}
          <div className="p-6 sm:p-8 rounded-2xl bg-navy-900 border border-navy-700 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded bg-navy-800 text-emerald-400 border border-emerald-500/30">
                {ui(lang, 'm14')}{' '}{currentNode.id}
              </span>
              <span className="text-xs text-slate-400">
                {t.classroom.votesCount} <strong className="text-white text-sm">{room.totalVotes}</strong>
              </span>
            </div>

            {currentNode.tekst && (
              <div className={`p-4 rounded-xl bg-navy-950 border border-navy-800 leading-relaxed ${isProjectorMode ? 'text-lg text-slate-200' : 'text-sm text-slate-300'}`}>
                {currentNode.tekst}
              </div>
            )}

            <h2 className={`font-extrabold text-white leading-tight ${isProjectorMode ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
              {currentNode.zapytannia}
            </h2>

            {/* Voting Distribution & Options */}
            <div className="space-y-4">
              {currentNode.varianty.map((v) => {
                const count = room.votes[v.id] || 0;
                const percent = room.totalVotes > 0 ? Math.round((count / room.totalVotes) * 100) : 0;
                const isSelectedForNext = selectedVariantForAdvance?.id === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVariantForAdvance(v)}
                    className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer ${
                      isSelectedForNext
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-lg'
                        : 'border-navy-800 bg-navy-950/70 hover:bg-navy-850'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 gap-3 mb-2">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-navy-800 border border-navy-700 text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {v.id}
                        </span>
                        <div className={`leading-relaxed text-slate-200 ${isProjectorMode ? 'text-base sm:text-lg' : 'text-sm'}`}>
                          {v.tekst}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-base sm:text-lg font-bold text-white">
                          {percent}%
                        </span>
                        <span className="text-xs text-slate-400 block font-mono">
                          {count} {ui(lang, 'm15')}{' '}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-navy-900 h-2.5 rounded-full overflow-hidden border border-navy-750">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Discussion Index Banner */}
            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {t.classroom.discussionIndex}
                  </div>
                  <div className="text-xs text-slate-400">
                    {ui(lang, 'm16')}{' '}</div>
                </div>
              </div>
              <div className="text-2xl font-mono font-extrabold text-amber-300">
                {room.discussionIndex || 0} / 1.0
              </div>
            </div>

            {/* Discussion Facilitation Questions */}
            {scenario.pytannia_dlia_obhovorennia && scenario.pytannia_dlia_obhovorennia.length > 0 && (
              <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-800 space-y-2">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex flex-wrap items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {t.classroom.discussionQuestions}
                </div>
                <ul className="space-y-1.5 pl-5 list-disc text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {scenario.pytannia_dlia_obhovorennia.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advance to Selected Path */}
            <div className="pt-4 border-t border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                {selectedVariantForAdvance ? (
                  <span>{ui(lang, 'm17')}{' '}<strong>{selectedVariantForAdvance.id}</strong> {ui(lang, 'm18')}{' '}</span>
                ) : (
                  <span>{t.classroom.selectPathPrompt}</span>
                )}
              </div>
              <button
                onClick={() => selectedVariantForAdvance && advanceToNext(selectedVariantForAdvance)}
                disabled={!selectedVariantForAdvance}
                className={`py-3 px-6 rounded-xl font-bold text-xs sm:text-sm flex flex-wrap items-center gap-2 transition-all ${
                  selectedVariantForAdvance
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer'
                    : 'bg-navy-800 text-slate-500 border border-navy-700 cursor-not-allowed'
                }`}
              >
                <span>{ui(lang, 'm19')}{' '}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
