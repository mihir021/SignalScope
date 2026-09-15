import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, ArrowRight, FileCheck, Sparkles, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function UploadDock({ onAnalyze, isLoading, currentFile, onReset }) {
  const [dragOver, setDragOver] = useState(false);
  const [caption, setCaption] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const fileInputRef = useRef(null);

  const previewUrl = React.useMemo(() => {
    return currentFile ? URL.createObjectURL(currentFile) : null;
  }, [currentFile]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (file) => {
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Please upload a valid image (PNG, JPG, JPEG, or WEBP).');
      return;
    }
    onAnalyze(file, caption);
  };

  const handleSampleLoad = async (samplePath, filename, defaultCaption = '') => {
    try {
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/png' });
      if (defaultCaption) {
        setCaption(defaultCaption);
      }
      onAnalyze(file, defaultCaption);
    } catch (err) {
      console.error('Failed to load sample image:', err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-warm-border p-4 sm:p-5 shadow-card transition-all mb-6">
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Left Status / File Ingestion Area */}
        <div className="flex items-center space-x-4 w-full lg:w-auto">
          {/* Thumbnail / Upload Icon */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 rounded-2xl bg-warm-100 hover:bg-gold-50 border border-warm-border hover:border-gold-300 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all overflow-hidden relative group shadow-soft"
            title="Click to select image file"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Selected preview" className="w-full h-full object-cover" />
            ) : (
              <UploadCloud className="w-6 h-6 text-charcoal-500 group-hover:text-gold-600 transition-colors" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {currentFile ? (
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    File Loaded
                  </span>
                  <span className="text-xs text-charcoal-400">
                    {formatFileSize(currentFile.size)}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-charcoal-900 truncate mt-0.5" title={currentFile.name}>
                  {currentFile.name}
                </h4>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-bold text-charcoal-900">
                  Ingest Image for Forensic Verification
                </h4>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Drag & drop, browse, or click a judge test preset below
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
          {/* Judge Preset 1: Real */}
          <button
            type="button"
            onClick={() => handleSampleLoad('/sample_authentic.png', 'sample_authentic.png')}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-all flex items-center space-x-1"
            title="1-Click test with authentic camera capture"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Preset: Authentic</span>
          </button>

          {/* Judge Preset 2: Synthetic */}
          <button
            type="button"
            onClick={() => handleSampleLoad('/sample_synthetic.png', 'sample_synthetic.png', 'A wildlife portrait in nature')}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200 transition-all flex items-center space-x-1"
            title="1-Click test with synthetic diffusion image"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Preset: AI-Gen</span>
          </button>

          {/* Caption prompt button */}
          <button
            type="button"
            onClick={() => setShowCaption(!showCaption)}
            className="px-3 py-1.5 rounded-full bg-warm-100 hover:bg-warm-200 text-charcoal-700 text-xs font-medium border border-warm-border transition-all"
          >
            {showCaption ? 'Hide Caption' : '+ Caption (Bonus E)'}
          </button>

          {/* Browse / Select File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-4 py-1.5 rounded-full bg-white hover:bg-warm-50 text-charcoal-800 text-xs font-semibold border border-warm-border shadow-soft transition-all"
          >
            Browse
          </button>

          {/* Reset / Clear Button */}
          {currentFile && (
            <button
              type="button"
              onClick={onReset}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-rose-50 text-charcoal-600 hover:text-rose-700 text-xs font-medium border border-warm-border transition-all flex items-center space-x-1"
              title="Reset analysis"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Primary Analyze Button */}
          <button
            type="button"
            onClick={() => {
              if (currentFile) {
                onAnalyze(currentFile, caption);
              } else {
                fileInputRef.current?.click();
              }
            }}
            disabled={isLoading}
            className="px-5 py-2 rounded-full bg-gold-400 hover:bg-gold-500 text-charcoal-900 text-xs font-bold shadow-soft transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-charcoal-900" />
            )}
            <span>{isLoading ? 'Analyzing...' : (currentFile ? 'Re-Analyze' : 'Analyze')}</span>
          </button>
        </div>

      </div>

      {/* Optional Caption Input Row */}
      {showCaption && (
        <div className="mt-3 pt-3 border-t border-warm-border/60 flex items-center space-x-3">
          <span className="text-xs text-charcoal-600 font-medium whitespace-nowrap">
            Multimodal Prompt (Bonus Track E):
          </span>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. A wildlife portrait in nature"
            className="flex-1 text-xs px-3.5 py-1.5 rounded-xl bg-warm-50 border border-warm-border text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>
      )}

    </div>
  );
}
