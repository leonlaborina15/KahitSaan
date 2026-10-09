"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CHAIN_NAMES, catalog } from "@/lib/catalog";
import { clearPrefs, loadPrefs, loadTaste, resetTaste } from "@/lib/store/db";
import type { Prefs, TasteProfile } from "@/lib/types";

const PRIORITY_LABELS = { cheap: "Mura", fast: "Mabilis", near: "Malapit", filling: "Busog" };

export default function Settings() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [taste, setTaste] = useState<TasteProfile | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void loadPrefs().then((p) => setPrefs(p ?? null));
    void loadTaste().then(setTaste);
  }, []);

  const topTags = taste
    ? Object.entries(taste.tag_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t]) => t)
    : [];

  return (
    <AppShell>
      <div className="flex flex-col gap-5 py-4">
        <h1 className="text-2xl font-bold">Settings</h1>

        <section className="rounded-xl bg-muted p-4 text-sm">
          🔒 Lahat ng data mo ay nasa phone lang na &apos;to. Walang account, walang server.
        </section>

        {prefs && (
          <section className="flex flex-col gap-1 text-sm">
            <h2 className="font-semibold">Preferences mo</h2>
            <p>Budget: ₱{prefs.usual_budget}</p>
            <p>Hilig: {prefs.favorite_foods.join(", ") || "—"}</p>
            <p>Ayaw: {[...(prefs.avoid_pork ? ["baboy"] : []), ...prefs.dislikes].join(", ") || "—"}</p>
            <p>Priority: {prefs.priority.map((p) => PRIORITY_LABELS[p]).join(" › ")}</p>
            <p>Favorite: {prefs.favorite_chains.map((c) => CHAIN_NAMES[c]).join(", ") || "—"}</p>
            <Button variant="outline" className="mt-2 h-11" onClick={() => void clearPrefs().then(() => router.push("/"))}>
              Ulitin ang setup
            </Button>
          </section>
        )}

        <section className="flex flex-col gap-1 text-sm">
          <h2 className="font-semibold">Taste memory</h2>
          <p>{taste?.pick_count ?? 0} picks · madalas: {topTags.join(", ") || "—"}</p>
          <Button
            variant="destructive"
            className="mt-2 h-11"
            onClick={() =>
              void resetTaste().then(async () => {
                setTaste(await loadTaste());
                setMsg("Na-reset na ang taste memory.");
              })
            }
          >
            I-reset ang taste memory
          </Button>
          {msg && <p className="text-muted-foreground">{msg}</p>}
        </section>

        <section className="flex flex-col gap-1 text-sm">
          <h2 className="font-semibold">AI model</h2>
          <p>Simple mode (rule-based). Ang local AI ay idadagdag sa susunod na update.</p>
        </section>

        <p className="text-xs text-muted-foreground">
          Catalog {catalog.version}
          {catalog.mock ? " · mock data, hindi pa totoong presyo" : ""}
        </p>
      </div>
    </AppShell>
  );
}
