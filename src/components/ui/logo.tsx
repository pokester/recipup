type LogoProps = {
  height?: number;
  className?: string;
};

export function Logo({ height = 36, className }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-v2.png"
      alt="Recipup"
      height={height}
      className={className}
      style={{ height: `${height}px`, width: "auto" }}
    />
  );
}

type WordmarkProps = {
  className?: string;
};

export function DarkWordmark({ className }: WordmarkProps) {
  return (
    <span
      className={`font-heading text-3xl font-semibold leading-none text-[var(--color-warm-white)] ${className ?? ""}`}
    >
      Recipup
    </span>
  );
}
