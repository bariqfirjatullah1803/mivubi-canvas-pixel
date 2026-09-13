# DESIGN · MIVUBI Canvas Pixel

| | |
| --- | --- |
| Dokumen | Sistem desain dan spesifikasi visual |
| Versi | 1.2 |
| Tanggal | 13 September 2026 |
| Pasangan | `PRD.md` v1.2 (perilaku produk; keputusan rebuild R1–R13 di §25). Dokumen ini mengatur rupa, rasa, dan bahasa. |
| Status | Diterapkan di prototipe UI repo `pixel-art` (SvelteKit 2 / Svelte 5). Belum diterapkan ke repo source. |
| Pemilik kanonis token di repo | `docs/foundation/05-ui-design-system.md` (repo `Image2Pixelart-Local`). Setelah dokumen ini disetujui, sinkronkan perubahan ke file itu (T3 di PRD). |

Dokumen ini memakai tiga label:

- **Saat ini**: rupa produk di HEAD `77873d0`, bersumber dari PRD.
- **[USULAN]**: perubahan untuk rebuild, lengkap dengan alasannya.
- **Rasio kontras**: hasil hitung rumus luminans relatif WCAG 2.x, dibulatkan dua desimal.

**Perubahan v1.1:** pemilik produk menetapkan palet brand enam warna (§4.1). Palet ini menggantikan palet produk saat ini (hijau hutan, mustard, dan ivory hangat). Semua token UI, komponen, dan poster Default kini diturunkan dari palet itu.

**Perubahan v1.2:** dokumen ini sekarang mencatat rupa yang **sudah dibangun**, bukan hanya usulan. Yang berubah: tipografi (§5) memakai Plus Jakarta Sans plus font pixel MIVUBI Blok; landing menjadi satu layar dengan papan komunitas sebagai latar bergerak (§7.2); navbar pil melayang dipakai di semua halaman (§8.12); Karyaku menjadi galeri berkas (§7.4); Canvas World kehilangan sidebar (§7.5); Karya publik mendapat tab Papan/Poster (§7.6); poster PNG menjadi 9:16 (§12); pergantian tema memakai animasi lingkaran (§9.4); Admin didesain ulang (§13). Label **[USULAN]** yang sudah dibangun diganti **[DIBANGUN]**.

---

## Daftar isi

