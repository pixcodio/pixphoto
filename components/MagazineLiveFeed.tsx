'use client';

import { useEffect, useRef } from 'react';
import { FilterType, Participant, TemplateType } from '@/lib/types';
import { Sparkles, User } from 'lucide-react';

interface MagazineLiveFeedProps {
  template: TemplateType;
  filter: FilterType;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  participants: Record<string, Participant>;
  peerId: string;
  isMirrored: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  roomCode: string;
}

// Map filter name to CSS filter styles for live video
const FILTER_CSS: Record<FilterType, string> = {
  normal: 'none',
  bw: 'grayscale(100%) contrast(125%) brightness(95%)',
  warm: 'sepia(35%) contrast(108%) brightness(105%) saturate(110%)',
  cool: 'contrast(120%) brightness(110%) hue-rotate(185deg) saturate(85%)',
  grain: 'contrast(115%) brightness(95%) saturate(90%)',
};

export default function MagazineLiveFeed({
  template,
  filter,
  localStream,
  remoteStreams,
  participants,
  peerId,
  isMirrored,
  localVideoRef,
  roomCode,
}: MagazineLiveFeedProps) {
  // Setup remote video refs
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  // Attach remote streams
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([pId, stream]) => {
      const el = remoteVideoRefs.current[pId];
      if (el && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const remotePeerIds = Object.keys(remoteStreams);
  const totalPeers = 1 + remotePeerIds.length;

  const myName = participants[peerId]?.name || 'You';
  const allNames = [
    myName,
    ...remotePeerIds.map((id) => participants[id]?.name || 'Guest'),
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto transition-all duration-500">
      {template === 'editorial-haute' ? (
        // TEMPLATE 1: EDITORIAL HAUTE (Vogue Style)
        <div className="relative bg-[#FAF8F5] text-[#111111] p-5 sm:p-7 rounded-sm shadow-2xl border border-[#222222]/30 flex flex-col font-serif">
          {/* Eyebrow */}
          <div className="flex items-center justify-between border-b border-[#111111]/20 pb-2 mb-3">
            <span className="text-[10px] sm:text-xs font-sans font-semibold tracking-[0.3em] uppercase text-zinc-700">
              PIXPHOTO SPECIAL ISSUE
            </span>
            <span className="text-[10px] sm:text-xs font-mono tracking-widest text-zinc-500">
              ROOM: {roomCode} • VOL. XXIV
            </span>
          </div>

          {/* Masthead */}
          <div className="text-center my-2">
            <h1 className="text-4xl sm:text-6xl font-bold italic tracking-[0.15em] leading-none text-[#111111]">
              PIX VOGUE
            </h1>
            <p className="text-[10px] sm:text-xs font-sans font-medium tracking-[0.25em] text-zinc-600 uppercase mt-1">
              THE ART OF DISTANT CONNECTION • AUTUMN EDITION
            </p>
          </div>

          {/* Live Video Grid Container */}
          <div className="relative my-3 border border-[#111111]/20 bg-stone-900 rounded-xs overflow-hidden shadow-inner aspect-[3/3.8] sm:aspect-[3/3.6]">
            <div
              className={`w-full h-full grid gap-1.5 p-1.5 bg-[#FAF8F5] ${
                totalPeers === 1
                  ? 'grid-cols-1 grid-rows-1'
                  : totalPeers === 2
                  ? 'grid-cols-2 grid-rows-1'
                  : totalPeers === 3
                  ? 'grid-cols-2 grid-rows-2'
                  : 'grid-cols-2 grid-rows-2'
              }`}
            >
              {/* Local Participant Video */}
              <div
                className={`relative overflow-hidden bg-zinc-950 rounded-xs border border-zinc-200/40 ${
                  totalPeers === 3 ? 'row-span-2 col-span-1' : ''
                }`}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    filter: FILTER_CSS[filter],
                    transform: isMirrored ? 'scaleX(-1)' : 'none',
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-sans text-white tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {myName} (You)
                </div>
              </div>

              {/* Remote Participants Videos */}
              {remotePeerIds.map((rId) => {
                const pName = participants[rId]?.name || 'Friend';
                return (
                  <div
                    key={rId}
                    className="relative overflow-hidden bg-zinc-950 rounded-xs border border-zinc-200/40"
                  >
                    <video
                      ref={(el) => {
                        remoteVideoRefs.current[rId] = el;
                      }}
                      autoPlay
                      playsInline
                      style={{ filter: FILTER_CSS[filter] }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-sans text-white tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {pName}
                    </div>
                  </div>
                );
              })}

              {/* Waiting Slots Placeholders if less than 4 */}
              {Array.from({ length: Math.max(0, (totalPeers === 1 ? 0 : 4 - totalPeers)) }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="relative overflow-hidden bg-zinc-100 border border-dashed border-zinc-300 rounded-xs flex flex-col items-center justify-center text-zinc-400 p-4 text-center"
                >
                  <User className="w-6 h-6 mb-1 opacity-40" />
                  <span className="text-[10px] font-sans font-medium tracking-wider uppercase text-zinc-500">
                    Menunggu Teman #{totalPeers + idx + 1}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 mt-0.5">
                    Maks. 4 orang di room
                  </span>
                </div>
              ))}
            </div>

            {/* Grain Overlay if selected */}
            {filter === 'grain' && (
              <div className="pointer-events-none absolute inset-0 bg-grain opacity-20" />
            )}
          </div>

          {/* Magazine Footer */}
          <div className="pt-2 border-t border-[#111111]/20 flex items-end justify-between font-sans">
            <div>
              <p className="text-[9px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                FEATURING:
              </p>
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#111111]">
                {allNames.join('  •  ').toUpperCase()}
              </p>
              <p className="text-[9px] font-mono text-zinc-500 mt-0.5">
                REMOTE PHOTOBOOTH LIVE SESSION • PIXPHOTO.IO
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block px-1.5 py-0.5 bg-zinc-900 text-[#FAF8F5] text-[9px] font-mono font-bold tracking-widest uppercase mb-1">
                L’ÉDITION
              </div>
              <p className="text-[9px] font-mono text-zinc-700">
                $12.50 USD / IDR 55.000
              </p>
            </div>
          </div>
        </div>
      ) : (
        // TEMPLATE 2: INDIE ARCHIVE / Y2K ZINE
        <div className="relative bg-[#141519] text-[#f2f0eb] p-5 sm:p-7 rounded-sm shadow-2xl border border-zinc-800 flex flex-col font-sans">
          {/* Film Perforations Border on sides */}
          <div className="absolute left-1.5 top-0 bottom-0 w-3 flex flex-col justify-around py-3 pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-2.5 h-3.5 bg-zinc-900/80 rounded-xs border border-zinc-700/50" />
            ))}
          </div>
          <div className="absolute right-1.5 top-0 bottom-0 w-3 flex flex-col justify-around py-3 pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-2.5 h-3.5 bg-zinc-900/80 rounded-xs border border-zinc-700/50" />
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3 px-3">
            <div className="flex items-center gap-2">
              <span className="bg-[#ffe600] text-black text-[10px] font-mono font-bold px-2 py-0.5 tracking-wider uppercase rounded-xs">
                ARCHIVE ZINE
              </span>
              <span className="text-[10px] font-mono text-zinc-400 tracking-wider">
                ROOM: {roomCode}
              </span>
            </div>
            <div className="text-[10px] font-mono text-amber-500 font-bold tracking-widest">
              &apos;26 09 16 • LIVE
            </div>
          </div>

          {/* Masthead */}
          <div className="flex items-baseline justify-between px-3 my-1">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
              ARCHIVE // 04
            </h1>
            <span className="border border-red-500/80 text-red-400 text-[10px] font-mono font-bold px-2 py-0.5 rotate-[-4deg] tracking-widest uppercase">
              APPROVED
            </span>
          </div>

          {/* Live Video Grid Container */}
          <div className="relative my-3 mx-2 border border-zinc-800 bg-black rounded-xs overflow-hidden shadow-2xl aspect-[3/3.8] sm:aspect-[3/3.6]">
            <div
              className={`w-full h-full grid gap-2 p-2 bg-[#1c1e24] ${
                totalPeers === 1
                  ? 'grid-cols-1 grid-rows-1'
                  : totalPeers === 2
                  ? 'grid-cols-2 grid-rows-1'
                  : totalPeers === 3
                  ? 'grid-cols-2 grid-rows-2'
                  : 'grid-cols-2 grid-rows-2'
              }`}
            >
              {/* Local Participant Video */}
              <div
                className={`relative overflow-hidden bg-zinc-950 rounded-xs border border-zinc-700/60 ${
                  totalPeers === 3 ? 'row-span-2 col-span-1' : ''
                }`}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    filter: FILTER_CSS[filter],
                    transform: isMirrored ? 'scaleX(-1)' : 'none',
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-[#ffe600] text-black px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase">
                  FRAME #01
                </div>
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  {myName} (You)
                </div>
              </div>

              {/* Remote Participants Videos */}
              {remotePeerIds.map((rId, idx) => {
                const pName = participants[rId]?.name || 'Friend';
                return (
                  <div
                    key={rId}
                    className="relative overflow-hidden bg-zinc-950 rounded-xs border border-zinc-700/60"
                  >
                    <video
                      ref={(el) => {
                        remoteVideoRefs.current[rId] = el;
                      }}
                      autoPlay
                      playsInline
                      style={{ filter: FILTER_CSS[filter] }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-zinc-800 text-zinc-300 px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase">
                      FRAME #0{idx + 2}
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {pName}
                    </div>
                  </div>
                );
              })}

              {/* Waiting Slots Placeholders */}
              {Array.from({ length: Math.max(0, (totalPeers === 1 ? 0 : 4 - totalPeers)) }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="relative overflow-hidden bg-zinc-900/60 border border-dashed border-zinc-700 rounded-xs flex flex-col items-center justify-center text-zinc-500 p-4 text-center"
                >
                  <Sparkles className="w-5 h-5 mb-1 text-zinc-600" />
                  <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-zinc-400">
                    SLOT TEMAN #{totalPeers + idx + 1}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-600 mt-0.5">
                    Maksimal 4 orang
                  </span>
                </div>
              ))}
            </div>

            {/* Grain Overlay */}
            {filter === 'grain' && (
              <div className="pointer-events-none absolute inset-0 bg-grain opacity-30" />
            )}
          </div>

          {/* Footer Info Box */}
          <div className="mx-2 p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xs flex items-center justify-between font-mono">
            <div>
              <p className="text-[9px] text-[#ffe600] font-bold tracking-wider uppercase">
                COLLAB CAST:
              </p>
              <p className="text-xs font-semibold text-zinc-200">
                {allNames.join('  //  ').toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 tracking-wider">
                EXP. 400 ISO // 35MM
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
