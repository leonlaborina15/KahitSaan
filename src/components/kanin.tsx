"use client";

import { cn } from "@/lib/utils";

export type KaninMood = "hungry" | "thinking" | "happy" | "sleepy" | "shocked";

const LABEL: Record<KaninMood, string> = {
  hungry: "Si Kanin, gutom",
  thinking: "Si Kanin, nag-iisip",
  happy: "Si Kanin, masaya",
  sleepy: "Si Kanin, inaantok",
  shocked: "Si Kanin, nagulat",
};

function Face({ mood }: { mood: KaninMood }) {
  const ink = "#1A1410";
  switch (mood) {
    case "happy":
      return (
        <g>
          <path d="M44 74q6-7 12 0M72 74q6-7 12 0" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M54 84q10 12 20 0z" fill={ink} />
          <path d="M58 88q6 4 12 0" fill="#E2482C" />
          <ellipse cx="40" cy="84" rx="6" ry="3.5" fill="#FF9F8A" opacity=".7" />
          <ellipse cx="88" cy="84" rx="6" ry="3.5" fill="#FF9F8A" opacity=".7" />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <path d="M44 76h12M72 76h12" stroke={ink} strokeWidth="4" strokeLinecap="round" />
          <path d="M58 88q6 3 12 0" stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <text x="94" y="34" fontSize="16" fontWeight="800" fill="#7A6E66" fontFamily="sans-serif">z</text>
          <text x="104" y="22" fontSize="12" fontWeight="800" fill="#7A6E66" fontFamily="sans-serif">z</text>
        </g>
      );
    case "shocked":
      return (
        <g>
          <circle cx="50" cy="74" r="6.5" fill="#fff" stroke={ink} strokeWidth="3" />
          <circle cx="78" cy="74" r="6.5" fill="#fff" stroke={ink} strokeWidth="3" />
          <circle cx="50" cy="74" r="2.5" fill={ink} />
          <circle cx="78" cy="74" r="2.5" fill={ink} />
          <ellipse cx="64" cy="90" rx="5" ry="6" fill={ink} />
        </g>
      );
    case "thinking":
      return (
        <g>
          <circle cx="50" cy="74" r="4.5" fill={ink} />
          <circle cx="78" cy="74" r="4.5" fill={ink} />
          <circle cx="52" cy="72" r="1.5" fill="#fff" />
          <circle cx="80" cy="72" r="1.5" fill="#fff" />
          <path d="M57 89h14" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="102" cy="34" r="3" fill="#6C4CF1" />
          <circle cx="110" cy="24" r="4" fill="#6C4CF1" />
          <circle cx="120" cy="12" r="5" fill="#6C4CF1" />
        </g>
      );
    default: // hungry
      return (
        <g>
          <circle cx="50" cy="74" r="4.5" fill={ink} />
          <circle cx="78" cy="74" r="4.5" fill={ink} />
          <circle cx="51.5" cy="72.5" r="1.5" fill="#fff" />
          <circle cx="79.5" cy="72.5" r="1.5" fill="#fff" />
          <path d="M54 85q10 9 20 0" stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M66 89q2 7 5 2" fill="#FF7A66" />
          <path d="M82 92q1 6 3 7" stroke="#8FD3F5" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
  }
}

/** Kanin: an original rice-bowl buddy. Purely decorative unless `label` is needed. */
export function Kanin({ mood = "hungry", size = 96, className, bob = false }: { mood?: KaninMood; size?: number; className?: string; bob?: boolean }) {
  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      role="img"
      aria-label={LABEL[mood]}
      className={cn("shrink-0 overflow-visible", bob && "animate-bob", className)}
    >
      {/* rice mound */}
      <path d="M18 58c0-20 20-34 46-34s46 14 46 34z" fill="#FFFFFF" stroke="#F0E6DA" strokeWidth="3" />
      <g fill="#F4ECE0">
        <ellipse cx="40" cy="44" rx="4" ry="2.4" transform="rotate(-20 40 44)" />
        <ellipse cx="58" cy="34" rx="4" ry="2.4" transform="rotate(15 58 34)" />
        <ellipse cx="78" cy="38" rx="4" ry="2.4" transform="rotate(-10 78 38)" />
        <ellipse cx="92" cy="48" rx="4" ry="2.4" transform="rotate(25 92 48)" />
        <ellipse cx="66" cy="48" rx="4" ry="2.4" />
      </g>
      {/* bowl */}
      <path d="M12 58h104c0 30-22 52-52 52S12 88 12 58z" fill="#E2482C" />
      <path d="M12 58h104c-1 5-2 9-4 13H16c-2-4-3-8-4-13z" fill="#C93A20" opacity=".35" />
      <path d="M22 66h84" stroke="#FFC23D" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />
      <rect x="46" y="108" width="36" height="8" rx="4" fill="#C93A20" />
      {/* face sits on the bowl */}
      <g transform="translate(0 4)">
        <Face mood={mood} />
      </g>
    </svg>
  );
}
