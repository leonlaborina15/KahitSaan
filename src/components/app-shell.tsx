"use client";

import { ClockCounterClockwise, Heart, House, Shuffle, User, type Icon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AiStatusPill, useAiStatus } from "@/components/ai-status";
import { Kanin } from "@/components/kanin";
import { cn } from "@/lib/utils";

const LEFT = [
  { href: "/", label: "Home", Icon: House },
  { href: "/kinain", label: "Kinain", Icon: ClockCounterClockwise },
];
const RIGHT = [
  { href: "/saved", label: "Saved", Icon: Heart },
  { href: "/ako", label: "Ako", Icon: User },
];

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}

export const buzz = () => {
  try {
    navigator.vibrate?.(10);
  } catch {}
};

export function Wordmark() {
  return (
    <span className="font-display text-xl font-extrabold tracking-tight" aria-label="KahitSaan">
      Kah
      <span className="relative inline-block">
        ı<span className="absolute left-1/2 top-[0.2em] size-[0.28em] -translate-x-1/2 rounded-full bg-brand" aria-hidden />
      </span>
      tSaan
    </span>
  );
}

function NavTab({ href, label, Icon, active }: { href: string; label: string; Icon: Icon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", active ? "text-primary" : "text-muted-foreground")}
    >
      <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary-soft")}>
        <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden />
      </span>
      {label}
    </Link>
  );
}

/** Floating glass bar with raised center "Kahit Saan" button (pulses on Home). */
function FloatingNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-[408px] items-center rounded-[24px] border border-white/60 bg-card/75 px-1.5 shadow-[var(--shadow-raised)] backdrop-blur-xl dark:border-white/10"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {LEFT.map((t) => (
        <NavTab key={t.href} {...t} active={path === t.href} />
      ))}
      <div className="flex flex-1 justify-center">
        <Link href="/kahit-saan" onClick={buzz} aria-label="Kahit Saan: ako na bahala pumili" className="-mt-8 flex flex-col items-center gap-1 text-[11px] font-bold text-foreground">
          <span
            className={cn(
              "flex size-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-raised)] ring-4 ring-mangga",
              path === "/" && "animate-ks-pulse",
            )}
          >
            <Shuffle size={26} weight="bold" aria-hidden />
          </span>
          Kahit Saan
        </Link>
      </div>
      {RIGHT.map((t) => (
        <NavTab key={t.href} {...t} active={path === t.href} />
      ))}
    </nav>
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="mx-5 mb-2 flex items-center gap-3 rounded-[16px] bg-warning/15 px-3 py-2 text-sm" role="status">
      <Kanin mood="shocked" size={36} /> Offline ka, pero gumagana pa rin ako.
    </div>
  );
}

/** Mobile shell. `nav={false}` hides the bar (setup, reveal); `header={false}` lets a page bring its own. */
export function AppShell({ children, nav = true, header = true, bare = false }: { children: React.ReactNode; nav?: boolean; header?: boolean; bare?: boolean }) {
  const path = usePathname();
  const ai = useAiStatus();
  const reduce = useReducedMotion();

  return (
    <div className={cn("mx-auto flex min-h-dvh w-full max-w-[440px] flex-col", !bare && "bg-background sm:border-x")}>
      {header && (
        <header className="sticky top-0 z-20 flex items-center justify-between bg-background/85 px-5 py-3 backdrop-blur-xl">
          <Link href="/" aria-label="KahitSaan home" className="rounded-lg">
            <Wordmark />
          </Link>
          <AiStatusPill status={ai} />
        </header>
      )}
      <OfflineBanner />
      <motion.main
        key={path}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className={cn("flex flex-1 flex-col px-5", nav ? "pb-36" : "pb-4")}
      >
        {children}
      </motion.main>
      {nav && <FloatingNav />}
    </div>
  );
}

/** Sticky bottom action area with a soft fade. Only used on screens without the nav (setup). */
export function StickyActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-auto px-5 pb-4 pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-transparent to-background" aria-hidden />
      <div className="relative flex gap-2 bg-background">{children}</div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg">{children}</h2>
      {action}
    </div>
  );
}
