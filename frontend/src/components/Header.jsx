import React from 'react';
import { ShieldCheck, RefreshCw, Activity } from 'lucide-react';

export default function Header({ apiStatus, onReset, hasResult }) {
  return (
    <header className="sticky top-4 z-50 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-2 pb-1">
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-pill-nav rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        
        {/* Brand Logo & Title */}
        <div 
          onClick={onReset}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-4 h-4 text-white stroke-[2.4]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-base font-bold tracking-tight text-slate-900 font-sans">
              SignalScope
            </span>
            <span className="text-[10px] font-semibold text-indigo-700 font-mono px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 hidden sm:inline">
              Media Forensics
            </span>
          </div>
        </div>

        {/* Right Info: Live System Status Pill & Reset */}
        <div className="flex items-center space-x-2.5">
          
          {/* Live System Connectivity Pill */}
          <div 
            className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border bg-white/95 shadow-sm transition-colors"
            style={{
              borderColor: apiStatus?.online ? '#A7F3D0' : '#FECDD3',
              color: apiStatus?.online ? '#065F46' : '#9F1239'
            }}
            title={apiStatus?.online ? `Inference engine connected (v${apiStatus.version || '1.0'})` : 'Engine offline on localhost:8000'}
          >
            <span className="relative flex h-2 w-2">
              {apiStatus?.online && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${apiStatus?.online ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className="font-semibold text-[11px]">
              {apiStatus?.online ? 'Engine Active' : 'Engine Offline'}
            </span>
          </div>

          {/* Reset / New Image Button */}
          {hasResult && (
            <button
              onClick={onReset}
              className="px-3.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm"
              title="Clear analysis and inspect new image"
            >
              <RefreshCw className="w-3 h-3" />
              <span>New Image</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
