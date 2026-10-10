// KahitSaan mark: a rice bowl whose steam is two crossing shuffle arrows.
// One source for the header logo, favicon and PWA icons.

/** Glyph only, drawn in a 48x48 box. `fg` = bowl/arrows, `bg` = bowl cut-out. */
export function markGlyph(fg: string, bg: string) {
  return `
  <path d="M7 26h34a17 17 0 0 1-34 0Z" fill="${fg}"/>
  <path d="M15 26a9 3 0 0 0 18 0" fill="none" stroke="${bg}" stroke-width="2.5" stroke-linecap="round"/>
  <g fill="none" stroke="${fg}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20c5 0 6-10 11-10h10"/>
    <path d="M12 10c5 0 6 10 11 10h10"/>
    <path d="m30 6.5 3.5 3.5-3.5 3.5"/>
    <path d="m30 16.5 3.5 3.5-3.5 3.5"/>
  </g>`;
}

/** Full app icon. `maskable` keeps the glyph inside the 80% safe zone and fills edge to edge. */
export function iconSvg(size: number, { maskable = false } = {}) {
  const pad = maskable ? 0.22 : 0.16;
  const inner = size * (1 - pad * 2);
  const radius = maskable ? 0 : size * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#E8501F"/>
  <g transform="translate(${size * pad} ${size * pad}) scale(${inner / 48})">${markGlyph("#FFF8F1", "#E8501F")}</g>
</svg>`;
}
