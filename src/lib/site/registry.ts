// Section catalogue: metadata, variants, default props and editable fields.
// Used by the editor (Add Section / settings panel) and by template definitions.

export type FieldType = "text" | "textarea" | "image" | "link" | "number" | "select" | "toggle" | "collection" | "category" | "skus" | "items";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: [string, string][];
  itemFields?: Field[];
  min?: number;
  max?: number;
};

export type SectionMeta = {
  type: string;
  label: string;
  group: "layout" | "content" | "products" | "commerce" | "functional";
  icon: string;
  variants: [string, string][];
  defaults: Record<string, any>;
  fields: Field[];
  functional?: boolean; // tied to a system page (catalog, cart…)
};

const ctaFields: Field[] = [
  { key: "ctaLabel", label: "Button label", type: "text" },
  { key: "ctaHref", label: "Button destination", type: "link" },
  { key: "secondaryLabel", label: "Second button label", type: "text" },
  { key: "secondaryHref", label: "Second button destination", type: "link" },
];

const productSource: Field[] = [
  { key: "source", label: "Product source", type: "select", options: [["newest", "Newest"], ["popular", "Most reserved"], ["available", "Most available"], ["collection", "Collection"], ["category", "Category"], ["manual", "Manual (SKUs)"]] },
  { key: "collection", label: "Collection", type: "collection" },
  { key: "category", label: "Category", type: "category" },
  { key: "skus", label: "SKUs (comma separated)", type: "skus" },
  { key: "limit", label: "Number of products", type: "number", min: 1, max: 24 },
];

