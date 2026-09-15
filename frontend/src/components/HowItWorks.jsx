import React from 'react';
import { Layers, Cpu, Scan, CheckCircle2 } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Dual-Stream Neural Decomposition',
      desc: 'The image passes simultaneously through two complementary streams: Brain 1 (a frozen CLIP ViT-B/16 transformer analyzing semantic coherence) and Brain 2 (an orthogonal forensic projection analyzing frequency and sensor noise distributions).',
      badge: 'Architecture'
    },
    {
      step: '02',
      title: 'Acoustic & Optical Signal Inspection',
      desc: 'High-frequency 2D-FFT azimuthal power spectra isolate periodic checkerboard spikes from latent diffusion deconvolution. SRM high-pass spatial filters check for genuine CMOS photon noise vs generative smoothing.',
      badge: 'Frequency & Noise'
    },
    {
      step: '03',
      title: 'Consensus Gating & Grounded Rollout',
      desc: 'A physical sensor autocorrelation gate protects against false positives on real computational photos. A 12-layer attention rollout maps spatial focus directly onto the image with faithful explanation synthesis.',
      badge: 'Faithful Output'
    },
  ];

  return (
    <section id="how-it-works" className="w-full max-w-4xl mx-auto px-4 sm:px-0 mt-16 pt-8 border-t border-warm-border/80">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="text-xs font-semibold tracking-wider uppercase text-gold-700 bg-gold-100 border border-gold-200 px-3 py-1 rounded-full shadow-sm">
          Technical Methodology
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-900 mt-3 tracking-tight">
          How SignalScope Detects Synthetic Imagery
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-500 mt-2 leading-relaxed">
          Built strictly according to the SIH 2026 Evaluation Framework. Every decision is grounded in optical physics and transformer attention dynamics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-3xl border border-warm-border p-6 shadow-card flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold font-mono text-gold-600 bg-gold-50 border border-gold-200 px-2.5 py-1 rounded-lg">
                  {item.step}
                </span>
                <span className="text-[11px] font-medium text-charcoal-500 bg-warm-100 px-2 py-0.5 rounded-full border border-warm-border">
                  {item.badge}
                </span>
              </div>

              <h3 className="text-sm font-bold text-charcoal-900 mb-2">
                {item.title}
              </h3>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                {item.desc}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-warm-border/60 flex items-center space-x-1.5 text-[11px] text-charcoal-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Grounded verification</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
