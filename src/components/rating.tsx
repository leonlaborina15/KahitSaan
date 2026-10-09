"use client";

import { ThumbsDown, ThumbsUp } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
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
        "flex size-11 items-center justify-center rounded-full border",
        h.rating === val ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
      )}
    >
      <Icon size={20} weight={h.rating === val ? "fill" : "regular"} />
    </motion.button>
  );
  return (
    <div className="flex gap-2">
      {btn("up", ThumbsUp, "Nabusog ako")}
      {btn("down", ThumbsDown, "Hindi ako nabusog")}
    </div>
  );
}
