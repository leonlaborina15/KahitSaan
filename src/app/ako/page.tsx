"use client";

import { CaretRight, Cpu, DownloadSimple, Info, MapPin, ShieldCheck, SlidersHorizontal, Trash } from "@phosphor-icons/react";
import { Kanin } from "@/components/kanin";
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
import { MODELS, loadModel } from "@/lib/ai/llm";
import { CHAIN_NAMES, catalog } from "@/lib/catalog";
import { clearAll } from "@/lib/store/db";

const PRIORITY_LABELS = { cheap: "Mura", fast: "Mabilis", near: "Malapit", filling: "Busog" };
const APPETITE_LABELS = { light: "Konti lang", normal: "Sakto", big: "Malakas kumain" };
const AVOID_LABELS: Record<string, string> = { beef: "Baka", seafood: "Seafood", spicy: "Maanghang" };

function Section({ Icon, title, children, ube = false }: { Icon: typeof Info; title: string; children: React.ReactNode; ube?: boolean }) {
  return (
    <section className="flex flex-col gap-2 rounded-[24px] border bg-card p-4">
      <h2 className="mb-1 flex items-center gap-2 text-base">
        <span className={ube ? "flex size-9 items-center justify-center rounded-[14px] bg-ube-soft text-ube" : "flex size-9 items-center justify-center rounded-[14px] bg-primary-soft text-primary"} aria-hidden>
          <Icon size={22} weight="duotone" />
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
    <button type="button" onClick={onClick} className="flex min-h-12 items-center gap-3 rounded-[16px] px-2 text-left hover:bg-muted">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 truncate text-sm font-semibold">{value}</span>
      <CaretRight size={18} className="text-muted-foreground" aria-hidden />
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
        <div className="flex items-center gap-3">
          <Kanin mood="happy" size={56} />
          <h1 className="text-[32px]">Ako</h1>
        </div>

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

        <Section Icon={Cpu} title="AI sa phone mo" ube>
          <div className="flex items-center justify-between px-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <AiStatusPill status={ai} />
          </div>
          {ai.state === "ready" ? (
            <p className="px-2 text-sm">
              Model: {MODELS[ai.model].label} · tumatakbo sa phone mo, kahit offline.
            </p>
          ) : ai.state === "loading" ? (
            <p className="px-2 text-sm text-muted-foreground">Dina-download… pwede ka pa ring maghanap habang hinihintay.</p>
          ) : ai.reason === "no-webgpu" ? (
            <p className="px-2 text-sm text-muted-foreground">Walang WebGPU ang browser na &apos;to, kaya Simple mode. Gumagana pa rin ang paghahanap.</p>
          ) : (
            <>
              <p className="px-2 text-sm">I-download ang AI brain (isang beses lang). Wi-Fi ang mas mainam.</p>
              {ai.reason === "error" && <p className="px-2 text-sm text-destructive">Hindi na-load ang AI. Subukan ulit o gamitin ang small.</p>}
              <Button className="h-11" onClick={() => void loadModel("big")}>
                <DownloadSimple size={20} aria-hidden /> Download ({MODELS.big.size})
              </Button>
              <Button variant="outline" className="h-11" onClick={() => void loadModel("small")}>
                Small model ({MODELS.small.size})
              </Button>
            </>
          )}
          {ai.state === "ready" && ai.model === "big" && (
            <Button variant="ghost" className="h-11" onClick={() => void loadModel("small")}>
              Lipat sa small model ({MODELS.small.size})
            </Button>
          )}
        </Section>

        <Section Icon={ShieldCheck} title="Privacy">
          <p className="px-2 text-sm">Nasa phone mo lang lahat. Walang account, walang server, walang tracking.</p>
          <Button variant="destructive" className="h-11" onClick={() => setConfirmOpen(true)}>
            <Trash size={20} aria-hidden /> Burahin lahat
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
