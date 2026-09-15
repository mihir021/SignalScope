import React from 'react';
import { Cpu, BarChart3, Check } from 'lucide-react';

export default function GeneratorAttribution({ attribution }) {
  if (!attribution || !attribution.predicted_family) return null;

  const { predicted_family, confidence, family_probabilities, num_families } = attribution;
  const confPct = Math.round((confidence || 0) * 1000) / 10;

  // Convert distribution dict to sorted array
  const entries = Object.entries(family_probabilities || {})
    .map(([name, prob]) => ({
      name,
      prob: Math.round(prob * 1000) / 10,
    }))
    .sort((a, b) => b.prob - a.prob);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-0 mt-8">
      <div className="bg-white rounded-3xl border border-warm-border p-6 sm:p-8 shadow-card">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-warm-border/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gold-100 border border-gold-200 text-gold-700 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-charcoal-900 tracking-tight">
                  Generator Family Attribution
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-warm-100 text-charcoal-600 border border-warm-border">
                  SIH Bonus Track B ({num_families || entries.length}-Class)
                </span>
              </div>
              <p className="text-xs text-charcoal-500">
                Multi-task linear classifier projecting 640-d fused embeddings to generator architectures
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-charcoal-500 block">Attribution Confidence</span>
            <span className="text-lg font-bold text-charcoal-900 font-mono">
              {confPct}%
            </span>
          </div>
        </div>

        {/* Primary Predicted Class Card */}
        <div className="mt-5 p-4 rounded-2xl bg-warm-50 border border-warm-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs text-charcoal-500 block">Predicted Generator Architecture:</span>
              <span className="text-base font-bold text-charcoal-900">
                {predicted_family}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown bar chart if distribution available */}
        {entries.length > 0 && (
          <div className="mt-5 space-y-2.5">
            <span className="text-xs font-semibold text-charcoal-700 block">
              Probability Distribution Across Generator Families:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {entries.map((item, idx) => {
                const isWinner = item.name === predicted_family;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                      isWinner
                        ? 'bg-gold-50/60 border-gold-300 font-medium'
                        : 'bg-white border-warm-border text-charcoal-600'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="truncate mr-2 text-charcoal-800 font-medium">
                        {item.name}
                      </span>
                      <span className="font-mono font-semibold text-charcoal-900 flex-shrink-0">
                        {item.prob}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-warm-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${item.prob}%` }}
                        className={`h-full rounded-full ${
                          isWinner ? 'bg-gold-500' : 'bg-charcoal-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
