"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cpu, MapPinOff, RotateCcw, SearchX } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const LINES = ["Iniisip ko kung saan ka mabubusog...", "Kinukumpara ang presyo...", "Tinitingnan kung sino'ng bukas..."];

/** Searching: skeletons sized like real results so nothing jumps when they load. */
export function Searching() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % LINES.length), 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <div className="flex items-center justify-between">
        <AnimatePresence mode="wait">
          <motion.p key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-sm font-medium">
            {LINES[i]}
          </motion.p>
        </AnimatePresence>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Cpu className="size-4" aria-hidden /> Ginagawa sa phone mo
        </span>
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
      <Skeleton className="h-[360px] w-full rounded-[20px]" />
      <Skeleton className="h-[120px] w-full rounded-[20px]" />
      <Skeleton className="h-[120px] w-full rounded-[20px]" />
    </div>
  );
}

function Art({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary-soft text-primary">{children}</div>;
}

export function EmptyResults({ budget, onRaise, onWiden }: { budget: number; onRaise: () => void; onWiden?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[20px] border bg-card p-6 text-center">
      <Art><SearchX className="size-9" aria-hidden /></Art>
      <div>
        <p className="text-lg font-bold">Walang pasok sa ₱{budget} dito.</p>
        <p className="text-sm text-muted-foreground">Subukan natin ng konting adjust.</p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <Button size="lg" className="h-12" onClick={onRaise}>Taasan budget</Button>
        {onWiden && <Button variant="outline" size="lg" className="h-12" onClick={onWiden}>Palawakin ang layo</Button>}
      </div>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border bg-card p-6 text-center" role="alert">
      <p className="text-lg font-bold">Ay, may mali.</p>
      <p className="text-sm text-muted-foreground">Hindi mo kasalanan. Subukan natin ulit?</p>
      <Button variant="outline" className="h-11" onClick={onRetry}>
        <RotateCcw className="size-5" aria-hidden /> Subukan ulit
      </Button>
    </div>
  );
}

export function LocationDenied({ onPick }: { onPick: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border bg-card p-3 text-sm" role="status">
      <MapPinOff className="size-5 shrink-0 text-primary" aria-hidden />
      <span className="flex-1">Hindi ko makita ang lokasyon mo.</span>
      <Button size="sm" className="h-11 px-4" onClick={onPick}>Pumili ng lugar</Button>
    </div>
  );
}
