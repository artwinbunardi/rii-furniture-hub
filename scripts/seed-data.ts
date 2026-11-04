// ALL DATA IN THIS FILE IS DEMONSTRATION DATA. Quantities, products and projects are
// fictional and must not be presented as actual RII company records.

export const DEMO_PASSWORD = "Demo1234!";

export const USERS = [
  { email: "admin@rii.demo", name: "Admin Sistem (Demo)", role: "admin", department: "IT" },
  { email: "decor@rii.demo", name: "Dewi Lestari (Demo)", role: "decor", department: "Decor" },
  { email: "decor2@rii.demo", name: "Raka Pratama (Demo)", role: "decor", department: "Decor" },
  { email: "staff@rii.demo", name: "Budi Santoso (Demo)", role: "warehouse_staff", department: "Warehouse" },
  { email: "manager@rii.demo", name: "Sari Wulandari (Demo)", role: "warehouse_manager", department: "Warehouse" },
  { email: "management@rii.demo", name: "Hendra Wijaya (Demo)", role: "management", department: "Management" },
] as const;

export const CATEGORIES = [
  { slug: "sofa", name_id: "Sofa", name_en: "Sofa", kind: "sofa" },
  { slug: "lounge-chair", name_id: "Kursi Lounge", name_en: "Lounge Chair", kind: "lounge-chair" },
  { slug: "dining-chair", name_id: "Kursi Makan", name_en: "Dining Chair", kind: "dining-chair" },
  { slug: "bar-stool", name_id: "Kursi Bar", name_en: "Bar Stool", kind: "bar-stool" },
  { slug: "coffee-table", name_id: "Meja Kopi", name_en: "Coffee Table", kind: "coffee-table" },
  { slug: "dining-table", name_id: "Meja Makan", name_en: "Dining Table", kind: "dining-table" },
  { slug: "console-table", name_id: "Meja Konsol", name_en: "Console Table", kind: "console-table" },
  { slug: "counter-reception", name_id: "Counter & Resepsionis", name_en: "Counter & Reception", kind: "counter-reception" },
  { slug: "display-furniture", name_id: "Furnitur Display", name_en: "Display Furniture", kind: "display-furniture" },
  { slug: "decorative-accessories", name_id: "Aksesori Dekoratif", name_en: "Decorative Accessories", kind: "decorative-accessories" },
  { slug: "shelving-storage", name_id: "Rak & Penyimpanan", name_en: "Shelving & Storage", kind: "shelving-storage" },
  { slug: "other-furniture", name_id: "Furnitur Lainnya", name_en: "Other Furniture", kind: "other" },
];

export const WAREHOUSES = [
  { code: "WH-CKG", name: "Gudang Cakung (Demo)", address: "Jakarta Timur — demo address", locations: ["A-01", "A-02", "A-03", "B-01", "B-02", "C-01"] },
  { code: "WH-BKS", name: "Gudang Bekasi (Demo)", address: "Bekasi — demo address", locations: ["R1-01", "R1-02", "R2-01", "R2-02"] },
];

type P = {
  sku: string; name: string; cat: string; color: string; accent?: string; material: string;
  l: number; w: number; h: number; kg?: number; qty: number; loc: string; desc: string; min?: number; units?: boolean;
};

