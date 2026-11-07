export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" strokeLinejoin="round">
      <path d="M16 5.5l9 5.5-9 15.5L7 11z" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M7 11h18M16 5.5L12.8 11 16 26.5 19.2 11z" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

export function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2.5 text-ink" aria-label="Facet, home">
      <LogoMark />
      <span className="font-serif text-[1.35rem] font-normal tracking-tight">Facet</span>
    </a>
  );
}
