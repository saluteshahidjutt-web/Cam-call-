import React from 'react';

/**
 * iOS WhatsApp-style subtle chat background pattern
 * In dark mode: deep obsidian tint with subtle geometric doodle wallpaper
 * In light mode: classic iOS warm vanilla/cream tint (#efeae2) with delicate motifs
 */
export const IosChatBackground: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${className}`}
      aria-hidden="true"
    >
      {/* Light mode WhatsApp iOS wallpaper */}
      <div className="absolute inset-0 bg-[#efeae2] dark:hidden opacity-100" />
      
      {/* Dark mode WhatsApp iOS wallpaper */}
      <div className="absolute inset-0 bg-[#0b141a] hidden dark:block opacity-100" />

      {/* SVG Doodle Pattern Overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.06] dark:opacity-[0.035] text-zinc-900 dark:text-emerald-400"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="ios-wa-pattern"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            {/* Camera doodle */}
            <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="20" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            
            {/* Chat bubble doodle */}
            <path
              d="M 50 15 C 44 15 40 19 40 24 C 40 27 42 29 44 31 L 42 36 L 47 34 C 48 34 49 34 50 34 C 56 34 60 30 60 25 C 60 20 56 15 50 15 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            
            {/* Video camera doodle */}
            <rect x="14" y="52" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="27,54 33,51 33,62 27,59" fill="none" stroke="currentColor" strokeWidth="1.5" />

            {/* Call receiver doodle */}
            <path
              d="M 55 52 C 53 50 50 51 49 53 L 48 55 C 46 54 44 52 43 50 L 45 49 C 47 48 48 45 46 43 L 44 40 C 42 38 39 39 38 41 C 36 45 39 53 47 61 C 55 69 63 72 67 70 C 69 69 70 66 68 64 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              transform="translate(10, 5) scale(0.35)"
            />

            {/* Sparkle star */}
            <path
              d="M 65 65 L 67 60 L 69 65 L 74 67 L 69 69 L 67 74 L 65 69 L 60 67 Z"
              fill="currentColor"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ios-wa-pattern)" />
      </svg>
    </div>
  );
};