export const PRODUCTS: P[] = [
  { sku: "SOF-001", name: "Sofa Arlo 3 Dudukan", cat: "sofa", color: "Abu-abu", material: "Kain linen, rangka kayu", l: 220, w: 90, h: 82, kg: 48, qty: 20, loc: "A-01", desc: "Sofa tiga dudukan dengan bantalan tebal dan lengan bulat, cocok untuk lounge VIP dan area tamu." },
  { sku: "SOF-002", name: "Sofa Bellini Velvet", cat: "sofa", color: "Hijau", material: "Velvet, kaki logam emas", accent: "Emas", l: 200, w: 88, h: 78, kg: 42, qty: 8, loc: "A-01", desc: "Sofa velvet hijau zamrud dengan kaki emas untuk tampilan mewah di gala dinner dan peluncuran produk." },
  { sku: "SOF-003", name: "Sofa Modular Cube", cat: "sofa", color: "Putih", material: "Kulit sintetis", l: 90, w: 90, h: 70, kg: 18, qty: 24, loc: "A-02", desc: "Modul sofa kotak yang dapat dikombinasikan menjadi konfigurasi L, U, atau lurus.", min: 6 },
  { sku: "SOF-004", name: "Sofa Chesterfield Klasik", cat: "sofa", color: "Cokelat", material: "Kulit, kancing tufted", l: 210, w: 92, h: 76, kg: 55, qty: 4, loc: "A-02", desc: "Chesterfield kulit cokelat untuk tema klasik dan heritage." },
  { sku: "LNG-001", name: "Kursi Lounge Oslo", cat: "lounge-chair", color: "Krem", material: "Bouclé, kaki oak", accent: "Oak", l: 78, w: 80, h: 76, kg: 14, qty: 16, loc: "A-03", desc: "Kursi lounge bouclé bergaya Skandinavia dengan kaki kayu oak." },
  { sku: "LNG-002", name: "Kursi Rotan Bali", cat: "lounge-chair", color: "Rattan", material: "Rotan alami", accent: "Rattan", l: 80, w: 76, h: 90, kg: 9, qty: 12, loc: "A-03", desc: "Kursi rotan anyaman tangan untuk tema tropis dan outdoor terlindung." },
  { sku: "LNG-003", name: "Kursi Egg Swivel", cat: "lounge-chair", color: "Terracotta", material: "Kain wol, dasar putar logam", accent: "Chrome", l: 86, w: 80, h: 105, kg: 21, qty: 6, loc: "B-01", desc: "Kursi lounge berbentuk telur dengan dasar putar, ikonik untuk booth pameran." },
  { sku: "DIN-001", name: "Kursi Makan Nordic", cat: "dining-chair", color: "Oak", material: "Kayu oak solid", accent: "Oak", l: 46, w: 50, h: 80, kg: 5, qty: 60, loc: "B-01", desc: "Kursi makan kayu oak minimalis, mudah ditumpuk untuk acara besar.", min: 20 },
  { sku: "DIN-002", name: "Kursi Tiffany Emas", cat: "dining-chair", color: "Emas", material: "Resin", accent: "Emas", l: 40, w: 42, h: 92, kg: 4, qty: 120, loc: "B-02", desc: "Kursi tiffany klasik untuk pernikahan dan gala dinner.", min: 40 },
  { sku: "DIN-003", name: "Kursi Ghost Transparan", cat: "dining-chair", color: "Putih", material: "Polikarbonat", l: 54, w: 53, h: 94, kg: 5, qty: 40, loc: "B-02", desc: "Kursi transparan modern yang menyatu dengan dekor apa pun." },
  { sku: "BAR-001", name: "Kursi Bar Loft", cat: "bar-stool", color: "Hitam", material: "Baja, dudukan kayu", accent: "Hitam", l: 42, w: 42, h: 76, kg: 6, qty: 30, loc: "C-01", desc: "Kursi bar industrial dengan pijakan kaki, untuk cocktail area." },
  { sku: "BAR-002", name: "Kursi Bar Velvet Mustard", cat: "bar-stool", color: "Mustard", material: "Velvet, kaki emas", accent: "Emas", l: 45, w: 45, h: 78, kg: 7, qty: 18, loc: "C-01", desc: "Kursi bar velvet dengan sandaran rendah dan kaki emas." },
  { sku: "COF-001", name: "Meja Kopi Marmer Bundar", cat: "coffee-table", color: "Marmer", material: "Marmer, kaki logam", accent: "Emas", l: 90, w: 90, h: 40, kg: 35, qty: 10, loc: "A-03", desc: "Meja kopi bundar dengan top marmer putih dan kaki emas." },
  { sku: "COF-002", name: "Meja Kopi Kayu Trembesi", cat: "coffee-table", color: "Walnut", material: "Kayu trembesi solid", accent: "Walnut", l: 120, w: 70, h: 42, kg: 40, qty: 6, loc: "A-03", desc: "Meja kopi kayu trembesi dengan serat alami, cocok untuk tema natural." },
  { sku: "COF-003", name: "Meja Samping Pedestal", cat: "coffee-table", color: "Hitam", material: "Kayu MDF finishing duco", accent: "Hitam", l: 45, w: 45, h: 55, kg: 8, qty: 20, loc: "B-01", desc: "Meja samping pedestal hitam doff, pendamping sofa dan kursi lounge." },
  { sku: "DTB-001", name: "Meja Makan Panjang Oak", cat: "dining-table", color: "Oak", material: "Kayu oak", accent: "Oak", l: 240, w: 100, h: 75, kg: 70, qty: 12, loc: "R1-01", desc: "Meja makan panjang untuk 8–10 orang, ideal untuk long-table dinner." },
  { sku: "DTB-002", name: "Meja Bundar Banquet 180", cat: "dining-table", color: "Putih", material: "Plywood, kaki lipat", accent: "Hitam", l: 180, w: 180, h: 75, kg: 30, qty: 40, loc: "R1-02", desc: "Meja bundar banquet diameter 180 cm untuk 10 tamu.", min: 10 },
  { sku: "DTB-003", name: "Meja Cocktail Tinggi", cat: "dining-table", color: "Hitam", material: "Top HPL, kaki baja", accent: "Chrome", l: 60, w: 60, h: 110, kg: 12, qty: 25, loc: "R1-02", desc: "Meja berdiri untuk area networking dan cocktail." },
  { sku: "CON-001", name: "Meja Konsol Walnut", cat: "console-table", color: "Walnut", material: "Kayu walnut veneer", accent: "Hitam", l: 140, w: 40, h: 80, kg: 22, qty: 8, loc: "A-02", desc: "Meja konsol ramping dengan laci ganda untuk area penerima tamu." },
  { sku: "CON-002", name: "Konsol Marmer Brass", cat: "console-table", color: "Marmer", material: "Marmer, rangka kuningan", accent: "Emas", l: 120, w: 35, h: 82, kg: 30, qty: 4, loc: "A-02", desc: "Konsol mewah dengan top marmer dan rangka brass." },
  { sku: "CTR-001", name: "Meja Resepsionis Fluted", cat: "counter-reception", color: "Krem", material: "MDF fluted, top solid surface", accent: "Hitam", l: 200, w: 70, h: 105, kg: 85, qty: 5, loc: "R2-01", desc: "Counter resepsionis dengan panel fluted untuk booth dan lobby acara." },
  { sku: "CTR-002", name: "Counter Bar Modular", cat: "counter-reception", color: "Hitam", material: "Panel HPL, top kayu", accent: "Oak", l: 150, w: 60, h: 110, kg: 60, qty: 6, loc: "R2-01", desc: "Modul counter bar yang dapat digabung menjadi bar lurus atau L." },
  { sku: "DSP-001", name: "Podium Display Set (3 pcs)", cat: "display-furniture", color: "Putih", material: "MDF duco", accent: "Emas", l: 60, w: 60, h: 100, kg: 25, qty: 10, loc: "R2-02", desc: "Set podium tiga ukuran untuk display produk di pameran.", units: true },
  { sku: "DSP-002", name: "Rak Display Gantung", cat: "display-furniture", color: "Hitam", material: "Besi hollow powder coat", accent: "Hitam", l: 120, w: 45, h: 180, kg: 28, qty: 8, loc: "R2-02", desc: "Rak display dengan rel gantung untuk fashion & retail activation." },
  { sku: "DSP-003", name: "Vitrine Kaca LED", cat: "display-furniture", color: "Putih", material: "Kaca tempered, LED", accent: "Chrome", l: 80, w: 50, h: 190, kg: 55, qty: 4, loc: "R2-02", desc: "Lemari kaca dengan pencahayaan LED untuk barang berharga.", units: true },
  { sku: "DEC-001", name: "Vas Keramik Tinggi", cat: "decorative-accessories", color: "Terracotta", material: "Keramik", accent: "Krem", l: 30, w: 30, h: 80, kg: 6, qty: 30, loc: "C-01", desc: "Vas keramik tinggi untuk rangkaian bunga kering." },
  { sku: "DEC-002", name: "Lampu Lantai Arc", cat: "decorative-accessories", color: "Emas", material: "Logam, kap linen", accent: "Krem", l: 40, w: 120, h: 190, kg: 10, qty: 10, loc: "C-01", desc: "Lampu lantai arc untuk pencahayaan hangat di lounge." },
  { sku: "SHL-001", name: "Rak Buku Grid Industrial", cat: "shelving-storage", color: "Hitam", material: "Besi & kayu pinus", accent: "Hitam", l: 120, w: 35, h: 180, kg: 32, qty: 6, loc: "R1-01", desc: "Rak grid terbuka untuk dekor backdrop dan display." },
  { sku: "SHL-002", name: "Kabinet Rotan Pintu Ganda", cat: "shelving-storage", color: "Rattan", material: "Kayu jati, anyaman rotan", accent: "Oak", l: 100, w: 42, h: 85, kg: 26, qty: 5, loc: "R1-01", desc: "Kabinet penyimpanan dengan panel rotan, cocok untuk tema tropis." },
  { sku: "OTH-001", name: "Ottoman Bulat Bouclé", cat: "other-furniture", color: "Krem", material: "Bouclé", l: 55, w: 55, h: 42, kg: 6, qty: 24, loc: "A-03", desc: "Ottoman bulat serbaguna sebagai dudukan tambahan atau meja kecil." },
  { sku: "OTH-002", name: "Bangku Panjang Kayu", cat: "other-furniture", color: "Natural", material: "Kayu jati", accent: "Natural", l: 160, w: 38, h: 45, kg: 15, qty: 14, loc: "B-01", desc: "Bangku panjang tanpa sandaran untuk area tunggu." },
  { sku: "OTH-003", name: "Partisi Lipat Rotan", cat: "other-furniture", color: "Rattan", material: "Rotan, rangka kayu", accent: "Rattan", l: 180, w: 3, h: 170, kg: 12, qty: 9, loc: "B-02", desc: "Partisi lipat empat panel untuk pembatas ruang dan backdrop foto." },
];

