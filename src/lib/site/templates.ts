// 50 website templates (10 categories × 5). Each template is pure configuration data:
// theme tokens + header/footer layout + page compositions built from the shared section
// registry. The same renderer displays them with live product & availability data.
import type { SiteSnapshot, Theme, HeaderConfig, FooterConfig, NavLink } from "./types";
import { DEFAULT_THEME } from "./theme";
import { page, systemPages } from "./default-site";

export const TEMPLATE_CATEGORIES: [string, string, string][] = [
  ["minimalist", "Minimalis", "Minimalist Furniture"],
  ["modern-luxury", "Modern Mewah", "Modern Luxury"],
  ["scandinavian", "Skandinavia", "Scandinavian"],
  ["contemporary", "Interior Kontemporer", "Contemporary Interior"],
  ["industrial", "Industrial", "Industrial Furniture"],
  ["event-exhibition", "Sewa Event & Pameran", "Event & Exhibition Rental"],
  ["premium-lounge", "Koleksi Lounge Premium", "Premium Lounge Collection"],
  ["creative-studio", "Studio Kreatif", "Creative Studio"],
  ["corporate", "Furnitur Korporat", "Corporate Furniture"],
  ["editorial", "Etalase Editorial", "Editorial Furniture Showcase"],
];

type S = [type: string, variant?: string, props?: Record<string, any>, style?: Record<string, any>];
type Sys = Parameters<typeof systemPages>[0];
type Colors = [primary: string, secondary: string, accent: string, background: string, surface: string, text: string, muted: string, border: string, headerBg: string, headerText: string, footerBg: string, footerText: string];

type Def = {
  id: string; name: string; category: string; description: string;
  colors: Colors;
  fonts: [heading: string, body: string, weight: number, headingCase?: "none" | "uppercase", tracking?: number];
  shape: Partial<Pick<Theme, "radius" | "buttonRadius" | "buttonStyle" | "cardStyle" | "imageRatio" | "containerWidth" | "density">>;
  logoText?: string;
  header: [HeaderConfig["variant"], Partial<HeaderConfig>?];
  footer: [FooterConfig["variant"], Partial<FooterConfig>?];
  nav?: NavLink[];
  home: S[];
  sys?: Sys;
};

const B = (n: string) => `/media/demo/banner-${n}.svg`;
const P = (sku: string) => `/media/demo/${sku.toLowerCase()}-1.svg`;
const DEMO_NOTE = "Konten contoh (demo) — ubah di editor.";

const NAV_STD: NavLink[] = [
  { label: "Katalog", href: "/products" }, { label: "Koleksi", href: "/collections" },
  { label: "Reservasi Saya", href: "/my-reservations" }, { label: "Tentang", href: "/about" }, { label: "Kontak", href: "/contact" },
];
const NAV_SHORT: NavLink[] = [{ label: "Produk", href: "/products" }, { label: "Koleksi", href: "/collections" }, { label: "Tentang", href: "/about" }];
const NAV_EVENT: NavLink[] = [
  { label: "Cek Ketersediaan", href: "/products?available=1" }, { label: "Paket Acara", href: "/collections" },
  { label: "Katalog", href: "/products" }, { label: "Reservasi", href: "/my-reservations" }, { label: "Kontak", href: "/contact" },
];
const NAV_CAT: NavLink[] = [
  { label: "Sofa", href: "/products?category=sofa" }, { label: "Lounge", href: "/products?category=lounge-chair" },
  { label: "Meja", href: "/products?category=coffee-table" }, { label: "Display", href: "/products?category=display-furniture" },
  { label: "Semua", href: "/products" },
];

