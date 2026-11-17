import React from "react";
import { Scale, Crosshair, Clock3 } from "lucide-react";
import { Language, translations } from "../i18n";
import labels from "../i18n/design.json";
import type { Scenario, Scores } from "../types";
export function Dossier({
  scenario,
  lang,
  nodeId,
  index = 1,
  children,
}: {
  scenario: Scenario;
  lang: Language;
  nodeId?: string;
  index?: number;
  children: React.ReactNode;
}) {
  const t = labels[lang],
    role = scenario.diiovi_osoby.find((r) => r.hravets);
  return (
    <section className="dossier hud-crosshair space-y-3" data-testid="dossier">
      <div className="flex flex-wrap gap-2">
        <span className="badge font-mono">
          {t.case} #{scenario.id} · {t.stage} {index}
          {nodeId ? ` · ${nodeId}` : ""}
        </span>
        {role && (
          <span className="badge !text-status-success">
            {translations[lang].briefing.playerBadge}: {role.rol}
          </span>
        )}
      </div>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}
export function ValueConflict({
  a,
  b,
  explanation,
}: {
  a: string;
  b: string;
  explanation: string;
}) {
  return (
    <div className="space-y-3" data-testid="value-conflict">
      <div className="value-poles">
        <div className="value-pole">{a}</div>
        <Scale className="h-6 w-6 text-status-warning" aria-hidden="true" />
        <div className="value-pole">{b}</div>
      </div>
      <p className="text-sm text-steel-300">{explanation}</p>
    </div>
  );
}
export function StageStepper({
  scenario,
  nodeId,
  completed,
  lang,
}: {
  scenario: Scenario;
  nodeId: string;
  completed: number;
  lang: Language;
}) {
  const t = labels[lang];
  function depth(id: string, seen = new Set<string>()): number {
    if (seen.has(id)) return 0;
    const next = new Set(seen).add(id),
      node = scenario.vuzly.find((n) => n.id === id);
    return node
      ? 1 +
          Math.max(
            0,
            ...node.varianty.map((v) =>
              v.nastupnyi_vuzol ? depth(v.nastupnyi_vuzol, next) : 0,
            ),
          )
      : 0;
  }
  const total = Math.min(30, completed + depth(nodeId));
  return (
    <ol
      className="flex flex-wrap gap-2"
      aria-label={t.stage}
      data-testid="stepper"
    >
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          aria-current={i === completed ? "step" : undefined}
          className={`badge ${i === completed ? "!border-status-success !text-status-success" : ""}`}
        >
          <span>
            {i + 1}.{" "}
            {i < completed
              ? t.completed
              : i === completed
                ? t.current
                : t.upcoming}
          </span>
        </li>
      ))}
    </ol>
  );
}
export function Consequence({
  delayed = false,
  title,
  children,
}: {
  delayed?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  const Icon = delayed ? Clock3 : Crosshair;
  return (
    <section
      className={`surface-muted space-y-2 consequence ${delayed ? "consequence-delayed" : ""}`}
    >
      <h3
        className={`im-section-title flex items-center gap-2 text-sm font-bold ${delayed ? "text-status-warning" : "text-tactical-ice"}`}
      >
        <Icon size={18} aria-hidden="true" />
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-steel-100">{children}</div>
    </section>
  );
}
export function Radar({
  scores,
  count,
  lang,
}: {
  scores: Scores;
  count: number;
  lang: Language;
}) {
  const t = labels[lang],
    axes = ["dobrochesnist", "efektyvnist", "dovira"] as const,
    ends = [
      [160, 60],
      [247, 210],
      [73, 210],
    ],
    center = [160, 160];
  const point = (i: number, ratio: number) => [
    center[0] + (ends[i][0] - center[0]) * ratio,
    center[1] + (ends[i][1] - center[1]) * ratio,
  ];
  return (
    <figure className="surface-muted space-y-3" data-testid="radar">
      <figcaption className="font-semibold">{t.balance}</figcaption>
      <svg
        viewBox="0 0 320 285"
        className="w-full max-w-sm mx-auto text-steel-300"
        role="img"
        aria-label={t.balance}
      >
        <title>{t.balance}</title>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon
            key={r}
            points={axes.map((_, i) => point(i, r).join(",")).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.45"
          />
        ))}
        {ends.map(([x, y], i) => (
          <line key={i} x1={160} y1={160} x2={x} y2={y} stroke="currentColor" />
        ))}
        <polygon
          points={axes
            .map((axis, i) =>
              point(
                i,
                Math.max(
                  0,
                  Math.min(1, (scores[axis] / Math.max(1, count) + 2) / 4),
                ),
              ).join(","),
            )
            .join(" ")}
          fill="rgb(var(--emerald-500) / 0.18)"
          stroke="rgb(var(--emerald-400))"
          strokeWidth="2"
        />
        {axes.map((axis, i) => (
          <foreignObject
            key={axis}
            x={[95, 222, 0][i]}
            y={[4, 218, 218][i]}
            width={i === 0 ? 130 : 98}
            height={62}
          >
            <div className="text-center text-xs text-steel-100 leading-relaxed">
              {translations[lang].dimensions[axis]}
              <strong className="block">
                {scores[axis] > 0 ? "+" : ""}
                {scores[axis]}
              </strong>
            </div>
          </foreignObject>
        ))}
      </svg>
      <p className="text-xs text-steel-300">{t.radarNotice}</p>
    </figure>
  );
}
