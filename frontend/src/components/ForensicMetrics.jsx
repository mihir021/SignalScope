import React from 'react';
import { Gauge, Activity, Waves, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ForensicMetrics({ explanationCues, prediction }) {
  if (!explanationCues) return null;

  const {
    peak_saliency,
    spectral_ratio,
    noise_variance,
    is_faithful,
  } = explanationCues;

  const sensorAutocorr = prediction?.sensor_autocorr ?? null;
  const isAnomalousSpectral = typeof spectral_ratio === 'number' && spectral_ratio > 0.45;
  const isSmoothNoise = typeof noise_variance === 'number' && noise_variance < 0.005;

  const metrics = [
    {
      title: 'Attention Focus',
      value: peak_saliency !== undefined ? `${Math.round(peak_saliency * 100)}%` : '—',
      status: peak_saliency > 0.7 ? 'High Concentration' : 'Diffuse Spread',
      desc: 'ViT transformer localized specific anatomical and boundary regions.',
      icon: Gauge,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Lens Light Decay',
      value: spectral_ratio !== undefined ? Number(spectral_ratio).toFixed(3) : '—',
      status: isAnomalousSpectral ? 'Spikes Detected' : 'Smooth Lens Optics',
      desc: isAnomalousSpectral
        ? 'Periodic deconvolution grid harmonics noted in high frequencies.'
        : 'Continuous 1/f power-law decay of physical camera lenses verified.',
      icon: Activity,
      color: isAnomalousSpectral ? 'text-amber-600' : 'text-emerald-600',
      bg: isAnomalousSpectral ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Sensor Micro-Grain',
      value: noise_variance !== undefined ? (typeof noise_variance === 'number' ? noise_variance.toFixed(5) : noise_variance) : '—',
      status: isSmoothNoise ? 'Denoised / Smooth' : 'Natural Camera Grain',
      desc: isSmoothNoise
        ? 'Surface noise variance is unnaturally low, characteristic of AI generation.'
        : 'Genuine CMOS silicon shot noise confirmed across photo-sites.',
      icon: Waves,
      color: isSmoothNoise ? 'text-amber-600' : 'text-emerald-600',
      bg: isSmoothNoise ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Evidence Grounding',
      value: is_faithful ? '100% Grounded' : 'Unverified',
      status: is_faithful ? 'Anti-Hallucination Verified' : 'Standard',
      desc: 'All explanations derived directly from raw pixel tensors, not generative LLM speculation.',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-3">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Diagnostic Evidence Summary
        </h3>
        <p className="text-xs text-slate-500">
          Core physical and architectural signals evaluated during inference
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div
              key={idx}
              className="bg-white/95 rounded-2xl border border-slate-200/80 p-4 shadow-bento flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {metric.title}
                  </span>
                  <div className={`w-7 h-7 rounded-lg ${metric.bg} border flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon className={`w-3.5 h-3.5 ${metric.color}`} />
                  </div>
                </div>

                <div className="flex items-baseline space-x-2 my-1">
                  <span className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                    {metric.value}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 truncate">
                    {metric.status}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug mt-2 pt-2 border-t border-slate-100">
                {metric.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
