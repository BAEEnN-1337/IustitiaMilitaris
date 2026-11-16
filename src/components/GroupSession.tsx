import { DecisionProfile } from './DecisionProfile';
import themes from '../i18n/themes.json';
import { CidsHelperModal } from './CidsHelperModal';
import { translations } from '../i18n';
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
  showLive: boolean;
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
  const [cidsOpen, setCidsOpen] = useState(false);
  const [room, setRoom] = useState<State | null>(null);
  const [code, setCode] = useState(initialCode);
  const [joining, setJoining] = useState(Boolean(initialCode) || host);
  const [message, setMessage] = useState(
    initialCode || host ? 'connecting' : ''
  );
  const [chosenId, setChosenId] = useState('');
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
          try {
            setChosenId(
              sessionStorage.getItem(
                `room-vote-${data.room.code}-${data.room.currentNodeId}`
              ) || ''
            );
          } catch {}
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
  const send = (type: string, variantId?: string, showLive?: boolean) => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ type, variantId, showLive }));
  };
  const totalVotes = (votes: Record<string, number>) =>
    Object.values(votes).reduce((a, b) => a + b, 0);
  const leader = node?.varianty.reduce(
    (best, v) =>
      (room?.votes[v.id] || 0) > (room?.votes[best.id] || 0) ? v : best,
    node.varianty[0]
  );
  function depth(id: string, visited = new Set<string>()): number {
    if (!scenario || visited.has(id)) return 0;
    const next = new Set(visited).add(id),
      n = scenario.vuzly.find((n) => n.id === id);
    return n
      ? 1 +
          Math.max(
            0,
            ...n.varianty.map((v) =>
              v.nastupnyi_vuzol ? depth(v.nastupnyi_vuzol, next) : 0
            )
          )
      : 0;
  }
  const chart = (
    votes: Record<string, number>,
    items: { id: string; tekst: string }[],
    selectable = false
  ) => (
    <div className="space-y-3" data-testid="vote-chart">
      {items.map((v) => {
        const count = votes[v.id] || 0,
          total = totalVotes(votes),
          percent = total ? Math.round((count / total) * 100) : 0;
        const selected =
          variant?.id === v.id || (!variant && leader?.id === v.id);
        return (
          <article
            className={`surface-muted space-y-3 ${selected ? '!border-emerald-500/40' : ''}`}
            key={v.id}
          >
            <div className="flex justify-between gap-3">
              <p className="text-sm">
                <strong className="text-emerald-300">{v.id}</strong> · {v.tekst}
              </p>
              <span className="badge shrink-0 font-mono">
                {percent}% · {count}
              </span>
            </div>
            <div className="meter">
              <div
                className="meter-fill"
                data-testid={`bar-${v.id}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            {selectable && host && (
              <button
                className={selected ? 'action-primary' : 'action'}
                onClick={() => send('DISCUSS', v.id)}
              >
                {t.discuss} {v.id}
                {v.id === leader?.id ? ` · ${t.leader}` : ''}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
  return (
    <section
      className={`page-shell ${projector ? '!max-w-none sm:!px-12 text-lg' : ''}`}
    >
      <button className="action-ghost" onClick={onExit}>
        ← {t.back}
      </button>
      {message && (
        <p className="notice" role="status">
          {t[message as keyof typeof t]}
        </p>
      )}
      {!joining && (
        <>
          <header>
            <h1 className="text-2xl font-bold text-white">{t.title}</h1>
            <p className="mt-2 text-sm text-slate-400">{t.privacy}</p>
          </header>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start">
            <form
              className="surface space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                activeCode.current = code;
                history.pushState({}, '', `/classroom/join/${code}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
                setJoining(true);
              }}
            >
              <h2 className="text-xl font-bold">{t.participant}</h2>
              <label className="block text-sm">
                {t.code}
                <input
                  className="field mt-2 text-2xl tracking-widest font-mono"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <button
                className="action-primary w-full"
                disabled={!/^\d{6}$/.test(code)}
              >
                {t.join}
              </button>
            </form>
            <div className="surface space-y-6">
              <h2 className="text-xl font-bold">{t.hostTitle}</h2>
              {[true, false].map((team) => (
                <div key={String(team)} className="space-y-3">
                  <h3 className="font-semibold text-slate-300">
                    {team ? t.team : t.examples}
                  </h3>
                  {allScenarios
                    .filter(
                      (s) => ['S06', 'S07', 'S08'].includes(s.id) === team
                    )
                    .map((source) => {
                      const s = localizeScenario(source, lang);
                      return (
                        <article key={s.id} className="surface-muted space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <span className="badge">{s.id}</span>
                            <span className="badge">
                              {themes[lang][s.tema as keyof typeof themes.en] ||
                                s.tema}
                            </span>
                            <span className="badge">
                              {s.tryvalist_khv} {t.minutes} · {s.vuzly.length}{' '}
                              {t.stages}
                            </span>
                          </div>
                          <h4 className="font-bold text-white">{s.nazva}</h4>
                          <a
                            className="action"
                            href={`/classroom/host/new?scenario=${s.id}`}
                          >
                            {t.host} →
                          </a>
                        </article>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {room && scenario && node && (
        <>
          <header className="surface flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="badge font-mono">
                  {t.code}: {room.code}
                </span>
                <span className="badge">
                  {t.participants}: {room.participantsCount}
                </span>
                <span className="badge">
                  {t.step}{' '}
                  {room.phase === 'finished'
                    ? room.history.length
                    : room.history.length + 1}{' '}
                  {t.of}{' '}
                  {room.phase === 'finished'
                    ? room.history.length
                    : room.history.length + depth(node.id)}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {scenario.nazva}
              </h1>
            </div>
            {host && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="action"
                  onClick={() => setProjector(!projector)}
                >
                  {t.projector}
                </button>
                <button
                  className="action-danger"
                  onClick={() => send('CLOSE_SESSION')}
                >
                  {t.close}
                </button>
              </div>
            )}
          </header>
          {host && link && (
            <div className="surface flex flex-wrap items-center gap-5">
              {qr && (
                <img
                  className="rounded-lg border border-navy-700"
                  src={qr}
                  alt={link}
                  width={144}
                  height={144}
                />
              )}
              <div className="space-y-3 flex-1">
                <a
                  className="block text-sm text-cyan-300 break-all"
                  href={link}
                >
                  {link}
                </a>
                <button
                  className="action"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                    } catch {
                      const field = document.createElement('textarea');
                      field.value = link;
                      document.body.appendChild(field);
                      field.select();
                      try {
                        setCopied(document.execCommand('copy'));
                      } finally {
                        field.remove();
                      }
                    }
                  }}
                >
                  {copied ? t.copied : t.copy}
                </button>
              </div>
            </div>
          )}
          {room.phase === 'finished' ? (
            <div className="surface space-y-5 animate-fadeIn">
              <h2 className="text-xl font-bold">{t.summary}</h2>
              <p className="notice">
                {t.mostDivided}:{' '}
                {room.history
                  .filter(
                    (h) =>
                      h.discussionIndex ===
                      Math.max(...room.history.map((h) => h.discussionIndex))
                  )
                  .map((h) => h.nodeId)
                  .join(', ')}
              </p>
              <DecisionProfile
                scenario={scenario}
                path={room.history.map((h) => ({
                  nodeId: h.nodeId,
                  variantId: h.selectedVariantId
                }))}
                lang={lang}
              />
              {room.history.map((h, i) => {
                const n = scenario.vuzly.find((n) => n.id === h.nodeId);
                return (
                  <details className="surface-muted" key={i} open>
                    <summary className="cursor-pointer font-semibold">
                      {h.nodeId} → {h.selectedVariantId} · {t.index}:{' '}
                      {h.discussionIndex}
                    </summary>
                    <div className="mt-4">
                      {chart(h.votes, n?.varianty || [])}
                    </div>
                  </details>
                );
              })}
              <h3 className="font-bold">
                {translations[lang].reflection.applicabilityTitle}
              </h3>
              <p>{scenario.zastosovnist}</p>
              <ul className="list-disc pl-5 space-y-2">
                {scenario.porady.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              {room.phase === 'briefing' ? (
                <article className="surface space-y-5 animate-fadeIn">
                  <h2 className="text-xl font-bold">
                    {translations[lang].briefing.title}
                  </h2>
                  <p className="text-slate-300 leading-relaxed">
                    {scenario.kontekst}
                  </p>
                  <p className="surface-muted leading-relaxed">
                    {scenario.sytuatsiia}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {scenario.diiovi_osoby.map((r) => (
                      <div className="surface-muted" key={r.id}>
                        <h3 className="font-bold text-emerald-300">{r.rol}</h3>
                        <p className="mt-2 text-sm text-slate-300">{r.opys}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {scenario.tsinnosti_v_konflikti.map((c, i) => (
                      <div className="surface-muted" key={i}>
                        <h3 className="font-semibold text-amber-200">
                          {c.tsinnist_a} ↔ {c.tsinnist_b}
                        </h3>
                        <p className="mt-2 text-sm text-slate-300">
                          {c.poiasnennia}
                        </p>
                      </div>
                    ))}
                  </div>
                  {host ? (
                    <button
                      className="action-primary"
                      onClick={() => send('OPEN_VOTING')}
                    >
                      {t.start}
                    </button>
                  ) : (
                    <p className="notice">{t.waiting}</p>
                  )}
                </article>
              ) : (
                <>
                  <article
                    className="surface space-y-4 animate-fadeIn"
                    key={node.id}
                  >
                    <span className="badge font-mono">{node.id}</span>
                    <h2 className="text-xl font-bold text-white">
                      {node.zapytannia}
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                      {node.tekst || scenario.sytuatsiia}
                    </p>
                    <button
                      className="action"
                      onClick={() => setCidsOpen(true)}
                    >
                      {translations[lang].step.cidsHelperBtn}
                    </button>
                  </article>
                  {room.phase === 'voting' && (
                    <div className="surface space-y-5">
                      <div className="flex flex-wrap justify-between items-center gap-3">
                        <p className="font-semibold">
                          {t.participation}: {room.totalVotes} /{' '}
                          {room.participantsCount}
                        </p>
                        {host && (
                          <button
                            className="action"
                            onClick={() =>
                              send('SET_LIVE', undefined, !room.showLive)
                            }
                          >
                            {room.showLive ? t.hideLive : t.showLive}
                          </button>
                        )}
                      </div>
                      <div className="meter">
                        <div
                          className="meter-fill"
                          style={{
                            width: `${room.participantsCount ? Math.min(100, (room.totalVotes / room.participantsCount) * 100) : 0}%`
                          }}
                        />
                      </div>
                      {host ? (
                        room.showLive ? (
                          chart(room.votes, node.varianty)
                        ) : (
                          <p className="notice">{t.hidden}</p>
                        )
                      ) : voted ? (
                        <p className="notice" role="status">
                          {t.voted}{' '}
                          {chosenId && (
                            <strong className="font-mono">· {chosenId}</strong>
                          )}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {node.varianty.map((v) => (
                            <button
                              className="action w-full !justify-start !text-left !p-4"
                              key={v.id}
                              onClick={() => {
                                try {
                                  sessionStorage.setItem(
                                    `room-vote-${room.code}-${node.id}`,
                                    v.id
                                  );
                                } catch {}
                                setChosenId(v.id);
                                send('SUBMIT_VOTE', v.id);
                              }}
                            >
                              <span className="badge font-mono">{v.id}</span>
                              {v.tekst}
                            </button>
                          ))}
                        </div>
                      )}
                      {host && (
                        <button
                          className="action-primary"
                          onClick={() => send('SHOW_RESULTS')}
                        >
                          {t.results}
                        </button>
                      )}
                    </div>
                  )}
                  {['results', 'feedback'].includes(room.phase) && (
                    <div className="surface space-y-5">
                      <h2 className="font-bold text-xl">{t.results}</h2>
                      <p className="notice">
                        {t.index}: <strong>{room.discussionIndex}</strong>
                      </p>
                      {chart(room.votes, node.varianty, true)}
                      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                        {scenario.pytannia_dlia_obhovorennia.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {room.phase === 'feedback' && variant && (
                    <article
                      className="surface space-y-5 animate-fadeIn"
                      key={variant.id}
                    >
                      <h2 className="text-lg font-bold">
                        {variant.id} · {variant.tekst}
                      </h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="surface-muted">
                          <h3 className="font-bold text-emerald-300 mb-2">
                            {t.immediate}
                          </h3>
                          <p>{variant.naslidky.odrazu}</p>
                        </div>
                        <div className="surface-muted">
                          <h3 className="font-bold text-amber-200 mb-2">
                            {t.later}
                          </h3>
                          <p>{variant.naslidky.vidkladeni}</p>
                        </div>
                      </div>
                      <BalanceIndicators
                        scores={variant.baly}
                        explanation={variant.chomu_taki_baly}
                        lang={lang}
                      />
                      <p className="leading-relaxed text-slate-300">
                        {variant.zvorotnyi_zviazok}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {variant.normy.map((id) => (
                          <button
                            className="action !text-cyan-300"
                            key={id}
                            onClick={() => setNorm(id)}
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                      {host && (
                        <button
                          className="action-primary"
                          onClick={() => send('NEXT_STAGE')}
                        >
                          {variant.nastupnyi_vuzol
                            ? `${t.nextNode} (${variant.nastupnyi_vuzol}) →`
                            : t.finish}
                        </button>
                      )}
                    </article>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      <CidsHelperModal
        isOpen={cidsOpen}
        onClose={() => setCidsOpen(false)}
        lang={lang}
      />
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
