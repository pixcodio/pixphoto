'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [inputRoomId, setInputRoomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Create Room
  const handleCreateRoom = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/rooms/create', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.roomId) {
        router.push(`/room/${data.roomId}`);
      } else {
        setErrorMessage(data.error || 'Gagal membuat room. Silakan coba lagi.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan.');
      setIsSubmitting(false);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputRoomId.trim().toUpperCase();
    if (!cleanId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/rooms/${cleanId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setErrorMessage('Room tidak ditemukan. Pastikan Room ID yang dimasukkan benar.');
        } else {
          setErrorMessage('Gagal memeriksa status room.');
        }
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      if (data.isFull) {
        setErrorMessage('Room ini sudah penuh (kapasitas maksimal 4 orang).');
        setIsSubmitting(false);
        return;
      }

      router.push(`/room/${cleanId}`);
    } catch {
      setErrorMessage('Terjadi kendala jaringan.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f4f2ee] flex flex-col justify-between selection:bg-amber-400 selection:text-black">
      {/* Editorial Top Navigation */}
      <header className="w-full border-b border-zinc-800/80 px-6 py-4 backdrop-blur-md sticky top-0 z-30 bg-[#0c0d10]/90">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif italic text-2xl font-bold tracking-wider text-white">
              PIXPHOTO
            </span>
            <span className="hidden sm:inline-block text-[9px] font-mono tracking-widest bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 uppercase">
              MAGAZINE BOOTH
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span className="hidden md:inline">EDISI SPESIAL • 2-4 ORANG</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-300">ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-amber-300 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>REMOTE MAGAZINE PHOTOBOOTH</span>
        </div>

        {/* Big Editorial Headline */}
        <div className="text-center max-w-3xl mb-8">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black tracking-tight leading-[1.08] text-white">
            Berfoto Bersama Teman, <br />
            <span className="italic font-normal text-amber-200">Bergaya Sampul Majalah.</span>
          </h1>
          <p className="text-sm sm:text-base font-sans text-zinc-400 max-w-xl mx-auto mt-4 leading-relaxed">
            Akses langsung dari kamera browser tanpa aplikasi tambahan. Hubungkan 2 hingga 4 orang
            meski terpaut jarak, dan abadikan dalam tata letak editorial mewah.
          </p>
        </div>

        {/* Interactive Room Action Card */}
        <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-2xl p-5 sm:p-6 shadow-2xl mb-12">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 mb-5">
            <button
              onClick={() => {
                setActiveTab('create');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-sans font-semibold transition-all ${
                activeTab === 'create'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Buat Room Baru
            </button>
            <button
              onClick={() => {
                setActiveTab('join');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-sans font-semibold transition-all ${
                activeTab === 'join'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Gabung Room
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 mb-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-sans">
              {errorMessage}
            </div>
          )}

          {activeTab === 'create' ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs text-zinc-300 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Room ID Bersifat Privat & Hidden</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Room kamu tidak akan muncul di daftar publik. Hanya teman yang memiliki kunci
                  Room ID atau Link yang bisa masuk (maksimal 4 orang).
                </p>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-white hover:bg-zinc-200 text-black font-sans font-bold text-sm shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{isSubmitting ? 'Membuka Studio...' : 'Buat Room Photobooth'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1.5">
                  Masukkan Kunci Room ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: VOGUE-481"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 font-mono tracking-wider focus:outline-none focus:border-amber-400 text-center"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !inputRoomId.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-amber-200 hover:bg-amber-100 text-black font-sans font-bold text-sm shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'Memeriksa Room...' : 'Masuk ke Room'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Showcase of the 2 Magazine Templates */}
        <div className="w-full mt-4">
          <div className="text-center mb-8">
            <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase">
              EDITORIAL DESIGNS
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif italic font-bold text-white mt-1">
              2 Pilihan Template Majalah
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Dapat diganti secara bebas kapan saja sebelum maupun sesudah foto diambil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Template 1 Card */}
            <div className="relative group bg-[#FBF9F5] text-[#111111] p-6 rounded-2xl border border-zinc-200 shadow-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#111111]/20 pb-2 mb-4">
                  <span className="text-[9px] font-sans font-bold tracking-[0.3em] uppercase text-zinc-600">
                    TEMPLATE 01
                  </span>
                  <span className="text-[9px] font-mono tracking-widest text-zinc-500">
                    HIGH FASHION
                  </span>
                </div>

                <h3 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-wider text-[#111111] mb-1">
                  PIX VOGUE
                </h3>
                <p className="text-[10px] font-sans tracking-[0.2em] uppercase text-zinc-600 mb-4">
                  L’ÉDITION SPÉCIALE • ELEGANT SERIF
                </p>

                {/* Visual Mock Layout */}
                <div className="aspect-[4/3] bg-zinc-200/80 rounded border border-[#111111]/20 p-2 grid grid-cols-2 gap-1.5 mb-4">
                  <div className="bg-zinc-800 rounded-xs flex items-center justify-center text-zinc-500 text-[10px] font-serif italic">
                    Pose 1
                  </div>
                  <div className="bg-zinc-700 rounded-xs flex items-center justify-center text-zinc-400 text-[10px] font-serif italic">
                    Pose 2
                  </div>
                </div>

                <ul className="text-xs font-sans text-zinc-700 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" />
                    <span>Tipografi Didone Serif bernuansa editorial majalah Paris</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" />
                    <span>Latar kertas ivory premium dengan barcode &amp; kredit nama</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" />
                    <span>Layout adaptif otomatis untuk 1, 2, 3, hingga 4 orang</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-[#111111]/10 mt-6 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>STYLE: VOGUE / BAZAAR</span>
                <span>ASPECT: 2:3 PRINT</span>
              </div>
            </div>

            {/* Template 2 Card */}
            <div className="relative group bg-[#131418] text-[#f2f0eb] p-6 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4">
                  <span className="bg-[#ffe600] text-black text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider">
                    TEMPLATE 02
                  </span>
                  <span className="text-[9px] font-mono tracking-widest text-amber-500">
                    RETRO Y2K
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-white">
                    ARCHIVE // 04
                  </h3>
                  <span className="text-red-400 border border-red-500 text-[9px] font-mono px-1.5 py-0.2 rotate-[-4deg] font-bold">
                    APPROVED
                  </span>
                </div>
                <p className="text-[10px] font-mono tracking-wider text-zinc-400 mb-4">
                  INDIE ZINE • 35MM FILM SPROCKETS
                </p>

                {/* Visual Mock Layout */}
                <div className="aspect-[4/3] bg-[#1a1c24] rounded border border-zinc-700 p-2 grid grid-cols-2 gap-1.5 mb-4">
                  <div className="bg-zinc-900 rounded-xs flex items-center justify-center text-zinc-400 text-[10px] font-mono">
                    #01 FRAME
                  </div>
                  <div className="bg-zinc-800 rounded-xs flex items-center justify-center text-zinc-300 text-[10px] font-mono">
                    #02 FRAME
                  </div>
                </div>

                <ul className="text-xs font-sans text-zinc-400 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#ffe600]" />
                    <span>Estetika indie zine dengan lubang rol film 35mm retro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#ffe600]" />
                    <span>Stamp digital kamera &apos;26, cap red velvet &amp; stiker Y2K</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#ffe600]" />
                    <span>Tampilan film strip bernuansa analog yang autentik</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-zinc-800 mt-6 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>STYLE: DAZED / NYLON</span>
                <span>FILM: 400 ISO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mt-16">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <Camera className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-sm font-semibold text-white">Kamera Device Saja</h4>
            <p className="text-xs text-zinc-400 mt-1">
              Bekerja langsung di browser HP atau laptop tanpa instal aplikasi apa pun.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <Users className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-sm font-semibold text-white">2 - 4 Orang Terhubung</h4>
            <p className="text-xs text-zinc-400 mt-1">
              Maksimal 4 orang per room dengan sinkronisasi video jarak jauh real-time.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <ShieldCheck className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-sm font-semibold text-white">Room ID Hidden &amp; Privat</h4>
            <p className="text-xs text-zinc-400 mt-1">
              Tidak ada daftar lobby publik. Hanya yang memiliki kode yang bisa bergabung.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <BookOpen className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-sm font-semibold text-white">Unduh Majalah Siap Cetak</h4>
            <p className="text-xs text-zinc-400 mt-1">
              Hasil foto langsung digabungkan menjadi sampul majalah resolusi tinggi (PNG).
            </p>
          </div>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="w-full border-t border-zinc-800 py-8 px-6 text-center font-mono text-[11px] text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-base font-bold text-zinc-300">PIXPHOTO</span>
            <span>• THE COLLABORATIVE EDITORIAL PHOTOBOOTH</span>
          </div>
          <div>© 2026 PIXPHOTO STUDIO. HAK CIPTA DILINDUNGI.</div>
        </div>
      </footer>
    </div>
  );
}
