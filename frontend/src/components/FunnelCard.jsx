import React from 'react';
import { MoreHorizontal, ArrowUpRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function FunnelCard({ result, onMenuClick }) {
  const hasResult = Boolean(result);
  const isReal = result?.label?.toLowerCase() === 'real';
  const confidence = result?.confidence ? Math.round(result.confidence * 1000) / 10 : 0;
  const verdict = result?.verdict || (hasResult ? (isReal ? 'Likely Authentic' : 'Likely AI-Generated') : 'Awaiting Analysis');

  const cues = result?.explanation_cues || {};

  // 5 diagnostic stages matching the 5 conversion funnel columns
  const funnelStages = [
    {
      title: 'Visual ViT Stream',
      value: hasResult ? (cues.peak_saliency !== undefined ? `Saliency: ${cues.peak_saliency}` : 'Analyzed') : '0',
      tag: hasResult ? '12-Layer Rollout' : '0%',
      desc: cues.hotspot_region || '14×14 patch attention flow',
    },
    {
      title: 'Frequency 2D-FFT',
      value: hasResult ? (cues.spectral_ratio !== undefined ? `Ratio: ${cues.spectral_ratio}` : 'Analyzed') : '0',
      tag: hasResult ? 'Azimuthal' : '0%',
      desc: cues.spectral_ratio > 0.45 ? 'Grid spikes noted' : '1/f natural decay',
    },
    {
      title: 'Sensor PRNU Noise',
      value: hasResult ? (cues.noise_variance !== undefined ? `Var: ${cues.noise_variance}` : 'Analyzed') : '0',
      tag: hasResult ? 'High-Pass' : '0%',
      desc: 'CMOS sensor photon noise',
    },
    {
      title: 'Consensus Gate',
      value: hasResult ? (isReal ? 'Authentic' : 'Synthetic') : '0',
      tag: hasResult ? 'Dual-Brain' : '0%',
      desc: 'Sensor autocorrelation lock',
    },
    {
      title: 'Final Verdict',
      value: hasResult ? (isReal ? 'Real / Auth' : 'AI-Gen') : '0',
      tag: hasResult ? `${confidence}%` : '0%',
      desc: hasResult ? 'Grounded output' : 'Completed analysis',
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-warm-border p-6 sm:p-8 shadow-card flex flex-col justify-between relative overflow-hidden transition-all">
      
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 font-sans">
            AI DETECTION VERDICT
          </span>
          <button 
            type="button" 
            onClick={onMenuClick}
            className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded-lg hover:bg-warm-100 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Big Verdict Stat */}
        <div className="flex items-baseline space-x-3 mt-2">
          <span className="text-4xl sm:text-5xl font-bold tracking-tight text-charcoal-900 font-sans">
            {hasResult ? `${confidence}%` : '0.0%'}
          </span>
          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
            hasResult
              ? (isReal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
              : 'bg-warm-200 text-charcoal-500'
          }`}>
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>{verdict}</span>
          </span>
        </div>

        {/* Subtitle */}
        <div className="mt-8 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
            FORENSIC MULTI-STREAM DECOMPOSITION FUNNEL
          </span>
        </div>

        {/* 5 Funnel Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 z-10 relative">
          {funnelStages.map((stage, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-xs text-charcoal-500 block truncate font-medium">
                {stage.title}
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-charcoal-900 font-sans">
                  {stage.value}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">
                  {stage.tag}
                </span>
              </div>
              <span className="text-[11px] text-charcoal-400 block truncate leading-tight">
                {stage.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stepped Multi-Tone Golden Faceted Wave at Bottom (Exact Replica of Reference Image) */}
      <div className="mt-8 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 overflow-hidden pt-4">
        <svg
          viewBox="0 0 500 50"
          preserveAspectRatio="none"
          className="w-full h-12 sm:h-14 block"
        >
          {/* 5 faceted stepped polygonal panels */}
          {/* Panel 1: Pale warm yellow */}
          <polygon points="0,35 100,28 100,50 0,50" fill="#FEF7D6" />
          {/* Panel 2: Light golden yellow */}
          <polygon points="100,28 200,32 200,50 100,50" fill="#FDEEAD" />
          {/* Panel 3: Medium warm yellow */}
          <polygon points="200,32 300,29 300,50 200,50" fill="#FCDF7E" />
          {/* Panel 4: Golden amber */}
          <polygon points="300,29 400,33 400,50 300,50" fill="#F9CE55" />
          {/* Panel 5: Warm amber ochre */}
          <polygon points="400,33 500,26 500,50 400,50" fill="#ECAE36" />
        </svg>
      </div>

    </div>
  );
}
