"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Settings, Utensils, Wallet, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AiStatusPill, useAiStatus } from "@/components/ai-status";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Kain", Icon: Utensils },
  { href: "/baon", label: "Baon", Icon: Wallet },
  { href: "/settings", label: "Settings", Icon: Settings },
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
  // Primary dot on the "i".
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

/** Mobile shell: header, offline banner, animated content, bottom nav. `nav={false}` hides nav (welcome/setup). */
export function AppShell({ children, nav = true }: { children: React.ReactNode; nav?: boolean }) {
  const path = usePathname();
  const online = useOnline();
  const ai = useAiStatus();
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background sm:border-x">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background/90 px-5 py-3 backdrop-blur">
        <Link href="/" aria-label="KahitSaan home" className="rounded-lg">
          <Wordmark />
        </Link>
        <AiStatusPill status={ai} />
      </header>
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
        className={cn("flex flex-1 flex-col px-5", nav && "pb-24")}
      >
        {children}
      </motion.main>
      {nav && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[440px] border-t bg-card pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ href, label, Icon }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/** Sticky bottom action area with a soft fade above it. Sits above the bottom nav when present. */
export function StickyActions({ children, aboveNav = false }: { children: React.ReactNode; aboveNav?: boolean }) {
  return (
    <div className={cn("sticky z-10 -mx-5 mt-auto px-5 pb-4 pt-6", aboveNav ? "bottom-14" : "bottom-0")}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-transparent to-background" aria-hidden />
      <div className="relative flex gap-2 bg-background">{children}</div>
    </div>
  );
}
