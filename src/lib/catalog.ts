import data from "../../public/catalog.json";
import type { Catalog, ChainId } from "@/lib/types";

export const catalog = data as Catalog;

export const CHAIN_NAMES: Record<ChainId, string> = {
  jollibee: "Jollibee",
  mcdonalds: "McDonald's",
  "mang-inasal": "Mang Inasal",
  chowking: "Chowking",
};

export const CHAIN_COLORS: Record<ChainId, string> = {
  jollibee: "bg-red-600",
  mcdonalds: "bg-yellow-500",
  "mang-inasal": "bg-green-700",
  chowking: "bg-orange-600",
};
