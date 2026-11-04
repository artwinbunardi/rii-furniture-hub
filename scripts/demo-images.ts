/**
 * Generates clearly-labelled DEMO product illustrations (SVG) so the app works offline
 * without using any copyrighted photography. Replace them with real RII photos via the
 * Media Library / product editor.
 */
const PALETTE: Record<string, string> = {
  "Abu-abu": "#9a9a9f", Grey: "#9a9a9f", Charcoal: "#3d3d42", Hitam: "#232326", Black: "#232326",
  Putih: "#ecebe6", White: "#ecebe6", Krem: "#e6dccb", Cream: "#e6dccb", Beige: "#d8c7a8",
  Cokelat: "#7a5236", Walnut: "#5e3e2a", Oak: "#b88b5a", Natural: "#c9a77c", Emas: "#c4a05a", Gold: "#c4a05a",
  Hijau: "#5f7a5c", Sage: "#8ea08a", Biru: "#3f5a7a", Navy: "#26354f", Terracotta: "#b8603e", Mustard: "#cf9f3a",
  Pink: "#d9a3a0", Merah: "#9c3b33", Chrome: "#b9bec4", Rattan: "#c8a46a", Marmer: "#e9e6e1",
};

export function colorHex(name: string) {
  return PALETTE[name] ?? "#9a8f80";
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const LEG = "#2b2b2e";

function shape(kind: string, col: string, accent: string): string {
  const d = shade(col, -0.12), l = shade(col, 0.08);
  switch (kind) {
    case "sofa":
      return `<rect x="150" y="330" width="500" height="110" rx="26" fill="${col}"/>
        <rect x="170" y="230" width="460" height="130" rx="34" fill="${d}"/>
        <rect x="130" y="290" width="70" height="150" rx="28" fill="${l}"/><rect x="600" y="290" width="70" height="150" rx="28" fill="${l}"/>
        <rect x="205" y="320" width="190" height="40" rx="16" fill="${l}"/><rect x="405" y="320" width="190" height="40" rx="16" fill="${l}"/>
        <rect x="170" y="440" width="14" height="40" rx="4" fill="${LEG}"/><rect x="616" y="440" width="14" height="40" rx="4" fill="${LEG}"/>`;
    case "lounge-chair":
      return `<path d="M270 200 Q400 150 530 200 L560 360 Q400 390 240 360 Z" fill="${d}"/>
        <rect x="240" y="330" width="320" height="90" rx="36" fill="${col}"/>
        <path d="M280 420 L250 490" stroke="${LEG}" stroke-width="12" stroke-linecap="round"/><path d="M520 420 L550 490" stroke="${LEG}" stroke-width="12" stroke-linecap="round"/>
        <path d="M330 420 L320 480" stroke="${LEG}" stroke-width="10" stroke-linecap="round" opacity=".6"/>`;
    case "dining-chair":
      return `<rect x="320" y="150" width="160" height="170" rx="22" fill="${d}"/>
        <rect x="300" y="310" width="200" height="40" rx="12" fill="${col}"/>
        <rect x="310" y="350" width="12" height="140" fill="${LEG}"/><rect x="478" y="350" width="12" height="140" fill="${LEG}"/>
        <rect x="340" y="350" width="10" height="120" fill="${LEG}" opacity=".5"/><rect x="452" y="350" width="10" height="120" fill="${LEG}" opacity=".5"/>`;
    case "bar-stool":
      return `<ellipse cx="400" cy="190" rx="95" ry="26" fill="${col}"/><rect x="305" y="170" width="190" height="22" rx="10" fill="${d}"/>
        <path d="M335 200 L300 490 M465 200 L500 490 M370 200 L360 470 M430 200 L440 470" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
        <ellipse cx="400" cy="380" rx="88" ry="14" fill="none" stroke="${accent}" stroke-width="8"/>`;
    case "coffee-table":
      return `<ellipse cx="400" cy="330" rx="220" ry="54" fill="${col}"/><ellipse cx="400" cy="322" rx="220" ry="50" fill="${l}"/>
        <rect x="300" y="350" width="16" height="110" fill="${accent}"/><rect x="484" y="350" width="16" height="110" fill="${accent}"/><rect x="392" y="360" width="16" height="110" fill="${accent}" opacity=".6"/>`;
    case "dining-table":
      return `<rect x="110" y="250" width="580" height="34" rx="8" fill="${col}"/><rect x="110" y="282" width="580" height="10" fill="${d}"/>
        <rect x="150" y="292" width="20" height="190" fill="${accent}"/><rect x="630" y="292" width="20" height="190" fill="${accent}"/>
        <rect x="200" y="292" width="16" height="160" fill="${accent}" opacity=".5"/><rect x="584" y="292" width="16" height="160" fill="${accent}" opacity=".5"/>`;
    case "console-table":
      return `<rect x="190" y="230" width="420" height="26" rx="4" fill="${col}"/>
        <rect x="200" y="256" width="400" height="60" fill="${d}"/><rect x="215" y="268" width="180" height="36" rx="3" fill="${l}"/><rect x="405" y="268" width="180" height="36" rx="3" fill="${l}"/>
        <rect x="205" y="316" width="14" height="170" fill="${accent}"/><rect x="581" y="316" width="14" height="170" fill="${accent}"/>`;
    case "counter-reception":
      return `<rect x="150" y="210" width="500" height="30" rx="6" fill="${accent}"/>
        <path d="M165 240 H635 V470 H165 Z" fill="${col}"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${185 + i * 57}" y="255" width="36" height="200" rx="18" fill="${d}" opacity=".55"/>`).join("")}`;
    case "display-furniture":
      return `<rect x="190" y="300" width="150" height="180" fill="${col}"/><rect x="340" y="220" width="130" height="260" fill="${d}"/><rect x="470" y="340" width="140" height="140" fill="${l}"/>
        <circle cx="405" cy="190" r="26" fill="${accent}"/><rect x="235" y="268" width="60" height="32" rx="4" fill="${accent}" opacity=".8"/>`;
    case "decorative-accessories":
      return `<path d="M360 200 Q330 300 350 380 Q365 460 400 470 Q435 460 450 380 Q470 300 440 200 Z" fill="${col}"/>
        <ellipse cx="400" cy="200" rx="40" ry="10" fill="${d}"/>
        <path d="M400 200 C 390 150 360 120 330 110 M400 200 C 410 140 450 110 480 100 M400 200 C 400 140 400 110 405 80" stroke="#5f7a5c" stroke-width="5" fill="none"/>
        <path d="M520 470 Q540 360 600 340 Q640 380 620 470 Z" fill="${accent}" opacity=".7"/>`;
    case "shelving-storage":
      return `<rect x="230" y="120" width="340" height="370" fill="none" stroke="${accent}" stroke-width="12"/>
        ${[0, 1, 2, 3].map((i) => `<rect x="236" y="${200 + i * 80}" width="328" height="10" fill="${accent}"/>`).join("")}
        <rect x="260" y="150" width="40" height="50" fill="${col}"/><rect x="310" y="165" width="30" height="35" fill="${d}"/><rect x="450" y="235" width="80" height="45" fill="${col}"/>
        <circle cx="300" cy="350" r="26" fill="${l}"/><rect x="420" y="310" width="34" height="80" fill="${d}"/><rect x="290" y="420" width="120" height="50" fill="${col}"/>`;
    default:
      return `<rect x="220" y="290" width="360" height="120" rx="40" fill="${col}"/><rect x="220" y="270" width="360" height="40" rx="20" fill="${l}"/>
        <rect x="250" y="410" width="14" height="70" fill="${LEG}"/><rect x="536" y="410" width="14" height="70" fill="${LEG}"/>`;
  }
}

const BACKGROUNDS = [
  ["#f4f2ee", "#e9e5dd"],
  ["#eef0f1", "#dfe3e6"],
  ["#f6efe8", "#ebdccd"],
];

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

export function productSvg(opts: { kind: string; color: string; accent?: string; name: string; sku: string; variant: number }) {
  const col = colorHex(opts.color);
  const accent = opts.accent ? colorHex(opts.accent) : "#2f2f33";
  const [b1, b2] = BACKGROUNDS[opts.variant % BACKGROUNDS.length];
  const scale = opts.variant === 1 ? 1.18 : opts.variant === 2 ? 0.9 : 1;
  const tx = opts.variant === 1 ? -70 : opts.variant === 2 ? 40 : 0;
  const ty = opts.variant === 1 ? -50 : opts.variant === 2 ? 25 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect y="470" width="800" height="130" fill="${b2}" opacity=".7"/>
  <ellipse cx="400" cy="490" rx="${opts.kind === "dining-table" ? 320 : 230}" ry="18" fill="#000" opacity=".08"/>
  <g transform="translate(${tx} ${ty}) translate(400 300) scale(${scale}) translate(-400 -300)">${shape(opts.kind, col, accent)}</g>
  ${opts.variant === 2 ? `<g opacity=".9"><rect x="560" y="40" width="200" height="130" rx="12" fill="#fff"/><rect x="575" y="55" width="80" height="100" rx="8" fill="${col}"/><rect x="665" y="55" width="80" height="100" rx="8" fill="${accent}"/><text x="660" y="190" font-family="Helvetica,Arial" font-size="13" text-anchor="middle" fill="#555">${esc(opts.color)}</text></g>` : ""}
  <text x="32" y="48" font-family="Helvetica,Arial" font-size="15" letter-spacing="3" fill="#8a8580">DEMO IMAGE · RII FURNITURE HUB</text>
  <text x="32" y="566" font-family="Helvetica,Arial" font-size="20" font-weight="600" fill="#3a3733">${esc(opts.name)}</text>
  <text x="768" y="566" font-family="Helvetica,Arial" font-size="15" text-anchor="end" fill="#8a8580">${esc(opts.sku)}</text>
</svg>`;
}

