import React from 'react';
import { Camera, Info, ShieldCheck, Check } from 'lucide-react';

export default function MetadataCard({ exifMetadata, filename }) {
  const hasExif = Boolean(exifMetadata?.has_exif);
  const device = exifMetadata?.device || 'unknown / stripped';

  return (
    <div className="w-full">
      <div className="bg-white/95 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-bento">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Camera EXIF & Hardware Provenance
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Header Integrity Verification
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hardware sensor headers, camera signature, and image container verification
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border shadow-sm ${
              hasExif
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {hasExif ? 'EXIF Header Present' : 'No EXIF Data'}
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs shadow-sm">
            <span className="text-slate-500 block mb-1">Target Filename</span>
            <span className="font-bold text-slate-900 truncate block" title={filename}>
              {filename || 'Uploaded file'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs shadow-sm">
            <span className="text-slate-500 block mb-1">EXIF Availability</span>
            <span className="font-bold text-slate-900">
              {hasExif ? 'Available in file header' : 'Not available in container'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs shadow-sm">
            <span className="text-slate-500 block mb-1">Device / Camera Signature</span>
            <span className="font-bold text-indigo-700 truncate block" title={device}>
              {device}
            </span>
          </div>
        </div>

        {/* Forensic Neutrality Advisory Callout */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start space-x-3 shadow-sm">
          <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-800">Forensic Integrity Standard:</strong> Stripped EXIF metadata is standard behavior for messaging apps (WhatsApp, Telegram) and social web uploads. SignalScope does <strong>not</strong> treat missing EXIF as proof of synthetic media, maintaining strict non-accusatory forensic fairness.
          </p>
        </div>

      </div>
    </div>
  );
}
