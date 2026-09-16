'use client';

import { useEffect, useRef, useState } from 'react';
import { FilterType, Participant, TemplateType } from '@/lib/types';
import { renderMagazineToCanvas } from '@/lib/canvas-renderer';
import confetti from 'canvas-confetti';
import {
  Download,
  RotateCcw,
  Share2,
  Check,
  Sparkles,
  BookOpen,
  Camera,
  Layers,
} from 'lucide-react';

interface MagazineResultModalProps {
  capturedPhotos: Record<string, string>;
  participants: Record<string, Participant>;
  roomCode: string;
  template: TemplateType;
  filter: FilterType;
  onReset: () => void;
  onSelectTemplate: (tpl: TemplateType) => void;
  onSelectFilter: (flt: FilterType) => void;
}

export default function MagazineResultModal({
  capturedPhotos,
  participants,
  roomCode,
  template,
  filter,
  onReset,
  onSelectTemplate,
  onSelectFilter,
}: MagazineResultModalProps) {
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isRendering = !renderedImageUrl;

  // Launch confetti when modal opens
  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffe600', '#f4f2ee', '#e63946', '#3b82f6'],
      });
    } catch {}
  }, []);

  // Asynchronously render canvas composite
  useEffect(() => {
    let isMounted = true;

    const photoUrls = Object.values(capturedPhotos);
    const names = Object.keys(capturedPhotos).map(
      (id) => participants[id]?.name || 'Cast Member'
    );

    renderMagazineToCanvas({
      photos: photoUrls,
      participantNames: names,
      template,
      filter,
      roomCode,
      width: 1200,
      height: 1800,
    })
      .then((canvas) => {
        if (!isMounted) return;
        canvasRef.current = canvas;
        const dataUrl = canvas.toDataURL('image/png', 0.95);
        setRenderedImageUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Error rendering composite canvas:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [capturedPhotos, participants, template, filter, roomCode]);

  // Download image
  const handleDownload = () => {
    if (!renderedImageUrl) return;
    const link = document.createElement('a');
    link.download = `PIXPHOTO_${template.toUpperCase()}_${roomCode}_${Date.now()}.png`;
    link.href = renderedImageUrl;
    link.click();
  };

  const fallbackCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Share image
  const handleShare = async () => {
    if (!canvasRef.current) return;
    try {
      if (navigator.share && navigator.canShare) {
        canvasRef.current.toBlob(async (blob) => {
          if (blob && navigator.canShare({ files: [new File([blob], 'pixphoto.png', { type: 'image/png' })] })) {
            await navigator.share({
              title: `PIXPHOTO Magazine Edition`,
              text: `Lihat hasil photobooth magazine kami dari room ${roomCode}!`,
              files: [new File([blob], `pixphoto-${roomCode}.png`, { type: 'image/png' })],
            });
          } else {
            fallbackCopy();
          }
        }, 'image/png');
      } else {
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-serif italic text-lg sm:text-xl font-bold tracking-wider text-white">
            PIXPHOTO STUDIO
          </span>
          <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-xs tracking-widest ml-2">
            FINAL PRINT
          </span>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-xs font-sans font-medium text-zinc-200 transition-all border border-zinc-700 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Ambil Foto Baru</span>
        </button>
      </div>

      {/* Main Preview Container */}
      <div className="my-4 flex flex-col items-center justify-center max-w-md w-full relative">
        {isRendering ? (
          <div className="w-full aspect-[2/3] bg-zinc-900 border border-zinc-800 rounded-sm flex flex-col items-center justify-center text-zinc-400 animate-pulse">
            <Sparkles className="w-8 h-8 mb-3 text-amber-400 animate-spin" />
            <p className="font-serif italic text-base text-zinc-200">Menyusun Tata Letak Majalah...</p>
            <p className="text-xs font-mono text-zinc-500 mt-1">High Resolution Print Render</p>
          </div>
        ) : (
          renderedImageUrl && (
            <div className="relative group rounded-sm overflow-hidden shadow-2xl border border-zinc-700/60 max-h-[68vh] transition-transform duration-300 hover:scale-[1.01]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={renderedImageUrl}
                alt="PIXPHOTO Magazine Final Result"
                className="w-full h-auto object-contain max-h-[68vh]"
              />
            </div>
          )
        )}
      </div>

      {/* Customization Toolbar & Actions */}
      <div className="w-full max-w-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
        {/* Template Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-sans text-zinc-400">
            <BookOpen className="w-4 h-4 text-zinc-300" />
            <span>Pilih Template:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setRenderedImageUrl(null);
                onSelectTemplate('editorial-haute');
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-serif italic tracking-wider transition-all border cursor-pointer ${
                template === 'editorial-haute'
                  ? 'bg-zinc-100 text-zinc-950 border-white font-bold shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
            >
              1. Editorial Haute (Vogue)
            </button>
            <button
              onClick={() => {
                setRenderedImageUrl(null);
                onSelectTemplate('indie-archive');
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all border cursor-pointer ${
                template === 'indie-archive'
                  ? 'bg-[#ffe600] text-black border-[#ffe600] shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
            >
              2. Indie Archive (Zine)
            </button>
          </div>
        </div>

        {/* Filter Switcher */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Tone:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'normal', label: 'Natural' },
              { id: 'bw', label: 'B&W Vogue' },
              { id: 'warm', label: 'Warm 90s' },
              { id: 'cool', label: 'Cool Flash' },
              { id: 'grain', label: 'Film Grain' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setRenderedImageUrl(null);
                  onSelectFilter(f.id as FilterType);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-sans transition-all whitespace-nowrap cursor-pointer ${
                  filter === f.id
                    ? 'bg-white text-black font-semibold'
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Download & Share */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleDownload}
            disabled={isRendering || !renderedImageUrl}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white hover:bg-zinc-100 text-black font-sans font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Majalah (PNG)</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-sans font-semibold text-sm border border-zinc-700 transition-all active:scale-[0.98] cursor-pointer"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{isCopied ? 'Link Disalin!' : 'Bagikan'}</span>
          </button>

          <button
            onClick={onReset}
            className="hidden sm:flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 font-sans text-sm border border-zinc-700/60 transition-all cursor-pointer"
            title="Ambil foto lain"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
