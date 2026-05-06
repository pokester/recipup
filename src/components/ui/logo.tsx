type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-cream)]"
        aria-hidden
      >
        R
      </span>
      {!compact && (
        <span className="font-heading text-2xl leading-none tracking-tight text-[var(--color-ink)]">
          Recipup
        </span>
      )}
    </div>
  );
}
