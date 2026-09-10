import React from 'react';

// Logo extraído de diseño.md (SVG original, inline para no requerir fetch).
export function Logo({ height = 40 }: { height?: number }): React.ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" fill="none" height={height} role="img" aria-label="matoyvoy truco">
      <rect width="240" height="60" rx="12" fill="#0b1b14" />
      <g transform="translate(14, 10)">
        <rect x="0" y="0" width="28" height="40" rx="4" fill="#1c3d2e" stroke="#10b981" strokeWidth="1.5" />
        <path d="M14 8 C14 8 7 17 7 22 C7 26 10.5 28.5 14 26 C17.5 28.5 21 26 21 22 C21 17 14 8 14 8 Z" fill="#34d399" />
        <path d="M12 25 L10 32 L18 32 L16 25 Z" fill="#34d399" />
      </g>
      <g transform="translate(24, 6)">
        <rect x="0" y="0" width="28" height="40" rx="4" fill="#162e24" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="7" y="16" fill="#f59e0b" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="12">1</text>
        <path d="M14 18 C14 18 10 23 10 26 C10 28.5 12 30 14 28 C16 30 18 28.5 18 26 C18 23 14 18 14 18 Z" fill="#f59e0b" />
      </g>
      <text x="64" y="36" fill="#ffffff" fontFamily="'Space Grotesk', system-ui, sans-serif" fontWeight="800" fontSize="22" letterSpacing="-0.5px">mato<tspan fill="#10b981">y</tspan>voy</text>
      <rect x="180" y="20" width="46" height="20" rx="6" fill="#1e3a2f" />
      <text x="188" y="34" fill="#34d399" fontFamily="'Space Grotesk', system-ui, sans-serif" fontWeight="700" fontSize="10" letterSpacing="1px">TRUCO</text>
    </svg>
  );
}
