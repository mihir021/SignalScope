import React, { useState, useMemo } from 'react';
import { Activity, CheckCircle2, AlertTriangle, HelpCircle, Eye, Sliders } from 'lucide-react';

export default function SpectralChart({ spectralRatio = 0.32, radialProfile = null, hasResult = false }) {
  const [showTechnical, setShowTechnical] = useState(false);

  const ratio = typeof spectralRatio === 'number' ? spectralRatio : 0.32;
  const isAnomalous = ratio > 0.45;

  // Path coordinates for technical view
  const measuredPath = useMemo(() => {
    if (!radialProfile || !Array.isArray(radialProfile) || radialProfile.length === 0) {
      if (ratio > 0.45) {
        return "M 40 40 Q 120 70 190 105 L 220 95 L 240 135 L 280 80 L 310 130 L 370 70 L 410 130 L 480 145";
      }
      return "M 40 35 Q 120 75 200 120 T 350 155 T 480 165";
    }

    const minVal = Math.min(...radialProfile);
    const maxVal = Math.max(...radialProfile);
    const range = (maxVal - minVal) || 1.0;

    const points = radialProfile.map((val, idx) => {
      const x = 40 + (idx / (radialProfile.length - 1)) * 440;
      const norm = (val - minVal) / range;
      const y = 165 - norm * 130;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    return points.join(' ');
  }, [radialProfile, ratio]);

  return (
    <div className="bg-white/95 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-bento flex flex-col justify-between">
      <div>
        {/* Header with Human Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Optical Light & Lens Frequency Check (2D-FFT)
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                !isAnomalous
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {!isAnomalous ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                    <span>PASSED (Natural Optics)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-600 inline" />
                    <span>AI GRID SPIKES DETECTED</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Checks if light falls off smoothly like a physical camera lens, or has hidden checkerboard grids from AI upsamplers.
            </p>
          </div>

          {/* View Toggle Button */}
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200/80 self-start sm:self-auto flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>{showTechnical ? 'Show Simple View' : 'Show Advanced Graph'}</span>
          </button>
        </div>

        {/* HUMAN-FIRST EXPLANATION VIEW (Default) */}
        {!showTechnical ? (
          <div className="mt-5 space-y-4">
            
            {/* Plain-English Status Card */}
            <div className={`p-4 rounded-2xl border ${
              !isAnomalous
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  !isAnomalous ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {!isAnomalous ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1">
                    {!isAnomalous ? 'Why this looks like a genuine photo:' : 'Why this looks like AI generation:'}
                  </h4>
                  <p className="text-xs leading-relaxed">
                    {!isAnomalous
                      ? 'Real glass camera lenses scatter light in a continuous, smooth decay across fine details. This image exhibits pure natural optical falloff with zero artificial math harmonics.'
                      : 'AI image generators assemble pixels using transposed convolution or pixel-shuffle blocks. This leaves microscopic repetitive grid patterns ("checkerboard spikes") detected at high frequencies.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Simple Visual Meter */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-800">Frequency Anomaly Ratio</span>
                <span className="font-mono text-slate-900 font-bold">
                  {hasResult ? ratio.toFixed(3) : '0.320'} (Threshold: 0.450)
                </span>
              </div>

              {/* Progress track with safe & alert zones */}
              <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden relative flex border border-slate-300/60">
                {/* Safe Zone (0.0 to 0.45) = 45% */}
                <div className="w-[45%] h-full bg-emerald-500/30 border-r border-slate-400" title="Safe: Real Camera Optics" />
                {/* Risk Zone (0.45 to 1.0) = 55% */}
                <div className="w-[55%] h-full bg-amber-500/30" title="Anomaly: AI Generator Spikes" />

                {/* Marker pointer for this image */}
                <div
                  style={{ left: `${Math.min(Math.max((ratio / 1.0) * 100, 2), 98)}%` }}
                  className="absolute top-0 bottom-0 w-2 bg-slate-900 rounded-full -ml-1 shadow-md"
                  title={`Measured Ratio: ${ratio.toFixed(3)}`}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-mono font-medium">
                <span className="text-emerald-700 font-semibold">◀ 0.0 (Natural Glass Optics)</span>
                <span className="text-slate-700 font-bold">Cutoff 0.45</span>
                <span className="text-amber-700 font-semibold">1.0 (AI Grid Spikes) ▶</span>
              </div>
            </div>

          </div>
        ) : (
          /* ADVANCED LAB VIEW (For technical deep dives) */
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Azimuthal Frequency Power Profile (1D FFT Integration)</span>
              <span className="font-mono text-slate-800">Ratio: {ratio.toFixed(4)}</span>
            </div>

            <svg viewBox="0 0 500 180" className="w-full h-40 sm:h-44 overflow-visible bg-slate-50 rounded-2xl border border-slate-200 p-2">
              <line x1="40" y1="20" x2="480" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" />
              <line x1="40" y1="65" x2="480" y2="65" stroke="#E2E8F0" strokeDasharray="3 3" />
              <line x1="40" y1="110" x2="480" y2="110" stroke="#E2E8F0" strokeDasharray="3 3" />
              <line x1="40" y1="150" x2="480" y2="150" stroke="#CBD5E1" strokeWidth="1.5" />
              <line x1="40" y1="20" x2="40" y2="150" stroke="#CBD5E1" strokeWidth="1.5" />

              {/* Threshold line */}
              <line x1="280" y1="20" x2="280" y2="150" stroke="#D97706" strokeDasharray="4 4" strokeWidth="1.5" />
              <text x="285" y="30" fill="#D97706" fontSize="9" fontFamily="sans-serif" fontWeight="700">
                0.45 Cutoff
              </text>

              {/* Curve */}
              <path
                d={measuredPath}
                fill="none"
                stroke={isAnomalous ? '#F59E0B' : '#10B981'}
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              {/* Dot */}
              <circle
                cx={40 + Math.min(Math.max(ratio, 0), 1) * 440}
                cy={150 - Math.min(Math.max(ratio, 0), 1) * 125}
                r="6"
                fill={isAnomalous ? '#E11D48' : '#10B981'}
                stroke="#FFFFFF"
                strokeWidth="2"
              />

              <text x="40" y="168" fill="#64748B" fontSize="9" fontFamily="sans-serif">0.0 (DC Center)</text>
              <text x="260" y="168" fill="#64748B" fontSize="9" fontFamily="sans-serif" textAnchor="middle">Mid-Band Optical</text>
              <text x="480" y="168" fill="#64748B" fontSize="9" fontFamily="sans-serif" textAnchor="end">1.0 (High Nyquist)</text>
            </svg>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
              <span>● Green: Natural continuous 1/f falloff</span>
              <span>▲ Amber: Periodic deconvolution spike</span>
            </div>
          </div>
        )}
      </div>

      {/* Educational takeaway */}
      <div className="mt-4 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs flex items-start space-x-2 text-blue-950">
        <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-blue-900 font-bold">Key Takeaway:</strong> Real camera lenses blur high frequencies smoothly. AI models build images from math blocks, leaving microscopic grid patterns that cameras never produce.
        </p>
      </div>
    </div>
  );
}
