import Image from "next/image";

// Intrinsic dimensions of /public/logo-v2.png — used to compute width at any display height
const LOGO_ASPECT = 2172 / 724;

type LogoProps = {
  height?: number;
  className?: string;
  priority?: boolean;
};

export function Logo({ height = 36, className, priority }: LogoProps) {
  const width = Math.round(height * LOGO_ASPECT);
  return (
    <Image
      src="/logo-v2.png"
      alt="Recipup"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