1. [Brief](#1-brief)
2. [Prinsip](#2-prinsip)
3. [Material](#3-material)
4. [Warna](#4-warna)
5. [Tipografi](#5-tipografi)
6. [Ruang, radius, outline, elevasi](#6-ruang-radius-outline-elevasi)
7. [Layout per layar](#7-layout-per-layar)
8. [Komponen](#8-komponen)
9. [Gerak](#9-gerak)
10. [Bahasa dan microcopy](#10-bahasa-dan-microcopy)
11. [Aksesibilitas visual](#11-aksesibilitas-visual)
12. [Poster PNG](#12-poster-png)
13. [Admin](#13-admin)
14. [Ringkasan perubahan](#14-ringkasan-perubahan)
15. [Keputusan desain terbuka](#15-keputusan-desain-terbuka)

---

## 1. Brief

**Subjek.** Papan mozaik blok magnet 240 × 120 cm di pameran MIVUBI. Satu sel di layar setara satu blok di papan fisik, dan Admin mengunci palet warnanya.

**Audiens.**

- Utama: pengunjung pameran yang berdiri di depan papan dengan ponsel di tangan, tanpa akun.
- Kedua: kreator yang kembali ke karyanya dari rumah.
- Ketiga: Admin pameran yang mengatur papan dan memoderasi karya.

**Tugas utama layar.** Pengunjung memasang blok berwarna di papan virtual, lalu menyimpan dan membagikan hasilnya sebagai poster PNG.

**Konteks pakai.** Ruang pameran berisik dan terang, dan pengunjung sering memakai satu tangan. Pengunjung menyentuh layar lebih sering daripada membaca, jadi papan dan rak palet harus terbaca dari jarak lengan tanpa instruksi.

**Karakter visual.** Latar putih hangat, bidang pastel biru dan hijau yang membagi halaman, sorotan kuning pastel, dan outline hijau sangat gelap yang membingkai kontrol. Hasilnya terasa seperti papan pameran yang ramah anak dan keluarga, dengan papan mozaik berbingkai hitam sebagai benda paling tegas di layar.

---

## 2. Prinsip

- **Papan adalah benda paling nyata di layar.** Papan mendapat satu-satunya bingkai hitam dan kedalaman 2.5D. Papan ivory duduk di atas bidang pastel, sehingga terbaca sebagai benda di atas meja. Header, toolbar, dan panel tetap datar.
- **Kedalaman milik benda fisik.** Bayangan, bevel, dan efek terangkat hanya dimiliki papan, blok, rak kayu, dan swatch terpilih. Tombol, kartu, dan panel UI datar dengan outline `--ink`. Overlay (dialog, menu, toast) memakai satu token bayangan untuk memisahkan lapisan.
- **Presisi di atas dekorasi.** Efek 2.5D tidak boleh menggeser hit target. Geometri grid tetap datar dan sejajar sumbu (PRD §6.3).
- **Status terbaca tanpa warna.** Setiap status memakai label teks dan bentuk. Warna menjadi penguat.
- **Satu nama per tindakan.** Tombol, toast, dan dialog memakai kata kerja yang sama sepanjang satu alur.

Kalau dua pilihan desain bertabrakan, prinsip yang lebih atas di daftar ini yang menang.

---

## 3. Material

Material UI ini meniru benda di ruang pameran. Tabel berikut memetakan benda ke token dan aturan.

| Benda | Peran di layar | Token / nilai | Aturan |
| --- | --- | --- | --- |
| Bingkai papan | Batas papan, sumber kontras utama | Gradasi hitam, radius 20, bevel tipis. Nilai hex belum tercatat di PRD; ambil dari `src/lib/render/magnetic-block.ts` saat rebuild. | Muncul di Studio, kartu Karyaku, template, HeroBoard, dan pratinjau Admin. Elemen lain tidak memakai bingkai hitam. |
| Grid papan | Permukaan tempat blok menempel | `--board-ivory` `#FBFAF4` | Tidak mengikuti tema maupun palet UI. Garis grid digambar kalau toggle aktif dan sel ≥ 3 px. |
| Blok magnet | Isi karya | Warna palet terkunci dari Admin | Gradasi terang di atas dan gelap di bawah. Sambungan 1 device-pixel (terang kiri/atas, gelap kanan/bawah). Tidak mengikuti tema. |
| Ghost | Pratinjau blok di bawah pointer | Warna aktif alpha 0,65 + outline `--primary`. Hapus: `#FEFAEC`. | Tidak muncul di mode Geser. |
| Rak kayu | Wadah palet | Nilai hex belum tercatat di PRD; ambil dari source. | Swatch terpilih terangkat 10 px dengan outline `--ink`. |
| Meja kerja | Area di sekitar papan di Studio | `--section-green` `#E1F0CF` | Bidang pastel ini memberi papan ivory latar yang berbeda (1,14:1), dan bingkai hitam menegaskan batasnya. |

Palet UI (§4) dan palet blok karya adalah dua sistem terpisah. Admin mengatur palet blok; palet UI tidak pernah masuk ke rak.

### 3.1 Temuan: blok pucat hilang di papan ivory

Blok "Putih tulang" `#E8ECE8` di atas ivory `#FBFAF4` punya kontras **1,14:1**. Blok "Kuning-tan" `#B78850` mencapai 3,02:1.

Tepi blok terbaca lewat gradasi dan sambungan, tetapi keduanya hanya digambar saat sel ≥ 8 px (`magnetic-block.ts:12`). Di bawah 8 px, misalnya saat Fit di ponsel 320 px, blok putih tulang tidak terlihat.

[USULAN] Renderer menggambar sambungan 1 device-pixel di semua ukuran sel untuk warna yang kontrasnya terhadap ivory < 1,5:1. Warna palet lain tetap mengikuti aturan ≥ 8 px.

---

## 4. Warna

### 4.1 Palet brand

Pemilik produk menetapkan enam warna ini. Rebuild memakainya tanpa mengubah nilai.

| Peran | Nama | Hex | Token |
| --- | --- | --- | --- |
| Background utama | Putih hangat | `#FFFEF5` | `--bg` |
| Section biru | Biru pastel | `#D8EEFF` | `--section-blue` |
| Section hijau | Hijau pastel | `#E1F0CF` | `--section-green` |
| Highlight | Kuning pastel | `#FFF0B3` | `--highlight` |
| Tombol utama | Hijau tua | `#08783F` | `--primary` |
| Teks & outline | Hijau sangat gelap | `#153D2B` | `--ink` |

### 4.2 Token turunan

Palet brand belum memuat warna untuk teks sekunder, galat, dan garis pemisah halus. Token berikut diturunkan dari palet atau dipertahankan dari produk saat ini, dan semuanya lolos audit §4.4.

| Token | Nilai | Asal | Peran |
| --- | --- | --- | --- |
| `--on-primary` | `#FFFEF5` | `--bg` | Teks dan ikon di atas `--primary` |
| `--muted` | `#506D5E` | Campuran 25% `--ink` ke `--bg` | Teks sekunder, petunjuk, metadata |
| `--line` | `#D0D7CD` | Campuran 80% `--ink` ke `--bg` | Garis pemisah dekoratif, garis grid World |
| `--danger` | `#A63E2D` | Dipertahankan dari produk saat ini | Galat, aksi destruktif |
| `--focus` | `#08783F` | `--primary` | Cincin fokus |
| `--board-ivory` | `#FBFAF4` | Material papan (§3) | Grid papan |
| `theme-color` | `#FFFEF5` | `--bg` | Warna bilah browser di ponsel |

**Saat ini** produk memakai hijau hutan `#005A2A`, mustard `#EBB734`, tinta `#21302F`, dan permukaan ivory hangat (PRD §15.2). Pemetaan untuk migrasi:

| Token lama | Nilai lama | Token baru |
| --- | --- | --- |
| `--paper` | `#FFFEF9` | `--bg` |
| `--ink` | `#21302F` | `--ink` `#153D2B` |
| `--forest` | `#005A2A` | `--primary` |
| `--on-accent` | `#FFFFFF` | `--on-primary` |
| `--accent` (mustard) | `#EBB734` | `--highlight` untuk isian sorotan; tidak ada pengganti untuk teks |
| `--muted` | `#66746F` | `--muted` `#506D5E` |
| `--line` | `#E4D9B6` | `--line` `#D0D7CD` |
| `--surface-soft` | `#F5F0E4` | `--section-green` atau `--section-blue` sesuai halaman (§4.5) |
| `--workspace` | `#EEE7D7` | `--section-green` |
| `--preview-surface` | `#F3EFE5` | `--section-blue` |
| `--hero-surface` | radial ivory | `--section-blue` datar |
| `--accent-dark`, `--cyan`, `--brand-yellow-50…500` | beragam | Dihapus |

Palet lama punya empat pasangan yang gagal WCAG, termasuk cincin fokus mustard 1,83:1 di permukaan terang. Palet baru menutup keempatnya (§4.4).

### 4.3 Tema gelap [USULAN]

Palet brand hanya berisi tema terang, sedangkan produk saat ini mendukung tema Terang/Gelap/Sistem (PRD FR-PROF-04). Token gelap berikut menjaga karakter palet: hijau sangat gelap menjadi latar, dan pastel menjadi versi redup.

| Token | Terang | Gelap |
| --- | --- | --- |
| `--bg` | `#FFFEF5` | `#10271C` |
| `--panel` | `#FFFEF5` | `#173325` |
| `--section-blue` | `#D8EEFF` | `#1B3346` |
| `--section-green` | `#E1F0CF` | `#1F3A24` |
| `--highlight` | `#FFF0B3` | `#3D3718` |
| `--primary` | `#08783F` | `#7ED3A0` |
| `--on-primary` | `#FFFEF5` | `#10271C` |
| `--ink` | `#153D2B` | `#FFFEF5` |
| `--outline` | `#153D2B` | `#8FB8A0` |
| `--muted` | `#506D5E` | `#B9C9BC` |
| `--line` | `#D0D7CD` | `#2E4A3A` |
| `--danger` | `#A63E2D` | `#F08A78` |
| `--focus` | `#08783F` | `#FFF0B3` |

Dalam tema gelap, papan tetap ivory dengan kontras 15,11:1 terhadap latar, jadi papan menjadi benda paling terang di layar. Keputusan untuk mempertahankan tema gelap tercatat di DD5.

### 4.4 Audit kontras

Ambang WCAG 2.2 AA: teks normal 4,5:1, teks besar (≥ 24 px, atau ≥ 18,66 px tebal) 3:1, dan komponen UI serta cincin fokus 3:1.

**Tema terang.** Setiap token diuji di keempat latar:

| Token | `--bg` | `--section-blue` | `--section-green` | `--highlight` | Hasil |
| --- | --- | --- | --- | --- | --- |
| `--ink` `#153D2B` | 11,96 | 10,14 | 10,13 | 10,59 | Lolos untuk teks dan outline |
| `--primary` `#08783F` | 5,51 | 4,67 | 4,66 | 4,87 | Lolos untuk teks, link, dan cincin fokus |
| `--muted` `#506D5E` | 5,62 | 4,77 | 4,76 | 4,98 | Lolos untuk teks normal |
| `--danger` `#A63E2D` | 6,20 | 5,25 | 5,25 | 5,49 | Lolos |

| Pasangan | Rasio | Hasil |
| --- | --- | --- |
| `--on-primary` di `--primary` | 5,51 | Lolos |
| `--ink` di `--primary` | 2,17 | **Gagal**. Jangan pakai teks gelap di tombol utama. |
| `--section-blue` / `--section-green` di `--bg` | 1,18 | Batas bidang terbaca lewat isian, tanpa minimum. Jangan pakai sebagai satu-satunya penanda kontrol. |
| `--highlight` di `--bg` | 1,13 | Sama. Sorotan kuning selalu disertai outline atau teks. |
| `--board-ivory` di `--section-green` | 1,14 | Bingkai hitam papan menegaskan batas. |

**Tema gelap:**

| Token | `--bg` | `--panel` | `--section-blue` | `--section-green` | `--highlight` |
| --- | --- | --- | --- | --- | --- |
| `--ink` `#FFFEF5` | 15,61 | 13,50 | 12,90 | 12,28 | 11,80 |
| `--muted` `#B9C9BC` | 9,14 | 7,90 | 7,55 | 7,19 | 6,91 |
| `--primary` `#7ED3A0` | 8,81 | 7,62 | 7,28 | 6,93 | 6,66 |
| `--outline` `#8FB8A0` | 7,17 | 6,20 | 5,93 | 5,64 | 5,42 |
| `--danger` `#F08A78` | 6,48 | 5,60 | 5,35 | 5,10 | 4,90 |
| `--focus` `#FFF0B3` | 13,82 | 11,95 | 11,42 | 10,87 | 10,45 |

`--on-primary` gelap `#10271C` di `--primary` gelap: 8,81. Semua pasangan tema gelap lolos.

### 4.5 Aturan pemakaian

- **Putih hangat** `--bg` adalah latar halaman, panel, kartu, dialog, dan field.
- **Biru pastel** `--section-blue` menandai bidang tempat orang **melihat** karya: hero Preshow, Canvas World, dan area kanvas di halaman Karya publik.
- **Hijau pastel** `--section-green` menandai bidang tempat orang **membuat** karya: meja kerja Studio dan galeri template "Mulai dari pola".
- **Kuning pastel** `--highlight` menandai sorotan sementara atau pilihan: hover tombol sekunder, item daftar World yang aktif, badge Draf, dan titik status "Menyimpan…". Kuning tidak pernah menjadi warna teks dan tidak pernah berdiri tanpa outline atau label.
- **Hijau tua** `--primary` memegang satu tombol utama per layar, link, dan cincin fokus. Tombol lain memakai gaya sekunder atau teks.
- **Hijau sangat gelap** `--ink` adalah warna teks dan outline semua kontrol.
- Warna palet blok, ivory papan, dan warna poster PNG tidak mengikuti tema (PRD FR-PROF-04).

Pembagian biru untuk melihat dan hijau untuk membuat memberi pengunjung petunjuk tempat tanpa label tambahan.

### 4.6 Warna status simpan

| Status | Label (PRD FR-HEADER-02) | Titik indikator | Teks |
| --- | --- | --- | --- |
| `local` | Tersimpan di perangkat | Cincin 2 px `--ink`, isi `--bg` | `--muted` |
| `saving` | Menyimpan… | Isi `--highlight` + cincin 2 px `--ink` | `--ink` |
| `saved` | Tersimpan | Isi `--primary` | `--ink` |
| `error` | Gagal disimpan | Isi `--danger` | `--danger` |
| `conflict` | Ada versi lebih baru | Isi `--danger` | `--danger` |

Label teks selalu tampil di samping titik. Titik tidak pernah berdiri sendiri.

---

## 5. Tipografi

**Saat ini**: Poppins untuk teks, Readex Pro untuk judul dan brand, dengan fallback system sans. Logotype poster PNG memakai Poppins.

**[DIBANGUN]** Dua keluarga dengan tugas yang tidak tumpang tindih (PRD R1, R2).

**Teks UI — Plus Jakarta Sans.** Variable, berat 200–800, di-host sendiri lewat paket npm `@fontsource-variable/plus-jakarta-sans`. Nama keluarganya di CSS adalah `'Plus Jakarta Sans Variable'`; nama tanpa akhiran `Variable` tidak akan cocok dan diam-diam jatuh ke fallback.

```css
--font: 'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
```

Font wajib di-host sendiri: `fonts.gstatic.com` tidak dapat dijangkau dari lingkungan build ini, jadi `<link>` ke Google Fonts akan gagal tanpa pesan dan halaman turun ke system sans. Ini menutup DD1 dan DD2.

**Display — MIVUBI Blok.** Keluarga pixel yang dibangkitkan `scripts/build-pixel-font.py` (bitmap → kontur lewat pembatalan tepi, keluaran TTF + WOFF2 di `static/fonts/`):

| Keluarga | Grid | Berat | Pemakaian |
| --- | --- | --- | --- |
| MIVUBI Blok | 5 × 7 | Regular, Bold | Cadangan untuk label pendek bergaya pixel |
| MIVUBI Blok Display | 5 × 5, kapital saja | Regular | Judul landing |

Aturan pemakaian font pixel: hanya untuk judul landing dan judul kartu halaman masuk. Font pixel tidak dipakai untuk teks isi, label tombol, field, atau apa pun yang lebih panjang dari satu baris — bentuk 5 × 5 tidak punya cukup detail untuk dibaca dalam paragraf, dan tanpa hinting ia pecah di ukuran kecil. Ukuran minimum yang terbaca: 24 px; kelipatan bulat lebih tajam.

### 5.1 Skala

Basis 16 px dengan rasio 1,25.

| Token | Ukuran / tinggi baris | Berat | Pemakaian |
| --- | --- | --- | --- |
| `--text-xs` | 13 / 18 px | 500 | Keterangan kecil, badge, koordinat |
| `--text-sm` | 14 / 20 px | 400 | Teks sekunder, petunjuk rak |
| `--text-md` | 16 / 24 px | 400 | Teks isi, field form |
| `--text-lg` | 20 / 28 px | 600 | Judul dialog, nama karya di header |
| `--text-xl` | 25 / 32 px | 600 | Judul halaman (Karyaku, Akun, Admin) |
| `--text-2xl` | 31 / 38 px | 700 | Judul World dan Karya publik |
| `--text-display` | 49 / 54 px | 700 | Judul halaman besar |
| Judul landing | 80 / 70 / 50 / 30 px (xl → xs) | MIVUBI Blok Display | Judul landing saja (§7.2) |

Di ≤ 600 px, `--text-display` turun ke 39 / 44 px. Judul landing punya tangganya sendiri karena font pixel tidak menyusut mulus.

### 5.2 Aturan

- Semua teks memakai `--ink` atau `--muted`. Link memakai `--primary` dengan garis bawah.
- Semua judul, label, dan tombol memakai **sentence case**. Huruf kapital penuh hanya untuk judul landing dan logotype poster.
- Hapus eyebrow huruf kapital di atas judul, kecuali eyebrow itu membawa informasi yang tidak ada di judul (§10.4).
- Judul memakai satu berat. Jangan menebalkan atau mewarnai satu frasa di dalam judul.
- Angka yang berubah di tempat (koordinat "Kolom X · Baris Y", persen zoom, jumlah sel) memakai `font-variant-numeric: tabular-nums` lewat kelas `.num`. Plus Jakarta Sans menyediakan `tnum`.
- Paragraf maksimal 70 karakter per baris.
- Teks rata kiri. Rata tengah hanya untuk satu baris pendek di empty state dan layar muat.

---

## 6. Ruang, radius, outline, elevasi

### 6.1 Ruang

Skala 4 px: `4 · 8 · 12 · 16 · 24 · 32 · 48`. Target sentuh minimal **44 × 44 px**. Swatch rak di ≤ 600 px berukuran 52 × 64 px (PRD §15.3).

### 6.2 Radius

Radius mengikuti ukuran benda. Satu radius untuk semua benda membuat hierarki hilang.

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--radius-xs` | 4 px | Badge, chip, swatch |
| `--radius-sm` | 8 px | Tombol, field form, pil koordinat |
| `--radius-md` | 12 px | Menu profil, toast, banner, kartu |
| `--radius-lg` | 16 px | Dialog |
| `--radius-section` | 24 px | Sudut bidang pastel yang tidak menyentuh tepi layar |
| `--radius-board` | 20 px | Bingkai papan |

### 6.3 Outline

Palet menetapkan hijau sangat gelap `#153D2B` sebagai warna teks dan outline. Token warnanya `--outline`: sama dengan `--ink` di tema terang, dan `#8FB8A0` di tema gelap (§4.3). Outline menggantikan bayangan sebagai pemisah kontrol.

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--outline-thin` | 1,5 px `--outline` | Kartu, field, tombol sekunder, badge berbingkai |
| `--outline-strong` | 2 px `--outline` | Swatch terpilih, tab aktif, item terpilih |
| `--line` | 1 px `--line` | Pemisah dekoratif di dalam panel |

### 6.4 Elevasi

| Lapisan | Perlakuan |
| --- | --- |
| UI datar (tombol, kartu, panel, header) | Tanpa bayangan. Pemisah memakai outline `--ink` atau `--line`. |
| Benda fisik (papan, blok, rak, swatch terangkat) | Bayangan dan bevel dari renderer material (§3). |
| Overlay (dialog, menu profil, toast, tooltip World) | Outline `--outline-thin` + satu token `--shadow-panel`. |

[USULAN] `--shadow-control` hanya dipakai swatch terangkat. Kartu Karyaku tidak memakai bayangan; outline dan papan mini berbingkai hitam sudah memisahkan kartu dari latar.

---

## 7. Layout per layar

### 7.1 Breakpoint

**Saat ini** ada 12 breakpoint berbeda (1200, 1000, 980, 850, 800, 780, 760, 650, 600, 400, 380, 320). [USULAN] Rebuild memakai lima breakpoint bersama:

| Nama | Kondisi | Pengganti untuk |
| --- | --- | --- |
| `xs` | ≤ 400 px | 400, 380 |
| `sm` | ≤ 600 px | 600, 650 |
| `md` | ≤ 800 px | 850, 800, 780, 760 |
| `lg` | ≤ 1000 px | 1000, 980 |
| `xl` | ≤ 1200 px | 1200 |

Semua layar wajib lolos di lebar 320 px tanpa scroll horizontal halaman (AC-19).

### 7.2 Landing

[DIBANGUN] Landing adalah **satu layar setinggi 100dvh tanpa scroll**. Papan komunitas tidak lagi duduk di samping teks; ia menjadi latar penuh layar yang bergeser pelan, seperti dunia yang berputar. Judul dan satu CTA berada di tengah. Tidak ada section kedua.

```text
┌──────────────────────────────────────────────────────────────────────┐
│   ╭ MIVUBI ╮                        ╭ Canvas World  Karyaku  (A) ╮   │  navbar pil melayang
│                                                                      │
│      ░ ▓ ░  karya  ░ ▓ ░ karya ░ ▓ ░ karya ░ ▓ ░ karya ░ ▓ ░         │
│    ░ ▓ ░ ░      ╭───────────────────────────────╮    ░ ▓ ░ ░         │  papan komunitas
│  ▓ ░ karya      │        BLOCK UNBLOCK          │  karya  ░ ▓        │  bergeser otomatis
│    ░ ▓ ░ ░      │   Susun warna, tuangkan ide…  │    ░ ▓ ░ ░         │
│  ░ ▓ ░ karya    │   ▛ Mulai dari papan kosong ▟ │  ░ ▓ ░ karya       │  cahaya ivory lembut
│    ░ ▓ ░ ░      ╰───────────────────────────────╯    ░ ▓ ░ ░         │
│      ░ ▓ ░  karya  ░ ▓ ░ karya ░ ▓ ░ karya ░ ▓ ░ karya ░ ▓ ░         │
└──────────────────────────────────────────────────────────────────────┘
```

- **Latar bergerak.** `HeroBoard` menyusun karya publik terbaru (maks 60) menjadi satu petak yang diulang, digambar sekali ke kanvas offscreen lalu digeser dengan `requestAnimationFrame` pada 24 px/detik. Karya baru yang tampil di World ikut muncul di sini. Papan dibangun ulang hanya kalau daftar id atau revisinya berubah, bukan tiap frame.
- **Teks di atas cahaya, bukan di atas kartu.** Blok teks tidak punya latar solid maupun border. Di belakangnya ada satu gradasi radial `--bg` yang memudar ke transparan, sehingga papan tetap terlihat menembus tepinya. Kartu solid memutus latar dan membuat halaman terasa seperti dua lapisan yang tidak berhubungan.
- **Judul** "Block Unblock" memakai MIVUBI Blok Display: 80 px (xl), 70 px (lg), 50 px (sm), 30 px (xs). Dua kata, dua baris, satu berat — tanpa titik dan tanpa penekanan pada salah satu frasa.
- **CTA** memakai tombol blok (§8.13). Hanya satu tombol; tautan "Lihat semua karya" dihapus karena Canvas World sudah ada di navbar.
- **Landing selalu tema terang.** Token terang dikunci di `.landing` apa pun tema yang dipilih. Alasannya papan komunitas adalah gambar berwarna di atas ivory: tema gelap membalik hubungan terang-gelap itu dan mozaiknya jadi mengambang. Tombol tema tetap ada di navbar dan tetap berlaku untuk halaman lain.

### 7.3 Studio

```text
Desktop
┌ Header 76 px, --bg ──────────────────────────────────────────────────────┐
│ ←  MIVUBI  Karya: <judul>   Canvas World  Karyaku   ● Tersimpan          │
│                                              [Simpan & bagikan]   (A)    │
├──────────────────────────────────────────────────────────────────────────┤
│ [Urungkan][Ulangi]                     [☑ Grid][✋ Geser] [−] 100% [+] [Fit] │
│                                                                          │
│                  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   --section-green │
│                  ┃        PAPAN 48 × 24 (ivory)      ┃                    │
│                  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛                    │
│                           Kolom 12 · Baris 7                             │
│             Palet blok magnet: Hijau                                     │
│             ╔═══════════════════════════════════════════╗                │
│             ║ [1][2][3][4][5][6][7][8] …        [Hapus] ║  rak kayu      │
│             ╚═══════════════════════════════════════════╝                │
│             Pilih warna, lalu klik atau tarik di papan.                  │
└──────────────────────────────────────────────────────────────────────────┘

Ponsel (≤ sm)
┌ Header 68 px ────────────┐
│ ← <judul>           (A)  │
│   ● Tersimpan  [Simpan]  │
├──────────────────────────┤
│ [↶][↷]      [✋][−][+][⤢] │  --section-green
│ ┏━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃       PAPAN          ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━┛ │
│ ╔══════════════════════╗ │
│ ║[1][2][3][4]… ⇢ [Hapus]║ │  swatch 52 × 64, scroll horizontal
│ ╚══════════════════════╝ │
│ Ketuk untuk memasang     │
└──────────────────────────┘
```

- [DIBANGUN] Header Studio memakai anatomi pil yang sama dengan navbar (§8.12): pil navigasi, pil judul + status simpan, pil alat, lalu satu tombol utama. Rak palet juga datar (`--bg` + outline), bukan gradasi kayu.
- Papan mengisi area yang tidak tertutup kontrol, dan Fit memusatkannya di area itu (PRD FR-CANVAS-04).
- [DIBANGUN] **Papan tidak bisa digeser keluar dari area kerja.** Kalau papan lebih kecil dari area, ia bebas dipindah tetapi selalu utuh di dalam; kalau lebih besar (zoom masuk), tepinya berhenti tepat di tepi area sehingga layar tidak pernah kosong. Batas ini berlaku untuk semua cara menggeser — tarik, pinch, roda tetikus, dan tombol panah — juga saat zoom mengubah ukuran papan dan saat jendela diubah ukurannya. Tanpa batas ini papan bisa hilang dari layar dan satu-satunya jalan pulang adalah menekan Fit.
- Seluruh area kerja di bawah header memakai `--section-green`.
- Toolbar atas melayang di atas meja kerja. Tombolnya berlatar `--bg` dengan `--outline-thin`, sehingga tetap terbaca saat papan di-zoom ke bawah toolbar.
- Di ≤ md, nav header disembunyikan dan Urungkan/Ulangi berubah menjadi ikon dengan `aria-label`.

**Referensi.** Toolbar punya satu tombol tambahan, Referensi, di antara grup riwayat dan grup tampilan. Tombol itu hilang kalau Admin belum punya pola. Memilih pola menempelkannya sebagai satu langkah yang bisa diurungkan, lalu papan di-Fit supaya hasilnya langsung terlihat. Kalau papan sudah ada isinya, dialog menawarkan **Ganti papan** atau **Tempel di atas** (§13.5).

### 7.4 Karyaku

[DIBANGUN] Karyaku adalah tempat orang mencari karyanya kembali, jadi bentuknya mengikuti peramban berkas, bukan halaman pemasaran: satu baris judul, tab, lalu grid thumbnail yang padat.

```text
┌ navbar pil melayang ─────────────────────────────────────────────────┐
│ Karyaku                                        [+ Buat karya baru]   │
│ ╭ Semua 12 ╮ ╭ Tersimpan 9 ╮ ╭ Draf 3 ╮                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│ │ ┏━━━━━━┓ │ │ ┏━━━━━━┓ │ │ ┏━━━━━━┓ │ │ ┏━━━━━━┓ │                  │
│ │ ┃papan ┃ │ │ ┃      ┃ │ │ ┃      ┃ │ │ ┃      ┃ │                  │
│ │ ┗━━━━━━┛ │ │ ┗━━━━━━┛ │ │ ┗━━━━━━┛ │ │ ┗━━━━━━┛ │                  │
│ │ [Publik] │ │ [Privat] │ │ [Draf]   │ │ [Publik] │                  │
│ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤                  │
│ │ Judul  … │ │ Judul  … │ │ Judul  … │ │ Judul  … │                  │
│ │ 2 jam    │ │ kemarin  │ │ 3 hari   │ │ 5 hari   │                  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
└──────────────────────────────────────────────────────────────────────┘
```

- **Tab** Semua / Tersimpan / Draf, masing-masing dengan hitungan. Tab menggantikan dua judul bagian ("Karya tersimpan", "Draf cloud") yang dulu memaksa orang scroll untuk tahu berapa isinya.
- **Kartu** berisi papan mini berbingkai hitam di atas bidang `--section-blue`, badge status di pojok, lalu footer berisi judul, waktu relatif ("2 jam lalu"), dan tombol "…".
- **Menu "…"** memuat Edit/Lanjutkan, Salin link, Buka halaman publik, dan Hapus. Aksi tidak lagi berupa tiga tombol yang selalu tampil, supaya kartunya pendek dan yang menonjol tetap karyanya.
- **"+ Buat karya baru"** langsung membuat draf lalu membuka `/project/[id]` (PRD R8). Tombol ini tidak membuka dialog dan tidak mampir ke landing.
- Grid `repeat(auto-fill, minmax(220px, 1fr))`: 4–5 kolom di desktop sampai 1 kolom di xs.

### 7.5 Canvas World

```text
┌ navbar pil melayang ──────────────────────────────────────────────┐
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·    │
│  ·    ┌────┐        ┌──────┐                                 ·    │
│  ·    │karya│   ┌──┐│karya │          --section-blue         ·    │
│  ·    └────┘   └──┘└──────┘                                  ·    │
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·    │
│ [−] 90% [+] [Lihat semua]                          bantuan ⓘ      │
└───────────────────────────────────────────────────────────────────┘
```

[DIBANGUN] Panel daftar di kanan dihapus (PRD R7). Daftar itu mengulang apa yang sudah terlihat di viewport dan mengambil 280 px dari lebar mozaik. Detail karya tetap terjangkau lewat klik pada karyanya. Kolom grid memakai `minmax(0, 1fr)` supaya viewport tidak pernah mendorong halaman melebar.

- Viewport World berlatar `--section-blue`. Grid dua tingkat (tiap sel dan tiap 5 sel) memakai `--line` dengan alpha 0,5 dan 1.
- Karya di World tampil tanpa bingkai. Hanya area content bounds yang digambar, dan sel kosong transparan, sehingga karya-karya menyatu menjadi satu mozaik di atas langit biru.
- Item daftar yang sedang di-hover atau fokus memakai isi `--highlight`, dan karya yang sama di viewport mendapat outline `--primary` 2 px.
- [USULAN] Tombol "Pusat" diganti namanya menjadi "Lihat semua". Tombol ini membingkai semua karya yang termuat, dan kamera baru kembali ke titik (0,0) kalau tidak ada karya (PRD §8.11). Nama lama menjanjikan hal lain.

### 7.6 Karya publik

```text
┌───────────────────────────────────────────┬──────────────────────┐
│ ╭ Papan │ Poster ╮                        │ Judul karya          │
│                                           │ oleh <Kreator>       │
│   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │ 48 × 24 sel · kemarin│
│   ┃   papan read-only, atau poster    ┃   │                      │
│   ┃   9:16 ukuran penuh               ┃   │ Desain poster        │
│   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │ ┌────┐ ┌────┐        │  --bg
│                        --section-blue     │ │ 9  │ │ 9  │        │
│   [−] 100% [+] [Fit]   (hanya tab Papan)  │ │:16 │ │:16 │        │
│                                           │ └────┘ └────┘        │
│                                           │ [Bagikan karya]      │
│                                           │ [Unduh PNG] [Salin link] │
└───────────────────────────────────────────┴──────────────────────┘
Grid 1fr 380px; bertumpuk di ≤ md.
```

[DIBANGUN] Dua hal baru (PRD R9):

- **Tab Papan / Poster** berupa pil melayang di pojok kiri atas panggung. Papan bisa di-zoom; Poster menampilkan PNG yang sebenarnya akan diunduh.
- **Pratinjau ikut pilihan.** Memilih desain di panel kanan langsung merender ulang poster besarnya dan memindahkan tampilan ke tab Poster. Sebelumnya orang memilih desain hanya dari namanya.
- Poster pratinjau memakai `max-height: 100%` di dalam baris grid `minmax(0, 1fr)`. Tanpa baris yang tingginya pasti, persen itu melingkar dan poster 9:16 terpotong di bawah.

Katalog desain poster sama dengan dialog "Karya tersimpan" di Studio (T1).

### 7.7 Akun [DIBANGUN]

Satu kolom di semua lebar: navbar pil, lalu satu kartu blok (§8.13) selebar 420 px di tengah bidang kertas grid (§8.14). Panel promosi dua kolom dihapus — kalimat pengantarnya menyusut menjadi satu baris di dalam kartu, tepat di bawah judul, sehingga di layar sempit form tidak lagi terdorong ke bawah lipatan.

Isi kartu dari atas: rel warna palet setinggi 10 px selebar kartu, tab pil Daftar/Masuk, judul (MIVUBI Blok 20 px), satu kalimat konteks, dua field, catatan tanpa pemulihan password (kotak `--highlight`, hanya saat Daftar), tombol kirim blok, dan satu baris kaki yang menjelaskan draf perangkat ikut terhubung.

Setelah masuk, kartu yang sama berisi sapaan, dua tautan aksi, dan tombol Keluar — tidak ada layout kedua.

### 7.8 Admin

Lihat §13.

---

## 8. Komponen

### 8.1 Tombol

| Varian | Latar | Teks | Outline | Pemakaian |
| --- | --- | --- | --- | --- |
| Utama | `--primary` | `--on-primary` | tidak ada | Satu per layar: Simpan & bagikan, Simpan karya, Mulai dari papan kosong |
| Sekunder | `--bg` | `--ink` | `--outline-thin` | Batal, Unduh PNG, Salin link |
| Teks | transparan | `--primary`, bergaris bawah | tidak ada | Tautan navigasi, Lewati |
| Destruktif | `--danger` | `--on-primary` | tidak ada | Hapus (di dialog konfirmasi), Takedown |

Semua tombol minimal 44 px tinggi, radius `--radius-sm`, label sentence case. Tombol tidak memakai panah "→" di label. Tombol yang membuka tab baru memakai ikon tautan keluar dengan `aria-label`.

State:
- Hover tombol utama dan destruktif: latar bergeser 10% ke arah `--ink`.
- Hover tombol sekunder: isi berganti ke `--highlight`.
- Aktif: tombol turun 1 px dan latar bergeser 16% ke arah `--ink`.
- Fokus: §11.1.
- Nonaktif: opasitas 0,45 dan `cursor: not-allowed`.
- Sibuk: label berganti ke bentuk progresif, misalnya "Menyiapkan studio…", dan tombol tetap nonaktif.

### 8.2 Rak palet dan swatch

- Rak berbentuk kayu dengan kompartemen dan bisa di-scroll horizontal. Scroll tidak mengecilkan swatch.
- Swatch terpilih punya empat penanda: terangkat 10 px, `--outline-strong` ditambah cincin luar 2 px `--bg`, nomor slot tebal bergaris bawah, dan `aria-pressed="true"`. Warna bukan satu-satunya penanda (PRD FR-TOOLS-03). Cincin `--bg` menjaga outline terlihat di atas swatch berwarna gelap.
- Tombol Hapus ada di ujung rak dengan ikon penghapus dan label teks. Saat aktif, tombol ini terangkat seperti swatch.
- Label di atas rak mengumumkan nama warna atau alat aktif lewat live region `polite`.

### 8.3 Indikator status simpan

Titik 10 px diikuti label (§4.6), memakai `role="status"` dan `aria-live="polite"`. Di ≤ sm, indikator pindah ke bawah judul karya.

### 8.4 Dialog

- Memakai `<dialog>` modal native. Lebar maks 600 px; tinggi maks `100dvh − 32px` dengan scroll di dalam. Detail World 760 px.
- Latar `--bg`, `--outline-thin`, radius `--radius-lg`, `--shadow-panel`. Backdrop `--ink` dengan alpha 0,45.
- Susunan: judul (`--text-lg`) → teks pengantar satu kalimat → isi → baris aksi rata kanan (tombol utama paling kanan).
- Escape menutup dialog, kecuali dialog konflik.
- Fokus masuk ke kontrol pertama yang relevan, lalu kembali ke pemicu setelah dialog ditutup.
- Pilihan Publik/Privat di dialog Simpan berupa dua kartu radio. Kartu terpilih memakai `--outline-strong` dan isi `--section-green`.
- [DIBANGUN] Dialog setelah menyimpan berjudul **"Karya tersimpan"** dan hanya punya dua aksi: **Unduh PNG** dan **Simpan** (menutup dialog). Tombol "Bagikan" lama memanggil Web Share API yang tidak ada di desktop, jadi ia diam-diam jatuh ke unduh PNG + salin link — hasilnya sama seperti menutup dialog, hanya dengan efek samping yang tidak diminta. "Salin link" ikut dihapus karena link karya sudah ada di halaman publiknya dan di menu "…" Karyaku. Menyimpan tidak pernah mengunduh apa pun; mengunduh adalah pilihan terpisah.

[USULAN] EditorHelp mengikuti ukuran dialog standar. **Saat ini** EditorHelp memakai 520 px dan `100dvh − 24px`.

### 8.5 Toast dan banner

Keduanya punya tugas berbeda. Rebuild memakai aturan ini di semua layar:

| | Toast | Banner |
| --- | --- | --- |
| Kapan | Tindakan selesai dan tidak butuh respons ("Karya disimpan privat.") | Galat yang menghalangi pekerjaan dan butuh tindakan (gagal masuk Studio, autosave gagal) |
| Posisi | Bawah tengah | Di bawah header, selebar area konten |
| Durasi | Hilang setelah 3,8 detik | Menetap sampai pengguna menutup atau masalah selesai |
| Role | `status` | `alert` |
| Rupa | Latar `--bg`, `--outline-thin`, ikon centang `--primary` | Latar `--bg`, outline 2 px `--danger`, ikon galat, tombol aksi |

**Saat ini** toast galat merah dan banner `.root-error` sama-sama dipakai untuk galat, tanpa aturan yang jelas. [USULAN] Toast tidak lagi membawa galat. Galat yang bisa diabaikan berupa teks galat di dekat kontrol pemicunya, dan galat yang menghalangi berupa banner.

### 8.6 Papan mini

[DIBANGUN] Papan mini dipakai di kartu Karyaku, dialog detail World, dan daftar Admin. Ukurannya dihitung dari lebar wadah **dan** batas tinggi (`maxHeight`), lalu diambil yang lebih kecil; kanvasnya dipusatkan kalau tinggi yang membatasi.

Tanpa batas tinggi, tinggi papan hanya mengikuti lebar wadah. Karya yang tinggi dan ramping — misalnya content bounds 7 × 20 sel — jadi berlipat kali lebih tinggi daripada layar, dan dialog detail World harus di-scroll untuk melihat satu gambar utuh. Batasnya: dialog World `52vh` (ikut tinggi layar), kartu Karyaku 200 px, ubin Ringkasan Admin 130 px, dan baris moderasi 110 px.

### 8.7 Kartu karya

- Papan mini berbingkai hitam di atas, lalu badge, judul, kreator, ukuran grid, dan baris aksi.
- Kartu memakai latar `--bg`, `--outline-thin`, radius `--radius-md`, dan tanpa bayangan.
- Badge memakai bentuk dan teks:

| Badge | Rupa |
| --- | --- |
| Publik | Isi `--section-green`, `--outline-thin`, ikon mata |
| Privat | Isi `--bg`, `--outline-thin`, ikon gembok |
| Tidak tampil di publik | Isi `--bg`, outline 1,5 px `--danger`, teks `--danger`, ikon larangan |
| Draf | Isi `--highlight`, `--outline-thin` |

- Kartu draf menampilkan "Menghapus…" saat dihapus, sama seperti kartu tersimpan (PRD FR-WORKS-04).

### 8.8 Field form

- Label di atas field. Teks bantuan di bawah field memakai `--muted`.
- Latar `--bg` dengan `--outline-thin`. Saat fokus, cincin fokus muncul di luar outline (§11.1).
- Galat berupa teks `--danger` di bawah field dengan ikon. Outline field berganti ke 2 px `--danger`, dan field dihubungkan lewat `aria-describedby` serta `aria-invalid="true"`. Aturan ini menutup celah A11Y-08 di `/account`.
- Penghitung karakter muncul di field berbatas (judul 200, kreator 80, sosmed 120).

### 8.9 Menu profil

Pemicu berisi avatar inisial dalam lingkaran `--section-blue` berbingkai `--outline-thin`, nama ("Tamu" atau username), dan chevron. Panel memakai `--bg`, `--outline-thin`, `--shadow-panel`, dan radius `--radius-md`. Item yang di-hover memakai isi `--highlight`. Urutan isi panel: identitas, navigasi, akun, tema, bantuan, lalu Keluar di paling bawah dengan pemisah `--line`.

### 8.10 Tutorial spotlight

- Lapisan `--ink` dengan alpha 0,55 dan lubang di sekitar elemen `data-tour`, dengan padding 8 px dan radius mengikuti target. Tepi lubang memakai cincin 3 px `--highlight`.
- Kartu tutorial memakai `--bg` dan `--outline-thin`. Kartu pindah ke atas target kalau target berada di separuh bawah layar.
- Progres ditulis "Langkah 2 dari 5" dengan 5 bar: bar selesai `--primary`, bar tersisa `--line`. Penomoran di sini sah, karena tutorial memang berurutan.

### 8.11 Empty state dan galat halaman

Susunan: papan mini kosong berbingkai hitam, satu kalimat keadaan, satu kalimat arahan, lalu satu tombol aksi. Contoh Karyaku kosong: "Kamu belum punya karya." + "Karya yang kamu simpan akan muncul di sini." + [Mulai berkarya].

### 8.12 Navbar pil [DIBANGUN]

Satu komponen untuk semua halaman (PRD R4). Header tidak lagi berupa bilah selebar layar dengan garis bawah; isinya dipecah menjadi dua pil yang melayang di atas konten.

- **Pil kiri** berisi logo saja: monogram MIVUBI 30 px tanpa wordmark, di dalam sasaran sentuh 44 × 44 px. Nama produk tidak diulang sebagai teks karena tiap halaman sudah menyebut dirinya lewat judul, dan logo sendirian menyisakan ruang untuk navigasi di layar sempit. Logonya adalah berkas resmi `static/logo/mark.png`, dipasang sebagai `mask-image` dengan `background: currentColor` — bukan `<img>`. Dengan begitu satu berkas monokrom melayani tema terang, tema gelap, dan landing yang tokennya dikunci terang, tanpa perlu menukar aset atau menebak tema lewat atribut `data-theme`.
- **Pil kanan** berisi tautan navigasi dan menu profil.
- Keduanya berlatar `--bg` dengan `--outline-thin`, radius 999 px, dan `--shadow-panel`.
- Prop `floating` menentukan apakah navbar duduk di atas konten (landing, World, Karya publik) atau mengalir sebagai baris biasa (Karyaku, Akun).
- Di halaman yang kontennya bisa lewat di belakang navbar, gradasi `--header-fade` dari `--bg` ke transparan menjaga pil tetap terbaca.
- Tautan aktif memakai isi `--section-green` dan `--outline-strong`, bukan hanya warna teks.

Studio memakai anatomi yang sama: tiga pil (navigasi, judul + status, alat) plus satu tombol utama, sehingga Studio tidak lagi terasa seperti aplikasi lain.

### 8.13 Tombol blok [DIBANGUN]

CTA utama landing. Bentuknya meminjam blok magnet: persegi dengan sudut kecil, outline `--ink` penuh, dan bayangan keras (`box-shadow: 6px 6px 0 var(--ink)`) tanpa blur. Saat ditekan, tombol bergeser 3 px ke kanan-bawah dan bayangannya menyusut, seperti blok yang ditekan ke papan.

Bayangan kerasnya tersedia sebagai kelas `.blok` (`border` 2 px `--outline`, `--radius-xs`, `box-shadow: 4px 4px 0 var(--outline)`), dipakai kartu maupun tombol.

Tombol blok dipakai paling banyak sekali per halaman: CTA landing, dan tombol kirim di halaman masuk (§7.7, §13.6) tempat kartunya sendiri sudah berbentuk blok. Tombol utama di halaman lain tetap memakai varian Utama (§8.1) — dua gaya tombol tegas dalam satu layar saling bersaing.

### 8.14 Kertas grid [DIBANGUN]

Latar halaman masuk: bidang `--section-blue` dengan dua gradasi garis 1 px ber-jarak 24 px, warnanya `--outline` 12 %. Kelas `.grid-field` di `app.css`, dipakai halaman Akun dan Masuk Admin.

Gunanya menyambungkan halaman masuk ke papan tanpa memuat karya sungguhan: tidak ada permintaan jaringan, tidak ada gerak di belakang form, dan warnanya ikut tema — berbeda dari landing yang mengunci token terang karena papannya memang ivory.

### 8.15 Petak pola [DIBANGUN]

Satu komponen untuk pola referensi, dipakai di tiga tempat: kartu Admin, editor Admin, dan galeri di Studio. Petak CSS Grid dengan sel sebesar `max / sisi terpanjang`, jadi pola 9 × 8 dan 12 × 12 sama-sama muat di kotak yang sama.

Tanpa callback `paint` ia hanya pratinjau (`role="img"` dengan label ukuran). Dengan `paint` tiap sel menjadi `<button>`: bisa diklik, ditarik untuk menggambar beberapa sel, dan dicapai keyboard satu per satu.

---

## 9. Gerak

### 9.1 Satu momen utama

Transisi Preshow ke Studio adalah satu-satunya animasi yang bukan respons atas sentuhan atau klik pengguna. Transisi ini mengubah papan komunitas menjadi papan kerja, sehingga pengunjung melihat bahwa karyanya akan bergabung dengan karya orang lain. Bidang latar ikut berganti dari biru (melihat) ke hijau (membuat). Timing mengikuti PRD §15.6:

| Langkah | Mulai | Durasi | Easing |
| --- | --- | --- | --- |
| Hero memudar | 0 s | 0,28 s | `power2.out` |
| Papan membesar ke posisi Studio | 0 s | 0,85 s | `power3.inOut` |
| Latar biru berganti ke hijau | 0,2 s | 0,5 s | linear |
| Crossfade isi papan ke draf | 0,2 s | 0,5 s | linear |
| Header, toolbar, rak muncul | 0,6 s | stagger 0,08 s | `power2.out` |

### 9.2 Gerak sebagai respons

| Pemicu | Gerak | Durasi |
| --- | --- | --- |
| Pilih swatch | Swatch naik 10 px | 150 ms |
| Pasang blok (pencil) | Blok berkilau (settle) | 160 ms |
| Buka dialog/menu | Fade + skala 0,98 → 1 | 160 ms |
| Toast masuk | Naik 8 px + fade | 200 ms |

[USULAN] Hover kartu template yang naik 3 px dihapus. Kartu template menunjukkan hover lewat isi `--highlight`. Efek angkat disimpan untuk swatch, agar "terangkat" selalu berarti "terpilih".

### 9.3 Pergantian tema [DIBANGUN]

Tema berganti lewat View Transitions API. Lapisan tema baru masuk dengan `clip-path: circle()` yang melebar dari titik tombol yang diklik sampai menutupi sudut terjauh layar, 420 ms `ease-in-out`.

```css
::view-transition-old(root),
::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
::view-transition-old(root) { z-index: 1; }
::view-transition-new(root) { z-index: 2; }
```

Animasi bawaan (crossfade) dimatikan karena dua tema yang saling memudar menghasilkan warna antara yang tidak ada di palet. Lingkaran memberi hubungan sebab-akibat: perubahan tampak berasal dari tombol yang barusan disentuh.

Kalau `startViewTransition` tidak tersedia atau `prefers-reduced-motion: reduce` aktif, tema berganti seketika tanpa animasi. Nilai tema diset sebelum transisi dimulai supaya tombol tidak pernah memicunya dua kali.

### 9.4 Gerak latar landing [DIBANGUN]

Papan komunitas di landing bergeser terus pada 24 px/detik lewat `requestAnimationFrame`. Ini satu-satunya gerak yang berjalan tanpa henti, dan ia tetap tunduk pada `prefers-reduced-motion`: saat reduce aktif, papan berhenti di posisi awalnya dan tetap terbaca sebagai mozaik.

### 9.5 Reduced motion

Saat `prefers-reduced-motion: reduce`, transisi Preshow, transisi CSS, animasi lingkaran tema, geseran latar landing, settle, dan efek naik swatch dimatikan. Swatch terpilih tetap berada di posisi terangkat tanpa animasi, karena posisi itu membawa informasi status.

---

## 10. Bahasa dan microcopy

### 10.1 Suara

- Santai, kalimat pendek, memakai "kamu" dan "karyamu" (PRD §15.7).
- Kalimat aktif dengan subjek yang jelas: "Kamu sudah keluar" lebih jelas daripada "Sesi telah diakhiri".
- Galat menyebut apa yang terjadi dan apa yang bisa pengguna lakukan. Galat tidak meminta maaf dan tidak memakai kode teknis ("Request gagal (500)").
- Empty state mengajak bertindak. Empty state tidak meratapi kekosongan.

### 10.2 Kosakata

Satu istilah untuk satu konsep. **Saat ini** produk mencampur beberapa istilah.

| Konsep | Pakai | Hindari |
| --- | --- | --- |
| Satu kotak berwarna | blok | balok, pixel (di UI) |
| Dokumen milik pengguna | karya | proyek, project, file |
| Bidang 48 × 24 | papan | canvas (kecuali nama "Canvas World") |
| Wadah warna | rak palet | toolbar warna |
| Alat pasang | Pasang | Pencil, Gambar |
| Alat hapus | Hapus | Eraser |
| Alat geser | Geser | Pan |
| Batalkan langkah | Urungkan | Undo |
| Ulangi langkah | Ulangi | Redo |
| Tampilkan seluruh papan | Fit | Pusat |

Riwayat mencatat label dari aksi yang terjadi. "Hapus blok" tidak boleh tercatat sebagai "Gambar sel" (PRD FR-TOOLS-05).

### 10.3 Rantai nama tindakan

Satu tindakan memakai kata kerja yang sama dari tombol sampai konfirmasi:

| Tombol | Dialog / proses | Hasil |
| --- | --- | --- |
| Simpan & bagikan | Simpan karya | Karya disimpan dan siap dibagikan. |
| Unduh PNG | Mengunduh… | PNG diunduh. |
| Salin link | · | Link disalin. |
| Hapus | Hapus karya ini? | Karya masuk Sampah. |
| Takedown (Admin) | Takedown karya? | Karya tidak tampil di publik. |

Pesan hasil share di `/art/[id]` memakai set yang sama dengan Studio (PRD Lampiran D). **Saat ini** kedua halaman memakai kalimat berbeda (T1).

### 10.4 [USULAN] Revisi pola teks

| Saat ini | Usulan | Alasan |
| --- | --- | --- |
| Eyebrow huruf kapital: "AROUND THE BLOCK · MOSAIC CANVAS", "KARYA KOLEKTIF", "SIMPAN KARYA", "VERSI BERBEDA", "FILE TIDAK AKTIF" | Hapus. Judul di bawahnya sudah menyebut konteks. | Eyebrow ini mengulang judul dan menambah satu lapis bacaan di layar ponsel. |
| Label dua bagian (kata kapital + tanda pisah + frasa): "SUDAH DISIMPAN" + "Karya", "DRAF CLOUD" + "Belum dibagikan" | Judul bagian biasa: "Karya tersimpan", "Draf cloud" | Satu judul, satu tugas. |
| "Satu blok. **Banyak cerita.**" (frasa kedua tebal) | [DIBANGUN] Judul diganti menjadi "Block Unblock": dua kata, dua baris, satu berat | HeroBoard di belakangnya sudah memegang penekanan visual. |
| Panah di tombol dan tautan: "Mulai dari papan kosong →", "Buka dunia pixel ↗", "Temukan karya lainnya →" | "Mulai dari papan kosong", "Buka Canvas World", "Lihat karya lain di Canvas World" | Label tombol menyebut hasil tindakan; panah tidak menambah makna. |
| "KENALI STUDIO · 2 / 5" | "Langkah 2 dari 5" | Lebih mudah dibaca pembaca layar. |
| Label "CANVAS PIXEL" monospace di poster | Readex Pro 700 dengan tracking 0,04 em | Monospace tidak punya alasan di label brand. Lihat DD2. |
| Pesan autosave teknis ("Request gagal (N).") | "Autosave cloud gagal. Draf tetap aman di perangkat ini." + tombol [Coba lagi] | Pesan ramah di PRD §8.5 tidak pernah tampil (T17). |

Label status simpan tetap memakai versi UI saat ini ("Tersimpan di perangkat", "Ada versi lebih baru"). Rebuild juga memperbarui dokumen foundation ke label yang sama (T3).

---

## 11. Aksesibilitas visual

### 11.1 Cincin fokus

- Outline 3 px `--focus` dengan offset 3 px di semua kontrol interaktif: tombol, link, field, swatch, kartu, dan region viewport World.
- Tema terang memakai `--primary` `#08783F`: 5,51:1 di `--bg`, 4,67:1 di `--section-blue`, 4,66:1 di `--section-green`, dan 4,87:1 di `--highlight`.
- Tema gelap memakai `#FFF0B3`: minimal 10,45:1 di semua latar gelap.
- Offset 3 px membuat cincin terpisah dari outline `--ink` kontrol, sehingga fokus tetap terbaca meskipun kontrol sudah berbingkai.
- Di atas papan (ivory), cincin fokus kanvas memakai dua lapis: 3 px `--focus` di luar dan 2 px `--bg` di dalam, agar tetap terlihat di atas blok gelap maupun terang.
- [DIBANGUN] Papan meminta fokus lewat script saat pointer turun, supaya pintasan keyboard langsung aktif. Karena itu papan mencatat asal fokusnya: cincin hanya tampil kalau fokus datang dari keyboard (Tab atau tombol apa pun), dan disembunyikan kalau datang dari klik atau sentuhan di papan. Tanpa catatan itu, menekan satu pintasan lalu menggambar dengan mouse membuat browser menilai fokusnya "keyboard" dan cincin menetap sepanjang orang menggambar.
- Sorotan hijau HeroBoard **saat ini** memakai box-shadow. [USULAN] Samakan dengan cincin fokus standar.

### 11.2 Ambang minimum

| Elemen | Minimum |
| --- | --- |
| Teks isi dan label | 4,5:1 |
| Teks ≥ 24 px atau ≥ 18,66 px tebal | 3:1 |
| Outline field, checkbox, radio, cincin fokus | 3:1 |
| Bidang pastel dan garis pemisah dekoratif | Tanpa minimum; jangan pakai sebagai satu-satunya penanda |

### 11.3 Celah yang ditutup rebuild

| Celah | Perbaikan desain |
| --- | --- |
| Cincin fokus mustard 1,83:1 (palet lama, terang) | `--focus` `#08783F`, minimal 4,66:1 |
| Teks sekunder 3,97:1 di workspace (palet lama) | `--muted` `#506D5E`, minimal 4,76:1 |
| Border kontrol 1,40:1 (palet lama) | Outline `--ink`, minimal 10,13:1 |
| Galat tema gelap 3,92:1 (palet lama) | `#F08A78`, minimal 4,90:1 |
| Kanvas terbaca pembaca layar selama Preshow (FR-HERO-06) | Workspace dan kanvas `inert` + `aria-hidden` selama Preshow |
| Region viewport World tidak bisa difokus (T22) | `tabindex="0"`, cincin fokus, dan panduan panah di `aria-describedby` |
| Galat form generik di `/account` (A11Y-08) | Pola field §8.8 |
| Petunjuk sentuh dipilih berdasarkan lebar layar | Pilih lewat `@media (pointer: coarse)` dan tampilkan kedua petunjuk kalau perangkat punya dua jenis input |
| Blok pucat hilang di papan kecil | Sambungan wajib untuk warna berkontras < 1,5:1 (§3.1) |

### 11.4 Aturan lain

- Target sentuh minimal 44 px; aman di zoom teks 200% dan zoom browser 400% (PRD A11Y-07).
- Status terpilih dan status simpan selalu punya penanda selain warna.
- Tooltip World juga muncul saat fokus keyboard. **Saat ini** tooltip hanya muncul untuk mouse.

---

## 12. Poster PNG

Poster tidak mengikuti tema aplikasi.

### 12.0 Rasio 9:16 [DIBANGUN]

Poster berukuran **1080 × 1920**, bukan 1080 × 1080 (PRD R10). Poster ini dibagikan lewat story media sosial, dan format persegi di sana dipotong atau dikelilingi bidang kosong. Koordinat §13.7 diskalakan ulang:

| Elemen | Koordinat |
| --- | --- |
| Logo | monogram 58 × 58 di (72, 84), diwarnai `accent` |
| Logotype "MIVUBI" | 700 44 px di (144, 130) |
| Label preset | rata kanan di (1008, 130) |
| Bingkai | (72, 220, 936 × 1300, r 40) |
| Strip accent | (104, 252, 872 × 10) |
| Permukaan karya | (104, 286, 872 × 1206, r 24) |
| Area karya | maks 840 × 1130, berpusat di (540, 889), skala integer jika ≥ 1 |
| Judul | 700 56 px di (72, 1700) |
| Byline | 500 30 px di (72, 1760) |
| "CANVAS PIXEL" | 700 26 px di (1008, 1700) |
| "`<cols>` × `<rows>` GRID" | 500 22 px di (1008, 1756) |

Karya 48 × 24 (lanskap) menyisakan bidang kosong besar di atas dan bawah permukaan karya. Itu disengaja: karya tetap berada di tengah dengan skala terbesar yang muat, dan bidang kosongnya berfungsi sebagai paspartu, bukan cacat tata letak.

Selebihnya, geometri dan font mengikuti PRD §13.7.

### 12.1 [USULAN] Preset Default dengan palet brand

Preset Default membawa nama MIVUBI, jadi warnanya ikut palet brand. Preset ATB tetap memakai warna sendiri.

| Token preset | Default saat ini | Default usulan | Kontras |
| --- | --- | --- | --- |
| `background` | `#F5F0E6` | `#D8EEFF` (biru pastel) | |
| `frame` | `#0F5A38` | `#153D2B` | |
| `artSurface` | `#FFFDF8` | `#FFFEF5` | |
| `accent` | `#D5A62E` | `#08783F` | Label "CANVAS PIXEL" di latar: 4,67 |
| `text` | `#1E2A23` | `#153D2B` | Judul di latar: 10,14 |
| `mutedText` | `#647069` | `#506D5E` | Byline 22 px di latar: 4,77 |

Label "CANVAS PIXEL" di preset Default saat ini hanya 1,98:1. Nilai usulan menutup celah itu. Strip accent di dalam bingkai berubah menjadi hijau tua di atas bingkai hijau sangat gelap; strip ini dekoratif dan tidak membawa teks.

### 12.2 Kontras preset ATB

| Pasangan | Rasio | Hasil |
| --- | --- | --- |
| Teks `#F4FAFB` di latar `#10171C` | 17,15 | Lolos |
| Muted `#9DB0B8` di latar | 8,04 | Lolos |
| Accent `#2ED7E6` di latar | 10,31 | Lolos |

### 12.3 Aturan template

- Template gambar Admin wajib PNG 1080 × 1080. Area karya memakai proporsi asli dan diletakkan di tengah area yang ditentukan (PRD FR-EXP-04).
- Sel kosong transparan di atas permukaan preset. Blok memakai warna palet eksak tanpa smoothing.
- Pratinjau di dialog dan file unduhan memakai renderer yang sama (AC-16).

---

## 13. Admin

[DIBANGUN] Admin adalah ruang kerja operator, bukan halaman yang perlu memikat. Rupanya tenang dan padat, memakai token yang sama dengan aplikasi publik, tetapi kerangkanya berbeda: publik memakai navbar pil melayang, Admin memakai **rail kiri yang selalu terlihat**. Perbedaan itu disengaja — operator harus tahu dari satu tatapan bahwa ia sedang berada di alat kerja, bukan di situs pengunjung.

### 13.1 Kerangka

```text
┌────────────┬──────────────────────────────────────────────────────┐
│ MIVUBI ▸Admin                                                     │
│            │  Ringkasan                            [Buka moderasi]│
│ ▸ Ringkasan│  satu kalimat konteks                                │
│   Moderasi │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                 │
│   Pengaturan  │  69  │ │   0  │ │48 × 24│ │  8  │   kartu angka   │
│            │  └──────┘ └──────┘ └──────┘ └──────┘                 │
│            │  ┌───────────────────────────┬──────────────────┐    │
│            │  │ Karya terbaru             │ Pengaturan       │    │
│            │  └───────────────────────────┴──────────────────┘    │
│ [Terang|Gelap]                                                    │
│ Lihat situs publik                                                │
│ [Keluar]   │                                                      │
└────────────┴──────────────────────────────────────────────────────┘
```

- **Rail** 248 px, `position: sticky`, tinggi 100dvh, dipisahkan `--outline-thin`. Tiga baris: logo + tag "Admin", navigasi, lalu kaki berisi pemilih tema, tautan ke situs publik, dan Keluar.
- Item navigasi aktif memakai isi `--section-green` + outline penuh — penanda yang sama dengan tautan aktif di navbar publik, bukan garis bawah.
- Di ≤ 900 px rail berubah menjadi **bilah atas yang sticky, dua baris**: baris pertama identitas di kiri dan aksi di kanan (tombol tema ringkas berbentuk lingkaran ☾/☀ plus Keluar), baris kedua strip navigasi berupa pil yang bisa digeser. Pemilih tema dua tombol diganti satu tombol berganti-ganti supaya tema tetap terjangkau di ponsel — sebelumnya ia hilang sama sekali di layar kecil.
- Di ≤ 560 px ikon navigasi disembunyikan supaya keempat tautan muat sebaris; tag "Admin" tetap tinggal.
- Area kerja memakai `grid-template-columns: minmax(0, 1fr)`. Tanpa kolom eksplisit, kolom implisit grid ikut `max-content` dan halaman melebar di layar sempit.
- Bidang pastel dipakai hemat: `--section-green` untuk item nav aktif dan baris aksi form, `--section-blue` sebagai alas pratinjau karya, `--highlight` untuk hover baris.

### 13.2 Ringkasan

Halaman pertama menjawab satu pertanyaan: apakah ada yang perlu ditangani sekarang.

- **Empat kartu angka**: karya tampil publik, karya ditakedown, ukuran grid, dan jumlah warna palet. Angka memakai 31 px 700 dengan label kecil di atas dan keterangan di bawah, jadi angkanya terbaca dari jauh.
- Kartu "Ditakedown" berganti latar `--highlight` begitu nilainya di atas nol. Itu satu-satunya cara halaman ini menarik perhatian.
- **Karya terbaru** menampilkan delapan karya sebagai ubin papan mini yang tertaut ke halaman publiknya. Karya ter-takedown ditandai badge dan opasitas 0,7.
- **Pengaturan pameran** merangkum ukuran, gap, dan daftar palet berikut tautan Ubah. Panel ini hanya membaca; menyunting tetap di halaman Pengaturan.

### 13.3 Moderasi

- Satu baris kontrol: **tab pil** Semua / Tampil publik / Ditakedown di kiri, kolom pencarian berbentuk pil di kanan. Tab menggantikan `<select>` status — tiga pilihan tidak perlu disembunyikan di balik dropdown. Di layar sempit, tab menggulir di dalam pilnya sendiri, bukan melebarkan halaman.
- Jumlah hasil ditulis sebagai satu baris `role="status"` di atas daftar.
- **Baris karya** berupa kartu berbingkai, bukan baris tabel: pratinjau 132 px di atas alas `--section-blue` (tertaut ke halaman publik), lalu badge status, `rev N`, ukuran grid, judul, kreator, waktu relatif + tanggal pasti, dan aksi di kanan.
- Di ≤ 800 px pratinjau menyusut ke 84 px dan tombol aksi pindah ke bawah meta dengan lebar seadanya. Tombol Takedown selebar kartu membuat tiap baris terbaca seperti peringatan, padahal daftar ini sebagian besar berisi karya yang baik-baik saja. Di ≤ 560 px tanggal pasti disembunyikan dan hanya waktu relatif yang tinggal, lalu tab dibuat selebar layar dengan tiap tab berbagi ruang sama besar.
- Karya ter-takedown memakai bingkai `--danger` dan menampilkan alasannya di dalam baris. Alasan hanya terlihat Admin.
- Takedown memakai tombol destruktif dan dialog dengan field alasan wajib (maks 500 karakter). Pulihkan memakai tombol sekunder dan tidak meminta konfirmasi — memulihkan tidak merusak apa pun.
- Daftar menyertakan karya ter-takedown apa pun visibilitasnya (PRD T20).

### 13.4 Pengaturan

- Tiga panel: Canvas, Palet blok, Gap Canvas World. Masing-masing punya kepala (judul + satu kalimat penjelas), badan, dan **kaki beraksi** berlatar `--section-green` yang memuat tombol simpan dan pesan hasilnya.
- Kaki yang terpisah membuat jelas bahwa setiap panel disimpan sendiri-sendiri; sebelumnya tiga tombol simpan mengambang di antara field dan mudah tertukar.
- Palet memegang satu kolom penuh karena ia butuh ruang vertikal paling banyak; Canvas dan Gap berbagi kolom lainnya. Di ≤ 1000 px semuanya menjadi satu kolom.
- **Editor palet** berupa satu baris per slot, bukan textarea `#HEX | Nama`. Tiap baris memuat nomor slot, `<input type="color">`, kolom HEX, kolom nama, lalu tombol ↑ ↓ ✕. Nomor slot mengikuti urutan baris, jadi urutan bisa diubah tanpa mengetik ulang. Textarea lama memaksa operator menghafal format dan tidak menunjukkan warnanya sampai disimpan.
- Validasi tetap dijalankan oleh parser yang sama (`parsePaletteText`): baris diserialkan ke teks, dan galat "Baris N" memberi bingkai `--danger` pada kolom HEX baris itu sekaligus menonaktifkan tombol simpan. Satu sumber aturan, dua tampilan.
- Baris minimum satu (tombol hapus mati saat tersisa satu) dan maksimum 32; sisa kuota ditulis di kaki panel ("8 dari 32 warna").
- Di ≤ 560 px baris melipat menjadi dua tingkat — nomor, swatch, HEX, dan tombol operasi di baris pertama; nama di baris kedua — dengan pemisah `--line` supaya batas antar slot tetap terbaca. Di ≤ 400 px semua kontrol menyusut sedikit agar kolom HEX tetap memuat tujuh karakter penuh.
- Pratinjau langsung: Canvas menampilkan hasil hitung grid dan total sel sambil diketik. Galat validasi tampil di tempat yang sama dan menonaktifkan tombol simpan.
- Pesan sukses berupa teks `--primary` di kaki panel, bukan toast. Toast akan hilang sebelum operator sempat memastikan panel mana yang tersimpan.

### 13.5 Referensi pola [DIBANGUN]

Pola kecil yang dipakai pengunjung sebagai titik mulai. Halaman ini memakai kartu galeri, bukan tabel: yang dibandingkan Admin adalah gambarnya.

- **Kartu** berisi pratinjau pola di bidang `--section-blue`, nama, ukuran dan jumlah warna, lalu [Ubah] dan [Hapus]. Tinggi bidang pratinjau dikunci supaya deretan kartu tetap sejajar walau pola berbeda rasio.
- **Editor** berupa dialog lebar: nama, lebar dan tinggi (4–32 sel), rel warna palet situs + [Hapus] + [Kosongkan], lalu petak gambar. Petaknya ikut lebar layar, jadi di ponsel dialog tidak perlu digeser.
- **Petak** memakai tombol per sel (§8.15), bukan kanvas, karena polanya kecil dan tiap sel perlu bisa dicapai keyboard.
- **Sel kosong** bertanda kotak-kotak halus supaya terbaca sebagai lubang pola, bukan blok putih.
- Jalur kedua: tombol **Jadikan referensi** di tiap baris Moderasi (§13.3) mengangkat karya yang sudah ada. Polanya dipotong sebatas isi karya dan warnanya disimpan sebagai HEX, bukan nomor slot, jadi pola tetap benar kalau palet situs berganti.
- Daftar kosong menyembunyikan tombol Referensi di Studio; tidak ada galeri kosong yang perlu dijelaskan.

### 13.6 Masuk Admin [DIBANGUN]

Sekeluarga dengan halaman Akun — kartu blok di tengah kertas grid (§8.14) — tetapi tanpa nada promosi. Kartunya selebar 400 px dan dibuka oleh bilah identitas `--section-green`: wordmark + tag "Admin". Bilah itu yang membedakannya dari halaman publik; di baliknya judul, satu kalimat konteks, field password, tombol blok, dan tautan "← Kembali ke situs publik".

Rel warna palet sengaja tidak dipakai di sini: ini pintu kerja, bukan ajakan berkarya. Galat tampil sebagai teks `--danger` yang terhubung ke field lewat `aria-describedby`.

Area kerja Admin (`.work`) membuang padding-nya saat kerangka dalam mode `bare`, sehingga bidang kertas grid benar-benar mengisi layar.

## 14. Ringkasan perubahan

| # | Perubahan | Alasan | Terkait |
| --- | --- | --- | --- |
| C0 | Palet brand enam warna menggantikan hijau hutan, mustard, dan ivory hangat | Keputusan pemilik produk (v1.1) | §4.1 |
| C1 | `--focus` `#08783F` (terang) dan `#FFF0B3` (gelap) | Cincin fokus mustard lama 1,83:1 | §4.2, §11.1 |
| C2 | `--muted` `#506D5E` | Teks sekunder lama 3,97:1 di workspace | §4.2 |
| C3 | Outline `--ink` untuk semua kontrol | Border lama 1,40:1 | §6.3 |
| C4 | `--danger` gelap `#F08A78` | Galat gelap lama 3,92:1 | §4.3 |
| C5 | Sambungan blok wajib untuk warna pucat | Putih tulang 1,14:1 di ivory | §3.1 |
| C6 | Satu keluarga font (Readex Pro) | Dua sans geometris yang mirip | §5, DD1 |
| C7 | Hapus eyebrow kapital, label dua bagian bertanda pisah, dan panah di tombol | Mengulang judul, menambah beban baca | §10.4 |
| C8 | Bayangan hanya untuk benda fisik dan overlay; kontrol memakai outline | Memisahkan papan dari UI | §2, §6.3, §6.4 |
| C9 | Aturan toast vs banner | Galat tercampur di dua pola | §8.5 |
| C10 | Lima breakpoint bersama | 12 breakpoint ad hoc | §7.1 |
| C11 | Hover kartu template memakai isi kuning, tanpa efek naik | "Terangkat" berarti "terpilih" | §9.2 |
| C12 | Kosakata tunggal (blok, karya, papan, Urungkan) | Istilah campur | §10.2 |
| C13 | "Pusat" di World → "Lihat semua" | Nama tidak cocok dengan perilaku | §7.5 |
| C14 | Preset poster Default memakai palet brand | Label accent lama 1,98:1; poster Default membawa nama MIVUBI | §12.1 |
| C15 | Hapus token `--accent-dark`, `--cyan`, `--brand-yellow-*` | Tidak punya peran di palet baru | §4.2 |
| C16 | Biru pastel untuk bidang melihat, hijau pastel untuk bidang membuat | Petunjuk tempat tanpa label tambahan | §4.5 |
| C17 | Teks UI Plus Jakarta Sans (di-host sendiri), bukan Poppins + Readex Pro | Google Fonts tidak terjangkau; satu keluarga variable sudah cukup. Menutup DD1/DD2 | §5 |
| C18 | Font pixel MIVUBI Blok untuk judul landing | Menyambungkan identitas ke blok papan tanpa mengorbankan keterbacaan teks isi | §5 |
| C19 | Landing satu layar: papan komunitas jadi latar bergerak, teks di atas cahaya ivory | Papan menjelaskan produk lebih cepat daripada teks; kartu solid memutus latar | §7.2 |
| C20 | Navbar pil melayang di semua halaman | Enam tinggi header berbeda di produk lama | §8.12 |
| C21 | Tombol blok untuk CTA landing | Meminjam bentuk blok magnet | §8.13 |
| C28 | Papan mini punya batas tinggi | Karya tinggi-ramping membuat dialog detail World harus di-scroll | §8.6 |
| C22 | Karyaku jadi galeri berkas dengan tab dan menu "…" | Dua judul bagian memaksa scroll; aksi selalu-tampil membuat kartu panjang | §7.4 |
| C23 | Sidebar Canvas World dihapus | Daftar mengulang viewport dan memakan 280 px | §7.5 |
| C24 | Tab Papan/Poster + pratinjau poster langsung di Karya publik | Desain dipilih lewat hasilnya, bukan namanya | §7.6 |
| C25 | Poster PNG 9:16 (1080 × 1920) | Format story; persegi terpotong | §12.0 |
| C26 | Tema hanya Terang/Gelap, berganti lewat lingkaran View Transitions; landing selalu terang | Tiga pilihan untuk satu preferensi kecil; crossfade menghasilkan warna di luar palet | §9.3, §7.2 |
| C29 | Logo resmi MIVUBI (`static/logo/`) menggantikan logo empat kotak buatan sendiri, dipasang lewat mask agar ikut `--ink` | Aset brand yang benar; satu berkas untuk semua tema | §8.12, §12 |
| C33 | Navbar memakai logo saja, teks "MIVUBI" di sampingnya dihapus | Keputusan pemilik produk; nama produk sudah disebut judul halaman dan tab peramban | §8.12, §5 |
| C32 | Referensi pola dikelola Admin, ditempel dari Studio sebagai satu langkah yang bisa diurungkan | Template bawaan hanya hidup di kode dan tidak pernah sampai ke pengunjung sejak galeri landing dihapus (R3) | §13.5, §8.15, §7.3 |
| C31 | Judul hero "Block Unblock" menggantikan "Satu blok. Banyak cerita." | Keputusan pemilik produk | §7.2, §10.4 |
| C30 | Halaman Akun dan Masuk Admin memakai satu bahasa: kartu blok di atas kertas grid | Dua halaman masuk yang tidak saling mirip dan tidak mirip produknya; panel promosi mendorong form ke bawah lipatan di layar sempit | §7.7, §13.6, §8.14 |
| C27 | Admin memakai rail kiri tetap, kartu angka di Ringkasan, tab pil di Moderasi, dan kaki beraksi di Pengaturan | Operator butuh navigasi yang selalu terlihat dan satu tempat yang jelas untuk tiap tombol simpan | §13 |

---

## 15. Keputusan desain terbuka

| ID | Pertanyaan | Rekomendasi |
| --- | --- | --- |
| DD1 | Apakah MIVUBI punya pedoman brand yang mengunci Poppins? | **Ditutup.** Plus Jakarta Sans, di-host sendiri (C17). |
| DD2 | Apakah logotype poster tetap Poppins dan label tetap monospace? | **Ditutup.** Keduanya memakai font UI; label "CANVAS PIXEL" 700 dengan tracking, bukan monospace. |
| DD3 | Nilai hex bingkai papan dan rak kayu | Ambil dari `magnetic-block.ts` lewat session `reference`, lalu catat di §3. |
| DD4 | Apakah label Inggris (Undo, Redo, Fit, Grid) dipertahankan untuk pengunjung yang terbiasa dengan aplikasi gambar? | Pakai Indonesia (Urungkan, Ulangi); pertahankan "Fit" dan "Grid" karena pendek dan dikenal luas. |
| DD5 | Palet brand hanya punya tema terang. Apakah tema gelap tetap ada di rebuild? | **Ditutup.** Tema gelap tetap ada dengan token §4.3, opsi Sistem dihapus, dan landing dikunci terang (C26). |
| DD6 | Apakah preset poster Default ikut palet brand (C14)? | Ikut, karena preset Default membawa nama MIVUBI dan nilai lamanya gagal kontras. |
| DD7 | Apakah pembagian biru untuk melihat dan hijau untuk membuat (C16) sesuai maksud palet? | Pertahankan kecuali pemilik produk sudah punya peta pemakaian bidang. |

DD3, DD4, DD6, dan DD7 masih terbuka. Setelah semuanya diputuskan, pindahkan token final ke `docs/foundation/05-ui-design-system.md` di repo source.
