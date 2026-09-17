'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  Users,
  FlipHorizontal,
  SwitchCamera,
  Mic,
  MicOff,
  LogOut,
} from 'lucide-react';
import { Participant } from '@/lib/types';

interface RoomHeaderProps {
  roomCode: string;
  participants: Record<string, Participant>;
  participantCount: number;
  isMirrored: boolean;
  onToggleMirror: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  onToggleCameraFacing: () => void;
  onExitRoom?: () => void;
}

export default function RoomHeader({
  roomCode,
  participants,
  participantCount,
  isMirrored,
  onToggleMirror,
  isAudioMuted,
  onToggleAudio,
  onToggleCameraFacing,
  onExitRoom,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <header className="w-full bg-[#121316]/90 border-b border-zinc-800 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Issue Tag */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2">
            <span className="font-serif italic text-xl font-bold tracking-wider text-zinc-100 group-hover:text-white transition-colors">
              PIXPHOTO
            </span>
            <span className="text-[9px] font-mono tracking-widest bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 uppercase">
              STUDIO
            </span>
          </Link>

          {/* Hidden Room ID Badge & Copy Invite */}
          <div className="flex items-center bg-zinc-900 border border-zinc-700/70 rounded-full pl-3 pr-1 py-1 gap-2 shadow-inner">
            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-zinc-500 font-sans text-[11px]">ROOM:</span>
              <span className="font-bold tracking-wider text-amber-200">{roomCode}</span>
            </div>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-sans font-medium px-2.5 py-0.5 rounded-full transition-all border border-zinc-700 active:scale-95"
              title="Salin link room untuk undang teman"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Undang Teman</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Participants count indicator */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-full text-xs font-sans text-zinc-300 shadow-xs"
            title={Object.values(participants).map((p) => p.name).join(', ')}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold text-white">{participantCount}</span>
            <span className="text-zinc-500">/ 4 Orang</span>
            {participantCount === 4 && (
              <span className="text-[9px] bg-red-950/80 text-red-300 border border-red-800 px-1.5 py-0.2 rounded-full uppercase font-mono ml-1">
                Penuh
              </span>
            )}
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-1">
            <button
              onClick={onToggleMirror}
              className={`p-1.5 rounded-full transition-colors ${
                isMirrored ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={isMirrored ? 'Mirror Aktif' : 'Mirror Nonaktif'}
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleCameraFacing}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Ganti Kamera Depan/Belakang"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleAudio}
              className={`p-1.5 rounded-full transition-colors ${
                isAudioMuted ? 'text-red-400 hover:text-red-300' : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title={isAudioMuted ? 'Mikrofon Bisu' : 'Mikrofon Aktif'}
            >
              {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <Link
              href="/"
              onClick={onExitRoom}
              className="p-1.5 rounded-full text-zinc-500 hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
              title="Keluar Room"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