const DEFS: Def[] = [
  // ───────────────────────────── 1. MINIMALIST FURNITURE ─────────────────────────────
  {
    id: "min-blanc", name: "Blanc", category: "minimalist",
    description: "Putih bersih, tipografi Inter tipis, grid produk lapang tanpa ornamen.",
    colors: ["#111111", "#f5f5f4", "#111111", "#ffffff", "#fafafa", "#111111", "#7a7a7a", "#ececec", "#ffffff", "#111111", "#ffffff", "#111111"],
    fonts: ["Inter", "Inter", 500, "none", -0.03], shape: { radius: 4, buttonRadius: 2, buttonStyle: "solid", cardStyle: "minimal", imageRatio: "square", containerWidth: 1200, density: "airy" },
    header: ["minimal", { showSearch: false, ctaLabel: "Keranjang" }], footer: ["minimal"], nav: NAV_SHORT,
    home: [
      ["hero", "minimal", { eyebrow: "", heading: "Sedikit bentuk. Banyak ruang.", subheading: "Furnitur pilihan RII untuk acara yang tenang dan terkurasi.", ctaLabel: "Lihat produk", secondaryLabel: "" }],
      ["featured-products", "grid", { heading: "Terbaru", source: "newest", limit: 8, columns: 4, linkLabel: "Semua" }],
      ["text-image", "image-right", { eyebrow: "", heading: "Dipilih dengan cermat", body: "Setiap produk dicek kondisi dan ketersediaannya langsung dari gudang.", image: B("minimal"), ctaLabel: "" }],
      ["reservation-cta", "minimal", { eyebrow: "", heading: "Siap memesan?", secondaryLabel: "" }],
    ],
    sys: { catalog: "topbar", product: "stacked", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "min-grid-index", name: "Grid Index", category: "minimalist",
    description: "Katalog ala indeks bernomor, label monospace, kartu tanpa bingkai.",
    colors: ["#1a1a1a", "#efefea", "#ff4d00", "#f7f7f2", "#ffffff", "#1a1a1a", "#6f6f6a", "#dcdcd4", "#f7f7f2", "#1a1a1a", "#1a1a1a", "#f7f7f2"],
    fonts: ["IBM Plex Mono", "IBM Plex Sans", 500, "uppercase", 0.02], shape: { radius: 0, buttonRadius: 0, buttonStyle: "outline", cardStyle: "caption", imageRatio: "square", containerWidth: 1320, density: "compact" },
    header: ["classic", { showSearch: true, ctaLabel: "[ Keranjang ]" }], footer: ["split"], nav: NAV_CAT,
    home: [
      ["category-grid", "index", { eyebrow: "Indeks", heading: "Kategori", limit: 12 }],
      ["featured-products", "index", { heading: "Produk", source: "available", limit: 10 }],
      ["stats", "dividers", { heading: "Inventaris hari ini" }],
    ],
    sys: { catalog: "topbar", product: "grid", collections: "list", reservations: "table", login: "card" },
  },
  {
    id: "min-mono-gallery", name: "Mono Gallery", category: "minimalist",
    description: "Hitam-putih galeri, gambar potret, hero tipografi di tengah.",
    colors: ["#000000", "#f2f2f2", "#000000", "#ffffff", "#f4f4f4", "#000000", "#777777", "#e6e6e6", "#ffffff", "#000000", "#000000", "#ffffff"],
    fonts: ["Space Grotesk", "Inter", 500, "none", -0.04], shape: { radius: 0, buttonRadius: 999, buttonStyle: "solid", cardStyle: "minimal", imageRatio: "portrait", containerWidth: 1280, density: "comfortable" },
    header: ["centered", { showSearch: false }], footer: ["bigtype", { tagline: "Mono — koleksi furnitur RII" }],
    home: [
      ["hero", "centered", { eyebrow: "Koleksi", heading: "Bentuk murni untuk ruang acara", subheading: "", ctaLabel: "Masuk ke katalog", secondaryLabel: "" }],
      ["gallery", "strip", { heading: "", images: [B("minimal"), P("LNG-001"), P("SOF-003"), P("CON-001"), P("DEC-002")] }],
      ["featured-products", "masonry", { heading: "Pilihan", source: "popular", limit: 9 }],
      ["custom-content", "single", { heading: "Kurasi", body: "Koleksi ini menampilkan produk dengan siluet paling bersih dari gudang RII." }, { align: "center" }],
    ],
    sys: { catalog: "tabs", product: "stacked", collections: "grid", login: "split", reservations: "cards" },
  },
  {
    id: "min-quiet-room", name: "Quiet Room", category: "minimalist",
    description: "Nuansa abu hangat, serif tipis, layout dua kolom yang tenang.",
    colors: ["#3a3632", "#ebe7e1", "#8c7f70", "#f6f4f0", "#eeeae4", "#2e2b28", "#857d74", "#ddd7cf", "#f6f4f0", "#2e2b28", "#e9e4dc", "#2e2b28"],
    fonts: ["Cormorant Garamond", "Karla", 500, "none", 0], shape: { radius: 2, buttonRadius: 2, buttonStyle: "underline", cardStyle: "minimal", imageRatio: "landscape", containerWidth: 1160, density: "airy" },
    header: ["split", { showSearch: false }], footer: ["centered"],
    home: [
      ["hero", "split-reverse", { eyebrow: "Quiet Room", heading: "Ketenangan dalam setiap detail", image: B("minimal"), secondaryLabel: "" }],
      ["search-availability", "inline", {}],
      ["collection-showcase", "stack", { heading: "Koleksi", limit: 3 }],
      ["faq", "simple", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "min-line", name: "Line", category: "minimalist",
    description: "Garis tipis pembatas, aksen biru tunggal, kartu bergaris.",
    colors: ["#1d4ed8", "#eef2ff", "#1d4ed8", "#ffffff", "#f8fafc", "#0f172a", "#64748b", "#e2e8f0", "#ffffff", "#0f172a", "#f8fafc", "#0f172a"],
    fonts: ["Manrope", "Manrope", 600, "none", -0.02], shape: { radius: 8, buttonRadius: 8, buttonStyle: "solid", cardStyle: "bordered", imageRatio: "landscape", containerWidth: 1240, density: "comfortable" },
    header: ["classic", { showSearch: true }], footer: ["columns"],
    home: [
      ["announcement", "default", { text: "Pengajuan reservasi diproses pada hari kerja." }],
      ["hero", "boxed", { heading: "Katalog furnitur yang jelas dan akurat", image: B("office") }],
      ["category-grid", "pills", { heading: "Telusuri" }],
      ["product-carousel", "cards", { heading: "Baru masuk gudang", source: "newest" }],
      ["stats", "plain", {}],
      ["reservation-cta", "card", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "grid", login: "card", reservations: "table" },
  },

  // ───────────────────────────── 2. MODERN LUXURY ─────────────────────────────
  {
    id: "lux-noir-or", name: "Noir & Or", category: "modern-luxury",
    description: "Hitam pekat dengan aksen emas, serif Didone, hero layar penuh.",
    colors: ["#c8a46a", "#1b1915", "#c8a46a", "#0d0c0a", "#171512", "#f2ece1", "#a39a8b", "#2c2822", "#0d0c0a", "#f2ece1", "#070605", "#cfc6b6"],
    fonts: ["Bodoni Moda", "Jost", 500, "none", 0], shape: { radius: 0, buttonRadius: 0, buttonStyle: "outline", cardStyle: "overlay", imageRatio: "portrait", containerWidth: 1280, density: "airy" },
    header: ["transparent", { showSearch: false, ctaLabel: "Reservasi" }], footer: ["bigtype", { tagline: "Noir & Or — RII Signature" }],
    home: [
      ["hero", "fullbleed", { eyebrow: "Signature Collection", heading: "Kemewahan yang dirancang untuk malam istimewa", image: B("luxury"), secondaryLabel: "" }],
      ["featured-products", "spotlight", { heading: "Signature pieces", source: "collection", collection: "vip-lounge", limit: 5 }],
      ["promo-banner", "image", { heading: "Gala & VIP", text: "Set lounge lengkap untuk area tamu kehormatan.", image: B("premium") }],
      ["testimonials", "large", {}],
      ["reservation-cta", "minimal", { eyebrow: "Concierge" }],
    ],
    sys: { catalog: "tabs", product: "grid", collections: "grid", login: "split", reservations: "cards", productBottom: [["product-carousel", "wide", { heading: "Lengkapi set Anda", source: "popular" }]] },
  },
  {
    id: "lux-marble", name: "Marble Hall", category: "modern-luxury",
    description: "Putih marmer & champagne, serif Playfair, kartu bayangan halus.",
    colors: ["#2b2621", "#f3eee7", "#b39363", "#fcfbf8", "#f4f0ea", "#24201c", "#8b8177", "#e7e0d5", "#fcfbf8", "#24201c", "#2b2621", "#efe7da"],
    fonts: ["Playfair Display", "Nunito Sans", 600, "none", -0.01], shape: { radius: 16, buttonRadius: 999, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "portrait", containerWidth: 1240, density: "comfortable" },
    header: ["centered", { showSearch: true }], footer: ["columns"],
    home: [
      ["hero", "collage", { eyebrow: "Marble Hall", heading: "Elegan, terang, dan berkelas", image: B("wedding"), image2: P("SOF-002"), image3: P("COF-003") }],
      ["collection-showcase", "cards", { heading: "Koleksi eksklusif" }],
      ["featured-products", "grid", { heading: "Paling diminati", source: "popular", columns: 3, limit: 6 }],
      ["text-image", "overlap", { eyebrow: "Layanan", heading: "Setiap detail disiapkan gudang kami", image: B("luxury") }],
      ["faq", "two-column", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "grid", login: "split", reservations: "table" },
  },
  {
    id: "lux-velvet", name: "Velvet Room", category: "modern-luxury",
    description: "Merah anggur & beludru, DM Serif, slider layar penuh.",
    colors: ["#6e1e2b", "#f6ebe8", "#d6a77a", "#fffaf8", "#f7eeeb", "#2a1418", "#8a6d70", "#ecdcd8", "#6e1e2b", "#fff3ee", "#2a1418", "#f6e3dc"],
    fonts: ["DM Serif Display", "DM Sans", 400, "none", 0], shape: { radius: 10, buttonRadius: 4, buttonStyle: "solid", cardStyle: "polaroid", imageRatio: "square", containerWidth: 1200, density: "comfortable" },
    header: ["bold", { showSearch: false }], footer: ["split"],
    home: [
      ["slider", "fullwidth", {}],
      ["category-grid", "circles", { heading: "Jelajahi koleksi" }],
      ["featured-products", "grid", { heading: "Kurasi Velvet", source: "collection", collection: "wedding-gala", columns: 4 }],
      ["promo-banner", "color", { heading: "Malam gala Anda, tanpa kompromi" }],
    ],
    sys: { catalog: "topbar", product: "thumbs", collections: "grid", login: "card", reservations: "cards" },
  },
  {
    id: "lux-atelier", name: "Atelier Doré", category: "modern-luxury",
    description: "Krem dan perunggu, huruf kapital berjarak, editorial dua kolom.",
    colors: ["#5a4632", "#f1e9dc", "#a67c4e", "#f8f4ec", "#efe7da", "#2f261d", "#86786a", "#e2d7c6", "#f8f4ec", "#2f261d", "#5a4632", "#f1e9dc"],
    fonts: ["Italiana", "Raleway", 400, "uppercase", 0.12], shape: { radius: 0, buttonRadius: 0, buttonStyle: "underline", cardStyle: "caption", imageRatio: "portrait", containerWidth: 1180, density: "airy" },
    header: ["stacked", { showSearch: false }], footer: ["centered"],
    home: [
      ["hero", "editorial", { eyebrow: "Atelier", heading: "Karya furnitur dengan jiwa", image: B("lounge") }],
      ["featured-products", "editorial", { heading: "Dari atelier", source: "popular", limit: 4 }],
      ["gallery", "grid", { heading: "Suasana" }],
      ["contact", "stacked", { heading: "Jadwalkan konsultasi" }],
    ],
    sys: { catalog: "tabs", product: "stacked", collections: "list", login: "split", reservations: "table" },
  },
  {
    id: "lux-onyx", name: "Onyx Suite", category: "modern-luxury",
    description: "Grafit gelap modern, sans geometris, kartu overlay dan pill button.",
    colors: ["#e7e2d8", "#1f2023", "#9d8f74", "#141517", "#1d1e21", "#ecebe7", "#9a9a9e", "#2c2d31", "#141517", "#ecebe7", "#0e0f10", "#bdbcb7"],
    fonts: ["Outfit", "Outfit", 600, "none", -0.02], shape: { radius: 20, buttonRadius: 999, buttonStyle: "solid", cardStyle: "overlay", imageRatio: "landscape", containerWidth: 1320, density: "comfortable" },
    header: ["classic", { showSearch: true }], footer: ["columns"],
    home: [
      ["hero", "split", { eyebrow: "Onyx Suite", heading: "Furnitur gelap untuk panggung yang terang", image: B("luxury") }],
      ["search-availability", "hero-card", {}],
      ["product-carousel", "wide", { heading: "Suite pilihan", source: "available" }],
      ["stats", "cards", {}],
      ["reservation-cta", "band", {}],
    ],
    sys: { catalog: "sidebar", product: "grid", collections: "grid", login: "card", reservations: "cards" },
  },

  // ───────────────────────────── 3. SCANDINAVIAN ─────────────────────────────
  {
    id: "scn-fjord", name: "Fjord", category: "scandinavian",
    description: "Biru fjord pucat, kayu ek, kartu polaroid & sudut membulat.",
    colors: ["#2e4a5c", "#e7eef1", "#c9a27a", "#f7f9f9", "#eef3f4", "#1f2f38", "#6d808a", "#dbe4e7", "#f7f9f9", "#1f2f38", "#2e4a5c", "#e7eef1"],
    fonts: ["Nunito Sans", "Nunito Sans", 700, "none", -0.01], shape: { radius: 18, buttonRadius: 12, buttonStyle: "solid", cardStyle: "polaroid", imageRatio: "square", containerWidth: 1200, density: "comfortable" },
    header: ["classic", { showSearch: true }], footer: ["columns"],
    home: [
      ["hero", "split", { eyebrow: "Fjord", heading: "Ringan, alami, fungsional", image: B("nordic") }],
      ["category-grid", "tiles", { heading: "Untuk setiap ruang" }],
      ["featured-products", "grid", { heading: "Favorit tim dekor", source: "popular", columns: 4 }],
      ["text-image", "image-left", { eyebrow: "Material", heading: "Kayu terang & tekstil lembut", image: B("natural") }],
      ["reservation-cta", "card", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "grid", login: "card", reservations: "cards" },
  },
  {
    id: "scn-hygge", name: "Hygge", category: "scandinavian",
    description: "Krem hangat, oranye terakota, sans membulat, suasana rumahan.",
    colors: ["#c2603c", "#f6ede3", "#c2603c", "#fbf7f2", "#f4ebe1", "#3b2e26", "#8a7a6d", "#eadfd2", "#fbf7f2", "#3b2e26", "#f4ebe1", "#3b2e26"],
    fonts: ["Rubik", "Rubik", 600, "none", -0.01], shape: { radius: 24, buttonRadius: 999, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "square", containerWidth: 1160, density: "airy" },
    header: ["centered", { showSearch: false }], footer: ["centered"],
    home: [
      ["announcement", "default", { text: "Hygge: koleksi hangat untuk acara intim." }],
      ["hero", "boxed", { heading: "Hangat seperti di rumah", image: B("nordic") }],
      ["collection-showcase", "mosaic", { heading: "Set yang nyaman" }],
      ["testimonials", "cards", {}],
      ["product-carousel", "cards", { heading: "Baru", source: "newest" }],
    ],
    sys: { catalog: "topbar", product: "thumbs", collections: "grid", login: "split", reservations: "cards" },
  },
  {
    id: "scn-birch", name: "Birch", category: "scandinavian",
    description: "Putih birch, hijau sage, katalog dengan tab kategori.",
    colors: ["#56705a", "#eef2ec", "#56705a", "#ffffff", "#f3f6f2", "#26302a", "#77867b", "#e1e8e0", "#ffffff", "#26302a", "#eef2ec", "#26302a"],
    fonts: ["Work Sans", "Work Sans", 600, "none", -0.02], shape: { radius: 12, buttonRadius: 6, buttonStyle: "outline", cardStyle: "bordered", imageRatio: "portrait", containerWidth: 1240, density: "comfortable" },
    header: ["split", { showSearch: true }], footer: ["split"],
    home: [
      ["hero", "split-reverse", { eyebrow: "Birch", heading: "Garis sederhana, nuansa hutan utara", image: B("natural") }],
      ["featured-products", "grid", { heading: "Koleksi alami", source: "collection", collection: "tropical-natural", columns: 3, limit: 6 }],
      ["gallery", "masonry", { heading: "Inspirasi" }],
      ["faq", "simple", {}],
    ],
    sys: { catalog: "tabs", product: "grid", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "scn-lagom", name: "Lagom", category: "scandinavian",
    description: "Seimbang: abu biru, tipografi Josefin kapital, layout terukur.",
    colors: ["#3d4b59", "#e9edf0", "#d1a96b", "#f9fafb", "#eef1f3", "#232b33", "#7d8790", "#dfe4e8", "#f9fafb", "#232b33", "#232b33", "#e9edf0"],
    fonts: ["Josefin Sans", "Karla", 600, "uppercase", 0.06], shape: { radius: 6, buttonRadius: 4, buttonStyle: "solid", cardStyle: "caption", imageRatio: "landscape", containerWidth: 1200, density: "comfortable" },
    header: ["minimal", { showSearch: true }], footer: ["minimal"],
    home: [
      ["hero", "centered", { eyebrow: "Lagom", heading: "Tidak terlalu banyak, tidak terlalu sedikit" }],
      ["category-grid", "large", { heading: "Kategori" }],
      ["stats", "dividers", {}],
      ["featured-products", "spotlight", { heading: "Pas untuk acara Anda", source: "available", limit: 5 }],
    ],
    sys: { catalog: "topbar", product: "stacked", collections: "grid", login: "card", reservations: "table" },
  },
  {
    id: "scn-sauna", name: "Sauna Wood", category: "scandinavian",
    description: "Kayu cedar gelap & linen, serif Fraunces, kartu caption besar.",
    colors: ["#6b4a33", "#efe6dc", "#6b4a33", "#f6f1ea", "#ece3d8", "#2d2018", "#86735f", "#ded2c3", "#6b4a33", "#f6f1ea", "#2d2018", "#ded2c3"],
    fonts: ["Fraunces", "Work Sans", 600, "none", -0.02], shape: { radius: 8, buttonRadius: 8, buttonStyle: "solid", cardStyle: "caption", imageRatio: "portrait", containerWidth: 1280, density: "comfortable" },
    header: ["bold", { showSearch: false }], footer: ["bigtype", { tagline: "Sauna Wood — RII" }],
    home: [
      ["hero", "fullbleed", { eyebrow: "Sauna Wood", heading: "Kayu, cahaya, dan kehangatan", image: B("nordic") }],
      ["text-image", "stacked", { heading: "Dibuat untuk bertahan", body: "Setiap unit dirawat dan dicek setelah kembali dari acara.", image: B("natural") }],
      ["product-carousel", "wide", { heading: "Kursi & lounge", source: "category", category: "lounge-chair" }],
      ["reservation-cta", "band", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "list", login: "split", reservations: "cards" },
  },

  // ───────────────────────────── 4. CONTEMPORARY INTERIOR ─────────────────────────────
  {
    id: "con-terra", name: "Terra", category: "contemporary",
    description: "Terakota & pasir, Sora geometris, kolase hero tiga gambar.",
    colors: ["#b5532f", "#f5e6db", "#344e41", "#fdf8f4", "#f6ece4", "#2f1f17", "#8c7466", "#ecdcd0", "#fdf8f4", "#2f1f17", "#2f1f17", "#f5e6db"],
    fonts: ["Sora", "Inter", 600, "none", -0.03], shape: { radius: 14, buttonRadius: 999, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "portrait", containerWidth: 1280, density: "comfortable" },
    header: ["classic", { showSearch: true }], footer: ["columns"],
    home: [
      ["hero", "collage", { eyebrow: "Terra", heading: "Warna tanah untuk ruang masa kini", image: B("contemporary"), image2: P("LNG-002"), image3: P("COF-002") }],
      ["category-grid", "tiles", { heading: "Ruang & fungsi" }],
      ["featured-products", "masonry", { heading: "Kurasi musim ini", source: "popular", limit: 9 }],
      ["promo-banner", "strip", { heading: "Rencanakan acara lebih awal" }],
    ],
    sys: { catalog: "sidebar", product: "grid", collections: "grid", login: "split", reservations: "cards" },
  },
  {
    id: "con-sage-studio", name: "Sage Studio", category: "contemporary",
    description: "Hijau sage lembut, Plus Jakarta Sans, layout kartu bergaris.",
    colors: ["#4f6f52", "#e8efe6", "#d08c60", "#fbfcfa", "#f0f4ee", "#1f2a20", "#6f7d70", "#dde6db", "#fbfcfa", "#1f2a20", "#e8efe6", "#1f2a20"],
    fonts: ["Plus Jakarta Sans", "Plus Jakarta Sans", 700, "none", -0.02], shape: { radius: 16, buttonRadius: 10, buttonStyle: "solid", cardStyle: "bordered", imageRatio: "landscape", containerWidth: 1240, density: "comfortable" },
    header: ["split", { showSearch: true }], footer: ["split"],
    home: [
      ["hero", "split", { eyebrow: "Sage Studio", heading: "Ruang segar untuk pertemuan modern", image: B("natural") }],
      ["search-availability", "inline", {}],
      ["collection-showcase", "cards", { heading: "Set lengkap" }],
      ["featured-products", "grid", { heading: "Siap dipesan", source: "available", columns: 4 }],
      ["testimonials", "cards", {}],
    ],
    sys: { catalog: "topbar", product: "thumbs", collections: "grid", login: "card", reservations: "table" },
  },
  {
    id: "con-curve", name: "Curve", category: "contemporary",
    description: "Lengkung & pastel, Unbounded tebal, tombol pil, gambar persegi.",
    colors: ["#5b3fd1", "#efeaff", "#ff8a65", "#fcfbff", "#f3f0ff", "#1c1638", "#77718f", "#e5e0f7", "#fcfbff", "#1c1638", "#1c1638", "#efeaff"],
    fonts: ["Unbounded", "DM Sans", 600, "none", -0.03], shape: { radius: 28, buttonRadius: 999, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "square", containerWidth: 1200, density: "comfortable" },
    header: ["centered", { showSearch: false }], footer: ["bigtype", { tagline: "Curve" }],
    home: [
      ["hero", "boxed", { heading: "Furnitur dengan lekuk yang ramah", image: B("contemporary") }],
      ["category-grid", "circles", { heading: "Pilih kategori" }],
      ["product-carousel", "cards", { heading: "Lagi populer", source: "popular" }],
      ["video", "with-text", { heading: "Cara kami menyiapkan pesanan" }],
      ["reservation-cta", "card", {}],
    ],
    sys: { catalog: "tabs", product: "thumbs", collections: "grid", login: "split", reservations: "cards" },
  },
  {
    id: "con-gallery-white", name: "Gallery White", category: "contemporary",
    description: "Ruang galeri putih, aksen kobalt, judul besar rata kiri.",
    colors: ["#1f3bb3", "#eef1fb", "#1f3bb3", "#ffffff", "#f6f7fb", "#101322", "#6b7088", "#e4e7f2", "#ffffff", "#101322", "#101322", "#eef1fb"],
    fonts: ["Archivo", "Archivo", 700, "none", -0.03], shape: { radius: 0, buttonRadius: 0, buttonStyle: "solid", cardStyle: "minimal", imageRatio: "landscape", containerWidth: 1360, density: "airy" },
    header: ["minimal", { showSearch: true }], footer: ["columns"],
    home: [
      ["hero", "editorial", { eyebrow: "Pameran tetap", heading: "Furnitur sebagai karya", image: B("office") }],
      ["featured-products", "editorial", { heading: "Dalam sorotan", source: "newest", limit: 4 }],
      ["gallery", "grid", { heading: "Instalasi" }],
      ["custom-content", "two-column", { heading: "Tentang koleksi", body: "Koleksi ini dikurasi untuk ruang pameran dan peluncuran produk.", body2: "Semua stok terhubung langsung dengan gudang RII." }],
    ],
    sys: { catalog: "sidebar", product: "stacked", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "con-sunset", name: "Sunset Lounge", category: "contemporary",
    description: "Gradasi senja jingga-ungu, Poppins, slider dan kartu overlay.",
    colors: ["#e8613c", "#fff1ea", "#7b3fa0", "#fffaf7", "#fff1ea", "#2a1622", "#8b6f78", "#f3dfd6", "#2a1622", "#fff1ea", "#2a1622", "#f3dfd6"],
    fonts: ["Poppins", "Poppins", 600, "none", -0.02], shape: { radius: 18, buttonRadius: 12, buttonStyle: "solid", cardStyle: "overlay", imageRatio: "portrait", containerWidth: 1240, density: "comfortable" },
    header: ["bold", { showSearch: true }], footer: ["split"],
    home: [
      ["slider", "contained", {}],
      ["featured-products", "grid", { heading: "Untuk sore yang panjang", source: "category", category: "lounge-chair", columns: 4 }],
      ["promo-banner", "image", { heading: "Rooftop & terrace sets", image: B("contemporary") }],
      ["stats", "cards", {}],
    ],
    sys: { catalog: "topbar", product: "grid", collections: "grid", login: "split", reservations: "cards" },
  },

  // ───────────────────────────── 5. INDUSTRIAL FURNITURE ─────────────────────────────
  {
    id: "ind-foundry", name: "Foundry", category: "industrial",
    description: "Baja gelap & karat, Bebas Neue kapital, kartu bergaris tebal.",
    colors: ["#b3633b", "#2a2826", "#b3633b", "#1b1a19", "#242321", "#e9e4dd", "#9b958d", "#3a3734", "#1b1a19", "#e9e4dd", "#111010", "#c9c2b8"],
    fonts: ["Bebas Neue", "IBM Plex Sans", 400, "uppercase", 0.04], shape: { radius: 2, buttonRadius: 2, buttonStyle: "solid", cardStyle: "bordered", imageRatio: "landscape", containerWidth: 1320, density: "compact" },
    header: ["bold", { showSearch: true, ctaLabel: "Order list" }], footer: ["columns"], nav: NAV_CAT,
    home: [
      ["hero", "fullbleed", { eyebrow: "Foundry", heading: "Furnitur kuat untuk acara besar", image: B("industrial") }],
      ["category-grid", "index", { heading: "Lini produk" }],
      ["featured-products", "grid", { heading: "Stok siap kirim", source: "available", columns: 4, limit: 8 }],
      ["stats", "dividers", {}],
    ],
    sys: { catalog: "sidebar", product: "grid", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "ind-concrete", name: "Concrete", category: "industrial",
    description: "Abu beton terang, Archivo Black, grid rapat ala gudang.",
    colors: ["#2b2b2b", "#e4e2df", "#f2b705", "#efeeec", "#e6e4e1", "#1c1c1c", "#6e6b67", "#cfccc7", "#efeeec", "#1c1c1c", "#2b2b2b", "#efeeec"],
    fonts: ["Archivo Black", "Archivo", 400, "uppercase", 0], shape: { radius: 0, buttonRadius: 0, buttonStyle: "solid", cardStyle: "caption", imageRatio: "square", containerWidth: 1400, density: "compact" },
    header: ["classic", { showSearch: true }], footer: ["split"],
    home: [
      ["announcement", "default", { text: "STOK REAL-TIME DARI GUDANG RII" }],
      ["hero", "split", { eyebrow: "Concrete", heading: "Dibangun untuk dipakai berulang kali", image: B("industrial") }],
      ["featured-products", "index", { heading: "Daftar barang", source: "newest", limit: 12 }],
      ["promo-banner", "color", { heading: "Butuh dalam jumlah besar?" }],
    ],
    sys: { catalog: "topbar", product: "grid", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "ind-loft", name: "Loft 88", category: "industrial",
    description: "Bata merah & kayu tua, Oswald, layout galeri bertumpuk.",
    colors: ["#8c3b2a", "#f1e7df", "#3d3a36", "#f8f4f0", "#efe6de", "#2a211c", "#857469", "#e3d6cb", "#3d3a36", "#f1e7df", "#2a211c", "#e3d6cb"],
    fonts: ["Oswald", "Karla", 500, "uppercase", 0.02], shape: { radius: 4, buttonRadius: 4, buttonStyle: "solid", cardStyle: "polaroid", imageRatio: "landscape", containerWidth: 1260, density: "comfortable" },
    header: ["stacked", { showSearch: true }], footer: ["columns"],
    home: [
      ["hero", "split-reverse", { eyebrow: "Loft 88", heading: "Karakter mentah, kenyamanan modern", image: B("industrial") }],
      ["gallery", "masonry", { heading: "Proyek di lapangan" }],
      ["product-carousel", "cards", { heading: "Kursi bar & meja tinggi", source: "category", category: "bar-stool" }],
      ["text-image", "image-right", { heading: "Rak & display", body: "Rak besi dan display untuk booth bergaya industrial.", image: B("industrial") }],
      ["reservation-cta", "band", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "grid", login: "split", reservations: "cards" },
  },
  {
    id: "ind-workshop", name: "Workshop", category: "industrial",
    description: "Biru montir & kuning peringatan, Space Grotesk, label mono.",
    colors: ["#1e3a5f", "#e8edf3", "#f5b700", "#f5f6f7", "#eceff2", "#121a24", "#66707c", "#d6dce3", "#1e3a5f", "#ffffff", "#121a24", "#d6dce3"],
    fonts: ["Space Grotesk", "IBM Plex Mono", 600, "none", -0.02], shape: { radius: 6, buttonRadius: 4, buttonStyle: "solid", cardStyle: "bordered", imageRatio: "square", containerWidth: 1280, density: "compact" },
    header: ["bold", { showSearch: true }], footer: ["minimal"],
    home: [
      ["search-availability", "hero-card", { heading: "Cek stok untuk tanggal acara" }],
      ["category-grid", "pills", { heading: "Kategori" }],
      ["featured-products", "grid", { heading: "Paling sering dipakai", source: "popular", columns: 4 }],
      ["faq", "two-column", {}],
    ],
    sys: { catalog: "topbar", product: "grid", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "ind-rivet", name: "Rivet", category: "industrial",
    description: "Hitam & hijau zaitun, Syne lebar, hero tipografi raksasa.",
    colors: ["#6b7a3c", "#ecefe2", "#6b7a3c", "#f3f3ef", "#e9eae2", "#151611", "#6d6f63", "#d9dbd0", "#151611", "#f3f3ef", "#151611", "#d9dbd0"],
    fonts: ["Syne", "Inter", 700, "uppercase", -0.01], shape: { radius: 0, buttonRadius: 999, buttonStyle: "outline", cardStyle: "minimal", imageRatio: "portrait", containerWidth: 1320, density: "comfortable" },
    header: ["minimal", { showSearch: false }], footer: ["bigtype", { tagline: "Rivet / RII" }],
    home: [
      ["hero", "centered", { eyebrow: "Rivet", heading: "Keras di luar, nyaman di dalam" }],
      ["featured-products", "masonry", { heading: "Koleksi", source: "newest", limit: 9 }],
      ["promo-banner", "strip", { heading: "Paket booth industrial tersedia" }],
      ["contact", "split", {}],
    ],
    sys: { catalog: "tabs", product: "stacked", collections: "grid", login: "split", reservations: "cards" },
  },

  // ───────────────────────────── 6. EVENT & EXHIBITION RENTAL ─────────────────────────────
  {
    id: "evt-expo", name: "Expo Kit", category: "event-exhibition",
    description: "Biru pameran, pencarian tanggal di depan, paket booth.",
    colors: ["#0b5cff", "#e8f0ff", "#ff7a00", "#ffffff", "#f4f7fc", "#0d1b33", "#5f6f8a", "#e0e7f3", "#ffffff", "#0d1b33", "#0d1b33", "#e8f0ff"],
    fonts: ["Plus Jakarta Sans", "Inter", 800, "none", -0.03], shape: { radius: 12, buttonRadius: 10, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "landscape", containerWidth: 1280, density: "comfortable" },
    header: ["classic", { showSearch: true, announcement: "", ctaLabel: "Daftar reservasi" }], footer: ["columns"], nav: NAV_EVENT,
    home: [
      ["hero", "split", { eyebrow: "Expo Kit", heading: "Semua furnitur booth dalam satu tempat", image: B("exhibition"), ctaLabel: "Cek ketersediaan", ctaHref: "/products?available=1" }],
      ["search-availability", "inline", {}],
      ["featured-products", "grid", { heading: "Paket booth", source: "collection", collection: "exhibition-booth", columns: 4 }],
      ["stats", "cards", {}],
      ["faq", "simple", {}],
      ["reservation-cta", "band", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "grid", login: "card", reservations: "table" },
  },
  {
    id: "evt-gala-night", name: "Gala Night", category: "event-exhibition",
    description: "Navy malam & emas champagne, slider acara, serif Marcellus.",
    colors: ["#d4b36a", "#13213c", "#d4b36a", "#0c1730", "#13213c", "#eef0f5", "#9aa3b8", "#24324f", "#0c1730", "#eef0f5", "#070e1f", "#c6ccda"],
    fonts: ["Marcellus", "Jost", 400, "uppercase", 0.06], shape: { radius: 6, buttonRadius: 2, buttonStyle: "outline", cardStyle: "overlay", imageRatio: "portrait", containerWidth: 1240, density: "comfortable" },
    header: ["transparent", { showSearch: false }], footer: ["centered"], nav: NAV_EVENT,
    home: [
      ["slider", "fullwidth", {}],
      ["collection-showcase", "stack", { heading: "Paket acara" }],
      ["featured-products", "spotlight", { heading: "Untuk meja utama", source: "collection", collection: "wedding-gala", limit: 5 }],
      ["testimonials", "large", {}],
    ],
    sys: { catalog: "tabs", product: "grid", collections: "list", login: "split", reservations: "cards" },
  },
  {
    id: "evt-festival", name: "Festival Grounds", category: "event-exhibition",
    description: "Warna festival cerah, Rubik tebal, kategori lingkaran.",
    colors: ["#e63946", "#fff4e6", "#2a9d8f", "#fffdf9", "#fff4e6", "#1d1d1f", "#6e6a66", "#f1e4d3", "#fffdf9", "#1d1d1f", "#1d1d1f", "#fff4e6"],
    fonts: ["Rubik", "Rubik", 800, "none", -0.03], shape: { radius: 20, buttonRadius: 999, buttonStyle: "solid", cardStyle: "polaroid", imageRatio: "square", containerWidth: 1240, density: "comfortable" },
    header: ["centered", { showSearch: true }], footer: ["split"], nav: NAV_EVENT,
    home: [
      ["announcement", "default", { text: "Musim festival: ajukan reservasi minimal H-7." }],
      ["hero", "boxed", { heading: "Furnitur outdoor & lounge untuk festival", image: B("creative") }],
      ["category-grid", "circles", { heading: "Kebutuhan area" }],
      ["product-carousel", "cards", { heading: "Paling banyak dipesan", source: "popular" }],
      ["promo-banner", "color", { heading: "Butuh 200 kursi? Kami punya." }],
    ],
    sys: { catalog: "topbar", product: "thumbs", collections: "grid", login: "card", reservations: "cards" },
  },
  {
    id: "evt-conference", name: "Conference Pro", category: "event-exhibition",
    description: "Abu korporat & teal, form ketersediaan menonjol, kartu ringkas.",
    colors: ["#0f766e", "#e6f4f2", "#0f766e", "#ffffff", "#f5f8f8", "#0f1f1d", "#5e706d", "#dde8e6", "#0f1f1d", "#e6f4f2", "#0f1f1d", "#cfdedb"],
    fonts: ["IBM Plex Sans", "IBM Plex Sans", 600, "none", -0.01], shape: { radius: 8, buttonRadius: 6, buttonStyle: "solid", cardStyle: "bordered", imageRatio: "landscape", containerWidth: 1280, density: "compact" },
    header: ["bold", { showSearch: true }], footer: ["columns"], nav: NAV_EVENT,
    home: [
      ["search-availability", "hero-card", { heading: "Rencanakan konferensi Anda" }],
      ["featured-products", "grid", { heading: "Meja & kursi konferensi", source: "category", category: "dining-chair", columns: 4 }],
      ["text-image", "image-left", { heading: "Logistik terjadwal", body: "Tim gudang menyiapkan picking list berdasarkan tanggal loading Anda.", image: B("exhibition") }],
      ["stats", "plain", {}],
      ["reservation-cta", "card", {}],
    ],
    sys: { catalog: "sidebar", product: "grid", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "evt-pop-up", name: "Pop-Up", category: "event-exhibition",
    description: "Kuning neon & hitam, Syne lebar, galeri strip bergerak.",
    colors: ["#111111", "#fff36b", "#111111", "#fffde8", "#fff9c4", "#111111", "#5d5a3f", "#ece7a6", "#fff36b", "#111111", "#111111", "#fff36b"],
    fonts: ["Syne", "Space Grotesk", 800, "uppercase", -0.02], shape: { radius: 0, buttonRadius: 0, buttonStyle: "solid", cardStyle: "caption", imageRatio: "square", containerWidth: 1300, density: "compact" },
    header: ["classic", { showSearch: false }], footer: ["bigtype", { tagline: "POP-UP" }], nav: NAV_EVENT,
    home: [
      ["hero", "centered", { eyebrow: "Pop-Up", heading: "Booth cepat, tampil maksimal" }],
      ["gallery", "strip", { heading: "", images: [B("exhibition"), B("creative"), P("DSP-001"), P("CTR-002"), P("BAR-001")] }],
      ["featured-products", "index", { heading: "Kit pop-up", source: "collection", collection: "exhibition-booth", limit: 8 }],
      ["reservation-cta", "minimal", {}],
    ],
    sys: { catalog: "tabs", product: "stacked", collections: "grid", login: "card", reservations: "cards" },
  },

  // ───────────────────────────── 7. PREMIUM LOUNGE COLLECTION ─────────────────────────────
  {
    id: "lng-emerald", name: "Emerald Bar", category: "premium-lounge",
    description: "Hijau zamrud & kuningan, serif Instrument, kartu overlay.",
    colors: ["#c9a961", "#16302a", "#c9a961", "#0f231d", "#16302a", "#eef0e8", "#9fb0a6", "#22413a", "#0f231d", "#eef0e8", "#08150f", "#c3cdc6"],
    fonts: ["Instrument Serif", "DM Sans", 400, "none", -0.01], shape: { radius: 4, buttonRadius: 999, buttonStyle: "outline", cardStyle: "overlay", imageRatio: "portrait", containerWidth: 1240, density: "airy" },
    header: ["centered", { showSearch: false }], footer: ["centered"],
    home: [
      ["hero", "fullbleed", { eyebrow: "Emerald Bar", heading: "Lounge yang mengundang percakapan", image: B("premium") }],
      ["featured-products", "spotlight", { heading: "Signature lounge", source: "category", category: "lounge-chair", limit: 5 }],
      ["text-image", "overlap", { heading: "Bar & high table", image: B("premium") }],
      ["reservation-cta", "minimal", {}],
    ],
    sys: { catalog: "tabs", product: "grid", collections: "list", login: "split", reservations: "cards" },
  },
  {
    id: "lng-cognac", name: "Cognac", category: "premium-lounge",
    description: "Kulit cokelat cognac, krem, Libre Baskerville, kartu bayangan.",
    colors: ["#8a4b2a", "#f5ebe1", "#8a4b2a", "#fbf7f2", "#f3e9de", "#2c1a10", "#8b7262", "#e7d8c9", "#fbf7f2", "#2c1a10", "#2c1a10", "#e7d8c9"],
    fonts: ["Libre Baskerville", "Karla", 400, "none", 0], shape: { radius: 10, buttonRadius: 6, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "landscape", containerWidth: 1200, density: "comfortable" },
    header: ["classic", { showSearch: true }], footer: ["columns"],
    home: [
      ["hero", "split", { eyebrow: "Cognac", heading: "Kursi kulit untuk sudut terbaik", image: B("lounge") }],
      ["collection-showcase", "cards", { heading: "Koleksi lounge" }],
      ["product-carousel", "wide", { heading: "Sofa", source: "category", category: "sofa" }],
      ["testimonials", "cards", {}],
      ["faq", "simple", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "grid", login: "card", reservations: "table" },
  },
  {
    id: "lng-midnight", name: "Midnight Club", category: "premium-lounge",
    description: "Ungu tengah malam & neon lembut, Tenor Sans kapital.",
    colors: ["#b48cff", "#1a1530", "#ff9ecf", "#0f0c1f", "#1a1530", "#ece8ff", "#9a93bd", "#2a2447", "#0f0c1f", "#ece8ff", "#08061a", "#b9b2d9"],
    fonts: ["Tenor Sans", "Manrope", 400, "uppercase", 0.08], shape: { radius: 14, buttonRadius: 999, buttonStyle: "solid", cardStyle: "overlay", imageRatio: "square", containerWidth: 1280, density: "comfortable" },
    header: ["transparent", { showSearch: false }], footer: ["split"],
    home: [
      ["slider", "fullwidth", {}],
      ["featured-products", "grid", { heading: "Malam ini", source: "collection", collection: "vip-lounge", columns: 3, limit: 6 }],
      ["promo-banner", "image", { heading: "VIP after-party", image: B("premium") }],
      ["stats", "dividers", {}],
    ],
    sys: { catalog: "topbar", product: "grid", collections: "grid", login: "split", reservations: "cards" },
  },
  {
    id: "lng-riviera", name: "Riviera", category: "premium-lounge",
    description: "Biru laut & putih linen, Cormorant, lounge tepi pantai.",
    colors: ["#1e5f8c", "#e9f2f8", "#d9b382", "#fbfdfe", "#eef5f9", "#122636", "#6c8597", "#dce8f0", "#fbfdfe", "#122636", "#1e5f8c", "#e9f2f8"],
    fonts: ["Cormorant Garamond", "Nunito Sans", 600, "none", 0], shape: { radius: 0, buttonRadius: 0, buttonStyle: "underline", cardStyle: "caption", imageRatio: "portrait", containerWidth: 1240, density: "airy" },
    header: ["split", { showSearch: false }], footer: ["centered"],
    home: [
      ["hero", "editorial", { eyebrow: "Riviera", heading: "Lounge santai di bawah langit terbuka", image: B("natural") }],
      ["gallery", "grid", { heading: "Beach club set-up" }],
      ["featured-products", "editorial", { heading: "Day beds & lounge", source: "category", category: "lounge-chair", limit: 4 }],
      ["contact", "stacked", {}],
    ],
    sys: { catalog: "sidebar", product: "stacked", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "lng-obsidian", name: "Obsidian Lounge", category: "premium-lounge",
    description: "Hitam obsidian & tembaga, Montserrat, mosaik koleksi.",
    colors: ["#c46f3b", "#1c1a19", "#c46f3b", "#121110", "#1c1a19", "#f0ebe6", "#a1968c", "#2e2a27", "#121110", "#f0ebe6", "#0a0909", "#bdb3a9"],
    fonts: ["Montserrat", "Montserrat", 600, "uppercase", 0.04], shape: { radius: 8, buttonRadius: 4, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "landscape", containerWidth: 1320, density: "comfortable" },
    header: ["bold", { showSearch: true }], footer: ["columns"],
    home: [
      ["hero", "split-reverse", { eyebrow: "Obsidian", heading: "Lounge berkarakter untuk tamu istimewa", image: B("luxury") }],
      ["collection-showcase", "mosaic", { heading: "Mosaik koleksi" }],
      ["featured-products", "grid", { heading: "Coffee table", source: "category", category: "coffee-table", columns: 4 }],
      ["reservation-cta", "band", {}],
    ],
    sys: { catalog: "tabs", product: "thumbs", collections: "grid", login: "split", reservations: "cards" },
  },

  // ───────────────────────────── 8. CREATIVE STUDIO ─────────────────────────────
  {
    id: "cre-primary", name: "Primary", category: "creative-studio",
    description: "Merah-kuning-biru primer, Archivo Black, kartu polaroid miring.",
    colors: ["#2440ff", "#fff6d6", "#ff5a36", "#fffdf5", "#fff6d6", "#141414", "#5c5a52", "#ebe3c4", "#ffb800", "#141414", "#2440ff", "#fff6d6"],
    fonts: ["Archivo Black", "Archivo", 400, "uppercase", -0.01], shape: { radius: 0, buttonRadius: 0, buttonStyle: "solid", cardStyle: "polaroid", imageRatio: "square", containerWidth: 1280, density: "comfortable" },
    header: ["bold", { showSearch: false }], footer: ["bigtype", { tagline: "PRIMARY STUDIO" }],
    home: [
      ["hero", "collage", { eyebrow: "Primary", heading: "Warna berani untuk set yang berani", image: B("creative"), image2: P("LNG-003"), image3: P("BAR-002") }],
      ["category-grid", "large", { heading: "Mainkan kategorinya" }],
      ["featured-products", "masonry", { heading: "Hot picks", source: "popular", limit: 9 }],
      ["promo-banner", "color", { heading: "Photoshoot minggu depan?" }],
    ],
    sys: { catalog: "topbar", product: "grid", collections: "grid", login: "split", reservations: "cards" },
  },
  {
    id: "cre-riso", name: "Riso Print", category: "creative-studio",
    description: "Pink fluor & biru riso, Space Grotesk, gaya cetak risograf.",
    colors: ["#ff48b0", "#e9f1ff", "#0078bf", "#fbf8f3", "#f3eee6", "#1e1e3f", "#6c6a86", "#e2dcd2", "#fbf8f3", "#1e1e3f", "#0078bf", "#fbf8f3"],
    fonts: ["Space Grotesk", "Space Grotesk", 700, "none", -0.03], shape: { radius: 6, buttonRadius: 999, buttonStyle: "outline", cardStyle: "bordered", imageRatio: "portrait", containerWidth: 1200, density: "comfortable" },
    header: ["centered", { showSearch: true }], footer: ["split"],
    home: [
      ["announcement", "default", { text: "Studio baru? Lihat kit photoshoot kami." }],
      ["hero", "split", { eyebrow: "Riso", heading: "Props & furnitur untuk produksi kreatif", image: B("studio") }],
      ["product-carousel", "cards", { heading: "Dekor & aksesori", source: "category", category: "decorative-accessories" }],
      ["gallery", "masonry", { heading: "Behind the scenes" }],
      ["testimonials", "cards", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "grid", login: "card", reservations: "cards" },
  },
  {
    id: "cre-darkroom", name: "Darkroom", category: "creative-studio",
    description: "Gelap ala ruang cetak foto, merah aman, IBM Plex Mono.",
    colors: ["#ff3b30", "#1c1c1c", "#ff3b30", "#0e0e0e", "#171717", "#ededed", "#8e8e8e", "#2a2a2a", "#0e0e0e", "#ededed", "#000000", "#b5b5b5"],
    fonts: ["IBM Plex Mono", "IBM Plex Sans", 500, "uppercase", 0.04], shape: { radius: 0, buttonRadius: 0, buttonStyle: "outline", cardStyle: "minimal", imageRatio: "landscape", containerWidth: 1320, density: "compact" },
    header: ["minimal", { showSearch: true }], footer: ["minimal"],
    home: [
      ["hero", "minimal", { eyebrow: "Darkroom", heading: "Set film & foto, siap dalam satu hari." }],
      ["featured-products", "index", { heading: "Roll call", source: "newest", limit: 12 }],
      ["video", "full", { heading: "Showreel" }],
      ["contact", "split", {}],
    ],
    sys: { catalog: "topbar", product: "stacked", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "cre-playground", name: "Playground", category: "creative-studio",
    description: "Pastel permen, Unbounded, sudut sangat membulat, kategori pil.",
    colors: ["#7c3aed", "#f5f0ff", "#10b981", "#fefcff", "#f7f2ff", "#2a1a4a", "#7d6f99", "#ebe3fa", "#fefcff", "#2a1a4a", "#f5f0ff", "#2a1a4a"],
    fonts: ["Unbounded", "Nunito Sans", 700, "none", -0.03], shape: { radius: 32, buttonRadius: 999, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "square", containerWidth: 1180, density: "airy" },
    header: ["classic", { showSearch: false }], footer: ["centered"],
    home: [
      ["hero", "boxed", { heading: "Furnitur ceria untuk acara keluarga", image: B("creative") }],
      ["category-grid", "pills", { heading: "Mau cari apa?" }],
      ["featured-products", "grid", { heading: "Favorit", source: "popular", columns: 3, limit: 6 }],
      ["faq", "simple", {}],
      ["reservation-cta", "card", {}],
    ],
    sys: { catalog: "tabs", product: "thumbs", collections: "grid", login: "split", reservations: "cards" },
  },
  {
    id: "cre-collage", name: "Cut & Paste", category: "creative-studio",
    description: "Kertas kraft & hitam, Fraunces italic, layout kolase.",
    colors: ["#1f1b16", "#e8dcc8", "#d9480f", "#f1e8d8", "#e8dcc8", "#1f1b16", "#6e6253", "#d6c7ae", "#f1e8d8", "#1f1b16", "#1f1b16", "#e8dcc8"],
    fonts: ["Fraunces", "Karla", 800, "none", -0.04], shape: { radius: 2, buttonRadius: 2, buttonStyle: "solid", cardStyle: "polaroid", imageRatio: "portrait", containerWidth: 1240, density: "comfortable" },
    header: ["stacked", { showSearch: false }], footer: ["bigtype", { tagline: "Cut & Paste" }],
    home: [
      ["hero", "collage", { eyebrow: "Moodboard", heading: "Rangkai set Anda seperti kolase", image: B("editorial"), image2: P("DEC-001"), image3: P("LNG-002") }],
      ["collection-showcase", "mosaic", { heading: "Moodboard koleksi" }],
      ["text-image", "stacked", { heading: "Dari ide ke loading dock", image: B("studio") }],
      ["product-carousel", "wide", { heading: "Baru", source: "newest" }],
    ],
    sys: { catalog: "sidebar", product: "grid", collections: "grid", login: "card", reservations: "cards" },
  },

  // ───────────────────────────── 9. CORPORATE FURNITURE ─────────────────────────────
  {
    id: "cor-boardroom", name: "Boardroom", category: "corporate",
    description: "Navy korporat & abu, Inter, tata letak terstruktur dan formal.",
    colors: ["#1e3a5f", "#eaf0f6", "#1e3a5f", "#ffffff", "#f6f8fa", "#111827", "#6b7280", "#e5e7eb", "#ffffff", "#111827", "#111827", "#e5e7eb"],
    fonts: ["Inter", "Inter", 700, "none", -0.02], shape: { radius: 8, buttonRadius: 6, buttonStyle: "solid", cardStyle: "bordered", imageRatio: "landscape", containerWidth: 1240, density: "comfortable" },
    header: ["classic", { showSearch: true, ctaLabel: "Ajukan reservasi" }], footer: ["columns"],
    home: [
      ["hero", "split", { eyebrow: "Corporate", heading: "Furnitur rapat & kantor sementara", image: B("corporate") }],
      ["stats", "cards", {}],
      ["featured-products", "grid", { heading: "Untuk ruang rapat", source: "category", category: "dining-chair", columns: 4 }],
      ["text-image", "image-left", { heading: "Proses persetujuan yang jelas", body: "Setiap permintaan disetujui Manajer Gudang sebelum stok dikunci.", image: B("office") }],
      ["faq", "two-column", {}],
    ],
    sys: { catalog: "sidebar", product: "thumbs", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "cor-glass-tower", name: "Glass Tower", category: "corporate",
    description: "Biru kaca & putih, Manrope, kartu bayangan, hero dengan kartu mengambang.",
    colors: ["#0369a1", "#e0f2fe", "#0ea5e9", "#f8fbfd", "#eef6fb", "#0b1d2a", "#5b7083", "#d9e7f0", "#f8fbfd", "#0b1d2a", "#0b1d2a", "#d9e7f0"],
    fonts: ["Manrope", "Manrope", 700, "none", -0.03], shape: { radius: 16, buttonRadius: 10, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "landscape", containerWidth: 1280, density: "comfortable" },
    header: ["split", { showSearch: true }], footer: ["split"],
    home: [
      ["hero", "boxed", { heading: "Ruang kerja yang siap dalam hitungan hari", image: B("office") }],
      ["search-availability", "hero-card", {}],
      ["category-grid", "tiles", { heading: "Kebutuhan kantor" }],
      ["product-carousel", "cards", { heading: "Meja & counter", source: "category", category: "counter-reception" }],
      ["reservation-cta", "band", {}],
    ],
    sys: { catalog: "topbar", product: "grid", collections: "grid", login: "split", reservations: "table" },
  },
  {
    id: "cor-civic", name: "Civic", category: "corporate",
    description: "Hijau institusi & krem, IBM Plex Sans, layout dokumentatif.",
    colors: ["#1f5135", "#e9f0ea", "#b88a2e", "#fbfbf8", "#f1f3ee", "#16251c", "#64706a", "#dfe5df", "#1f5135", "#ffffff", "#16251c", "#d4dcd5"],
    fonts: ["IBM Plex Sans", "IBM Plex Sans", 600, "none", -0.01], shape: { radius: 4, buttonRadius: 4, buttonStyle: "solid", cardStyle: "caption", imageRatio: "landscape", containerWidth: 1200, density: "compact" },
    header: ["bold", { showSearch: true }], footer: ["columns"],
    home: [
      ["announcement", "default", { text: "Kebijakan reservasi: persetujuan manajer wajib untuk semua permintaan." }],
      ["hero", "minimal", { eyebrow: "Civic", heading: "Inventaris furnitur untuk acara institusi" }],
      ["featured-products", "index", { heading: "Inventaris tersedia", source: "available", limit: 10 }],
      ["custom-content", "two-column", { heading: "Kebijakan penggunaan", body: "Furnitur dipinjam per proyek dan wajib dikembalikan sesuai tanggal.", body2: "Kerusakan dilaporkan saat inspeksi pengembalian." }],
      ["contact", "stacked", {}],
    ],
    sys: { catalog: "sidebar", product: "stacked", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "cor-meridian", name: "Meridian", category: "corporate",
    description: "Abu baja & oranye sinyal, DM Sans, statistik di depan.",
    colors: ["#334155", "#f1f5f9", "#f97316", "#ffffff", "#f8fafc", "#0f172a", "#64748b", "#e2e8f0", "#334155", "#f8fafc", "#0f172a", "#cbd5e1"],
    fonts: ["DM Sans", "DM Sans", 700, "none", -0.02], shape: { radius: 10, buttonRadius: 8, buttonStyle: "solid", cardStyle: "bordered", imageRatio: "square", containerWidth: 1280, density: "comfortable" },
    header: ["bold", { showSearch: false }], footer: ["split"],
    home: [
      ["stats", "dividers", { heading: "Kapasitas gudang hari ini" }],
      ["hero", "split-reverse", { eyebrow: "Meridian", heading: "Satu katalog untuk semua cabang acara", image: B("corporate") }],
      ["featured-products", "grid", { heading: "Paling banyak dipakai", source: "popular", columns: 4 }],
      ["collection-showcase", "stack", { heading: "Paket standar" }],
    ],
    sys: { catalog: "tabs", product: "thumbs", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "cor-campus", name: "Campus", category: "corporate",
    description: "Biru akademik & kuning, Nunito Sans, ramah untuk banyak divisi.",
    colors: ["#1d4ed8", "#eff4ff", "#facc15", "#ffffff", "#f5f8ff", "#111b33", "#64708a", "#e1e8f7", "#ffffff", "#111b33", "#1d4ed8", "#eff4ff"],
    fonts: ["Nunito Sans", "Nunito Sans", 800, "none", -0.02], shape: { radius: 14, buttonRadius: 999, buttonStyle: "solid", cardStyle: "shadow", imageRatio: "landscape", containerWidth: 1200, density: "comfortable" },
    header: ["centered", { showSearch: true }], footer: ["centered"],
    home: [
      ["hero", "centered", { eyebrow: "Campus", heading: "Furnitur untuk seminar, wisuda & pameran" }],
      ["category-grid", "circles", { heading: "Kategori" }],
      ["product-carousel", "cards", { heading: "Siap dipinjam", source: "available" }],
      ["testimonials", "cards", {}],
      ["reservation-cta", "card", {}],
    ],
    sys: { catalog: "topbar", product: "thumbs", collections: "grid", login: "split", reservations: "cards" },
  },

  // ───────────────────────────── 10. EDITORIAL FURNITURE SHOWCASE ─────────────────────────────
  {
    id: "edi-quarterly", name: "Quarterly", category: "editorial",
    description: "Majalah triwulan: krem, serif besar, kolom indeks bernomor.",
    colors: ["#1d1b18", "#efe9df", "#a23b2a", "#f7f3ec", "#efe9df", "#1d1b18", "#6f675c", "#ddd3c4", "#f7f3ec", "#1d1b18", "#1d1b18", "#efe9df"],
    fonts: ["Playfair Display", "Karla", 700, "none", -0.03], shape: { radius: 0, buttonRadius: 0, buttonStyle: "underline", cardStyle: "caption", imageRatio: "portrait", containerWidth: 1240, density: "airy" },
    header: ["stacked", { showSearch: false }], footer: ["bigtype", { tagline: "The Quarterly" }],
    home: [
      ["hero", "editorial", { eyebrow: "Edisi No. 04", heading: "Seni menata ruang acara", image: B("editorial") }],
      ["featured-products", "editorial", { heading: "Fitur utama", source: "popular", limit: 4 }],
      ["category-grid", "index", { heading: "Daftar isi" }],
      ["custom-content", "two-column", { heading: "Catatan editor", body: "Koleksi edisi ini berfokus pada material alami dan siluet rendah.", body2: "Semua produk dapat dipesan langsung dari katalog." }],
    ],
    sys: { catalog: "tabs", product: "stacked", collections: "list", login: "split", reservations: "table" },
  },
  {
    id: "edi-folio", name: "Folio", category: "editorial",
    description: "Portofolio hitam-putih, Bodoni, gambar potret besar berselang.",
    colors: ["#111111", "#f3f1ed", "#111111", "#ffffff", "#f6f4f0", "#111111", "#727272", "#e5e2dc", "#ffffff", "#111111", "#ffffff", "#111111"],
    fonts: ["Bodoni Moda", "Inter", 500, "none", -0.02], shape: { radius: 0, buttonRadius: 0, buttonStyle: "outline", cardStyle: "minimal", imageRatio: "portrait", containerWidth: 1180, density: "airy" },
    header: ["centered", { showSearch: false }], footer: ["minimal"],
    home: [
      ["hero", "split", { eyebrow: "Folio", heading: "Sebuah portofolio furnitur", image: B("editorial") }],
      ["collection-showcase", "stack", { heading: "Bab" }],
      ["gallery", "grid", { heading: "Plates" }],
      ["reservation-cta", "minimal", {}],
    ],
    sys: { catalog: "topbar", product: "stacked", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "edi-broadsheet", name: "Broadsheet", category: "editorial",
    description: "Koran lebar: garis kolom, Libre Baskerville, kepala berita.",
    colors: ["#111111", "#f2efe8", "#b91c1c", "#faf8f3", "#f2efe8", "#111111", "#5f5b53", "#d9d4c9", "#faf8f3", "#111111", "#111111", "#faf8f3"],
    fonts: ["Libre Baskerville", "Lora", 700, "none", -0.02], shape: { radius: 0, buttonRadius: 0, buttonStyle: "solid", cardStyle: "bordered", imageRatio: "landscape", containerWidth: 1320, density: "compact" },
    header: ["stacked", { showSearch: true }], footer: ["columns"],
    home: [
      ["announcement", "default", { text: "Edisi hari ini · stok diperbarui langsung dari gudang" }],
      ["hero", "minimal", { eyebrow: "Berita utama", heading: "Koleksi lounge baru tiba di gudang Jakarta" }],
      ["featured-products", "grid", { heading: "Di halaman depan", source: "newest", columns: 3, limit: 6 }],
      ["stats", "dividers", {}],
      ["faq", "two-column", { heading: "Tanya jawab" }],
    ],
    sys: { catalog: "sidebar", product: "grid", collections: "list", login: "card", reservations: "table" },
  },
  {
    id: "edi-lookbook", name: "Lookbook", category: "editorial",
    description: "Lookbook musiman: slider besar, Italiana tipis, kartu overlay.",
    colors: ["#3b3027", "#f4ede5", "#b08968", "#fbf8f4", "#f4ede5", "#2a221c", "#85776a", "#e6dccf", "#fbf8f4", "#2a221c", "#3b3027", "#f4ede5"],
    fonts: ["Italiana", "Jost", 400, "uppercase", 0.1], shape: { radius: 0, buttonRadius: 999, buttonStyle: "outline", cardStyle: "overlay", imageRatio: "portrait", containerWidth: 1280, density: "comfortable" },
    header: ["transparent", { showSearch: false }], footer: ["centered"],
    home: [
      ["slider", "fullwidth", {}],
      ["featured-products", "masonry", { heading: "Look 01—09", source: "popular", limit: 9 }],
      ["text-image", "overlap", { heading: "Styling notes", image: B("editorial") }],
      ["product-carousel", "wide", { heading: "Shop the look", source: "collection", collection: "vip-lounge" }],
    ],
    sys: { catalog: "tabs", product: "grid", collections: "grid", login: "split", reservations: "cards" },
  },
  {
    id: "edi-archive", name: "Archive", category: "editorial",
    description: "Arsip museum: abu hangat, Tenor Sans, katalog bernomor & tabel.",
    colors: ["#4a4339", "#ece8e1", "#7a5c3e", "#f5f3ef", "#ece8e1", "#26221d", "#7c756b", "#dcd6cc", "#f5f3ef", "#26221d", "#26221d", "#dcd6cc"],
    fonts: ["Tenor Sans", "IBM Plex Sans", 400, "uppercase", 0.06], shape: { radius: 2, buttonRadius: 2, buttonStyle: "outline", cardStyle: "caption", imageRatio: "square", containerWidth: 1260, density: "compact" },
    header: ["minimal", { showSearch: true }], footer: ["split"],
    home: [
      ["hero", "centered", { eyebrow: "Arsip", heading: "Katalog objek & furnitur RII" }],
      ["category-grid", "index", { heading: "Klasifikasi" }],
      ["featured-products", "index", { heading: "Objek", source: "newest", limit: 12 }],
      ["custom-content", "single", { heading: "Catatan arsip", body: "Setiap objek memiliki kode aset, riwayat pergerakan, dan status kondisi." }],
    ],
    sys: { catalog: "topbar", product: "stacked", collections: "list", login: "card", reservations: "table" },
  },
];

function build(d: Def): SiteSnapshot {
  const [primary, secondary, accent, background, surface, text, muted, border, headerBg, headerText, footerBg, footerText] = d.colors;
  const theme: Theme = {
    ...structuredClone(DEFAULT_THEME),
    ...d.shape,
    colors: { primary, secondary, accent, background, surface, text, muted, border, headerBg, headerText, footerBg, footerText },
    fonts: { heading: d.fonts[0], body: d.fonts[1], headingWeight: d.fonts[2], headingCase: d.fonts[3] ?? "none", headingTracking: d.fonts[4] ?? -0.02 },
    logoText: d.logoText ?? "RII Furniture",
  };
  const header: HeaderConfig = { variant: d.header[0], sticky: true, showSearch: true, announcement: "", ctaLabel: "Reservasi", ctaHref: "/cart", ...(d.header[1] ?? {}) };
  const footer: FooterConfig = {
    variant: d.footer[0], tagline: "Koleksi furnitur & dekorasi acara RII — sistem reservasi internal.",
    address: "Jakarta, Indonesia (alamat demo)", email: "furniture@rii.demo", phone: "+62 21 0000 0000", copyright: "", ...(d.footer[1] ?? {}),
  };
  return {
    name: `RII — ${d.name}`,
    templateId: d.id,
    theme, header, footer,
    navigation: structuredClone(d.nav ?? NAV_STD),
    seo: { title: `RII Furniture Hub — ${d.name}`, description: d.description },
    pages: [page("home", "", "Beranda", d.home), ...systemPages(d.sys)],
  };
}

export type TemplateInfo = { id: string; name: string; category: string; description: string; sort: number };
export const TEMPLATES: TemplateInfo[] = DEFS.map((d, i) => ({ id: d.id, name: d.name, category: d.category, description: d.description, sort: i }));
export const DEFAULT_TEMPLATE_ID = "min-line";

/** Fresh snapshot for a template (new section ids every call). */
export function templateSnapshot(id: string): SiteSnapshot | null {
  const d = DEFS.find((x) => x.id === id);
  return d ? build(d) : null;
}

/** Structural fingerprint used by tests to prove templates are genuinely different layouts. */
export function templateFingerprint(s: SiteSnapshot) {
  const home = s.pages.find((p) => p.is_home)!;
  return [
    s.header.variant, s.footer.variant, s.theme.cardStyle, s.theme.fonts.heading,
    home.sections.map((x) => `${x.type}:${x.variant}`).join(","),
  ].join("|");
}

export { DEMO_NOTE };