export type BannerScene = "sofa" | "chairs" | "banquet" | "arch" | "booth" | "shelves";

function scene(kind: BannerScene, c: string) {
  switch (kind) {
    case "chairs": // a row of dining chairs
      return [0, 1, 2, 3].map((i) => `<g transform="translate(${880 + i * 150} 300)"><rect x="0" y="0" width="90" height="170" rx="14" fill="${c}" opacity=".92"/><rect x="-6" y="160" width="102" height="34" rx="8" fill="${c}"/><rect x="4" y="194" width="10" height="130" fill="#222"/><rect x="76" y="194" width="10" height="130" fill="#222"/></g>`).join("");
    case "banquet": // round banquet table with cloth and chairs
      return `<ellipse cx="1180" cy="520" rx="300" ry="60" fill="#fff" opacity=".85"/><path d="M880 520 Q880 660 960 660 L1400 660 Q1480 660 1480 520 Z" fill="#fff" opacity=".75"/>
        <rect x="1150" y="380" width="60" height="120" rx="20" fill="${c}"/><circle cx="1180" cy="360" r="46" fill="${c}" opacity=".8"/>
        ${[800, 1500].map((x) => `<g transform="translate(${x} 380)"><rect width="80" height="150" rx="30" fill="${c}" opacity=".85"/><rect x="-6" y="140" width="92" height="30" rx="8" fill="${c}"/><rect x="6" y="170" width="8" height="120" fill="#222"/><rect x="66" y="170" width="8" height="120" fill="#222"/></g>`).join("")}`;
    case "arch": // arched niche with a lounge chair
      return `<path d="M940 760 V360 a240 240 0 0 1 480 0 V760 Z" fill="${c}" opacity=".35"/>
        <path d="M1040 610 q0 -150 140 -150 q140 0 140 150 v40 h-280 Z" fill="${c}"/><rect x="1020" y="600" width="320" height="70" rx="30" fill="${c}" opacity=".85"/>
        <rect x="1060" y="670" width="14" height="80" fill="#222"/><rect x="1286" y="670" width="14" height="80" fill="#222"/>
        <circle cx="900" cy="700" r="40" fill="#fff" opacity=".3"/><rect x="893" y="700" width="14" height="60" fill="#222" opacity=".6"/>`;
    case "booth": // exhibition counter with back wall panels
      return `<rect x="860" y="200" width="200" height="420" fill="${c}" opacity=".45"/><rect x="1070" y="200" width="200" height="420" fill="${c}" opacity=".6"/><rect x="1280" y="200" width="200" height="420" fill="${c}" opacity=".45"/>
        <rect x="980" y="470" width="380" height="200" rx="10" fill="#fff" opacity=".9"/><rect x="980" y="470" width="380" height="26" fill="${c}"/>
        <rect x="900" y="560" width="50" height="110" rx="8" fill="#fff" opacity=".7"/><rect x="1390" y="560" width="50" height="110" rx="8" fill="#fff" opacity=".7"/>`;
    case "shelves": // open shelving with objects
      return `<rect x="900" y="180" width="16" height="520" fill="#222" opacity=".8"/><rect x="1420" y="180" width="16" height="520" fill="#222" opacity=".8"/>
        ${[260, 400, 540].map((y) => `<rect x="900" y="${y}" width="536" height="14" fill="#222" opacity=".8"/>`).join("")}
        <rect x="950" y="190" width="60" height="70" rx="6" fill="${c}"/><circle cx="1120" cy="225" r="34" fill="#fff" opacity=".7"/><rect x="1250" y="200" width="110" height="60" rx="6" fill="${c}" opacity=".7"/>
        <rect x="960" y="330" width="140" height="70" rx="6" fill="#fff" opacity=".6"/><rect x="1180" y="320" width="40" height="80" rx="20" fill="${c}"/><rect x="1300" y="340" width="80" height="60" rx="6" fill="${c}" opacity=".6"/>
        <rect x="980" y="470" width="90" height="70" rx="6" fill="${c}" opacity=".8"/><rect x="1150" y="480" width="200" height="60" rx="30" fill="#fff" opacity=".7"/>`;
    default: // sofa + side table
      return `<rect x="980" y="300" width="420" height="230" rx="60" fill="${c}" opacity=".9"/><rect x="1010" y="200" width="360" height="160" rx="60" fill="${c}" opacity=".7"/>
        <rect x="1020" y="530" width="18" height="90" fill="#222"/><rect x="1342" y="530" width="18" height="90" fill="#222"/>
        <rect x="560" y="420" width="260" height="22" rx="4" fill="#fff" opacity=".5"/><rect x="580" y="442" width="14" height="190" fill="#222" opacity=".8"/><rect x="786" y="442" width="14" height="190" fill="#222" opacity=".8"/>`;
  }
}

