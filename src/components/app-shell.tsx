"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ClockArrowLeft, Heart, House, Shuffle, User, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AiStatusPill, useAiStatus } from "@/components/ai-status";
import { cn } from "@/lib/utils";

const LEFT = [
  { href: "/", label: "Home", Icon: House },
  { href: "/kinain", label: "Kinain", Icon: ClockArrowLeft },
];
const RIGHT = [
  { href: "/saved", label: "Saved", Icon: Heart },
  { href: "/ako", label: "Ako", Icon: User },
];

function useOnline() {
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

export function Wordmark() {
  return (
    <span className="text-xl font-bold tracking-tight" aria-label="KahitSaan">
      Kah
      <span className="relative inline-block">
        ı<span className="absolute left-1/2 top-[0.2em] size-[0.28em] -translate-x-1/2 rounded-full bg-brand" aria-hidden />
      </span>
      tSaan
    </span>
  );
}

function NavTab({ href, label, Icon, active }: { href: string; label: string; Icon: typeof House; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden strokeWidth={active ? 2.5 : 2} />
      {label}
    </Link>
  );
}

/** Floating pill bar with raised center "Kahit Saan" button. */
function FloatingNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-[408px] items-center rounded-full border bg-card/85 px-2 shadow-[var(--shadow-raised)] backdrop-blur-md"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {LEFT.map((t) => (
        <NavTab key={t.href} {...t} active={path === t.href} />
      ))}
      <div className="flex flex-1 justify-center">
        <Link
          href="/kahit-saan"
          aria-label="Kahit Saan: ako na bahala pumili"
          className="-mt-7 flex flex-col items-center gap-0.5 text-[11px] font-bold text-primary"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-raised)] ring-4 ring-background">
            <Shuffle className="size-6" aria-hidden />
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

/** Mobile shell: header, offline banner, animated content, floating nav. `nav={false}` hides it (setup, reveal). */
export function AppShell({ children, nav = true, header = true }: { children: React.ReactNode; nav?: boolean; header?: boolean }) {
  const path = usePathname();
  const online = useOnline();
  const ai = useAiStatus();
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background sm:border-x">
      {header && (
        <header className="sticky top-0 z-20 flex items-center justify-between bg-background/90 px-5 py-3 backdrop-blur">
          <Link href="/" aria-label="KahitSaan home" className="rounded-lg">
            <Wordmark />
          </Link>
          <AiStatusPill status={ai} />
        </header>
      )}
      {!online && (
        <div className="mx-5 mb-2 flex items-center gap-2 rounded-[14px] bg-warning/15 px-4 py-2 text-sm" role="status">
          <WifiOff className="size-5 shrink-0" aria-hidden /> Offline ka, pero gumagana pa rin ako.
        </div>
      )}
      <motion.main
        key={path}
        initial={reduce ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
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

/** Small section heading used across screens. */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base">{children}</h2>
      {action}
    </div>
  );
}
