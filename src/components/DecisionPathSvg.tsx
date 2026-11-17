import React, { useId } from 'react';
import type { Scenario } from '../types';
import { stageLabel, variantLabel } from '../i18n/display';
import { useLanguage } from '../i18n/ui';

type Step = { nodeId: string; variantId: string };
export function DecisionPathSvg({ scenario, steps }: { scenario: Scenario; steps: Step[] }) {
  const lang = useLanguage();
  const arrow = `path-arrow-${useId().replace(/:/g, '')}`;
  const columns = steps.flatMap(step => {
    const node = scenario.vuzly.find(n => n.id === step.nodeId);
    const index = node?.varianty.findIndex(v => v.id === step.variantId) ?? -1;
    return node && index >= 0 ? [{ node, index }] : [];
  });
  const width = 280, gap = 88, top = 92, row = 88, box = 72;
  const height = top + Math.max(1, ...columns.map(c => c.node.varianty.length)) * row + 20;
  const totalWidth = Math.max(300, columns.length * (width + gap) - gap + 32);
  return <div className="decision-path-scroll w-full overflow-x-auto rounded-sm border border-steel-700 bg-obsidian-950/80 p-4" tabIndex={0} aria-label={lang === 'uk' ? 'Ваш шлях прийняття рішень' : 'Your decision pathway'}>
    <svg width={totalWidth} height={height} className="block select-none" role="img" aria-label={lang === 'uk' ? 'Пройдені етапи та обрані варіанти' : 'Completed stages and selected options'}>
      <defs><marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1 L10 5 L0 9Z" fill="#C8A456" /></marker></defs>
      {columns.slice(1).map((column, i) => {
        const previous = columns[i];
        const x = 16 + i * (width + gap) + width, end = x + gap;
        const y = top + previous.index * row + box / 2, targetY = top + column.index * row + box / 2;
        return <path key={i} data-testid="selected-curve" data-from-option={previous.index} data-to-option={column.index} d={`M ${x} ${y} C ${x + gap / 2} ${y}, ${end - gap / 2} ${targetY}, ${end} ${targetY}`} stroke="#C8A456" strokeWidth="2.5" fill="none" markerEnd={`url(#${arrow})`} />;
      })}
      {columns.map(({ node, index }, col) => {
        const x = 16 + col * (width + gap);
        const heading = stageLabel(scenario, node.id, lang);
        const short = stageLabel(scenario, node.id, lang, false);
        return <g key={`${col}:${node.id}`} data-testid="path-stage">
          <foreignObject x={x} y={8} width={width} height={76}>
            <div className="text-steel-100"><strong className="block font-mono text-xs uppercase tracking-widest text-justice-gold">{short}</strong><div className="mt-2 text-sm leading-snug line-clamp-2" title={heading}>{heading.includes(' · ') ? heading.split(' · ').slice(1).join(' · ') : ''}</div></div>
          </foreignObject>
          {node.varianty.map((variant, option) => {
            const selected = option === index, y = top + option * row;
            return <g key={variant.id} data-testid="path-option" data-selected={selected}>
              <rect x={x} y={y} width={width} height={box} rx={2} fill={selected ? 'rgba(200,164,86,0.13)' : 'var(--graph-surface)'} stroke={selected ? '#C8A456' : 'rgb(var(--slate-600))'} />
              {selected && <rect x={x} y={y} width={3} height={box} fill="#C8A456" />}
              <foreignObject x={x + 10} y={y + 10} width={width - 20} height={box - 20}>
                <div title={variant.tekst} className="flex items-start gap-2 text-sm leading-snug" style={{ color: 'var(--graph-ink)' }}>
                  <strong className="shrink-0 font-mono" style={{ color: selected ? 'var(--justice-gold)' : 'inherit' }}>{variantLabel(scenario, node.id, variant.id, lang)}</strong>
                  <span className="line-clamp-2">{variant.tekst}</span>
                  {selected && <span className="shrink-0" aria-label={lang === 'uk' ? 'Обрано' : 'Selected'}>✓</span>}
                </div>
              </foreignObject>
            </g>;
          })}
        </g>;
      })}
    </svg>
  </div>;
}
