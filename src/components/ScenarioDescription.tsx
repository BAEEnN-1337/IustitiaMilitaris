import React, { useId, useLayoutEffect, useRef, useState } from 'react';
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
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [content, setContent] = useState(() => descriptionPreview(text));
  const { preview, continuation } = content;
  useLayoutEffect(() => {
    let cancelled = false;
    const update = () => {
      const element = paragraph.current;
      if (!element || cancelled) return;
      const style = getComputedStyle(element);
      const mirror = document.createElement('p');
      mirror.lang = lang;
      Object.assign(mirror.style, {
        position: 'fixed',
        left: '-100000px',
        top: '0',
        visibility: 'hidden',
        width: `${element.clientWidth}px`,
        font: style.font,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        wordSpacing: style.wordSpacing,
        overflowWrap: style.overflowWrap,
        whiteSpace: 'normal',
        textAlign: 'justify',
        textAlignLast: 'left',
        hyphens: 'auto',
        margin: '0',
        padding: '0'
      });
      const words = document.createElement('span');
      const marker = document.createElement('span');
      marker.textContent = '[···]';
      Object.assign(marker.style, {
        fontFamily: '"IBM Plex Mono", monospace',
        fontWeight: '700',
        marginLeft: '4px',
        whiteSpace: 'nowrap'
      });
      mirror.append(words, marker);
      document.body.append(mirror);
      let next = descriptionPreview(text);
      try {
        for (let i = 0; i < 100; i++) {
          words.textContent = next.preview;
          marker.style.display = next.continuation ? 'inline' : 'none';
          if (
            mirror.getBoundingClientRect().height <=
            parseFloat(style.lineHeight) * 7 + 0.5
          )
            break;
          const smaller = descriptionPreview(
            text,
            Array.from(next.preview).length - 1
          );
          if (smaller.preview.length >= next.preview.length) break;
          next = smaller;
        }
      } finally {
        mirror.remove();
      }
      setContent((previous) =>
        previous.preview === next.preview &&
        previous.continuation === next.continuation
          ? previous
          : next
      );
    };
    update();
    const observer = new ResizeObserver(update);
    if (paragraph.current) observer.observe(paragraph.current);
    void document.fonts.ready.then(update);
    document.fonts.addEventListener('loadingdone', update);
    return () => {
      cancelled = true;
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', update);
    };
  }, [text, lang]);
  return (
    <div
      lang={lang}
      className="scenario-description relative group mt-2 font-sans text-xs sm:text-sm text-steel-300 leading-relaxed text-justify [text-align-last:left] hyphens-auto overflow-visible"
    >
      <p
        ref={paragraph}
        lang={lang}
        className="description-preview-box relative font-sans text-xs sm:text-sm text-steel-300 leading-relaxed text-justify [text-align-last:left] hyphens-auto"
      >
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
            className="description-more font-mono text-tactical-ice font-bold ml-1 cursor-help hover:text-justice-gold transition-colors"
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
