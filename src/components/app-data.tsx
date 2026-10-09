"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { parseRules } from "@/lib/parse/rules";
import { resolveFilters } from "@/lib/parse/validate";
import type { ExploreFilters } from "@/lib/rank/explore";
import { EMPTY_TASTE, loadPlace, loadPrefs, loadTaste, recordPick, resetTaste, savePlace, savePrefs, type SavedPlace } from "@/lib/store/db";
import {
  addHistory, loadHistory, loadSaved, toggleSavedChain, toggleSavedItem, updateHistory, type HistoryEntry, type Saved,
} from "@/lib/store/history";
import type { Branch, CatalogItem, ChainId, Filters, Prefs, TasteProfile } from "@/lib/types";

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
 * Setup answers are defaults; the typed request overrides what it mentions (resolveFilters).
 * Returns the filters plus which chips came from setup.
 */
export function filtersFromRequest(text: string, prefs: Prefs, now = new Date()) {
  const parsed: Filters = parseRules(text);
  const f: ExploreFilters = {
    ...resolveFilters(parsed, prefs, now),
    open_only: true,
    food_types: parsed.cravings,
  };
  const fromSetup = new Set<string>();
  if (parsed.budget === null) fromSetup.add("budget");
  if (parsed.hunger === "normal") fromSetup.add("hunger");
  if (f.avoid.some((a) => !parsed.avoid.includes(a))) fromSetup.add("avoid");
  return { filters: f, fromSetup };
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

  useEffect(() => {
    void Promise.all([loadPrefs(), loadTaste(), loadHistory(), loadSaved()]).then(([p, t, h, s]) => {
      setPrefsState(p ?? null);
      setTaste(t);
      setHistory(h);
      setSaved(s);
      setReady(true);
    });
  }, []);

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

  useEffect(locate, [locate]);

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
    rate: async (id, rating, dismissed) => setHistory(await updateHistory(id, { rating, ...(dismissed ? { rating_dismissed: true } : {}) })),
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

