import React from 'react';
import { Loader2, Eye, Activity, AudioWaveform, FileText } from 'lucide-react';

export default function LoadingState() {
  const steps = [
    { label: 'Semantic Vision Stream', icon: Eye, desc: 'CLIP ViT-B/16 multi-layer token attention', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { label: '2D-FFT Fourier Optics', icon: Activity, desc: 'Azimuthal radial power distribution', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'CMOS Sensor Noise (PRNU)', icon: AudioWaveform, desc: 'Spatial noise residual & autocorrelation', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Whole-Image Scene Synthesis', icon: FileText, desc: 'Natural language scene narrative', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white/95 rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-bento text-center">
        
        {/* Animated Refined Spinner */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin stroke-[2.2]" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Executing Dual-Stream Forensics...
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          SignalScope is evaluating semantic tokens, 2D Fourier optics, and CMOS sensor physics simultaneously.
        </p>

        {/* 4 Pipeline Stages */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={idx}
                className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm"
              >
                <div className={`w-8 h-8 rounded-xl ${step.color} border flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-900 truncate">
                    {step.label}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate font-mono">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-[11px] text-slate-400 font-mono">
          Local PyTorch inference via DualStreamClassifier • Usually &lt; 2.5s
        </div>

      </div>
    </div>
  );
}
