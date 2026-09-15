import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-md py-6 px-4 sm:px-8 xl:px-12 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <span className="font-bold text-slate-800">SignalScope Forensics</span>
          <span className="text-slate-300">•</span>
          <span>AI Media Forensics & Sensor Verification Platform</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500">
          <span>Dual-Stream Architecture</span>
          <span>•</span>
          <span>CLIP ViT-B/16 + 2D-FFT + PRNU</span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold">Engine Active</span>
        </div>

      </div>
    </footer>
  );
}
