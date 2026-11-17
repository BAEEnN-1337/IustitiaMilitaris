import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useId, useState, useRef } from 'react';

export function Collapsible({ isOpen, children, id }: { isOpen: boolean; children: React.ReactNode; id?: string }) {
  return <div id={id} className={`collapsible ${isOpen ? 'is-open' : ''}`} aria-hidden={!isOpen} {...{ inert: isOpen ? undefined : '' }}>
    <div className="collapsible-inner"><div className="collapsible-content">{children}</div></div>
  </div>;
}

export function usePresence(open: boolean) {
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) { setPresent(true); return; }
    const timer = window.setTimeout(() => setPresent(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250);
    return () => window.clearTimeout(timer);
  }, [open]);
  return open || present;
}

export function AnimatedDetails({ open = false, children, ...props }: React.DetailsHTMLAttributes<HTMLDetailsElement>) {
  const [expanded, setExpanded] = useState(open);
  const [shown, setShown] = useState(open);
  const present = usePresence(expanded);
  const id = useId();
  useEffect(() => setExpanded(open), [open]);
  useEffect(() => {
    if (!expanded) { setShown(false); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(true); return; }
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setShown(true)); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [expanded]);
  const [summary, ...content] = React.Children.toArray(children);
  return <details {...props} open={present} data-expanded={expanded} onToggle={event => {
    if (event.currentTarget.open !== present) setExpanded(event.currentTarget.open);
  }}>
    {React.isValidElement<React.HTMLAttributes<HTMLElement>>(summary) && React.cloneElement(summary, {
      'aria-expanded': expanded, 'aria-controls': id,
      children: <><ChevronDown strokeWidth={1.75} className={`w-4 h-4 shrink-0 collapse-chevron ${expanded ? 'is-open' : ''}`} />{summary.props.children}</>,
      onClick: event => { event.preventDefault(); setExpanded(value => !value); }
    })}
    <Collapsible id={id} isOpen={expanded && shown}>{content}</Collapsible>
  </details>;
}

export function AnimatedOverlay({ isOpen, children, className, onClose }: { isOpen: boolean; children: React.ReactNode; className: string; onClose: () => void }) {
  const overlay = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key === 'Tab') {
        const items = [...(overlay.current?.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex="0"]') || [])].filter(el => el.getClientRects().length && !el.hasAttribute('disabled'));
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    const frame = requestAnimationFrame(() => overlay.current?.querySelector<HTMLElement>('button')?.focus());
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown); previous?.isConnected && previous.focus(); };
  }, [isOpen]);
  const present = usePresence(isOpen);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!isOpen) { setEntered(false); return; }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);
  if (!present) return null;
  return createPortal(<div ref={overlay} style={{ zIndex: 100 }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className={`${className} animated-overlay ${isOpen && entered ? 'is-open' : ''}`} aria-hidden={!isOpen} {...{ inert: isOpen ? undefined : '' }}>{children}</div>, document.body);
}
