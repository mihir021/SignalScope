import React from 'react';
import { MoreHorizontal, Sparkles } from 'lucide-react';
import ConfidenceGauge from './ConfidenceGauge';

export default function OverviewCard({ result, onMenuClick }) {
  const hasResult = Boolean(result);
  const isReal = result?.label?.toLowerCase() === 'real';
  const confidence = result?.confidence ? result.confidence * 100 : 0;

  const realPct = hasResult 
    ? (result?.probabilities?.real !== undefined ? Math.round(result.probabilities.real * 1000) / 10 : (isReal ? Math.round(confidence * 10) / 10 : Math.round((100 - confidence) * 10) / 10))
    : 0;

  const fakePct = hasResult
    ? (result?.probabilities?.fake !== undefined ? Math.round(result.probabilities.fake * 1000) / 10 : (isReal ? Math.round((100 - confidence) * 10) / 10 : Math.round(confidence * 10) / 10))
    : 0;

  return (
    <div className="bg-white rounded-3xl border border-warm-border p-6 sm:p-8 shadow-card flex flex-col justify-between transition-all">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 font-sans">
            CONFIDENCE OVERVIEW
          </span>
          <button
            type="button"
            onClick={onMenuClick}
            className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded-lg hover:bg-warm-100 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Radial Speedometer Gauge */}
        <div className="py-2">
          <ConfidenceGauge
            value={confidence}
            isReal={isReal}
            hasResult={hasResult}
          />
        </div>
      </div>

      {/* Bottom 2 Pill Metric Cards (Exact replica of "Number of Sales" and "Total Revenue" cards in reference) */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {/* Real Prob Card */}
        <div className="p-3.5 rounded-2xl bg-warm-50/80 border border-warm-border flex flex-col justify-between">
          <span className="text-[11px] text-charcoal-500 block">
            Authentic Probability
          </span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-bold text-charcoal-900 font-sans">
              {hasResult ? `${realPct}%` : '0%'}
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
              Real
            </span>
          </div>
        </div>

        {/* Fake Prob Card */}
        <div className="p-3.5 rounded-2xl bg-warm-50/80 border border-warm-border flex flex-col justify-between">
          <span className="text-[11px] text-charcoal-500 block">
            Synthetic Probability
          </span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-bold text-charcoal-900 font-sans">
              {hasResult ? `${fakePct}%` : '0%'}
            </span>
            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded-md">
              AI-Gen
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
