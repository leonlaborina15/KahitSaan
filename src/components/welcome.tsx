"use client";

import { motion, useReducedMotion } from "framer-motion";
import { StickyActions } from "@/components/app-shell";
import { Kanin } from "@/components/kanin";
import { Button } from "@/components/ui/button";

export function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
        <motion.div
          initial={reduce ? false : { scale: 0.6, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="relative"
        >
          <span className="absolute inset-0 -z-10 scale-125 rounded-full bg-mangga/30 blur-2xl" aria-hidden />
          <Kanin mood="hungry" size={200} bob />
        </motion.div>
        <p className="font-display text-lg font-bold text-primary">Hi, ako si Kanin!</p>
        <h1 className="text-[32px] leading-[1.05]">
          Saan tayo kakain? <span className="text-primary">Kahit saan,</span> basta pasok sa budget.
        </h1>
        <p className="text-muted-foreground">30 seconds lang ang setup. Nasa phone mo lang ang info mo.</p>
      </div>
      <StickyActions>
        <div className="flex w-full flex-col items-center gap-2">
          <Button size="lg" className="h-14 w-full rounded-[16px] font-display text-lg" onClick={onStart}>
            Simulan na!
          </Button>
          <button type="button" onClick={onSkip} className="min-h-11 px-4 text-sm font-medium text-muted-foreground underline">
            Laktawan
          </button>
        </div>
      </StickyActions>
    </div>
  );
}
