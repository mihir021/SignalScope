import React, { useState } from 'react';
import { MoreHorizontal, Sparkles, MapPin, Eye, Layers } from 'lucide-react';

export default function ModelAttention({ originalImageFile, overlayBase64, explanationCues, onMenuClick }) {
  const [viewMode, setViewMode] = useState('sideBySide'); // 'sideBySide', 'overlay', 'original'

  const hotspotRegion = explanationCues?.hotspot_region;
  const peakSaliency = explanationCues?.peak_saliency;
  const hotspotContent = explanationCues?.hotspot_content;
  const hotspotBbox = explanationCues?.hotspot_bbox;

  // Create preview URL for original image file
  const origUrl = React.useMemo(() => {
    return originalImageFile ? URL.createObjectURL(originalImageFile) : null;
  }, [originalImageFile]);

  const overlaySrc = overlayBase64 ? `data:image/jpeg;base64,${overlayBase64}` : null;

  return (
    <div className="bg-white rounded-3xl border border-warm-border p-6 sm:p-8 shadow-card flex flex-col justify-between transition-all">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-warm-border/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 font-sans">
                MODEL ATTENTION & SALIENCY LOCALIZATION
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gold-100 text-gold-800 border border-gold-200">
                12-Layer ViT Rollout
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Visual token patch attention mapping where neural weights detected synthetic disruption
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Switcher */}
            <div className="flex items-center space-x-1 bg-warm-100 p-1 rounded-full border border-warm-border/60">
              <button
                type="button"
                onClick={() => setViewMode('sideBySide')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  viewMode === 'sideBySide'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Side by Side
              </button>
              <button
                type="button"
                onClick={() => setViewMode('overlay')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  viewMode === 'overlay'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Heatmap
              </button>
              <button
                type="button"
                onClick={() => setViewMode('original')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  viewMode === 'original'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Original
              </button>
            </div>

            <button 
              type="button" 
              onClick={onMenuClick}
              className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded-lg hover:bg-warm-100 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Display Area */}
        <div className="mt-6">
          {viewMode === 'sideBySide' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Left: Original Image */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-charcoal-700 mb-2">
                  Original Capture
                </span>
                <div className="relative aspect-video sm:aspect-square rounded-2xl overflow-hidden bg-warm-100 border border-warm-border flex items-center justify-center shadow-soft">
                  {origUrl ? (
                    <img
                      src={origUrl}
                      alt="Original upload"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-charcoal-400">Awaiting image upload</span>
                  )}
                </div>
              </div>

              {/* Right: Heatmap Overlay */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-charcoal-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                    <span>Attention Heatmap</span>
                  </span>
                  <span className="text-[11px] font-normal text-charcoal-400">
                    Plasma Colormap
                  </span>
                </span>
                <div className="relative aspect-video sm:aspect-square rounded-2xl overflow-hidden bg-warm-100 border border-warm-border flex items-center justify-center shadow-soft">
                  {overlaySrc ? (
                    <img
                      src={overlaySrc}
                      alt="Model attention heatmap overlay"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-charcoal-400">Heatmap generated after analysis</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'overlay' && (
            <div className="max-w-md mx-auto">
              <span className="text-xs font-semibold text-charcoal-700 mb-2 block text-center">
                Attention Heatmap Overlay
              </span>
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-warm-100 border border-warm-border flex items-center justify-center shadow-soft">
                {overlaySrc ? (
                  <img
                    src={overlaySrc}
                    alt="Model attention heatmap overlay"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-charcoal-400">Heatmap generated after analysis</span>
                )}
              </div>
            </div>
          )}

          {viewMode === 'original' && (
            <div className="max-w-md mx-auto">
              <span className="text-xs font-semibold text-charcoal-700 mb-2 block text-center">
                Original Capture
              </span>
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-warm-100 border border-warm-border flex items-center justify-center shadow-soft">
                {origUrl ? (
                  <img
                    src={origUrl}
                    alt="Original upload"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-charcoal-400">Awaiting image upload</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Footer Bar */}
      <div className="mt-6 pt-4 border-t border-warm-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {hotspotRegion && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-warm-100 border border-warm-border text-charcoal-700 font-medium">
              <MapPin className="w-3 h-3 mr-1 text-gold-600" />
              <span>Hotspot: <strong className="text-charcoal-900">{hotspotRegion}</strong></span>
            </span>
          )}
          {hotspotContent && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-warm-100 border border-warm-border text-charcoal-700 font-medium">
              <span>Content: <strong className="text-charcoal-900">{hotspotContent}</strong></span>
            </span>
          )}
          {hotspotBbox && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-warm-100 border border-warm-border text-charcoal-500 font-mono text-[11px]">
              bbox: [{hotspotBbox.x1}, {hotspotBbox.y1}, {hotspotBbox.x2}, {hotspotBbox.y2}]
            </span>
          )}
        </div>

        <div className="text-charcoal-600">
          Peak Saliency: <strong className="text-charcoal-900 font-mono">{peakSaliency !== undefined ? peakSaliency : '—'}</strong>
        </div>
      </div>

    </div>
  );
}
