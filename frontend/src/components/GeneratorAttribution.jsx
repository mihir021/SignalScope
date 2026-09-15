import React from 'react';
import { Cpu, Check } from 'lucide-react';

export default function GeneratorAttribution({ attribution }) {
  if (!attribution || !attribution.predicted_family) return null;

  const { predicted_family, confidence, family_probabilities, num_families } = attribution;
  const confPct = Math.round((confidence || 0) * 1000) / 10;

  const entries = Object.entries(family_probabilities || {})
    .map(([name, prob]) => ({
      name,
      prob: Math.round(prob * 1000) / 10,
    }))
    .sort((a, b) => b.prob - a.prob);

  return (
    <div className="w-full">
      <div className="bg-white/95 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-bento">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Cpu className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Generative Architecture Attribution Head
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {num_families || entries.length}-Class Discriminator
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Auxiliary linear projection head on 640-d fused embeddings identifying generative source model family
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-500 block">Attribution Confidence</span>
            <span className="text-xl font-bold text-indigo-700 font-mono">
              {confPct}%
            </span>
          </div>
        </div>

        {/* Primary Predicted Class Card */}
        <div className="mt-5 p-4 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] text-blue-800 font-semibold block">Predicted Architecture Family:</span>
              <span className="text-base font-extrabold text-slate-900">
                {predicted_family}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300">
            Top Match
          </span>
        </div>

        {/* Distribution Grid */}
        {entries.length > 0 && (
          <div className="mt-5 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Probability Distribution Across Generator Architectures:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {entries.map((item, idx) => {
                const isWinner = item.name === predicted_family;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                      isWinner
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-sm'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`truncate mr-2 font-medium ${isWinner ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                        {item.name}
                      </span>
                      <span className={`font-mono font-bold ${isWinner ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {item.prob}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${item.prob}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isWinner ? 'bg-indigo-600' : 'bg-slate-400'
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
