import { ImageResponse } from "next/og";
import { iconSvg } from "@/lib/brand/mark";

// Rendered to PNG at build time (static export); no image files to keep in sync.
export const dynamic = "force-static";

const FILES: Record<string, { size: number; maskable?: boolean }> = {
  "icon-192.png": { size: 192 },
  "icon-512.png": { size: 512 },
  "maskable-512.png": { size: 512, maskable: true },
  "apple-touch-icon.png": { size: 180, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const f = FILES[file];
  if (!f) return new Response("Not found", { status: 404 });
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg(f.size, { maskable: f.maskable }))}`;
  // eslint-disable-next-line @next/next/no-img-element
  return new ImageResponse(<img src={src} width={f.size} height={f.size} alt="" />, { width: f.size, height: f.size });
}
