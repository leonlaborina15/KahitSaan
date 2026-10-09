"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Mobile layout: header with model-status pill + bottom nav (TASKS 1.1). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const tab = (href: string, label: string) => (
    <Link
      href={href}
      className={cn("flex min-h-12 flex-1 items-center justify-center text-sm font-medium", path === href ? "text-primary" : "text-muted-foreground")}
    >
      {label}
    </Link>
  );
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-lg font-bold">
          KahitSaan
        </Link>
        {/* Static until the local model lands in Phase 3 (TASKS 3.6). */}
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">Simple mode</span>
      </header>
      <main className="flex-1 px-4 pb-20">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t bg-background">
        {tab("/", "Kain")}
        {tab("/settings", "Settings")}
      </nav>
    </div>
  );
}
