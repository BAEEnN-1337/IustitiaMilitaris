import React, { useLayoutEffect, useRef, useState } from 'react';

export function SlidingNav({ children, className, label, activeKey }: { children: React.ReactNode; className: string; label: string; activeKey: string }) {
  const ref = useRef<HTMLElement>(null);
  const [line, setLine] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      setLine({ left: active?.offsetLeft ?? 0, width: active?.offsetWidth ?? 0 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav); nav.querySelectorAll('button').forEach(button => observer.observe(button));
    document.fonts.ready.then(() => { if (ref.current === nav) measure(); });
    return () => observer.disconnect();
  }, [activeKey]);
  return <nav ref={ref} className={`${className} sliding-nav`} aria-label={label}>{children}<span aria-hidden="true" className="nav-indicator" style={{ width: line.width, transform: `translateX(${line.left}px)` }} /></nav>;
}
