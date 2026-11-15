import React from 'react';

interface MoonLogoProps {
  className?: string;
  withTile?: boolean;
}

/**
 * Moon Client crescent moon brand mark.
 */
export const MoonLogo: React.FC<MoonLogoProps> = ({
  className = 'w-6 h-6',
  withTile = false,
}) => {
  const icon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={withTile ? 'w-[66%] h-[66%]' : className}
    >
      {/* Crisp Crescent Moon */}
      <path
        d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 0 0 12 21a9.003 9.003 0 0 0 8.354-5.646Z"
        fill="currentColor"
      />
      {/* Subtle 4-point star accent */}
      <path
        d="M17.5 4.5L18.15 6.35L20 7L18.15 7.65L17.5 9.5L16.85 7.65L15 7L16.85 6.35L17.5 4.5Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );

  if (withTile) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#1a73e8] text-white border border-neutral-700/60 shadow-sm ${className}`}
      >
        {icon}
      </div>
    );
  }

  return icon;
};
