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
