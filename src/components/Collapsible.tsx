import React, { useEffect, useId, useState } from 'react';

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
      onClick: event => { event.preventDefault(); setExpanded(value => !value); }
    })}
    <Collapsible id={id} isOpen={expanded && shown}>{content}</Collapsible>
  </details>;
}

export function AnimatedOverlay({ isOpen, children, className }: { isOpen: boolean; children: React.ReactNode; className: string }) {
  const present = usePresence(isOpen);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!isOpen) { setEntered(false); return; }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);
  if (!present) return null;
  return <div className={`${className} animated-overlay ${isOpen && entered ? 'is-open' : ''}`} aria-hidden={!isOpen} {...{ inert: isOpen ? undefined : '' }}>{children}</div>;
}
