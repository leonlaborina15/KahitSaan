"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Kanin, type KaninMood } from "@/components/kanin";
import { Button } from "@/components/ui/button";

const LINES = ["Iniisip ko kung saan ka mabubusog...", "Kinukumpara ang presyo...", "Tinitingnan kung sino'ng bukas..."];

/** Loading: Kanin thinking + skeletons sized like real results so nothing jumps. */
export function ResultsSkeleton() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % LINES.length), 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <Kanin mood="thinking" size={40} bob />
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            <motion.p key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-body">
              {LINES[i]}
            </motion.p>
          </AnimatePresence>
          <span className="text-micro">Ginagawa sa phone mo</span>
        </div>
      </div>
      <HeroSkeleton />
      <CompactSkeleton />
      <CompactSkeleton />
    </div>
  );
}

const Bone = ({ className }: { className: string }) => <span className={"skeleton block rounded-[10px] " + className} aria-hidden />;

/** Same shape as HeroCard. */
export function HeroSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-card p-2 pb-4 shadow-[var(--shadow-soft)]">
      <Bone className="h-40 w-full" />
      <div className="flex flex-col gap-2 px-2">
        <div className="flex justify-between gap-4">
          <Bone className="h-5 w-3/5" />
          <Bone className="h-6 w-14" />
        </div>
        <Bone className="h-3.5 w-2/5" />
        <Bone className="h-3.5 w-4/5" />
      </div>
      <div className="px-2"><Bone className="h-12 w-full" /></div>
    </div>
  );
}

/** Same shape as CompactCard / carousel rows. */
export function CompactSkeleton() {
  return (
    <div className="flex gap-4 rounded-[20px] bg-card p-4 shadow-[var(--shadow-soft)]">
      <Bone className="size-16 shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex justify-between gap-2">
          <Bone className="h-5 w-3/5" />
          <Bone className="h-6 w-12" />
        </div>
        <Bone className="h-3.5 w-2/5" />
        <Bone className="h-3.5 w-3/4" />
      </div>
    </div>
  );
}

/** Same shape as MiniFoodCard. */
export function MiniSkeleton() {
  return (
    <div className="flex w-[64%] min-w-52 max-w-64 shrink-0 flex-col gap-2 rounded-[20px] bg-card p-2 pb-4 shadow-[var(--shadow-soft)]">
      <Bone className="h-28 w-full" />
      <div className="flex flex-col gap-2 px-2 pt-2">
        <Bone className="h-5 w-4/5" />
        <Bone className="h-3.5 w-1/2" />
      </div>
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
    <div className="flex flex-col items-center gap-4 py-8 text-center" role={role}>
      <Kanin mood={mood} size={88} />
      <div className="flex flex-col gap-1">
        <p className="text-section">{title}</p>
        {body && <p className="text-meta">{body}</p>}
      </div>
      {action && (
        <Button size="lg" className="h-12 w-full rounded-[10px] text-body font-semibold" onClick={action.onClick}>
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
          {onWiden && <Button variant="outline" size="lg" className="h-12 rounded-[10px]" onClick={onWiden}>Palawakin ang layo</Button>}
          {onClear && <Button variant="ghost" size="lg" className="h-12 rounded-[10px]" onClick={onClear}>Alisin ang filters</Button>}
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
    <div className="flex items-center gap-4 py-2">
      <Kanin mood="sleepy" size={40} />
      <div className="flex flex-1 flex-col items-start gap-2">
        <p className="text-meta">{children}</p>
        {action && (
          <Button size="sm" variant="outline" className="h-11 rounded-[10px] px-4" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
