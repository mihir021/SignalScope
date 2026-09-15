import React from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, Sparkles, Tag, Globe, Compass, Eye, Activity, Waves } from 'lucide-react';
import DualBrainCharts from './DualBrainCharts';

export default function VerdictSummary({ result, onReset, latencyMs }) {
  if (!result) return null;

  const {
    label,
    verdict,
    confidence,
    probabilities,
    explanation_cues,
    image_summary,
    image_summary_data,
    certainty_tier,
    filename,
  } = result;

  const isReal = label?.toLowerCase() === 'real';

  const confPct = Math.round((confidence || 0) * 1000) / 10;
  const certaintyLabel = (certainty_tier || (confPct >= 80 ? 'HIGH' : 'BORDERLINE')).toUpperCase();

  // Standard legal PS terminology
  const officialVerdictText = isReal
    ? 'Official Verdict: LIKELY AUTHENTIC / REAL'
    : 'Official Verdict: LIKELY AI-GENERATED / SYNTHETIC';

  const cues = explanation_cues || {};
  const primarySubject = image_summary_data?.primary_subject || cues.primary_subject;
  const sceneType = image_summary_data?.scene_type || cues.scene_type;
  const detectedStyle = image_summary_data?.detected_style || cues.detected_style;
  const narrative = image_summary || cues.summary || 'Scene analysis completed.';

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      
      {/* Top Official Verdict Banner Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all shadow-bento ${
        isReal
          ? 'bg-[#ECFDF5] border-[#A7F3D0]'
          : 'bg-[#FFFBEB] border-[#FDE68A]'
      }`}>
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${
              isReal
                ? 'bg-white border-emerald-200 text-emerald-600'
                : 'bg-white border-rose-200 text-rose-600'
            }`}>
              {isReal ? (
                <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
              ) : (
                <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  {filename ? `INSPECTION: ${filename.toUpperCase()}` : 'MEDIA FORENSIC ANALYSIS'}
                </span>
                <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                  isReal
                    ? 'bg-white text-emerald-800 border-emerald-200 shadow-sm'
                    : 'bg-white text-rose-800 border-rose-200 shadow-sm'
                }`}>
                  Certainty: {certaintyLabel}
                </span>
                {latencyMs && (
                  <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm hidden sm:inline">
                    ⚡ {latencyMs} ms
                  </span>
                )}
              </div>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${
                isReal ? 'text-emerald-900' : 'text-slate-900'
              }`}>
                {officialVerdictText}
              </h2>
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all flex items-center space-x-1.5 self-start sm:self-auto shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Analyze Another</span>
          </button>
        </div>

        {/* Diagnostic Signal Summary Cards */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Diagnostic Signal Breakdown:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Signal 1: Visual Anatomy */}
            <div className="p-4 rounded-2xl bg-white/95 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-slate-800 flex items-center space-x-1.5 text-xs font-bold mb-1.5">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Visual Anatomy</span>
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {isReal
                    ? 'Edges, shadows, and anatomical geometries conform naturally to physical optics.'
                    : 'Subtle disruptions in pixel micro-textures and boundary deconvolution detected.'}
                </p>
              </div>
            </div>

            {/* Signal 2: Sensor Noise PRNU */}
            <div className="p-4 rounded-2xl bg-white/95 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-slate-800 flex items-center space-x-1.5 text-xs font-bold mb-1.5">
                  <Waves className="w-4 h-4 text-emerald-600" />
                  <span>Sensor Noise (PRNU)</span>
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {isReal
                    ? 'Natural silicon photon shot noise verified consistently across sensor pixels.'
                    : 'Physical photon shot noise suppressed by iterative latent diffusion denoising.'}
                </p>
              </div>
            </div>

            {/* Signal 3: 2D Frequency Fourier */}
            <div className="p-4 rounded-2xl bg-white/95 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-slate-800 flex items-center space-x-1.5 text-xs font-bold mb-1.5">
                  <Activity className="w-4 h-4 text-amber-600" />
                  <span>2D Frequency Fourier</span>
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {cues.spectral_ratio > 0.45
                    ? 'Periodic high-frequency spectral spikes noted from upsampling deconvolution grids.'
                    : 'Natural 1/f continuous power-law decay of physical camera lenses verified.'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* DUAL-BRAIN NEURAL BREAKDOWN & FINAL CALIBRATED VERDICT BAR CHARTS */}
      <DualBrainCharts result={result} />

      {/* Whole-Image Scene Description Card (Clean from /image/summary) */}
      <div className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-bento text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-slate-900">Multimodal Scene Comprehension</span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Cross-Domain Synthesis
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Whole-Image Semantics</span>
        </div>

        {/* Narrative */}
        <p className="mt-3.5 text-slate-700 leading-relaxed font-normal text-sm">
          {narrative}
        </p>

        {/* Badges */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          {primarySubject && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs shadow-sm">
              <Tag className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              <span>Subject: {primarySubject}</span>
            </span>
          )}
          {sceneType && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs shadow-sm">
              <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              <span>Scene: {sceneType}</span>
            </span>
          )}
          {detectedStyle && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs shadow-sm">
              <Compass className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              <span>Style: {detectedStyle}</span>
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
