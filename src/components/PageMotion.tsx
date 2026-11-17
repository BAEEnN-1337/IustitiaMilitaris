import React, { useLayoutEffect, useRef } from 'react';
import type { Language } from '../i18n';

export function PageMotion({ pathname, lang, children }: { pathname: string; lang: Language; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef({ pathname, lang });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.dataset.motion = previous.current.pathname !== pathname ? 'route' : previous.current.lang !== lang ? 'language' : 'route';
    element.style.animation = 'none';
    void element.offsetWidth;
    element.style.animation = '';
    previous.current = { pathname, lang };
  }, [pathname, lang]);
  return <div ref={ref} className="page-motion">{children}</div>;
}