export const COLLECTIONS = [
  { slug: "vip-lounge", name: "VIP Lounge Essentials", description: "Sofa, kursi lounge, dan meja untuk area VIP.", skus: ["SOF-001", "SOF-002", "LNG-001", "LNG-003", "COF-001", "COF-003", "DEC-002"] },
  { slug: "wedding-gala", name: "Wedding & Gala Dinner", description: "Kursi tiffany, meja banquet dan aksesoris dekoratif.", skus: ["DIN-002", "DTB-002", "DTB-001", "DEC-001", "CON-002"] },
  { slug: "exhibition-booth", name: "Exhibition Booth Kit", description: "Counter, display dan seating untuk booth pameran.", skus: ["CTR-001", "CTR-002", "DSP-001", "DSP-002", "DSP-003", "BAR-001", "DTB-003"] },
  { slug: "tropical-natural", name: "Tropical Natural", description: "Rotan, kayu, dan tekstur alami.", skus: ["LNG-002", "SHL-002", "OTH-003", "COF-002", "OTH-002"] },
];

export const PROJECTS = [
  { code: "PRJ-2026-001", name: "Peluncuran Produk Aurora (Demo)", client: "PT Aurora Demo", event: "Product Launch", location: "Jakarta Convention Center", offset: [3, 9] },
  { code: "PRJ-2026-002", name: "Gala Dinner Bank Nusantara (Demo)", client: "Bank Nusantara Demo", event: "Annual Gala Dinner", location: "Hotel Mulia, Jakarta", offset: [10, 13] },
  { code: "PRJ-2026-003", name: "Pameran Interior Expo (Demo)", client: "Expo Organizer Demo", event: "Interior Expo Booth", location: "ICE BSD, Tangerang", offset: [-6, 2] },
  { code: "PRJ-2026-004", name: "Pernikahan Taman Bali (Demo)", client: "Klien Pribadi Demo", event: "Garden Wedding", location: "Bali", offset: [20, 24] },
  { code: "PRJ-2026-005", name: "Corporate Summit Jakarta (Demo)", client: "PT Summit Demo", event: "Leadership Summit", location: "Ritz-Carlton Pacific Place", offset: [-20, -15] },
];
