import React from 'react';
import { translations, Language } from '../i18n';
import type { Scenario } from '../types';
export type PathStep = { nodeId: string; variantId: string };
export function resolvePath(scenario: Scenario, path: PathStep[]) {
  return path.flatMap((step) => {
    const variant = scenario.vuzly
      .find((n) => n.id === step.nodeId)
      ?.varianty.find((v) => v.id === step.variantId);
    return variant ? [{ ...step, variant }] : [];
  });
}
export function DecisionProfile({
  scenario,
  path,
  lang
}: {
  scenario: Scenario;
  path: PathStep[];
  lang: Language;
}) {
  const steps = resolvePath(scenario, path);
  return (
    <div
      className="grid gap-3 sm:grid-cols-3"
      aria-label={translations[lang].reflection.profileTitle}
    >
      {(['dobrochesnist', 'efektyvnist', 'dovira'] as const).map((axis) => {
        const value = steps.reduce(
          (total, step) => total + step.variant.baly[axis],
          0
        );
        return (
          <div className="surface-muted space-y-2" key={axis}>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span>{translations[lang].dimensions[axis]}</span>
              <strong
                className={value < 0 ? 'text-status-danger' : 'text-status-success'}
              >
                {value > 0 ? '+' : ''}
                {value}
              </strong>
            </div>
            <div className="meter">
              <div
                className="meter-fill"
                style={{
                  width: `${steps.length ? (Math.abs(value) / (2 * steps.length)) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
