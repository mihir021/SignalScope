import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, ArrowRight, FileCheck, HelpCircle } from 'lucide-react';

export default function UploadCard({ onAnalyze, isLoading, error }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const fileInputRef = useRef(null);

  // Format file size nicely (e.g., 245 KB, 1.2 MB)
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFile = (file) => {
    if (!file) return;

    // Check mime type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, or WEBP).');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
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
    <div id="analyzer" className="w-full max-w-2xl mx-auto px-4 sm:px-0">
      <div className="bg-white rounded-3xl border border-warm-border p-6 sm:p-8 shadow-card transition-all">
        
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
          /* Dropzone / Upload state */
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
              dragOver
                ? 'border-gold-500 bg-gold-50/50'
                : 'border-warm-border hover:border-gold-400 hover:bg-warm-50/60'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-gold-100 border border-gold-200 text-gold-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <UploadCloud className="w-7 h-7 stroke-[2]" />
            </div>

            <h3 className="text-base font-semibold text-charcoal-900">
              Drag and drop your image here
            </h3>
            <p className="text-sm text-charcoal-500 mt-1">
              or <span className="text-gold-700 font-medium underline underline-offset-2">browse files</span> from your computer
            </p>

            <div className="mt-5 flex items-center justify-center space-x-2 text-xs text-charcoal-400">
              <span className="px-2 py-0.5 rounded bg-warm-100 border border-warm-border">PNG</span>
              <span className="px-2 py-0.5 rounded bg-warm-100 border border-warm-border">JPG</span>
              <span className="px-2 py-0.5 rounded bg-warm-100 border border-warm-border">JPEG</span>
              <span className="px-2 py-0.5 rounded bg-warm-100 border border-warm-border">WEBP</span>
              <span>• Up to 20 MB</span>
            </div>
          </div>
        ) : (
          /* File Preview & Ready State */
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-warm-50 border border-warm-border">
              {/* Thumbnail */}
              <div className="relative w-28 h-28 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-warm-200 border border-warm-border flex-shrink-0 shadow-sm">
                <img
                  src={previewUrl}
                  alt={selectedFile.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs text-emerald-700 font-medium mb-1">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Ready for analysis</span>
                </div>
                <h4 className="text-sm font-semibold text-charcoal-900 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </h4>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type.split('/')[1]?.toUpperCase() || 'IMAGE'}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={handleRemove}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-charcoal-600 hover:text-charcoal-900 hover:bg-white border border-warm-border transition-colors flex items-center space-x-1 shadow-sm disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>

            {/* Optional Caption Toggle for multimodal analysis */}
            <div className="border-t border-warm-border/60 pt-4">
              {!showCaptionInput ? (
                <button
                  type="button"
                  onClick={() => setShowCaptionInput(true)}
                  className="text-xs text-charcoal-500 hover:text-charcoal-800 flex items-center space-x-1 font-medium"
                >
                  <span>+ Add optional caption or prompt text</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-charcoal-700 flex items-center space-x-1">
                      <span>Image caption or prompt</span>
                      <span className="text-charcoal-400 font-normal">(optional multimodal check)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCaptionInput(false);
                        setCaption('');
                      }}
                      className="text-xs text-charcoal-400 hover:text-charcoal-700"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. A photo of a dog in the park"
                    className="w-full text-xs px-3.5 py-2 rounded-xl bg-warm-50 border border-warm-border text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:bg-white transition-all"
                  />
                </div>
              )}
            </div>

            {/* Error banner if previous attempt failed */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                <span className="font-semibold flex-shrink-0">Notice:</span>
                <span>{error}</span>
              </div>
            )}

            {/* Action Trigger Button */}
            <div className="pt-2">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gold-400 hover:bg-gold-500 text-charcoal-900 font-semibold text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span>Analyze Image</span>
                <ArrowRight className="w-4 h-4 stroke-[2.2] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
