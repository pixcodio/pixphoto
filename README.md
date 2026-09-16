# PIXPHOTO — Editorial Magazine Remote Photobooth 📸✨

Website photobooth kolaboratif bergaya majalah editorial (*fashion magazine cover*). Memungkinkan 2 hingga 4 orang mengambil foto bersama dari perangkat yang berbeda dan jarak yang berjauhan secara serentak, hanya menggunakan kamera bawaan perangkat (*browser camera*).

---

## 🌟 Fitur Utama

1. **Hanya Menggunakan Kamera Device (`getUserMedia`)**:
   - Berjalan langsung di browser (ponsel, laptop, atau tablet) tanpa perlu menginstal aplikasi apa pun.
   - Dilengkapi kontrol cermin (*mirror*), ganti kamera depan/belakang (*environment/user*), dan mute mikrofon.

2. **Akses Kolaboratif Jarak Jauh (2 - 4 Orang)**:
   - WebRTC P2P multi-peer mesh dan Server-Sent Events (SSE) untuk sinkronisasi video dan aksi secara instan.
   - Tata letak otomatis menyesuaikan secara dinamis untuk 1, 2, 3, atau 4 orang.

3. **Sistem Private Room & Kunci Room ID**:
   - Host membuat room dengan 1-klik dan mendapatkan kode unik (contoh: `VOGUE-481`).
   - Tombol **"Salin Link / Undang Teman"** untuk mengundang teman secara langsung.
   - **Room ID Bersifat Hidden**: Tidak ada daftar room/lobby publik. Hanya orang yang memiliki kode atau link langsung yang dapat masuk.
   - **Kapasitas Terbatas Maksimal 4 Orang**: Sistem secara otomatis menolak dan membatasi partisipan ke-5 agar tata letak majalah tetap presisi dan proporsional.

4. **2 Pilihan Template Majalah**:
   - **Template 1: Editorial Haute (Vogue / Harper's Bazaar style)**
     - Tipografi klasik Didone Serif (*Playfair Display*).
     - Latar kertas ivory hangat (`#FBF9F5`), aksen barcode realistis, kredit nama partisipan, dan nomor edisi volume.
   - **Template 2: Indie Archive (Dazed / Kinfolk / Y2K Zine style)**
     - Nuansa retro 35mm film dengan lubang *sprocket*, cap stempel merah `APPROVED`, cap tanggal digital kamera (`'26 09 16`), dan tipografi modern monospaced & bold sans.
   - Template dapat diganti secara *real-time* baik saat siaran langsung (*live booth*) maupun sesudah foto diambil.

5. **Efek Filter Tone & Suara Autentik**:
   - Pilihan filter: *Natural*, *B&W Vogue*, *Warm 90s*, *Cool Flash*, dan *Film Grain*.
   - Countdown audio beeps (3... 2... 1...) yang disintesis via Web Audio API.
   - Efek suara *camera shutter* mekanis dan kilatan *screen flash* putih.

6. **Download High-Resolution Print (PNG)**:
   - Menggunakan mesin rendering HTML5 Canvas beresolusi tinggi (1200 x 1800 piksel).
   - Simpan langsung hasil foto majalah ke galeri atau bagikan ke media sosial.

---

## 🚀 Cara Menjalankan Aplikasi

### Persyaratan:
- [Bun](https://bun.sh/) (atau Node.js 18+)

### Langkah Menjalankan:
```bash
# 1. Masuk ke direktori proyek
cd /path/to/pixphoto

# 2. Instal dependensi (jika belum)
bun install

# 3. Jalankan server development
bun dev
```

Buka browser Anda di:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Struktur Proyek

```
pixphoto/
├── app/
│   ├── api/
│   │   └── rooms/
│   │       ├── create/route.ts       # Endpoint pembuatan room baru
│   │       └── [id]/
│   │           ├── route.ts          # Status room
│   │           ├── join/route.ts     # Pengecekan kapasitas (maks 4 orang)
│   │           ├── events/route.ts   # Server-Sent Events (SSE) sinkronisasi
│   │           ├── signal/route.ts   # WebRTC signaling & aksi serentak
│   │           ├── photo/route.ts    # Upload snapshot lokal resolusi tinggi
│   │           └── poll/route.ts     # Polling fallback
│   ├── room/[id]/page.tsx            # Halaman studio booth interaktif
│   ├── layout.tsx                    # Font Didone Serif & Sans Google Fonts
│   ├── globals.css                   # Tailwind CSS v4 & efek majalah
│   └── page.tsx                      # Beranda bergaya majalah editorial
├── components/
│   ├── MagazineLiveFeed.tsx          # Live video feed 1-4 orang dalam bingkai majalah
│   ├── MagazineResultModal.tsx       # Tampilan cetak majalah akhir & tombol unduh
│   ├── RoomHeader.tsx                # Status room, salin link & kontrol kamera
│   └── BoothControls.tsx             # Switcher template, filter, dan tombol shutter
├── hooks/
│   └── use-room-webrtc.ts            # Hook WebRTC mesh, audio & countdown serentak
└── lib/
    ├── canvas-renderer.ts            # HTML5 Canvas compositor resolusi tinggi
    ├── room-store.ts                 # Manajemen room in-memory & event broadcaster
    ├── audio.ts                      # Sintesis suara countdown & kamera
    └── types.ts                      # Definisi tipe TypeScript
```
