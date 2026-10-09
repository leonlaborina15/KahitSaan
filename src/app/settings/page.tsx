"use client";

import { ChevronRight, Cpu, Download, Info, ShieldCheck, Trash, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AiStatusPill, useAiStatus } from "@/components/ai-status";
import { AppShell } from "@/components/app-shell";
import { Setup } from "@/components/setup";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CHAIN_NAMES, catalog } from "@/lib/catalog";
import { clearAll, loadPrefs, loadTaste, resetTaste, savePrefs } from "@/lib/store/db";
import type { Prefs, TasteProfile } from "@/lib/types";

const PRIORITY_LABELS = { cheap: "Mura", fast: "Mabilis", near: "Malapit", filling: "Busog" };

function Section({ Icon, title, children }: { Icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[20px] border bg-card p-4">
      <h2 className="flex items-center gap-2 text-base">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary" aria-hidden>
          <Icon className="size-5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default function Settings() {
  const router = useRouter();
  const ai = useAiStatus();
  const [prefs, setPrefs] = useState<Prefs | null | undefined>(undefined);
  const [taste, setTaste] = useState<TasteProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    void loadPrefs().then((p) => setPrefs(p ?? null));
    void loadTaste().then(setTaste);
  }, []);

  if (editing && prefs)
    return (
      <AppShell nav={false}>
        <Setup
          initial={prefs}
          onBack={() => setEditing(false)}
          onDone={(p) =>
            void savePrefs(p).then(() => {
              setPrefs(p);
              setEditing(false);
              toast.success("Na-save ang preferences mo.");
            })
          }
        />
      </AppShell>
    );

  const topTags = taste
    ? Object.entries(taste.tag_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([t]) => t)
    : [];

  return (
    <AppShell>
      <div className="flex flex-col gap-4 py-2">
        <h1 className="text-[28px]">Settings</h1>

        <Section Icon={Utensils} title="Preferences">
          {prefs === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : prefs === null ? (
            <p className="text-sm text-muted-foreground">Wala pang setup. Pumunta sa Kain para magsimula.</p>
          ) : (
            <>
              <Row label="Budget" value={`₱${prefs.usual_budget}`} />
              <Row label="Hilig" value={prefs.favorite_foods.join(", ") || "—"} />
              <Row label="Iniiwasan" value={[...(prefs.avoid_pork ? ["baboy"] : []), ...prefs.dislikes].join(", ") || "Wala"} />
              <Row label="Priority" value={prefs.priority.map((p) => PRIORITY_LABELS[p]).join(" › ")} />
              <Row label="Kainan" value={prefs.favorite_chains.map((c) => CHAIN_NAMES[c]).join(", ") || "Kahit saan"} />
              <Row label="Taste memory" value={`${taste?.pick_count ?? 0} picks${topTags.length ? ` · ${topTags.join(", ")}` : ""}`} />
              <Button variant="outline" className="h-11 justify-between" onClick={() => setEditing(true)}>
                I-edit ang preferences <ChevronRight className="size-5" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                className="h-11"
                onClick={() =>
                  void resetTaste().then(async () => {
                    setTaste(await loadTaste());
                    toast("Na-reset ang taste memory.");
                  })
                }
              >
                I-reset ang taste memory
              </Button>
            </>
          )}
        </Section>

        <Section Icon={Cpu} title="AI model">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <AiStatusPill status={ai} />
          </div>
          <Row label="Model" value="Qwen2.5 1.5B (darating pa)" />
          <Row label="Laki" value="~1 GB, isang download lang" />
          <p className="text-sm text-muted-foreground">Sa ngayon, Basic mode muna: gumagana pa rin ang paghahanap, offline.</p>
          <Button variant="outline" className="h-11" disabled>
            <Download className="size-5" aria-hidden /> I-download ulit
          </Button>
        </Section>

        <Section Icon={ShieldCheck} title="Privacy">
          <p className="text-sm">Nasa phone mo lang lahat. Walang account, walang server, walang tracking.</p>
          <Button variant="destructive" className="h-11" onClick={() => setConfirmOpen(true)}>
            <Trash className="size-5" aria-hidden /> Burahin lahat
          </Button>
        </Section>

        <Section Icon={Info} title="About">
          <p className="text-sm">KahitSaan · AppBuildersPH Hackathon 2026 · Local AI</p>
          <p className="text-xs text-muted-foreground">
            Catalog {catalog.version}
            {catalog.mock ? " · mock data, hindi pa totoong presyo" : ""}
          </p>
        </Section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[360px] rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Burahin lahat?</DialogTitle>
            <DialogDescription>Mabubura ang preferences, taste memory at lokasyon mo sa phone na &apos;to. Hindi na ito maibabalik.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" className="h-11" />}>Huwag na</DialogClose>
            <Button
              variant="destructive"
              className="h-11"
              onClick={() =>
                void clearAll().then(() => {
                  setConfirmOpen(false);
                  toast("Nabura na lahat.");
                  router.push("/");
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
