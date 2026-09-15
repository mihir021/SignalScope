import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, ShieldCheck, Camera, Activity, Cpu } from 'lucide-react';

export default function IntelligentAlertsCard({ result }) {
  const hasResult = Boolean(result);
  const cues = result?.explanation_cues || {};
  const isReal = result?.label?.toLowerCase() === 'real';
  const confidence = result?.confidence || 0;

  // Build intelligent alerts based on real forensic cues
  const alerts = [];

  if (hasResult) {
    if (confidence < 0.80) {
      alerts.push({
        type: 'warning',
        text: 'Moderate / borderline confidence score. Manual human review recommended for subtle post-processing filters.',
      });
    }

    if (cues.spectral_ratio > 0.45) {
      alerts.push({
        type: 'warning',
        text: `Periodic high-frequency 2D-FFT energy spike detected (${cues.spectral_ratio} ratio), indicative of generative deconvolution grid artifacts.`,
      });
    }

    if (cues.noise_variance < 0.005 && !isReal) {
      alerts.push({
        type: 'warning',
        text: `Severe suppression of CMOS PRNU photon noise (variance: ${cues.noise_variance}), typical of latent diffusion denoising.`,
      });
    }
  }

  const alertCount = alerts.length;

  return (
    <div className="bg-white rounded-3xl border border-warm-border p-6 sm:p-8 shadow-card flex flex-col justify-between transition-all">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-warm-border/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold-100 border border-gold-200 text-gold-700 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-gold-600 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-bold text-charcoal-900 tracking-tight">
              Intelligent Alerts
            </h3>
          </div>

          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
            alertCount > 0 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-gold-100 text-gold-800 border-gold-200'
          }`}>
            {alertCount} Now
          </span>
        </div>

        {/* Alerts Content */}
        <div className="mt-5 space-y-3">
          {alertCount === 0 ? (
            <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-medium">
                {hasResult
                  ? 'All multi-domain forensic checks normal. No anomalies flagged.'
                  : 'All systems normal. Ready for image ingestion.'}
              </span>
            </div>
          ) : (
            alerts.map((alt, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-normal">{alt.text}</span>
              </div>
            ))
          )}

          {/* Forensic System Checklist */}
          <div className="pt-2 space-y-2 text-xs text-charcoal-600">
            <div className="flex items-center justify-between p-2 rounded-xl bg-warm-50 border border-warm-border">
              <span className="flex items-center space-x-2">
                <Activity className="w-3.5 h-3.5 text-gold-600" />
                <span>2D-FFT Power Spectrum</span>
              </span>
              <span className="font-mono text-charcoal-900 font-semibold">
                {hasResult ? (cues.spectral_ratio || 'OK') : 'Standing by'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-warm-50 border border-warm-border">
              <span className="flex items-center space-x-2">
                <Camera className="w-3.5 h-3.5 text-gold-600" />
                <span>Hardware EXIF Profile</span>
              </span>
              <span className="text-charcoal-700 truncate max-w-[140px]">
                {hasResult ? (result?.exif_metadata?.has_exif ? result.exif_metadata.device : 'Stripped') : 'Standing by'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-warm-50 border border-warm-border">
              <span className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Grounded Faithfulness</span>
              </span>
              <span className="text-emerald-700 font-medium">
                {hasResult ? (cues.is_faithful ? 'Verified' : 'Unchecked') : 'Active'}
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
