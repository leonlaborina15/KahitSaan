"use client";

import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["#E8552D", "#E9A23B", "#2F9E6B", "#FDE7DF", "#CC4420"];

/** Small confetti burst from the center of its parent. Renders nothing with reduced motion. */
export function ConfettiBurst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 60 + (i % 3) * 25;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 size-2 rounded-[2px]"
            style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 20, opacity: 0, rotate: 180 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}
