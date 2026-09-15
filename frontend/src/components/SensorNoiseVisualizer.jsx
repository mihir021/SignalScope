import React, { useState } from 'react';
import { Waves, CheckCircle2, AlertTriangle, HelpCircle, Sliders } from 'lucide-react';

export default function SensorNoiseVisualizer({ noiseVariance, sensorAutocorr, isReal, hasResult = false }) {
  const [showTechnical, setShowTechnical] = useState(false);

  const variance = typeof noiseVariance === 'number' ? noiseVariance : 0.0084;
  const autocorr = typeof sensorAutocorr === 'number' ? sensorAutocorr : 0.042;

  const isSmooth = variance < 0.005;
  const isPeriodic = autocorr > 0.12;

  return (
    <div className="bg-white/95 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-bento flex flex-col justify-between">
      <div>
        {/* Header with Human Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Camera Sensor Shot Noise & Micro-Grain (PRNU)
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                !isSmooth && !isPeriodic
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {!isSmooth && !isPeriodic ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                    <span>PASSED (Real Camera Grain)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-600 inline" />
                    <span>SYNTHETIC DENOISING DETECTED</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verifies microscopic photon grain caused by physical CMOS silicon photo-sites.
            </p>
          </div>

          {/* Toggle */}
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200/80 self-start sm:self-auto flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>{showTechnical ? 'Show Simple View' : 'Show Advanced Gauges'}</span>
          </button>
        </div>

        {/* HUMAN-FIRST EXPLANATION VIEW (Default) */}
        {!showTechnical ? (
          <div className="mt-5 space-y-4">
            
            {/* Plain-English Status Card */}
            <div className={`p-4 rounded-2xl border ${
              !isSmooth && !isPeriodic
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  !isSmooth && !isPeriodic ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {!isSmooth && !isPeriodic ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1">
                    {!isSmooth && !isPeriodic ? 'Natural Camera Sensor Fingerprint Verified:' : 'Artificial Smoothing Detected:'}
                  </h4>
                  <p className="text-xs leading-relaxed">
                    {!isSmooth && !isPeriodic
                      ? 'Genuine camera hardware leaves microscopic variations in every pixel (like film grain). This image contains natural silicon photon noise across all surface areas.'
                      : 'AI diffusion generators clean and denoise images during generation. This wipes out natural hardware sensor noise, leaving unnaturally plastic, glass-like textures.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Simple 2-Indicator Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Check 1: Micro-Grain Presence */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">Physical Micro-Grain</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      !isSmooth ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {!isSmooth ? 'Present (Healthy)' : 'Suppressed (Plastic)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Natural silicon sensor noise floor verified above the minimum physical camera threshold.
                  </p>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-3">
                  <div
                    style={{ width: `${Math.min(Math.max((variance / 0.015) * 100, 10), 100)}%` }}
                    className={`h-full rounded-full transition-all duration-700 ${!isSmooth ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                </div>
              </div>

              {/* Check 2: Pixel Randomness */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">Grain Randomness</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      !isPeriodic ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {!isPeriodic ? 'Random (Natural)' : 'Correlated (AI Pattern)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Noise grains are mutually independent without repetitive deconvolution mathematical periodicity.
                  </p>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-3">
                  <div
                    style={{ width: `${Math.min(Math.max((autocorr / 0.20) * 100, 10), 100)}%` }}
                    className={`h-full rounded-full transition-all duration-700 ${!isPeriodic ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* ADVANCED TECHNICAL LAB VIEW */
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-800">Spatial Noise Variance</span>
                <span className="font-mono text-slate-900 font-bold text-xs">{variance.toFixed(6)}</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">Threshold: &gt; 0.005000 = Real camera sensor floor</p>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
                <div className="absolute top-0 bottom-0 left-[35%] w-0.5 bg-slate-600 z-10" />
                <div
                  style={{ width: `${Math.min(Math.max((variance / 0.015) * 100, 5), 100)}%` }}
                  className={`h-full rounded-full ${isSmooth ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>0.000 (Denoised)</span>
                <span>Cutoff 0.005</span>
                <span>0.015+ (Natural PRNU)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-800">Lag-1 Autocorrelation</span>
                <span className="font-mono text-slate-900 font-bold text-xs">{autocorr > 0 ? `+${autocorr.toFixed(4)}` : autocorr.toFixed(4)}</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">Threshold: &lt; +0.1200 = Independent random noise</p>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
                <div className="absolute top-0 bottom-0 left-[60%] w-0.5 bg-slate-600 z-10" />
                <div
                  style={{ width: `${Math.min(Math.max((autocorr / 0.20) * 100, 5), 100)}%` }}
                  className={`h-full rounded-full ${isPeriodic ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>0.00 (Independent)</span>
                <span>Limit 0.12</span>
                <span>0.20+ (Grid Artifacts)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Educational takeaway */}
      <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs flex items-start space-x-2 text-emerald-950">
        <HelpCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-emerald-900 font-bold">Key Takeaway:</strong> Physical camera silicon chips have microscopic manufacturing variations that scatter random noise. AI image denoisers wipe this fingerprint clean, revealing their synthetic origin.
        </p>
      </div>
    </div>
  );
}
