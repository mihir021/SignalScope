import React from 'react';
import { Sparkles, ScanEye, ArrowDown } from 'lucide-react';

export default function Hero({ onScrollToAnalyzer }) {
  return (
    <section className="pt-10 pb-6 px-4 sm:px-6 text-center max-w-4xl mx-auto">
      {/* Top Pill Tag */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gold-100 border border-gold-200 text-gold-700 text-xs font-medium mb-5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-gold-600" />
        <span>Dual-Stream Multimodal AI Forensics</span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl md:text-5xl font-bold tracking-tight text-charcoal-900 leading-tight">
        Detect AI-generated images.<br />
        <span className="text-charcoal-600 font-semibold">Understand why.</span>
      </h1>

      {/* Description */}
      <p className="mt-4 text-base sm:text-lg text-charcoal-600 max-w-2xl mx-auto leading-relaxed">
        Analyze visual, frequency, and sensor-noise characteristics to estimate whether an image is authentic or synthetically generated.
      </p>

      {/* Quick Feature Badges */}
      <div className="mt-6 flex flex-wrap justify-center items-center gap-2 sm:gap-3 text-xs text-charcoal-600">
        <span className="px-3 py-1 rounded-full bg-white border border-warm-border shadow-soft">
          ViT Attention Rollout
        </span>
        <span className="px-3 py-1 rounded-full bg-white border border-warm-border shadow-soft">
          2D-FFT Power Spectrum
        </span>
        <span className="px-3 py-1 rounded-full bg-white border border-warm-border shadow-soft">
          CMOS Sensor Noise (PRNU)
        </span>
      </div>
    </section>
  );
}
