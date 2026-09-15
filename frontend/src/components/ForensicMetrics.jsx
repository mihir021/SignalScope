import React from 'react';
import { Gauge, Activity, Waves, Hash, CheckCircle2 } from 'lucide-react';

export default function ForensicMetrics({ explanationCues, prediction }) {
  if (!explanationCues) return null;

  const {
    peak_saliency,
    spectral_ratio,
    noise_variance,
    is_faithful,
  } = explanationCues;

  const sensorAutocorr = prediction?.sensor_autocorr ?? null;

  const metrics = [
    {
      title: 'Peak Saliency',
      value: peak_saliency !== undefined ? peak_saliency : '—',
      desc: 'Max normalized ViT attention concentration [0.0 - 1.0]',
      icon: Gauge,
    },
    {
      title: 'Spectral Ratio',
      value: spectral_ratio !== undefined ? spectral_ratio : '—',
      desc: 'High-to-low radial frequency power ratio (> 0.45 = anomalous spikes)',
      icon: Activity,
    },
    {
      title: 'Noise Variance',
      value: noise_variance !== undefined ? (typeof noise_variance === 'number' ? noise_variance.toFixed(6) : noise_variance) : '—',
      desc: 'Spatial noise residual variance (< 0.005 indicates synthetic smoothing)',
      icon: Waves,
    },
    ...(sensorAutocorr !== null ? [{
      title: 'Lag-1 Autocorr',
      value: typeof sensorAutocorr === 'number' ? (sensorAutocorr > 0 ? `+${sensorAutocorr.toFixed(4)}` : sensorAutocorr.toFixed(4)) : sensorAutocorr,
      desc: 'Sensor PRNU spatial correlation (> 0.12 indicates synthetic deconvolution)',
      icon: Hash,
    }] : []),
    {
      title: 'Faithfulness',
      value: is_faithful ? 'Verified' : 'Unchecked',
      desc: 'Grounding guarantee against perceptual hallucination',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-charcoal-900 tracking-tight">
          Forensic Metrics
        </h3>
        <p className="text-xs text-charcoal-500">
          Quantified acoustic, optical, and transformer signals calculated on the raw pixel tensor
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-warm-border p-4 shadow-soft flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-charcoal-500 mb-2">
                <span className="text-xs font-semibold text-charcoal-700 truncate">
                  {metric.title}
                </span>
                <Icon className="w-3.5 h-3.5 text-gold-600 flex-shrink-0" />
              </div>

              <div className="my-1">
                <span className="text-xl font-bold font-mono text-charcoal-900 tracking-tight">
                  {metric.value}
                </span>
              </div>

              <p className="text-[11px] text-charcoal-400 leading-tight mt-1">
                {metric.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