export function bannerSvg(title: string, sub: string, tone: [string, string, string], kind: BannerScene = "sofa") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tone[0]}"/><stop offset="1" stop-color="${tone[1]}"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#b)"/>
  <rect x="0" y="640" width="1600" height="260" fill="${tone[2]}" opacity=".35"/>
  <circle cx="300" cy="260" r="140" fill="#fff" opacity=".12"/>
  ${scene(kind, tone[2])}
  <text x="80" y="110" font-family="Helvetica,Arial" font-size="22" letter-spacing="6" fill="#fff" opacity=".8">DEMO BANNER · ${esc(title.toUpperCase())}</text>
  <text x="80" y="820" font-family="Helvetica,Arial" font-size="26" fill="#fff" opacity=".85">${esc(sub)}</text>
</svg>`;
}

export function logoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 64" width="240" height="64">
  <rect x="0" y="8" width="48" height="48" rx="12" fill="#1f1f23"/><path d="M14 44 V20 h11 a7 7 0 0 1 0 14 h-11 M25 34 l9 10" stroke="#e6cf9f" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="60" y="41" font-family="Helvetica,Arial" font-size="24" font-weight="700" fill="#1f1f23">RII</text>
  <text x="104" y="41" font-family="Helvetica,Arial" font-size="18" fill="#6b6b73">Furniture</text>
</svg>`;
}
