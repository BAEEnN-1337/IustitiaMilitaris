import React, { useId } from 'react';
import { Language } from '../i18n';
import labels from '../i18n/design.json';
import { descriptionPreview } from '../utils/descriptionPreview';

export function ScenarioDescription({
  text,
  lang
}: {
  text: string;
  lang: Language;
}) {
  const id = useId();
  const { preview, continuation } = descriptionPreview(text);
  return (
    <div className="scenario-description relative group mt-2 text-xs text-steel-300 leading-relaxed overflow-visible">
      <p>
        <span className="description-preview">{preview}</span>
        {continuation && (
          <button
            type="button"
            aria-label={labels[lang].descriptionMore}
            aria-describedby={id}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            className="font-mono text-tactical-ice font-bold ml-1 cursor-help hover:text-justice-gold transition-colors"
          >
            [···]
          </button>
        )}
      </p>
      {continuation && (
        <div
          id={id}
          role="tooltip"
          className="description-continuation absolute left-0 right-0 top-full mt-1.5 w-full z-40 p-3.5 rounded-sm bg-obsidian-900/[0.98] border border-steel-600 shadow-2xl h-auto max-h-none overflow-visible backdrop-blur-md font-sans text-xs sm:text-sm text-steel-100 leading-relaxed transition-all duration-200 ease-out opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible"
        >
          {continuation}
        </div>
      )}
    </div>
  );
}
