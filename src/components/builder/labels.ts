// Indonesian labels for the section registry (the registry itself is written in English).
const ID: Record<string, string> = {
  // section types
  "Announcement Bar": "Bilah Pengumuman", "Hero Banner": "Banner Hero", "Image Slider": "Slider Gambar", "Featured Products": "Produk Unggulan",
  "Product Category Grid": "Grid Kategori Produk", "Collection Showcase": "Etalase Koleksi", "Product Carousel": "Karosel Produk",
  "Promotional Banner": "Banner Promosi", "Text & Image": "Teks & Gambar", Gallery: "Galeri", Statistics: "Statistik", Testimonials: "Testimoni",
  FAQ: "FAQ", Contact: "Kontak", "Reservation CTA": "Ajakan Reservasi", "Search & Availability": "Cari & Ketersediaan", "Video Section": "Video",
  "Custom Content": "Konten Kustom", "Product Catalog": "Katalog Produk", "Product Detail": "Detail Produk", "Collections List": "Daftar Koleksi",
  "Collection Detail": "Detail Koleksi", "Reservation Cart": "Keranjang Reservasi", "My Reservations": "Reservasi Saya", "Reservation Detail": "Detail Reservasi",
  "My Account": "Akun Saya", "Login Form": "Formulir Masuk",
  // fields
  Text: "Teks", "Link label": "Label tautan", "Link destination": "Tujuan tautan", Eyebrow: "Teks kecil di atas judul", Heading: "Judul", Subheading: "Subjudul",
  Image: "Gambar", "Image 2 (collage)": "Gambar 2 (kolase)", "Image 3 (collage)": "Gambar 3 (kolase)", "Button label": "Label tombol", "Button destination": "Tujuan tombol",
  "Second button label": "Label tombol kedua", "Second button destination": "Tujuan tombol kedua", Autoplay: "Putar otomatis", Slides: "Slide", Link: "Tautan",
  "Product source": "Sumber produk", Collection: "Koleksi", Category: "Kategori", "SKUs (comma separated)": "SKU (pisahkan dengan koma)", "Number of products": "Jumlah produk",
  Columns: "Kolom", "Max categories": "Maks. kategori", "Show empty categories": "Tampilkan kategori kosong", "Max collections": "Maks. koleksi", Body: "Isi",
  Images: "Gambar", Footnote: "Catatan kaki", "Value source": "Sumber nilai", "Custom value": "Nilai kustom", Label: "Label", Quotes: "Kutipan", Quote: "Kutipan",
  Name: "Nama", Role: "Jabatan", Questions: "Pertanyaan", Question: "Pertanyaan", Answer: "Jawaban", Address: "Alamat", Email: "Email", Phone: "Telepon", Hours: "Jam",
  "Video URL (YouTube, Vimeo or .mp4)": "URL video (YouTube, Vimeo atau .mp4)", "Second column": "Kolom kedua",
  // options
  Newest: "Terbaru", "Most reserved": "Paling sering dipesan", "Most available": "Stok terbanyak", "Manual (SKUs)": "Manual (SKU)",
  "Live: SKUs": "Live: jumlah SKU", "Live: total units": "Live: total unit", "Live: available units": "Live: unit tersedia", "Live: categories": "Live: kategori", "Live: collections": "Live: koleksi",
};
export const lbl = (lang: "id" | "en", s: string) => (lang === "en" ? s : ID[s] ?? s);
