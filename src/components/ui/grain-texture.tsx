import { cn } from "../../lib/utils";

interface GrainTextureProps {
  baseFrequency?: number;
  className?: string;
}

export const GrainTexture = ({
  baseFrequency = 3,
  className,
}: GrainTextureProps) => {
  // Use a unique filter ID based on frequency to avoid conflicts
  const filterId = `grain-${baseFrequency.toString().replace(".", "-")}`;

  return (
    <svg
      className={cn(
        "absolute inset-0 w-full h-full pointer-events-none",
        className
      )}
      style={{ opacity: "var(--grain-opacity)" }}
      preserveAspectRatio="none"
    >
      <filter id={filterId}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency={baseFrequency}
          numOctaves={4}
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
};
