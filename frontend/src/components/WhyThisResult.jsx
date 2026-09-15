import React from 'react';
import { Eye, Activity, AudioWaveform, ShieldCheck, Tag } from 'lucide-react';

export default function WhyThisResult({ explanationCues }) {
  if (!explanationCues) return null;

  const {
    spatial_cue,
    frequency_cue,
    noise_cue,
    object_aware_spatial_cue,
    hotspot_content,
    hotspot_region,
    spectral_ratio,
    noise_variance,
    peak_saliency,
    is_faithful,
    primary_subject,
    scene_type,
  } = explanationCues;

  // Use object-aware spatial cue if available from the backend, otherwise fallback to spatial_cue
  const activeSpatialCue = object_aware_spatial_cue || spatial_cue;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-0 mt-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-charcoal-900 tracking-tight">
            Why this result?
          </h3>
          <p className="text-xs text-charcoal-500">
            Multi-domain evidence explaining the model verdict
          </p>
        </div>
        {is_faithful && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gold-100 border border-gold-200 text-gold-700 text-xs font-semibold shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-600" />
            <span>Grounded & Faithful</span>
          </div>
        )}
      </div>

      {/* 3 Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Visual / Spatial Analysis */}
        <div className="bg-white rounded-3xl border border-warm-border p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gold-100 border border-gold-200 text-gold-700 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-charcoal-900">
                Visual / Spatial
              </h4>
            </div>

            <p className="text-xs text-charcoal-700 leading-relaxed">
              {activeSpatialCue || 'Visual attention map evaluated for localized texture and boundary consistency.'}
            </p>
          </div>

          {/* Context badges if returned */}
          <div className="mt-4 pt-3 border-t border-warm-border/60 flex flex-wrap items-center gap-1.5 text-[11px]">
            {(primary_subject || hotspot_content) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-warm-100 border border-warm-border text-charcoal-800 font-medium">
                <Tag className="w-3 h-3 mr-1 text-gold-600" />
                {primary_subject || hotspot_content}
              </span>
            )}
            {scene_type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-warm-100 border border-warm-border text-charcoal-600">
                {scene_type}
              </span>
            )}
            {hotspot_region && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-warm-100 border border-warm-border text-charcoal-600">
                {hotspot_region}
              </span>
            )}
            {peak_saliency !== undefined && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-warm-100 border border-warm-border text-charcoal-600">
                Peak: {peak_saliency}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Frequency Analysis */}
        <div className="bg-white rounded-3xl border border-warm-border p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-warm-100 border border-warm-border text-charcoal-700 flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-charcoal-900">
                Frequency Analysis
              </h4>
            </div>

            <p className="text-xs text-charcoal-700 leading-relaxed">
              {frequency_cue || '2D-FFT azimuthal power spectrum checked for deconvolution grid artifacts.'}
            </p>
          </div>

          {/* Context badges if returned */}
          <div className="mt-4 pt-3 border-t border-warm-border/60 flex items-center justify-between text-[11px] text-charcoal-600">
            <span>Spectral Ratio:</span>
            <span className="font-semibold text-charcoal-900 bg-warm-100 px-2 py-0.5 rounded border border-warm-border">
              {spectral_ratio !== undefined ? spectral_ratio : '—'}
            </span>
          </div>
        </div>

        {/* Card 3: Sensor Noise Analysis */}
        <div className="bg-white rounded-3xl border border-warm-border p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-warm-100 border border-warm-border text-charcoal-700 flex items-center justify-center flex-shrink-0">
                <AudioWaveform className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-charcoal-900">
                Sensor Noise (PRNU)
              </h4>
            </div>

            <p className="text-xs text-charcoal-700 leading-relaxed">
              {noise_cue || 'High-pass spatial noise residual inspected for CMOS photon noise vs synthetic denoising.'}
            </p>
          </div>

          {/* Context badges if returned */}
          <div className="mt-4 pt-3 border-t border-warm-border/60 flex items-center justify-between text-[11px] text-charcoal-600">
            <span>Noise Variance:</span>
            <span className="font-mono font-semibold text-charcoal-900 bg-warm-100 px-2 py-0.5 rounded border border-warm-border">
              {noise_variance !== undefined ? noise_variance : '—'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
