import React from 'react';
import { Loader2, Eye, Activity, AudioWaveform, FileText, CheckCircle2 } from 'lucide-react';

export default function LoadingState() {
  const steps = [
    { label: 'Visual analysis', icon: Eye, desc: 'CLIP ViT multi-layer attention flow' },
    { label: 'Frequency analysis', icon: Activity, desc: '2D-FFT azimuthal power spectrum' },
    { label: 'Noise analysis', icon: AudioWaveform, desc: 'Spatial noise residual & PRNU moments' },
    { label: 'Generating explanation', icon: FileText, desc: 'Grounded forensic synthesis' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0 py-8">
      <div className="bg-white rounded-3xl border border-warm-border p-8 sm:p-10 shadow-card text-center">
        
        {/* Spinner Icon with Gold Accent */}
        <div className="w-14 h-14 rounded-full bg-gold-100 border border-gold-200 text-gold-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Loader2 className="w-7 h-7 animate-spin stroke-[2.2]" />
        </div>

        <h3 className="text-xl font-bold text-charcoal-900 tracking-tight">
          Analyzing image...
        </h3>
        <p className="text-sm text-charcoal-500 mt-1 max-w-md mx-auto">
          SignalScope is evaluating multi-domain cues across dual streams. Please wait.
        </p>

        {/* 4 Diagnostic Stages */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={idx}
                className="flex items-center space-x-3 p-3 rounded-2xl bg-warm-50/80 border border-warm-border/60"
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-warm-border flex items-center justify-center flex-shrink-0 text-charcoal-700 shadow-sm">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-charcoal-900 truncate">
                    {step.label}
                  </span>
                  <span className="block text-[11px] text-charcoal-500 truncate">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-[11px] text-charcoal-400">
          Inference runs locally via PyTorch on CPU/GPU. Usually completes in a few seconds.
        </div>

      </div>
    </div>
  );
}
