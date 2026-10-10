"use client";

import { HeartIcon, HistoryIcon, HomeIcon, LogoMark, ShuffleIcon, UserIcon } from "@/components/icons";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AiStatusPill, useAiStatus } from "@/components/ai-status";
import { Kanin } from "@/components/kanin";
import { cn } from "@/lib/utils";

const LEFT = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/kinain", label: "Kinain", Icon: HistoryIcon },
];
const RIGHT = [
  { href: "/saved", label: "Saved", Icon: HeartIcon },
  { href: "/ako", label: "Ako", Icon: UserIcon },
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
    <span className="flex items-center gap-2 text-section" aria-label="KahitSaan">
      <LogoMark size={24} className="text-brand" />
      KahitSaan
    </span>
  );
}

type NavIcon = typeof HomeIcon;

function NavTab({ href, label, Icon, active }: { href: string; label: string; Icon: NavIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] text-micro transition-colors",
        active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon size={22} fill={active ? "currentColor" : "none"} fillOpacity={0.15} />
      {label}
    </Link>
  );
}

/** Raised orange circle; the shuffle icon spins on tap. */
function CenterTab({ active }: { active: boolean }) {
  const [spin, setSpin] = useState(0);
  return (
    <Link
      href="/kahit-saan"
      onClick={() => {
        buzz();
        setSpin((n) => n + 1);
      }}
      aria-label="Kahit Saan: ako na bahala pumili"
      aria-current={active ? "page" : undefined}
      className={cn("flex h-14 flex-1 flex-col items-center justify-end gap-0.5 text-micro", active ? "text-primary" : "text-foreground")}
    >
      <span className="-mt-7 mb-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-raised)] ring-4 ring-background">
        <ShuffleIcon key={spin} size={24} className={spin ? "animate-shuffle" : undefined} />
      </span>
      Kahit Saan
    </Link>
  );
}

/** Floating frosted bar: tinted tile on the active tab, raised circle in the middle. */
function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-[416px] items-end gap-1 rounded-[20px] border bg-card/85 p-1.5 shadow-[var(--shadow-raised)] backdrop-blur-xl"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {LEFT.map((t) => (
        <NavTab key={t.href} {...t} active={path === t.href} />
      ))}
      <CenterTab active={path === "/kahit-saan"} />
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
    <div className="mx-4 mb-2 flex items-center gap-2 text-meta" role="status">
      <Kanin mood="shocked" size={24} /> Offline ka, pero gumagana pa rin ako.
    </div>
  );
}

/** Mobile shell. `nav={false}` hides the bar (setup, reveal); `header={false}` lets a page bring its own. */
export function AppShell({ children, nav = true, header = true, bare = false }: { children: React.ReactNode; nav?: boolean; header?: boolean; bare?: boolean }) {
  const path = usePathname();
  const ai = useAiStatus();
  const reduce = useReducedMotion();

  return (
    <div className={cn("mx-auto flex min-h-dvh w-full max-w-[440px] flex-col", !bare && "bg-background")}>
      {header && (
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-background/90 px-4 backdrop-blur-xl">
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
        className={cn("flex flex-1 flex-col px-4", nav ? "pb-nav" : "pb-4")}
      >
        {children}
      </motion.main>
      {nav && <BottomNav />}
    </div>
  );
}

/** Sticky bottom action area with a soft fade. Only used on screens without the nav (setup). */
export function StickyActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-auto px-4 pb-4 pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-transparent to-background" aria-hidden />
      <div className="relative flex gap-2 bg-background">{children}</div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-section">{children}</h2>
      {action}
    </div>
  );
}
