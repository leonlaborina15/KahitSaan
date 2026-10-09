"use client";

import { Cpu } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Kanin, type KaninMood } from "@/components/kanin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const LINES = ["Iniisip ko kung saan ka mabubusog...", "Kinukumpara ang presyo...", "Tinitingnan kung sino'ng bukas..."];

/** Loading: Kanin thinking + skeletons sized like real results so nothing jumps. */
export function ResultsSkeleton() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % LINES.length), 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <Kanin mood="thinking" size={56} bob />
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            <motion.p key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-sm font-semibold">
              {LINES[i]}
            </motion.p>
          </AnimatePresence>
          <span className="flex items-center gap-1 text-xs font-semibold text-ube">
            <Cpu size={14} weight="duotone" aria-hidden /> Ginagawa sa phone mo
          </span>
        </div>
      </div>
      <Skeleton className="h-[380px] w-full rounded-[24px]" />
      <Skeleton className="h-[112px] w-full rounded-[24px]" />
      <Skeleton className="h-[112px] w-full rounded-[24px]" />
    </div>
  );
}

/** Kanin + message + one clear action (plus optional extras). */
export function KaninState({
  mood,
  title,
  body,
  action,
  extra,
  role,
}: {
  mood: KaninMood;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  extra?: React.ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[24px] border bg-card p-6 text-center" role={role}>
      <Kanin mood={mood} size={88} />
      <div className="flex flex-col gap-1">
        <p className="font-display text-xl font-bold">{title}</p>
        {body && <p className="text-sm text-muted-foreground">{body}</p>}
      </div>
      {action && (
        <Button size="lg" className="h-12 w-full text-base" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {extra}
    </div>
  );
}

export function EmptyResults({ budget, note, onRaise, onWiden, onClear }: { budget: number; note?: string; onRaise: () => void; onWiden?: () => void; onClear?: () => void }) {
  return (
    <KaninState
      mood="sleepy"
      title={`Walang pasok sa ₱${budget} dito.`}
      body={note ?? "Subukan natin ng konting adjust."}
      action={{ label: "Taasan budget", onClick: onRaise }}
      extra={
        <div className="flex w-full flex-col gap-2">
          {onWiden && <Button variant="outline" size="lg" className="h-12" onClick={onWiden}>Palawakin ang layo</Button>}
          {onClear && <Button variant="ghost" size="lg" className="h-12" onClick={onClear}>Alisin ang filters</Button>}
        </div>
      }
    />
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <KaninState mood="shocked" role="alert" title="Ay, may mali." body="Hindi mo kasalanan. Subukan natin ulit?" action={{ label: "Subukan ulit", onClick: onRetry }} />;
}

/** Compact empty state for lists and carousels: small sleepy Kanin + one action. */
export function EmptyNote({ children, action }: { children: React.ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-dashed bg-card p-4">
      <Kanin mood="sleepy" size={48} />
      <div className="flex flex-1 flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">{children}</p>
        {action && (
          <Button size="sm" variant="outline" className="h-11 px-4" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
