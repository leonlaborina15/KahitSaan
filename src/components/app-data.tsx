"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { catalog } from "@/lib/catalog";
import { DEFAULT_PREFS, EMPTY_TASTE, loadPlace, loadPrefs, loadTaste, recordPick, recordVote, resetTaste, savePlace, savePrefs, type SavedPlace } from "@/lib/store/db";
import {
  addHistory, loadHistory, loadSaved, toggleSavedChain, toggleSavedItem, updateHistory, type HistoryEntry, type Saved,
} from "@/lib/store/history";
import type { Branch, CatalogItem, ChainId, Prefs, TasteProfile } from "@/lib/types";

type LocStatus = "locating" | "ready" | "need-pick";

interface AppData {
  ready: boolean;
  prefs: Prefs | null;
  setPrefs: (p: Prefs) => Promise<void>;
  taste: TasteProfile | null;
  resetTaste: () => Promise<void>;
  history: HistoryEntry[];
  rate: (id: string, rating: "up" | "down" | null, dismissed?: boolean) => Promise<void>;
  saved: Saved;
  toggleItem: (key: string) => void;
  toggleChain: (c: ChainId) => void;
  place: SavedPlace | null;
  locStatus: LocStatus;
  pickPlace: (p: SavedPlace) => void;
  locate: () => void;
  /** "Ito na!": record taste + history, open the confirmation sheet. */
  confirm: (items: CatalogItem[], branch: Branch, total: number) => void;
  confirmed: { items: CatalogItem[]; branch: Branch; total: number } | null;
  closeConfirm: () => void;
  /** Food detail sheet target. */
  detail: { items: CatalogItem[]; total: number } | null;
  openDetail: (items: CatalogItem[]) => void;
  closeDetail: () => void;
}

const Ctx = createContext<AppData | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppDataProvider");
  return v;
}

/**
 * `?demo=1` on first open: skip setup with a sample profile and a Cabanatuan landmark,
 * so judges (and screenshot runs) land straight on Home. Only fills what's empty.
 */
async function seedDemo() {
  if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("demo") !== "1") return;
  if (!(await loadPrefs()))
    await savePrefs({
      ...DEFAULT_PREFS,
      usual_budget: 150,
      favorite_foods: ["chicken", "rice", "spaghetti"],
      appetite: "big",
      avoid_pork: true,
      priority: ["cheap", "filling", "near", "fast"],
      favorite_chains: ["jollibee", "mang-inasal"],
      created_at: new Date().toISOString(),
    });
  if (!(await loadPlace())) {
    const l = catalog.landmarks.find((x) => x.id === "public-market") ?? catalog.landmarks[0];
    await savePlace({ lat: l.lat, lng: l.lng, label: l.name, source: "landmark" });
  }
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs | null>(null);
  const [taste, setTaste] = useState<TasteProfile | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saved, setSaved] = useState<Saved>({ items: [], chains: [] });
  const [place, setPlace] = useState<SavedPlace | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>("locating");
  const [confirmed, setConfirmed] = useState<AppData["confirmed"]>(null);
  const [detail, setDetail] = useState<AppData["detail"]>(null);
  const locTimer = useRef<ReturnType<typeof setTimeout>>(undefined);


  /** GPS once (5 s timeout), else saved landmark, else ask (SPEC §10). */
  const locate = useCallback(() => {
    let done = false;
    setLocStatus("locating");
    const fallback = async () => {
      if (done) return;
      done = true;
      const saved = await loadPlace();
      if (saved) {
        setPlace(saved);
        setLocStatus("ready");
      } else setLocStatus("need-pick");
    };
    if (!("geolocation" in navigator)) return void fallback();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (done) return;
        done = true;
        setPlace({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Lokasyon mo ngayon", source: "gps" });
        setLocStatus("ready");
      },
      fallback,
      { timeout: 5000, maximumAge: 60_000 },
    );
    clearTimeout(locTimer.current);
    locTimer.current = setTimeout(fallback, 6000);
  }, []);


  useEffect(() => {
    // Seed first (demo links), then read stored data and start locating.
    void seedDemo().then(() => Promise.all([loadPrefs(), loadTaste(), loadHistory(), loadSaved()])).then(([p, t, h, s]) => {
      locate();
      setPrefsState(p ?? null);
      setTaste(t);
      setHistory(h);
      setSaved(s);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AppData = {
    ready,
    prefs,
    setPrefs: async (p) => {
      await savePrefs(p);
      setPrefsState(p);
    },
    taste,
    resetTaste: async () => {
      await resetTaste();
      setTaste(EMPTY_TASTE);
    },
    history,
    rate: async (id, rating, dismissed) => {
      // 👎 counts against the meal's tags; changing away from 👎 undoes it.
      const prev = history.find((h) => h.id === id);
      if (prev && (prev.rating === "down") !== (rating === "down")) {
        const items = prev.item_ids.map((i) => catalog.items.find((x) => x.id === i)).filter((x): x is CatalogItem => !!x);
        if (items.length) setTaste(await recordVote(items, rating === "down" ? -1 : 1));
      }
      setHistory(await updateHistory(id, { rating, ...(dismissed ? { rating_dismissed: true } : {}) }));
    },
    saved,
    toggleItem: (key) =>
      void toggleSavedItem(key).then((s) => {
        setSaved(s);
        toast(s.items.includes(key) ? "Na-save!" : "Tinanggal sa saved.");
      }),
    toggleChain: (c) => void toggleSavedChain(c).then(setSaved),
    place,
    locStatus,
    pickPlace: (p) => {
      setPlace(p);
      setLocStatus("ready");
      void savePlace(p);
    },
    locate,
    confirm: (items, branch, total) => {
      setDetail(null);
      setConfirmed({ items, branch, total });
      void recordPick(items).then(setTaste);
      void addHistory({
        item_ids: items.map((i) => i.id),
        label: [...new Set(items.map((i) => i.name))].join(" + "),
        branch_id: branch.id,
        branch_name: branch.name,
        chain: branch.chain,
        total,
      }).then(setHistory);
      toast.success("Enjoy! Natandaan ko 'to.");
    },
    confirmed,
    closeConfirm: () => setConfirmed(null),
    detail,
    openDetail: (items) => setDetail({ items, total: items.reduce((s, i) => s + i.price, 0) }),
    closeDetail: () => setDetail(null),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

