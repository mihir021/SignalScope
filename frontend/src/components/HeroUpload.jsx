import React, { useState, useRef } from 'react';
import { UploadCloud, FileCheck, X, Sparkles, ArrowRight, Shield } from 'lucide-react';

export default function HeroUpload({ onAnalyze, isLoading, error }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFile = (file) => {
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, or WEBP).');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemove = (e) => {
    e?.stopPropagation();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!selectedFile || isLoading) return;
    onAnalyze(selectedFile, caption);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      
      {/* Hero Header */}
      <div className="text-center pt-2 pb-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Dual-Stream Physical & Semantic Forensic Intelligence</span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Detect AI-Generated Media.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
            Verify Physical Sensor Proof.
          </span>
        </h1>
        
        <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          Coupling semantic vision transformers with 2D Fourier optics and CMOS sensor shot noise to verify authentic media with high precision.
        </p>
      </div>

      {/* Bento Upload Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-bento">
        
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {!selectedFile ? (
          <div>
            {/* Dropzone with reactive state */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all ${
                dragOver
                  ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/70'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <UploadCloud className="w-8 h-8 stroke-[2.2]" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Drag and drop your image here
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                or <span className="text-blue-600 font-semibold underline underline-offset-2">browse files</span> from your local drive
              </p>

              <div className="mt-5 flex items-center justify-center space-x-2 text-xs text-slate-400 font-mono">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">PNG</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">JPG</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">WEBP</span>
                <span>• Max 20 MB</span>
              </div>
            </div>
          </div>
        ) : (
          /* File Preview & Ready State */
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-sm">
              <div className="relative w-28 h-28 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm flex-shrink-0">
                <img
                  src={previewUrl}
                  alt={selectedFile.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs text-emerald-700 font-semibold mb-1">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Image Loaded & Preprocessed</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type.split('/')[1]?.toUpperCase() || 'IMAGE'}
                </p>
              </div>

              <button
                onClick={handleRemove}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 transition-colors flex items-center space-x-1 shadow-sm"
              >
                <X className="w-4 h-4" />
                <span>Remove</span>
              </button>
            </div>

            {/* Optional Multimodal Prompt Input */}
            <div className="border-t border-slate-200/80 pt-3">
              {!showCaption ? (
                <button
                  type="button"
                  onClick={() => setShowCaption(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
                >
                  <span>+ Add optional caption or prompt text for cross-modal verification</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Caption / Prompt Text:
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowCaption(false); setCaption(''); }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. A wildlife portrait of two elephants in the savanna"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Action Trigger Button */}
            <div className="pt-2">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 group"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Run Forensic Analysis</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
