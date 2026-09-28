import type { HatKind } from "@/lib/personas";

/**
 * Hand-drawn SVG hats — one per swarm role. Each uses currentColor for the
 * band so themes can tint it; fills stay characterful and fixed.
 */

interface HatProps {
  size?: number;
  className?: string;
}

export function TopHat({ size = 24, className }: HatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="10" y="5" width="12" height="16" rx="1.5" fill="#2E2E2E" />
      <rect x="10" y="16" width="12" height="3.4" fill="#4A90E2" />
      <rect x="4" y="21" width="24" height="3.2" rx="1.6" fill="#2E2E2E" />
    </svg>
  );
}

export function DevCap({ size = 24, className }: HatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M6 18a10 10 0 0 1 20 0v1H6v-1z" fill="#31567F" />
      <path d="M16 8v10" stroke="#22405F" strokeWidth="1.2" />
      <path d="M6 19h22a1.6 1.6 0 0 1 0 3.2H6z" fill="#22405F" />
      <circle cx="16" cy="7.6" r="1.6" fill="#22405F" />
    </svg>
  );
}

export function Fedora({ size = 24, className }: HatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M9 18c0-6 2-10 7-10s7 4 7 10H9z" fill="#6B5B4A" />
      <path d="M9 14.5h14V18H9z" fill="#822659" />
      <path d="M3 20.5c2-2.4 23-2.4 26 0 .8.8-.4 2.6-2 2.3-3.6-.7-19.4-.7-23 0-1.6.3-2.6-1.5-1-2.3z" fill="#5A4C3D" />
    </svg>
  );
}

export function Beret({ size = 24, className }: HatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M5 19c-1-6 4-11 11-11s13 4 12 10c-.3 1.4-2 2-4 1.6-5.6-1.2-13-1.2-16.4-.4-1.3.3-2.4.2-2.6-0.2z" fill="#A63D74" />
      <path d="M6 19.5c6-1.4 15-1.4 21-.3" stroke="#822659" strokeWidth="1.4" fill="none" />
      <rect x="14.6" y="5.6" width="2.8" height="3.6" rx="1.4" fill="#822659" />
    </svg>
  );
}

export function HardHat({ size = 24, className }: HatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M5 20a11 11 0 0 1 22 0v1H5v-1z" fill="#E2A63D" />
      <rect x="13.6" y="6.5" width="4.8" height="8" rx="2" fill="#C88A26" />
      <path d="M9 13.5c1.6-3 4.2-5 7-5s5.4 2 7 5" stroke="#C88A26" strokeWidth="1.6" fill="none" />
      <rect x="3.6" y="20.6" width="24.8" height="3" rx="1.5" fill="#B77F1F" />
    </svg>
  );
}

export function Hat({ kind, size = 24, className }: HatProps & { kind: HatKind }) {
  switch (kind) {
    case "top":
      return <TopHat size={size} className={className} />;
    case "cap":
      return <DevCap size={size} className={className} />;
    case "fedora":
      return <Fedora size={size} className={className} />;
    case "beret":
      return <Beret size={size} className={className} />;
    case "hardhat":
      return <HardHat size={size} className={className} />;
  }
}
