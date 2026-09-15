import React, { useState } from 'react';
import { Sparkles, MapPin, Eye, Layers } from 'lucide-react';

export default function ModelAttention({ originalImageFile, overlayBase64, explanationCues }) {
  const [viewMode, setViewMode] = useState('sideBySide'); // 'sideBySide', 'overlay', 'original'

  const hotspotRegion = explanationCues?.hotspot_region;
  const peakSaliency = explanationCues?.peak_saliency;
  const hotspotContent = explanationCues?.hotspot_content;
  const hotspotBbox = explanationCues?.hotspot_bbox;

  const origUrl = React.useMemo(() => {
    return originalImageFile ? URL.createObjectURL(originalImageFile) : null;
  }, [originalImageFile]);

  const overlaySrc = overlayBase64 ? `data:image/jpeg;base64,${overlayBase64}` : null;

  return (
    <div className="bg-white/95 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-bento flex flex-col justify-between">
      
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 font-sans">
                TRANSFORMER ATTENTION & SALIENCY LOCALIZATION
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                12-Layer ViT Rollout
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              LayerCAM rollout pinpointing high-saliency visual tokens where synthetic artifacts concentrate
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('sideBySide')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'sideBySide' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Side by Side
            </button>
            <button
              type="button"
              onClick={() => setViewMode('overlay')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'overlay' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Heatmap
            </button>
            <button
              type="button"
              onClick={() => setViewMode('original')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'original' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Original
            </button>
          </div>
        </div>

        {/* Display Canvas */}
        <div className="mt-6">
          {viewMode === 'sideBySide' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Original */}
              <div>
                <span className="text-xs font-bold text-slate-700 mb-2 block">
                  Original Image Capture
                </span>
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                  {origUrl ? (
                    <img src={origUrl} alt="Original upload" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">Awaiting image upload</span>
                  )}
                </div>
              </div>

              {/* Heatmap */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span className="flex items-center space-x-1 text-indigo-700">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Attention Saliency Heatmap</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Plasma Colormap</span>
                </div>
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                  {overlaySrc ? (
                    <img src={overlaySrc} alt="Attention heatmap overlay" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">Heatmap generated after analysis</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'overlay' && (
            <div className="max-w-md mx-auto">
              <span className="text-xs font-bold text-slate-700 mb-2 block text-center">
                Attention Heatmap Overlay
              </span>
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                {overlaySrc ? (
                  <img src={overlaySrc} alt="Attention heatmap overlay" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Heatmap generated after analysis</span>
                )}
              </div>
            </div>
          )}

          {viewMode === 'original' && (
            <div className="max-w-md mx-auto">
              <span className="text-xs font-bold text-slate-700 mb-2 block text-center">
                Original Image Capture
              </span>
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                {origUrl ? (
                  <img src={origUrl} alt="Original upload" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Awaiting image upload</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Hotspot Badges */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {hotspotRegion && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-semibold shadow-sm">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <span>Hotspot: {hotspotRegion}</span>
            </span>
          )}
          {hotspotContent && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-semibold shadow-sm">
              <span>Artifact Content: {hotspotContent}</span>
            </span>
          )}
          {hotspotBbox && (
            <span className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px]">
              bbox: [{hotspotBbox.x1}, {hotspotBbox.y1}, {hotspotBbox.x2}, {hotspotBbox.y2}]
            </span>
          )}
        </div>

        <div className="text-slate-500 text-xs">
          Peak Saliency: <strong className="text-indigo-700 font-mono font-bold">{peakSaliency !== undefined ? peakSaliency : '—'}</strong>
        </div>
      </div>

    </div>
  );
}
