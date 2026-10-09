"use client";

import { ChevronRight, Cpu, Download, Info, MapPin, ShieldCheck, SlidersHorizontal, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AiStatusPill, useAiStatus } from "@/components/ai-status";
import { useApp } from "@/components/app-data";
import { AppShell } from "@/components/app-shell";
import { LocationSheet } from "@/components/location";
import { Setup } from "@/components/setup";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CHAIN_NAMES, catalog } from "@/lib/catalog";
import { clearAll } from "@/lib/store/db";

const PRIORITY_LABELS = { cheap: "Mura", fast: "Mabilis", near: "Malapit", filling: "Busog" };
const APPETITE_LABELS = { light: "Konti lang", normal: "Sakto", big: "Malakas kumain" };
const AVOID_LABELS: Record<string, string> = { beef: "Baka", seafood: "Seafood", spicy: "Maanghang" };

function Section({ Icon, title, children }: { Icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-[20px] border bg-card p-4">
      <h2 className="mb-1 flex items-center gap-2 text-base">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary" aria-hidden>
          <Icon className="size-5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A tappable default that opens its setup step. */
function EditRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-12 items-center gap-3 rounded-[14px] px-2 text-left hover:bg-muted">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 truncate text-sm font-semibold">{value}</span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </button>
  );
}

export default function Ako() {
  const ai = useAiStatus();
  const { ready, prefs, setPrefs, taste, resetTaste, place } = useApp();
  const [editStep, setEditStep] = useState<number | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (editStep !== null && prefs)
    return (
      <AppShell nav={false}>
        <Setup
          initial={prefs}
          startStep={editStep}
          single
          onBack={() => setEditStep(null)}
          onDone={(p) =>
            void setPrefs(p).then(() => {
              setEditStep(null);
              toast.success("Na-save!");
            })
          }
        />
      </AppShell>
    );

  return (
    <AppShell>
      <div className="flex flex-col gap-4 py-2">
        <h1 className="text-[28px]">Ako</h1>

        <Section Icon={SlidersHorizontal} title="Defaults">
          <p className="px-2 text-xs text-muted-foreground">Default lang ito. Pag may sinabi ka sa search, yun ang masusunod.</p>
          {!ready ? (
            <Skeleton className="h-48 w-full" />
          ) : !prefs ? (
            <p className="text-sm text-muted-foreground">Wala pang setup. Pumunta sa Home para magsimula.</p>
          ) : (
            <div className="flex flex-col">
              <EditRow label="Budget" value={`₱${prefs.usual_budget}`} onClick={() => setEditStep(0)} />
              <EditRow label="Gusto" value={prefs.favorite_foods.join(", ") || "—"} onClick={() => setEditStep(1)} />
              <EditRow
                label="Iwasan"
                value={[...(prefs.avoid_pork ? ["Baboy"] : []), ...prefs.dislikes.map((d) => AVOID_LABELS[d] ?? d)].join(", ") || "Wala"}
                onClick={() => setEditStep(2)}
              />
              <EditRow label="Gutom level" value={APPETITE_LABELS[prefs.appetite]} onClick={() => setEditStep(3)} />
              <EditRow label="Priorities" value={prefs.priority.map((p) => PRIORITY_LABELS[p]).join(" › ")} onClick={() => setEditStep(4)} />
              <EditRow label="Kainan" value={prefs.favorite_chains.map((c) => CHAIN_NAMES[c]).join(", ") || "Kahit saan"} onClick={() => setEditStep(5)} />
              <div className="mt-2 flex items-center justify-between gap-2 px-2 text-sm">
                <span className="text-muted-foreground">Taste memory: {taste?.pick_count ?? 0} picks</span>
                <Button variant="ghost" className="h-11" onClick={() => void resetTaste().then(() => toast("Na-reset ang taste memory."))}>
                  I-reset
                </Button>
              </div>
            </div>
          )}
        </Section>

        <Section Icon={MapPin} title="Location">
          <EditRow label="Default area" value={place?.label ?? "Wala pa"} onClick={() => setLocOpen(true)} />
        </Section>

        <Section Icon={Cpu} title="AI sa phone mo">
          <div className="flex items-center justify-between px-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <AiStatusPill status={ai} />
          </div>
          <p className="px-2 text-sm">Model: Qwen2.5 1.5B · ~1 GB, isang download lang</p>
          <p className="px-2 text-sm text-muted-foreground">Basic mode muna sa ngayon. Gumagana pa rin ang paghahanap, kahit offline.</p>
          <Button variant="outline" className="h-11" disabled>
            <Download className="size-5" aria-hidden /> I-download ulit
          </Button>
        </Section>

        <Section Icon={ShieldCheck} title="Privacy">
          <p className="px-2 text-sm">Nasa phone mo lang lahat. Walang account, walang server, walang tracking.</p>
          <Button variant="destructive" className="h-11" onClick={() => setConfirmOpen(true)}>
            <Trash className="size-5" aria-hidden /> Burahin lahat
          </Button>
        </Section>

        <Section Icon={Info} title="About">
          <p className="px-2 text-sm">KahitSaan · AppBuildersPH Hackathon 2026 · Local AI</p>
          <p className="px-2 text-xs text-muted-foreground">
            Catalog {catalog.version}
            {catalog.mock ? " · mock data, hindi pa totoong presyo" : ""}
          </p>
        </Section>
      </div>

      <LocationSheet open={locOpen} onOpenChange={setLocOpen} />
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[360px] rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Burahin lahat?</DialogTitle>
            <DialogDescription>
              Mabubura ang defaults, taste memory, Kinain, Saved at lokasyon mo sa phone na &apos;to. Hindi na ito maibabalik.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" className="h-11" />}>Huwag na</DialogClose>
            <Button
              variant="destructive"
              className="h-11"
              onClick={() =>
                void clearAll().then(() => {
                  // Full reload so every screen starts fresh.
                  window.location.href = "/";
                })
              }
            >
              Burahin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
