import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, Info, RefreshCw, Cpu, Activity, AudioWaveform } from 'lucide-react';

export default function ResultCard({ result, onReset }) {
  if (!result) {
    /* Standby state before analysis */
    return (
      <div className="bg-white rounded-2xl border border-warm-border p-4 sm:p-5 shadow-card flex flex-col justify-between h-full">
        <div className="flex items-center justify-between pb-2.5 border-b border-warm-border/60">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-warm-subtle border border-warm-border flex items-center justify-center text-ink-700">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-ink-900 tracking-tight">
              Analysis Result
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            Engine Ready
          </span>
        </div>

        {/* Readiness Checklist / Instrument State */}
        <div className="my-auto py-3 space-y-2.5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-warm-subtle/50 border border-warm-border/50 text-xs">
            <span className="text-ink-700 flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-accent-deep" />
              <span>Semantic Vision Stream (Brain 1)</span>
            </span>
            <span className="text-[10px] font-mono text-ink-400">CLIP ViT-B/16</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-warm-subtle/50 border border-warm-border/50 text-xs">
            <span className="text-ink-700 flex items-center space-x-2">
              <Activity className="w-3.5 h-3.5 text-accent-deep" />
              <span>Frequency Domain Profiler (Brain 2)</span>
            </span>
            <span className="text-[10px] font-mono text-ink-400">2D-FFT Azimuthal</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-warm-subtle/50 border border-warm-border/50 text-xs">
            <span className="text-ink-700 flex items-center space-x-2">
              <AudioWaveform className="w-3.5 h-3.5 text-accent-deep" />
              <span>Sensor Noise PRNU Moments</span>
            </span>
            <span className="text-[10px] font-mono text-ink-400">SRM Residuals</span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-warm-border/60 flex items-center justify-between text-[11px] text-ink-400">
          <span>Awaiting image input to execute inference</span>
          <span className="font-mono">SIH 2026</span>
        </div>
      </div>
    );
  }

  const { label, verdict, confidence, probabilities } = result;
  const isReal = label?.toLowerCase() === 'real';

  const confPct = Math.round((confidence || 0) * 1000) / 10;
  const realPct = Math.round((probabilities?.real ?? (isReal ? confidence : 1 - confidence)) * 1000) / 10;
  const fakePct = Math.round((probabilities?.fake ?? (isReal ? 1 - confidence : confidence)) * 1000) / 10;

  let confidenceQualifier = 'High confidence';
  let isBorderline = false;
  if (confidence < 0.70) {
    confidenceQualifier = 'Borderline confidence';
    isBorderline = true;
  } else if (confidence < 0.85) {
    confidenceQualifier = 'Moderate confidence';
    isBorderline = true;
  }

  const theme = isReal
    ? {
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        verdictColor: 'text-emerald-700',
        icon: CheckCircle,
        title: 'LIKELY AUTHENTIC',
      }
    : {
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
        verdictColor: 'text-amber-700',
        icon: AlertTriangle,
        title: 'LIKELY AI GENERATED',
      };

  const IconComponent = theme.icon;

  return (
    <div className="bg-white rounded-2xl border border-warm-border p-4 sm:p-5 shadow-card flex flex-col justify-between h-full">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-warm-border/60">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-warm-subtle border border-warm-border flex items-center justify-center text-ink-700">
            <IconComponent className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Analysis Result
          </span>
        </div>

        <button
          onClick={onReset}
          className="text-[11px] font-medium text-ink-500 hover:text-ink-900 flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-warm-subtle hover:bg-warm-border transition-colors border border-warm-border/60"
          title="Clear and analyze new image"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Main Verdict & Confidence */}
      <div className="my-2 py-1">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className={`font-hand text-2xl sm:text-3xl font-normal leading-tight tracking-wide ${theme.verdictColor}`}>
              {verdict ? verdict.toUpperCase() : theme.title}
            </h2>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                {confidenceQualifier}
              </span>
              <span className="text-xs text-ink-400 font-mono">
                {confPct}% score
              </span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-3xl sm:text-4xl font-mono font-bold text-ink-900 leading-none">
              {confPct}%
            </span>
          </div>
        </div>

        {/* Small Probability Split Visualization */}
        <div className="mt-3.5 pt-2.5 border-t border-warm-border/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-ink-600 flex items-center space-x-1 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Authentic: <strong className="text-ink-900 font-mono">{realPct}%</strong></span>
            </span>
            <span className="text-ink-600 flex items-center space-x-1 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              <span>Synthetic: <strong className="text-ink-900 font-mono">{fakePct}%</strong></span>
            </span>
          </div>

          {/* Bar */}
          <div className="w-full h-2 bg-warm-subtle rounded-full overflow-hidden flex">
            <div
              style={{ width: `${realPct}%` }}
              className="bg-emerald-500 transition-all duration-500"
            />
            <div
              style={{ width: `${fakePct}%` }}
              className="bg-amber-500 transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Footer / Borderline Advisory */}
      <div className="pt-2 border-t border-warm-border/50 text-[11px] text-ink-500">
        {isBorderline ? (
          <p className="text-[11px] text-amber-800 leading-tight bg-amber-50/70 p-2 rounded-lg border border-amber-200/80 flex items-start space-x-1.5">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 mt-0.5" />
            <span>Moderate confidence. Real post-processing (bokeh, social compression) can mimic synthetic cues.</span>
          </p>
        ) : (
          <span className="text-ink-400">Classification verified via physical sensor consensus gate.</span>
        )}
      </div>

    </div>
  );
}