export const SECTIONS: SectionMeta[] = [
  {
    type: "announcement", label: "Announcement Bar", group: "layout", icon: "Megaphone",
    variants: [["default", "Bar"]],
    defaults: { text: "Reservasi minimal H-3 sebelum tanggal loading.", linkLabel: "Lihat katalog", linkHref: "/products" },
    fields: [{ key: "text", label: "Text", type: "text" }, { key: "linkLabel", label: "Link label", type: "text" }, { key: "linkHref", label: "Link destination", type: "link" }],
  },
  {
    type: "hero", label: "Hero Banner", group: "layout", icon: "Image",
    variants: [["split", "Split"], ["split-reverse", "Split (image left)"], ["fullbleed", "Full-bleed image"], ["centered", "Centered type"], ["editorial", "Editorial"], ["collage", "Collage"], ["boxed", "Boxed card"], ["minimal", "Minimal text"]],
    defaults: { eyebrow: "RII Furniture Collection", heading: "Furnitur pilihan untuk setiap acara", subheading: "Jelajahi koleksi, cek ketersediaan berdasarkan tanggal, dan ajukan reservasi untuk proyek Anda.", ctaLabel: "Jelajahi katalog", ctaHref: "/products", secondaryLabel: "Lihat koleksi", secondaryHref: "/collections", image: "/media/demo/banner-lounge.svg" },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "heading", label: "Heading", type: "textarea" }, { key: "subheading", label: "Subheading", type: "textarea" },
      { key: "image", label: "Image", type: "image" }, { key: "image2", label: "Image 2 (collage)", type: "image" }, { key: "image3", label: "Image 3 (collage)", type: "image" }, ...ctaFields,
    ],
  },
  {
    type: "slider", label: "Image Slider", group: "layout", icon: "GalleryHorizontal",
    variants: [["fullwidth", "Full width"], ["contained", "Contained"]],
    defaults: { autoplay: true, slides: [
      { image: "/media/demo/banner-lounge.svg", heading: "Lounge Collection", text: "Sofa & kursi lounge untuk area VIP.", href: "/collections/vip-lounge" },
      { image: "/media/demo/banner-exhibition.svg", heading: "Exhibition Kit", text: "Counter, podium dan display untuk booth.", href: "/collections/exhibition-booth" },
      { image: "/media/demo/banner-wedding.svg", heading: "Wedding & Gala", text: "Kursi tiffany dan meja banquet.", href: "/collections/wedding-gala" },
    ] },
    fields: [{ key: "autoplay", label: "Autoplay", type: "toggle" }, { key: "slides", label: "Slides", type: "items", itemFields: [{ key: "image", label: "Image", type: "image" }, { key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "text" }, { key: "href", label: "Link", type: "link" }] }],
  },
  {
    type: "featured-products", label: "Featured Products", group: "products", icon: "Star",
    variants: [["grid", "Grid"], ["spotlight", "Spotlight"], ["editorial", "Editorial list"], ["masonry", "Masonry"], ["index", "Sticky index"]],
    defaults: { eyebrow: "", heading: "Produk unggulan", subheading: "", source: "popular", limit: 8, columns: 4, linkLabel: "Semua produk", linkHref: "/products" },
    fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "heading", label: "Heading", type: "text" }, { key: "subheading", label: "Subheading", type: "textarea" }, ...productSource,
      { key: "columns", label: "Columns", type: "select", options: [["2", "2"], ["3", "3"], ["4", "4"]] }, { key: "linkLabel", label: "Link label", type: "text" }, { key: "linkHref", label: "Link destination", type: "link" }],
  },
  {
    type: "category-grid", label: "Product Category Grid", group: "products", icon: "LayoutGrid",
    variants: [["tiles", "Tiles"], ["large", "Large mosaic"], ["pills", "Pills"], ["index", "Numbered index"], ["circles", "Circles"]],
    defaults: { heading: "Belanja per kategori", limit: 8 },
    fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "heading", label: "Heading", type: "text" }, { key: "subheading", label: "Subheading", type: "textarea" }, { key: "limit", label: "Max categories", type: "number", min: 1, max: 20 }, { key: "showEmpty", label: "Show empty categories", type: "toggle" }],
  },
  {
    type: "collection-showcase", label: "Collection Showcase", group: "products", icon: "Layers",
    variants: [["cards", "Portrait cards"], ["stack", "Alternating stack"], ["mosaic", "Mosaic previews"]],
    defaults: { heading: "Koleksi pilihan", limit: 4, linkLabel: "Semua koleksi", linkHref: "/collections" },
    fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "heading", label: "Heading", type: "text" }, { key: "subheading", label: "Subheading", type: "textarea" }, { key: "limit", label: "Max collections", type: "number", min: 1, max: 8 }, { key: "linkLabel", label: "Link label", type: "text" }, { key: "linkHref", label: "Link destination", type: "link" }],
  },
  {
    type: "product-carousel", label: "Product Carousel", group: "products", icon: "GalleryHorizontalEnd",
    variants: [["cards", "Cards"], ["wide", "Wide cards"]],
    defaults: { heading: "Baru ditambahkan", source: "newest", limit: 10 },
    fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "heading", label: "Heading", type: "text" }, ...productSource, { key: "linkLabel", label: "Link label", type: "text" }, { key: "linkHref", label: "Link destination", type: "link" }],
  },
  {
    type: "promo-banner", label: "Promotional Banner", group: "content", icon: "BadgePercent",
    variants: [["color", "Color block"], ["image", "Image background"], ["strip", "Ruled strip"]],
    defaults: { heading: "Merencanakan acara besar?", text: "Ajukan reservasi lebih awal untuk memastikan ketersediaan furnitur.", ctaLabel: "Mulai reservasi", ctaHref: "/products", image: "/media/demo/banner-exhibition.svg" },
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "textarea" }, { key: "image", label: "Image", type: "image" }, { key: "ctaLabel", label: "Button label", type: "text" }, { key: "ctaHref", label: "Button destination", type: "link" }],
  },
  {
    type: "text-image", label: "Text & Image", group: "content", icon: "PanelLeft",
    variants: [["image-left", "Image left"], ["image-right", "Image right"], ["overlap", "Overlap"], ["stacked", "Stacked"]],
    defaults: { eyebrow: "Tentang RII", heading: "Dibuat untuk tim produksi acara", body: "RII Furniture Hub menghubungkan tim dekor, gudang dan manajemen dalam satu sistem reservasi furnitur yang akurat.", image: "/media/demo/banner-natural.svg", ctaLabel: "Selengkapnya", ctaHref: "/about" },
    fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "heading", label: "Heading", type: "text" }, { key: "body", label: "Body", type: "textarea" }, { key: "image", label: "Image", type: "image" }, { key: "ctaLabel", label: "Button label", type: "text" }, { key: "ctaHref", label: "Button destination", type: "link" }],
  },
  {
    type: "gallery", label: "Gallery", group: "content", icon: "Images",
    variants: [["grid", "Feature grid"], ["masonry", "Masonry"], ["strip", "Scrolling strip"]],
    defaults: { heading: "Inspirasi set-up", images: ["/media/demo/banner-lounge.svg", "/media/demo/banner-wedding.svg", "/media/demo/banner-natural.svg", "/media/demo/banner-exhibition.svg", "/media/demo/banner-studio.svg"] },
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "images", label: "Images", type: "items", itemFields: [{ key: "_", label: "Image", type: "image" }] }],
  },
  {
    type: "stats", label: "Statistics", group: "content", icon: "BarChart3",
    variants: [["plain", "Plain"], ["cards", "Cards"], ["dividers", "Dividers"]],
    defaults: { heading: "Koleksi dalam angka", note: "Angka diambil langsung dari database inventaris (data demo).", items: [{ label: "SKU furnitur", source: "skus" }, { label: "Total unit", source: "units" }, { label: "Kategori", source: "categories" }, { label: "Koleksi", source: "collections" }] },
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "note", label: "Footnote", type: "text" }, { key: "items", label: "Statistics", type: "items", itemFields: [{ key: "label", label: "Label", type: "text" }, { key: "source", label: "Value source", type: "select", options: [["skus", "Live: SKUs"], ["units", "Live: total units"], ["available", "Live: available units"], ["categories", "Live: categories"], ["collections", "Live: collections"], ["custom", "Custom value"]] }, { key: "value", label: "Custom value", type: "text" }] }],
  },
  {
    type: "testimonials", label: "Testimonials", group: "content", icon: "Quote",
    variants: [["cards", "Cards"], ["large", "Large quote"]],
    defaults: { heading: "Kata tim kami", note: "Contoh testimoni (demo).", items: [{ quote: "Cek ketersediaan sekarang hanya butuh hitungan detik.", name: "Tim Dekor", role: "Contoh testimoni" }, { quote: "Gudang selalu tahu apa yang harus disiapkan besok.", name: "Tim Gudang", role: "Contoh testimoni" }, { quote: "Utilisasi furnitur jauh lebih mudah dipantau.", name: "Manajemen", role: "Contoh testimoni" }] },
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "note", label: "Footnote", type: "text" }, { key: "items", label: "Quotes", type: "items", itemFields: [{ key: "quote", label: "Quote", type: "textarea" }, { key: "name", label: "Name", type: "text" }, { key: "role", label: "Role", type: "text" }] }],
  },
  {
    type: "faq", label: "FAQ", group: "content", icon: "HelpCircle",
    variants: [["simple", "Simple"], ["two-column", "Two column"]],
    defaults: { heading: "Pertanyaan umum", subheading: "Kebijakan reservasi furnitur internal RII.", items: [
      { q: "Kapan reservasi saya dikonfirmasi?", a: "Setelah Manajer Gudang menyetujui. Permintaan yang masih menunggu belum mengunci stok." },
      { q: "Bagaimana ketersediaan dihitung?", a: "Berdasarkan tanggal loading sampai tanggal kembali ditambah buffer perawatan, dikurangi reservasi yang sudah disetujui dan barang rusak." },
      { q: "Bisakah saya membatalkan reservasi?", a: "Ya, selama reservasi masih berstatus draf, menunggu persetujuan, atau disetujui (belum disiapkan)." },
    ] },
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "subheading", label: "Subheading", type: "text" }, { key: "items", label: "Questions", type: "items", itemFields: [{ key: "q", label: "Question", type: "text" }, { key: "a", label: "Answer", type: "textarea" }] }],
  },
  {
    type: "contact", label: "Contact", group: "content", icon: "Mail",
    variants: [["split", "Split with form"], ["stacked", "Stacked"]],
    defaults: { heading: "Hubungi tim RII", text: "Pertanyaan tentang koleksi atau reservasi? Kirim pesan kepada kami.", address: "Jakarta, Indonesia (alamat demo)", email: "furniture@rii.demo", phone: "+62 21 0000 0000", hours: "Senin–Jumat, 08.00–17.00 WIB" },
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "textarea" }, { key: "address", label: "Address", type: "text" }, { key: "email", label: "Email", type: "text" }, { key: "phone", label: "Phone", type: "text" }, { key: "hours", label: "Hours", type: "text" }],
  },
  {
    type: "reservation-cta", label: "Reservation CTA", group: "commerce", icon: "CalendarCheck",
    variants: [["band", "Color band"], ["card", "Outlined card"], ["minimal", "Minimal row"]],
    defaults: { eyebrow: "Reservasi", heading: "Siap merencanakan proyek berikutnya?", text: "Pilih tanggal loading dan pengembalian, tambahkan furnitur, lalu ajukan untuk persetujuan gudang.", ctaLabel: "Buat reservasi", ctaHref: "/products", secondaryLabel: "Reservasi saya", secondaryHref: "/my-reservations" },
    fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "textarea" }, ...ctaFields],
  },
  {
    type: "search-availability", label: "Search & Availability", group: "commerce", icon: "CalendarSearch",
    variants: [["inline", "Inline"], ["hero-card", "Floating card"]],
    defaults: { heading: "Cek ketersediaan", text: "Masukkan tanggal acara untuk melihat stok yang dapat dipesan." },
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "textarea" }],
  },
  {
    type: "video", label: "Video Section", group: "content", icon: "PlayCircle",
    variants: [["full", "Full width"], ["with-text", "With text"]],
    defaults: { heading: "Di balik layar", text: "Proses persiapan furnitur di gudang RII.", url: "" },
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "textarea" }, { key: "url", label: "Video URL (YouTube, Vimeo or .mp4)", type: "link" }],
  },
  {
    type: "custom-content", label: "Custom Content", group: "content", icon: "Type",
    variants: [["single", "Single column"], ["two-column", "Two columns"]],
    defaults: { heading: "Judul konten", body: "Tulis konten Anda di sini.", body2: "" },
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "body", label: "Body", type: "textarea" }, { key: "body2", label: "Second column", type: "textarea" }],
  },
  // functional (system page) sections
  { type: "catalog", label: "Product Catalog", group: "functional", icon: "Store", functional: true, variants: [["sidebar", "Sidebar filters"], ["topbar", "Top filters"], ["tabs", "Category tabs"]], defaults: { heading: "", subheading: "" }, fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "subheading", label: "Subheading", type: "textarea" }] },
  { type: "product-detail", label: "Product Detail", group: "functional", icon: "Package", functional: true, variants: [["thumbs", "Gallery + thumbnails"], ["grid", "Image grid"], ["stacked", "Stacked"]], defaults: {}, fields: [] },
  { type: "collections-list", label: "Collections List", group: "functional", icon: "Layers", functional: true, variants: [["grid", "Grid"], ["list", "List"]], defaults: { heading: "", subheading: "" }, fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "subheading", label: "Subheading", type: "textarea" }] },
  { type: "collection-detail", label: "Collection Detail", group: "functional", icon: "Layers", functional: true, variants: [["default", "Default"]], defaults: {}, fields: [] },
  { type: "cart", label: "Reservation Cart", group: "functional", icon: "ShoppingBag", functional: true, variants: [["two-column", "Two column"], ["single", "Single column"]], defaults: { heading: "" }, fields: [{ key: "heading", label: "Heading", type: "text" }] },
  { type: "my-reservations", label: "My Reservations", group: "functional", icon: "ClipboardList", functional: true, variants: [["table", "Table"], ["cards", "Cards"]], defaults: { heading: "" }, fields: [{ key: "heading", label: "Heading", type: "text" }] },
  { type: "reservation-detail", label: "Reservation Detail", group: "functional", icon: "ClipboardCheck", functional: true, variants: [["default", "Default"]], defaults: {}, fields: [] },
  { type: "account", label: "My Account", group: "functional", icon: "UserRound", functional: true, variants: [["default", "Default"]], defaults: {}, fields: [] },
  { type: "login-form", label: "Login Form", group: "functional", icon: "LogIn", functional: true, variants: [["card", "Card"], ["split", "Split with image"]], defaults: { heading: "Masuk", text: "Gunakan akun perusahaan Anda.", image: "/media/demo/banner-lounge.svg" }, fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "text" }, { key: "image", label: "Image", type: "image" }] },
];

export const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.type, s]));

export const STYLE_FIELDS = [
  "bg", "text", "paddingTop", "paddingBottom", "paddingX", "marginTop", "marginBottom", "align", "radius", "fontSize", "fontWeight", "hideDesktop", "hideMobile",
] as const;

let counter = 0;
export function newSectionId() {
  counter++;
  return `s_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeSection(type: string, variant?: string, props: Record<string, any> = {}, style = {}) {
  const meta = SECTION_MAP[type];
  if (!meta) throw new Error(`Unknown section type ${type}`);
  return { id: newSectionId(), type, variant: variant ?? meta.variants[0][0], props: { ...structuredClone(meta.defaults), ...props }, style, hidden: false };
}
