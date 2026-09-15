import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="about" className="w-full max-w-4xl mx-auto px-4 sm:px-0 mt-20 pb-12 border-t border-warm-border/80 text-xs text-charcoal-500">
      <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left Branding */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-gold-400 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-charcoal-900 stroke-[2.2]" />
          </div>
          <span className="font-semibold text-charcoal-900">SignalScope</span>
          <span>— Smart India Hackathon (SIH 2026)</span>
        </div>

        {/* Center Disclaimers */}
        <div className="text-center sm:text-right text-[11px] text-charcoal-400">
          Forensic analysis estimates are probabilistic heuristics. Not intended as sole legal evidence.
        </div>

      </div>

      <div className="mt-4 text-center text-[11px] text-charcoal-400">
        FastAPI Backend • PyTorch • HuggingFace Transformers • Tailwind CSS
      </div>
    </footer>
  );
}
