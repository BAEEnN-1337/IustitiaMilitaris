import { AnimatedDetails } from './Collapsible';
import React from 'react';
import type { Scenario } from '../types';
import type { Language } from '../i18n';
import { stageLabel, variantLabel } from '../i18n/display';
import labels from '../i18n/accounts.json';
import { resolvePath, type PathStep } from './DecisionProfile';
import { DecisionPathSvg } from './DecisionPathSvg';

export function ProfileDecisionPath({ scenario, path, lang, open }: {
  scenario: Scenario; path: PathStep[]; lang: Language; open: boolean;
}) {
  const steps = resolvePath(scenario, path);
  return <div className="min-w-0 space-y-4" data-testid="profile-path">
    <div className="flex flex-wrap gap-1.5" aria-label={labels[lang].path} data-testid="profile-step-chips">
      {steps.map((step, index) => <span key={`${index}:${step.nodeId}`} title={stageLabel(scenario, step.nodeId, lang)} className="profile-step-chip">
        {lang === 'uk' ? 'Е' : 'S'}{index + 1} · {variantLabel(scenario, step.nodeId, step.variantId, lang)}
      </span>)}
    </div>
    <AnimatedDetails className="surface-muted min-w-0" open={open} data-testid="profile-route">
      <summary className="cursor-pointer text-sm text-tactical-ice">{labels[lang].path}</summary>
      <div className="mt-4 min-w-0 space-y-5">
        <DecisionPathSvg scenario={scenario} steps={steps} />
        <ol className="profile-decision-timeline" data-testid="profile-timeline">
          {steps.map((step, index) => {
            const heading = stageLabel(scenario, step.nodeId, lang);
            const title = heading.split(' · ').slice(1).join(' · ') || scenario.vuzly.find(n => n.id === step.nodeId)?.zapytannia;
            return <li key={`${index}:${step.nodeId}`} className="profile-decision-step">
              <div className="profile-decision-badges">
                <span className="profile-step-chip !w-auto">{lang === 'uk' ? 'ЕТАП' : 'STAGE'} {index + 1}</span>
                <span className="profile-step-chip !w-auto text-tactical-ice">{lang === 'uk' ? 'ВАРІАНТ' : 'OPTION'} {variantLabel(scenario, step.nodeId, step.variantId, lang)}</span>
              </div>
              <div className="min-w-0 space-y-1">
                <h4 className="font-semibold text-steel-100">{title}</h4>
                <p className="text-sm leading-relaxed text-steel-300">{step.variant.tekst}</p>
              </div>
            </li>;
          })}
        </ol>
      </div>
    </AnimatedDetails>
  </div>;
}
