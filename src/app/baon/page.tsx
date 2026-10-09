import { Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function Baon() {
  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Wallet className="size-9" aria-hidden />
        </div>
        <h1 className="text-2xl">Baon tracker</h1>
        <p className="max-w-[28ch] text-muted-foreground">Coming soon. Dito mo makikita kung magkano na&apos;ng nagastos mo sa kain.</p>
      </div>
    </AppShell>
  );
}
