// Shapes from SPEC.md §3–4. Change SPEC.md first, then this file.

export type ChainId = "jollibee" | "mcdonalds" | "mang-inasal" | "chowking";
export type Category = "meal" | "main" | "side" | "drink" | "dessert" | "bundle";
export type Level = "low" | "normal" | "high";
export type Priority = "cheap" | "fast" | "near" | "filling";

export interface CatalogItem {
  id: string;
  chain: ChainId;
  name: string;
  price: number; // whole pesos
  category: Category;
  tags: string[];
  protein: string | null;
  contains_pork: boolean;
  spicy: boolean;
  fill_score: number; // 1–5
  prep_minutes: number;
  serves: number;
  desc: string;
}

export interface Branch {
  id: string;
  chain: ChainId;
  name: string;
  lat: number;
  lng: number;
  hours: { open: string; close: string }; // "HH:MM" 24h
  is_24h: boolean;
  base_wait_minutes: number;
  has_drive_thru: boolean;
  source?: string;
}

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Catalog {
  version: string;
  currency: "PHP";
  mock?: boolean;
  items: CatalogItem[];
  branches: Branch[];
  landmarks: Landmark[];
}

export interface Prefs {
  usual_budget: number;
  favorite_foods: string[];
  dislikes: string[];
  avoid_pork: boolean;
  appetite: "light" | "normal" | "big";
  priority: Priority[]; // index 0 = most important
  favorite_chains: ChainId[];
  created_at: string;
}

export interface TasteProfile {
  vector: number[] | null; // 384-d MiniLM, null until embeddings load
  pick_count: number;
  tag_counts: Record<string, number>;
  chain_counts: Record<string, number>;
  recent_picks: string[]; // item ids, last 10
}

/** LLM / rule-parser output contract (SPEC §4.1). null = not stated, fill from prefs. */
export interface Filters {
  budget: number | null;
  people: number;
  hunger: Level;
  urgency: Level;
  max_distance_km: number | null;
  cravings: string[];
  avoid: string[];
  chains: ChainId[];
  time_context: "late_night" | "breakfast" | null;
}

export interface Combo {
  branch: Branch;
  items: CatalogItem[];
  total: number;
  distance_km: number;
  eta_min: number;
}

export type SubScores = Record<Priority | "taste", number>;

export interface Result extends Combo {
  score: number;
  sub: SubScores;
  reason: string;
}
