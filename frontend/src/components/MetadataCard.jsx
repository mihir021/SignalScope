import React from 'react';
import { Camera, FileText, Info, ShieldAlert, Check } from 'lucide-react';

export default function MetadataCard({ exifMetadata, filename }) {
  const hasExif = Boolean(exifMetadata?.has_exif);
  const device = exifMetadata?.device || 'unknown / stripped';

  return (
    <div className="w-full">
      <div className="bg-white rounded-3xl border border-warm-border p-6 sm:p-8 shadow-card">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warm-border/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-warm-100 border border-warm-border text-charcoal-700 flex items-center justify-center flex-shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal-900 tracking-tight">
                Image Metadata
              </h3>
              <p className="text-xs text-charcoal-500">
                Hardware sensor headers and EXIF container verification
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              hasExif
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-warm-100 text-charcoal-600 border-warm-border'
            }`}
          >
            {hasExif ? 'EXIF Header Present' : 'No EXIF Data'}
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-2xl bg-warm-50/70 border border-warm-border text-xs">
            <span className="text-charcoal-500 block mb-1">Target Filename</span>
            <span className="font-semibold text-charcoal-900 truncate block" title={filename}>
              {filename || 'Uploaded file'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-warm-50/70 border border-warm-border text-xs">
            <span className="text-charcoal-500 block mb-1">EXIF Availability</span>
            <span className="font-semibold text-charcoal-900">
              {hasExif ? 'Available in file header' : 'Not available'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-warm-50/70 border border-warm-border text-xs">
            <span className="text-charcoal-500 block mb-1">Device / Camera Signature</span>
            <span className="font-semibold text-charcoal-900 truncate block" title={device}>
              {device}
            </span>
          </div>
        </div>

        {/* Mandatory Neutrality Advisory Callout */}
        <div className="mt-5 p-3.5 rounded-2xl bg-warm-50 border border-warm-border text-xs text-charcoal-600 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-charcoal-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-charcoal-800">Forensic Note:</strong> Missing or stripped EXIF metadata is standard behavior for messaging applications (WhatsApp, Telegram, Signal) and social media platforms. It must <strong>not</strong> be interpreted as evidence that an image is synthetically generated.
          </p>
        </div>

      </div>
    </div>
  );
}
