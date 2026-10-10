import { markGlyph } from "@/lib/brand/mark";

/** Brand mark in currentColor; readable from 24px. */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: markGlyph("currentColor", "var(--background)") }}
    />
  );
}
