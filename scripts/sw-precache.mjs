// After `next build`: list every exported file in out/ and write it into out/sw.js,
// so the first visit caches the whole app for offline use.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = "out";
const SKIP = new Set(["sw.js"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(OUT)
  .map((p) => relative(OUT, p).split(sep).join("/"))
  .filter((f) => !SKIP.has(f) && !f.endsWith(".map") && !f.startsWith("icons/icon.svg"));

// out/results.html is served at /results, out/index.html at /.
const urls = files.map((f) => {
  if (f === "index.html") return "/";
  if (f.endsWith(".html")) return "/" + f.slice(0, -".html".length).replace(/\/index$/, "");
  return "/" + f;
});

const hash = createHash("sha256");
for (const f of files.sort()) hash.update(f).update(readFileSync(join(OUT, f)));
const version = hash.digest("hex").slice(0, 12);

const swPath = join(OUT, "sw.js");
const sw = readFileSync(swPath, "utf8").replace("__VERSION__", version);
writeFileSync(swPath, `self.__PRECACHE__ = ${JSON.stringify(urls)};\n${sw}`);
const kb = Math.round(files.reduce((s, f) => s + statSync(join(OUT, f)).size, 0) / 1024);
console.log(`sw.js: ${urls.length} files precached (${kb} KB), version ${version}`);
