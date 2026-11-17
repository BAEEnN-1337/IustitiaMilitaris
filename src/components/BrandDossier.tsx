import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '../i18n';
import labels from '../i18n/brand.json';

export function BrandDossier({
  lang,
  onClose
}: {
  lang: Language;
  onClose: () => void;
}) {
  const t = labels[lang];
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
      if (event.key === 'Tab') {
        const buttons =
          panel.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', keyboard, true);
    return () => {
      window.removeEventListener('keydown', keyboard, true);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);
  return createPortal(
    <div
      className="brand-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="brand-dossier-title"
        aria-describedby="brand-dossier-description"
        className="brand-dossier steel-panel hud-crosshair animate-fadeIn"
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-tactical-ice">
          {t.dossier}
        </p>
        <div className="brand-crest-frame">
          <img
            src="/logo-full.png"
            width={512}
            height={512}
            alt={t.crest}
            className="w-full h-auto"
          />
        </div>
        <h2
          id="brand-dossier-title"
          className="font-serif text-2xl font-bold text-steel-100"
        >
          Iustitia Militaris
        </h2>
        <p
          id="brand-dossier-description"
          className="text-sm leading-relaxed text-steel-300"
        >
          {t.subtitle}
        </p>
        <dl className="brand-facts">
          <div>
            <dt>{t.version}</dt>
            <dd>MVP 1.0</dd>
          </div>
          <div>
            <dt>{t.architecture}</dt>
            <dd>{t.privacy}</dd>
          </div>
          <div>
            <dt>{t.references}</dt>
            <dd>NATO Building Integrity &amp; {t.cids}</dd>
          </div>
          <div>
            <dt>{t.context}</dt>
            <dd>{t.hackathon}</dd>
          </div>
        </dl>
        <button className="action w-full" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>,
    document.body
  );
}
