"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ThumbsDownIcon as ThumbsDown, ThumbsUpIcon as ThumbsUp } from "@/components/icons";
import { useApp } from "@/components/app-data";
import type { HistoryEntry } from "@/lib/store/history";
import { cn } from "@/lib/utils";

export function RatingButtons({ h }: { h: HistoryEntry }) {
  const { rate } = useApp();
  const reduce = useReducedMotion();
  const btn = (val: "up" | "down", Icon: typeof ThumbsUp, label: string) => (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={h.rating === val}
      whileTap={reduce ? undefined : { scale: 0.8 }}
      onClick={() => void rate(h.id, h.rating === val ? null : val)}
      className={cn(
        "flex size-11 items-center justify-center rounded-[10px]",
        h.rating === val ? "text-brand" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon size={20} fill={h.rating === val ? "currentColor" : "none"} fillOpacity={0.2} />
    </motion.button>
  );
  return (
    <div className="flex">
      {btn("up", ThumbsUp, "Nabusog ako")}
      {btn("down", ThumbsDown, "Hindi ako nabusog")}
    </div>
  );
}
