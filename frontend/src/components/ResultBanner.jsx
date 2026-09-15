import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, Info, RefreshCw, Sparkles } from 'lucide-react';

export default function ResultBanner({ result, onReset, onShowFullSummary }) {
  if (!result) return null;

  const { label, verdict, confidence, probabilities } = result;
  const isReal = label?.toLowerCase() === 'real';

  // Calculate percentage format
  const confPct = Math.round((confidence || 0) * 1000) / 10; // e.g. 91.0
  const realPct = Math.round((probabilities?.real ?? (isReal ? confidence : 1 - confidence)) * 1000) / 10;
  const fakePct = Math.round((probabilities?.fake ?? (isReal ? 1 - confidence : confidence)) * 1000) / 10;

  // Determine qualitative strength
  let confidenceQualifier = 'High confidence';
  let isBorderline = false;
  if (confidence < 0.70) {
    confidenceQualifier = 'Borderline confidence';
    isBorderline = true;
  } else if (confidence < 0.85) {
    confidenceQualifier = 'Moderate confidence';
    isBorderline = true;
  }

  // Visual theming (Soft botanical green for Real, Warm amber for Synthetic)
  const theme = isReal
    ? {
        bg: 'bg-emerald-50/70',
        border: 'border-emerald-200',
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-800',
        icon: CheckCircle,
        iconColor: 'text-emerald-600',
        primaryText: 'text-emerald-950',
        title: 'LIKELY AUTHENTIC',
      }
    : {
        bg: 'bg-amber-50/70',
        border: 'border-amber-200',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-800',
        icon: AlertTriangle,
        iconColor: 'text-amber-600',
        primaryText: 'text-amber-950',
        title: 'LIKELY AI GENERATED',
      };

  const IconComponent = theme.icon;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-0">
      <div className={`rounded-3xl border ${theme.border} ${theme.bg} p-6 sm:p-8 shadow-card transition-all`}>
        
        {/* Top Bar: Title & Reset Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-2xl ${theme.badgeBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <IconComponent className={`w-6 h-6 ${theme.iconColor} stroke-[2.2]`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                  Primary Verdict
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText}`}>
                  {confidenceQualifier}
                </span>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${theme.primaryText}`}>
                {verdict ? verdict.toUpperCase() : theme.title}
              </h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onShowFullSummary && (
              <button
                type="button"
                onClick={onShowFullSummary}
                className="w-full sm:w-auto px-4 py-2 rounded-full bg-gold-100 hover:bg-gold-200 text-gold-950 border border-gold-300 text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold-700" />
                <span>Full Image Summary</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="w-full sm:w-auto px-4 py-2 rounded-full bg-white hover:bg-warm-50 text-charcoal-800 border border-warm-border text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Analyze another image</span>
            </button>
          </div>
        </div>

        {/* Confidence & Probability Comparison Grid */}
        <div className="mt-6 pt-6 border-t border-warm-border/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Main Confidence Metric */}
          <div className="bg-white rounded-2xl border border-warm-border p-4 shadow-soft">
            <span className="text-xs font-medium text-charcoal-500 block">
              Confidence Score
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-bold text-charcoal-900 tracking-tight">
                {confPct}%
              </span>
              <span className="text-xs text-charcoal-500 font-normal">
                {confidenceQualifier}
              </span>
            </div>
          </div>

          {/* Real vs Synthetic Probabilities Bar Card */}
          <div className="sm:col-span-2 bg-white rounded-2xl border border-warm-border p-4 shadow-soft flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-charcoal-700 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Authentic: <strong className="text-charcoal-900">{realPct}%</strong></span>
              </span>
              <span className="text-charcoal-700 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>Synthetic (AI): <strong className="text-charcoal-900">{fakePct}%</strong></span>
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-3 bg-warm-200 rounded-full overflow-hidden flex mt-2.5">
              <div
                style={{ width: `${realPct}%` }}
                className="bg-emerald-500 transition-all duration-700"
                title={`Authentic probability: ${realPct}%`}
              />
              <div
                style={{ width: `${fakePct}%` }}
                className="bg-amber-500 transition-all duration-700"
                title={`Synthetic probability: ${fakePct}%`}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-charcoal-400 mt-2">
              <span>0% (Synthetic)</span>
              <span>Consensus threshold: 50%</span>
              <span>100% (Authentic)</span>
            </div>
          </div>
        </div>

        {/* Honest Uncertainty Advisory if Borderline */}
        {isBorderline && (
          <div className="mt-4 p-3.5 rounded-2xl bg-white/90 border border-warm-border text-xs text-charcoal-700 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-charcoal-900">Uncertainty Advisory:</strong> This estimate has moderate/borderline confidence. Common real-world image processing (such as portrait-mode bokeh, social media compression, or heavy color grading) can mimic synthetic artifacts. Human review is recommended.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
