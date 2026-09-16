'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRoomWebRTC } from '@/hooks/use-room-webrtc';
import MagazineLiveFeed from '@/components/MagazineLiveFeed';
import RoomHeader from '@/components/RoomHeader';
import BoothControls from '@/components/BoothControls';
import MagazineResultModal from '@/components/MagazineResultModal';
import { Users, ArrowLeft, Camera, AlertCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RoomPage({ params }: PageProps) {
  const { id: rawRoomId } = use(params);
  const roomId = rawRoomId.toUpperCase().trim();

  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pixphoto_username') || '';
    }
    return '';
  });

  const [hasEnteredName, setHasEnteredName] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('pixphoto_username');
    }
    return false;
  });

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pixphoto_username', userName.trim());
      }
      setHasEnteredName(true);
    }
  };

  if (!hasEnteredName) {
    return (
      <main className="min-h-screen bg-[#0e0f12] text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-300">
            <Camera className="w-6 h-6" />
          </div>

          <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-xs">
            ROOM: {roomId}
          </span>

          <h1 className="text-2xl font-serif italic font-bold mt-3 mb-2 text-white">
            Masuk ke Photobooth
          </h1>
          <p className="text-xs font-sans text-zinc-400 mb-6">
            Nama kamu akan dicantumkan di kredit edisi majalah bersama teman-temanmu.
          </p>

          <form onSubmit={handleSaveName} className="flex flex-col gap-4">
            <input
              type="text"
              required
              maxLength={24}
              placeholder="Contoh: Sarah, Alex, Budi"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 text-center font-sans tracking-wide"
            />

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-sans font-bold text-sm transition-all shadow-lg active:scale-98 cursor-pointer"
            >
              Lanjutkan ke Studio
            </button>
          </form>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-sans text-zinc-500 hover:text-zinc-300 mt-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Utama</span>
          </Link>
        </div>
      </main>
    );
  }

  return <BoothSession roomId={roomId} userName={userName} />;
}

function BoothSession({ roomId, userName }: { roomId: string; userName: string }) {
  const {
    peerId,
    localStream,
    remoteStreams,
    participants,
    participantCount,
    isFull,
    isLoading,
    error,
    localVideoRef,
    template,
    selectTemplate,
    activeFilter,
    selectFilter,
    countdown,
    isFlashing,
    isCapturing,
    capturedPhotos,
    hasCapturedPhotos,
    startPhotoSession,
    resetSession,
    isMirrored,
    toggleMirror,
    isAudioMuted,
    toggleAudio,
    toggleCameraFacing,
    exitRoom,
  } = useRoomWebRTC({ roomId, userName });

  // Handle Full Room (Max 4 people)
  if (isFull) {
    return (
      <main className="min-h-screen bg-[#0e0f12] text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-red-900/50 p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto mb-4 text-red-400">
            <Users className="w-7 h-7" />
          </div>

          <span className="text-[10px] font-mono tracking-widest uppercase text-red-400 bg-red-950/80 border border-red-800 px-2.5 py-0.5 rounded-full">
            KAPASITAS MAKSIMAL TERCAPAI
          </span>

          <h1 className="text-2xl font-serif italic font-bold mt-4 mb-2 text-white">
            Room Ini Sudah Penuh
          </h1>

          <p className="text-xs font-sans text-zinc-400 leading-relaxed mb-6">
            Untuk menjaga estetika tata letak majalah dan kualitas video, satu room dibatasi maksimal 4 orang.
            Silakan buat room baru bersama teman-temanmu yang lain.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-sans font-bold text-sm transition-all"
            >
              Buat Room Baru
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-sans text-xs transition-all border border-zinc-700"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Camera Access Error
  if (error && !isLoading) {
    return (
      <main className="min-h-screen bg-[#0e0f12] text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-amber-900/50 p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-800 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-serif font-bold text-white mb-2">Izin Kamera Diperlukan</h1>
          <p className="text-xs text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold text-sm cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col justify-between relative overflow-x-hidden">
      {/* Top Header */}
      <RoomHeader
        roomCode={roomId}
        participants={participants}
        participantCount={participantCount}
        isMirrored={isMirrored}
        onToggleMirror={toggleMirror}
        isAudioMuted={isAudioMuted}
        onToggleAudio={toggleAudio}
        onToggleCameraFacing={toggleCameraFacing}
        onExitRoom={exitRoom}
      />

      {/* Main Studio Workspace */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 my-12">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="font-serif italic text-base text-zinc-300">Menghubungkan ke Studio Majalah...</p>
            <p className="text-[11px] font-mono text-zinc-500">Mempersiapkan kamera & sinyal sinkronisasi</p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center">
            {/* Magazine Live View */}
            <MagazineLiveFeed
              template={template}
              filter={activeFilter}
              localStream={localStream}
              remoteStreams={remoteStreams}
              participants={participants}
              peerId={peerId}
              isMirrored={isMirrored}
              localVideoRef={localVideoRef}
              roomCode={roomId}
            />

            {/* Bottom Controls */}
            <BoothControls
              template={template}
              onSelectTemplate={selectTemplate}
              filter={activeFilter}
              onSelectFilter={selectFilter}
              onCapture={startPhotoSession}
              isCapturing={isCapturing}
              countdown={countdown}
              participantCount={participantCount}
            />
          </div>
        )}

        {/* Big Countdown Overlay */}
        {countdown !== null && countdown > 0 && (
          <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs transition-all">
            <div className="flex flex-col items-center scale-up-center">
              <span className="font-serif italic font-black text-9xl sm:text-[14rem] text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)] animate-bounce">
                {countdown}
              </span>
              <p className="text-sm sm:text-base font-sans font-bold tracking-[0.3em] uppercase text-amber-300 bg-black/60 px-4 py-1 rounded-full border border-amber-400/40 mt-4">
                STRIKE A POSE!
              </p>
            </div>
          </div>
        )}

        {/* Shutter Flash Animation */}
        {isFlashing && (
          <div className="fixed inset-0 z-50 pointer-events-none flash-effect" />
        )}

        {/* Final Magazine Result Modal */}
        {hasCapturedPhotos && (
          <MagazineResultModal
            capturedPhotos={capturedPhotos}
            participants={participants}
            roomCode={roomId}
            template={template}
            filter={activeFilter}
            onReset={resetSession}
            onSelectTemplate={selectTemplate}
            onSelectFilter={selectFilter}
          />
        )}
      </main>
    </div>
  );
}
