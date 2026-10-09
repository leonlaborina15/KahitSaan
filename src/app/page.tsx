import catalog from "../../public/catalog.json";
import type { Catalog } from "@/lib/types";

// Phase 0 placeholder. Replaced by the real Home screen in Phase 1 (TASKS.md 1.3).
export default function Home() {
  const c = catalog as Catalog;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-2 p-6">
      <h1 className="text-2xl font-bold">KahitSaan</h1>
      <p className="text-muted-foreground">Sulit na kain, kahit saan sa Cabanatuan.</p>
      <p className="text-sm">
        Catalog {c.version}: {c.items.length} items, {c.branches.length} branches
        {c.mock ? " (mock data)" : ""}
      </p>
    </main>
  );
}
