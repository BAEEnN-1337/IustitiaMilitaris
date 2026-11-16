import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { allScenarios, normMap } from '../data/scenarios';
import { localizeScenario } from '../i18n/content';
import labels from '../i18n/group.json';
import type { Language } from '../i18n';
import type { Scenario } from '../types';
import { BalanceIndicators } from './BalanceIndicators';
import { NormDetailModal } from './NormDetailModal';

type State = {
  code: string;
  scenarioId: string;
  currentNodeId: string;
  phase: string;
  selectedVariantId?: string;
  votes: Record<string, number>;
  totalVotes: number;
  participantsCount: number;
  discussionIndex: number;
  history: {
    nodeId: string;
    selectedVariantId: string;
    votes: Record<string, number>;
    discussionIndex: number;
  }[];
};
export function GroupSession({
  scenario: initialScenario,
  initialCode = '',
  lang,
  onExit,
  host = false
}: {
  scenario?: Scenario;
  initialCode?: string;
  lang: Language;
  onExit: () => void;
  host?: boolean;
}) {
  const t = labels[lang];
  const [room, setRoom] = useState<State | null>(null);
  const [code, setCode] = useState(initialCode);
  const [joining, setJoining] = useState(Boolean(initialCode) || host);
  const [message, setMessage] = useState(initialCode || host ? 'connecting' : '');
  const [voted, setVoted] = useState(false);
  const [qr, setQr] = useState('');
  const [link, setLink] = useState('');
  const [projector, setProjector] = useState(false);
  const [norm, setNorm] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const activeCode = useRef(
    initialCode || window.location.pathname.split('/')[3]
  );
  useEffect(() => {
    if (!joining) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      const ws = new WebSocket(
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      );
      socket.current = ws;
      ws.onopen = () => {
        try {
          const existing = activeCode.current;
          let token = sessionStorage.getItem('clientVoteToken');
          if (!token) {
            token = Array.from(
              crypto.getRandomValues(new Uint8Array(24)),
              (x) => x.toString(16).padStart(2, '0')
            ).join('');
            sessionStorage.setItem('clientVoteToken', token);
          }
          if (host && (!existing || existing === 'new'))
            ws.send(
              JSON.stringify({
                type: 'CREATE_ROOM',
                scenarioId: initialScenario?.id || 'S06'
              })
            );
          else {
            const secret = host
              ? sessionStorage.getItem('room-host-' + existing)
              : undefined;
            if (host && !secret) {
              setMessage('missing');
              return;
            }
            ws.send(
              JSON.stringify({
                type: 'JOIN_ROOM',
                roomCode: existing || code,
                hostSecret: secret,
                clientVoteToken: token
              })
            );
          }
        } catch {
          setMessage('missing');
        }
      };
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'ROOM_CREATED') {
          activeCode.current = data.room.code;
          sessionStorage.setItem(
            'room-host-' + data.room.code,
            data.hostSecret
          );
          history.replaceState({}, '', `/classroom/host/${data.room.code}`);
        }
        if (data.room) {
          setRoom(data.room);
          setMessage('');
          setVoted(Boolean(data.hasVoted));
        }
        if (data.type === 'ERROR') setMessage('missing');
        if (data.type === 'SESSION_CLOSED') {
          setRoom(null);
          setMessage('ended');
          stopped = true;
          ws.close();
        }
      };
      ws.onerror = () => setMessage('connecting');
      ws.onclose = () => {
        if (!stopped) {
          setMessage('connecting');
          retry = setTimeout(connect, 1500);
        }
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.current?.close();
    };
  }, [joining, host]);
  useEffect(() => {
    if (!room?.code || !host) return;
    let cancelled = false;
    fetch('/api/server-info')
      .then((r) => r.json())
      .then(async (info) => {
        const url = `${info.preferredOrigin}/classroom/join/${room.code}`;
        const image = await QRCode.toDataURL(url);
        if (!cancelled) {
          setLink(url);
          setQr(image);
        }
      })
      .catch(() => setLink(`${location.origin}/classroom/join/${room.code}`));
    return () => {
      cancelled = true;
    };
  }, [room?.code, host]);
  const source = allScenarios.find((s) => s.id === room?.scenarioId);
  const scenario = source ? localizeScenario(source, lang) : undefined;
  const node = scenario?.vuzly.find((n) => n.id === room?.currentNodeId);
  const variant = node?.varianty.find((v) => v.id === room?.selectedVariantId);
  const send = (type: string, variantId?: string) =>
    socket.current?.readyState === WebSocket.OPEN &&
    socket.current.send(JSON.stringify({ type, variantId }));
  return (
    <section
      className={`mx-auto p-4 sm:p-8 space-y-5 ${projector ? 'max-w-none text-lg' : 'max-w-5xl'}`}
    >
      <button onClick={onExit}>{t.back}</button>
      {message && <p role="status">{t[message as keyof typeof t]}</p>}
      {!joining && (
        <div className="space-y-4">
          <label>
            {t.code}
            <input
              className="bg-navy-800 p-3 mx-2"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <button
            disabled={!/^\d{6}$/.test(code)}
            onClick={() => {
              activeCode.current = code;
              history.pushState({}, '', `/classroom/join/${code}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
              setJoining(true);
            }}
          >
            {t.join}
          </button>
          <h2>{t.host}</h2>
          {allScenarios.map((s) => (
            <p key={s.id}>
              <a href={`/classroom/host/new?scenario=${s.id}`}>
                {localizeScenario(s, lang).nazva}
              </a>
            </p>
          ))}
        </div>
      )}
      {room && scenario && node && (
        <>
          <header className="flex flex-wrap gap-4 items-center">
            <h1>{scenario.nazva}</h1>
            <p>
              {t.code}: {room.code}
            </p>
            <p>
              {t.participants}: {room.participantsCount}
            </p>
            {host && (
              <>
                <button onClick={() => setProjector(!projector)}>
                  {t.projector}
                </button>
                <button onClick={() => send('CLOSE_SESSION')}>{t.close}</button>
              </>
            )}
          </header>
          {host && link && (
            <div className="flex flex-wrap gap-4 items-center">
              {qr && <img src={qr} alt={link} width={160} height={160} />}
              <a className="break-all" href={link}>
                {link}
              </a>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  } catch {
                    const field = document.createElement('textarea');
                    field.value = link; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.appendChild(field); field.select();
                    try { setCopied(document.execCommand('copy')); } finally { field.remove(); }
                  }
                }}
              >
                {copied ? t.copied : t.copy}
              </button>
            </div>
          )}
          {room.phase === 'finished' ? (
            <>
              <h2>{t.summary}</h2>
              <p>{t.mostDivided}: {room.history.filter(item => item.discussionIndex === Math.max(...room.history.map(step => step.discussionIndex))).map(item => item.nodeId).join(', ')}</p>
              {room.history.map((item, i) => (
                <article key={i} className="bg-navy-900 p-4 rounded">
                  <p>
                    {item.nodeId}:{' '}
                    {
                      scenario.vuzly
                        .find((n) => n.id === item.nodeId)
                        ?.varianty.find((v) => v.id === item.selectedVariantId)
                        ?.tekst
                    }
                  </p>
                  <p>
                    {t.index}: {item.discussionIndex}
                  </p>
                </article>
              ))}
            </>
          ) : (
            <>
              <h2 key={node.id} className="animate-fadeIn">
                {node.zapytannia}
              </h2>
              <p>{node.tekst || scenario.sytuatsiia}</p>
              {room.phase === 'briefing' &&
                (host ? (
                  <button onClick={() => send('OPEN_VOTING')}>{t.open}</button>
                ) : (
                  <p>{t.waiting}</p>
                ))}
              {room.phase === 'voting' && (
                <>
                  <p>
                    {t.votes}: {room.totalVotes}
                  </p>
                  {host ? (
                    <button onClick={() => send('SHOW_RESULTS')}>
                      {t.results}
                    </button>
                  ) : voted ? (
                    <p>{t.voted}</p>
                  ) : (
                    node.varianty.map((v) => (
                      <button
                        className="block w-full text-left p-4 bg-navy-900 border border-navy-700 rounded my-2"
                        key={v.id}
                        onClick={() => send('SUBMIT_VOTE', v.id)}
                      >
                        {v.id}: {v.tekst}
                      </button>
                    ))
                  )}
                </>
              )}
              {['results', 'feedback'].includes(room.phase) && (
                <>
                  <p>
                    {t.index}: {room.discussionIndex}
                  </p>
                  {node.varianty.map((v) => (
                    <article
                      key={v.id}
                      className="p-4 bg-navy-900 rounded my-2"
                    >
                      <p>
                        {v.id}: {v.tekst}
                      </p>
                      <p>
                        {room.votes[v.id] || 0} / {room.totalVotes} (
                        {room.totalVotes
                          ? Math.round(
                              ((room.votes[v.id] || 0) / room.totalVotes) * 100
                            )
                          : 0}
                        %)
                      </p>
                      <div className="h-2 bg-navy-800">
                        <div
                          className="h-full bg-emerald-500 transition-[width] duration-200"
                          style={{
                            width: `${room.totalVotes ? ((room.votes[v.id] || 0) / room.totalVotes) * 100 : 0}%`
                          }}
                        />
                      </div>
                      {host && room.phase === 'results' && (
                        <button onClick={() => send('DISCUSS', v.id)}>
                          {t.discuss}
                        </button>
                      )}
                    </article>
                  ))}
                  <ul>
                    {scenario.pytannia_dlia_obhovorennia.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </>
              )}
              {room.phase === 'feedback' && variant && (
                <article className="animate-fadeIn space-y-4">
                  <p>
                    {t.immediate}: {variant.naslidky.odrazu}
                  </p>
                  <p>
                    {t.later}: {variant.naslidky.vidkladeni}
                  </p>
                  <BalanceIndicators
                    scores={variant.baly}
                    explanation={variant.chomu_taki_baly}
                    lang={lang}
                  />
                  <p>{variant.zvorotnyi_zviazok}</p>
                  {variant.normy.map((id) => (
                    <button
                      className="p-2"
                      key={id}
                      onClick={() => setNorm(id)}
                    >
                      {id}
                    </button>
                  ))}
                  {host && (
                    <button onClick={() => send('NEXT_STAGE')}>{t.next}</button>
                  )}
                </article>
              )}
            </>
          )}
        </>
      )}
      <NormDetailModal
        norm={norm ? normMap.get(norm) || null : null}
        yakZastosovuietsia={
          scenario?.normy.find((n) => n.id === norm)?.yak_zastosovuietsia
        }
        onClose={() => setNorm(null)}
      />
    </section>
  );
}
