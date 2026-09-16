'use client';

import { FilterType, TemplateType } from '@/lib/types';
import { Camera, Sparkles, BookOpen, Layers } from 'lucide-react';

interface BoothControlsProps {
  template: TemplateType;
  onSelectTemplate: (tpl: TemplateType) => void;
  filter: FilterType;
  onSelectFilter: (flt: FilterType) => void;
  onCapture: () => void;
  isCapturing: boolean;
  countdown: number | null;
  participantCount: number;
}

export default function BoothControls({
  template,
  onSelectTemplate,
  filter,
  onSelectFilter,
  onCapture,
  isCapturing,
  countdown,
  participantCount,
}: BoothControlsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3 my-4">
      {/* Top Floating Selector Bar: Template & Filter */}
      <div className="w-full bg-zinc-900/90 border border-zinc-800 backdrop-blur-md rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        {/* Template Choice */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-sans text-zinc-400">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Template:</span>
          </div>
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => onSelectTemplate('editorial-haute')}
              className={`px-3 py-1 rounded-md text-[11px] font-serif italic transition-all ${
                template === 'editorial-haute'
                  ? 'bg-zinc-200 text-black font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Editorial Haute
            </button>
            <button
              onClick={() => onSelectTemplate('indie-archive')}
              className={`px-3 py-1 rounded-md text-[11px] font-mono font-bold uppercase transition-all ${
                template === 'indie-archive'
                  ? 'bg-[#ffe600] text-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Indie Archive
            </button>
          </div>
        </div>

        {/* Filter Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 text-[11px] font-sans text-zinc-400 mr-1">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          {[
            { id: 'normal', label: 'Natural' },
            { id: 'bw', label: 'B&W' },
            { id: 'warm', label: 'Warm' },
            { id: 'cool', label: 'Flash' },
            { id: 'grain', label: 'Grain' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => onSelectFilter(f.id as FilterType)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-sans transition-all whitespace-nowrap ${
                filter === f.id
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Shutter Trigger Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onCapture}
          disabled={isCapturing || countdown !== null}
          className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-linear-to-r from-amber-100 via-white to-amber-200 text-black font-sans font-bold text-base shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:scale-100 cursor-pointer"
        >
          {/* Pulsing ring animation */}
          <span className="absolute -inset-1 rounded-full bg-white/20 blur-md group-hover:bg-amber-400/30 transition-all animate-pulse" />

          <Camera className="w-5 h-5 text-zinc-900 group-hover:rotate-[-10deg] transition-transform" />
          <span className="tracking-wide">
            {isCapturing ? 'MENYIAPKAN POSE...' : 'AMBIL FOTO MAJALAH'}
          </span>
          <Sparkles className="w-4 h-4 text-amber-600" />
        </button>

        <p className="text-[11px] font-mono text-zinc-400 tracking-wider">
          {participantCount === 1
            ? 'Bisa foto sendiri atau ajak hingga 4 teman dengan kode room'
            : `Semua ${participantCount} orang akan difoto secara serentak (Countdown 3 Detik)`}
        </p>
      </div>
    </div>
  );
}
