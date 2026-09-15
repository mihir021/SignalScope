import React from 'react';
import { ShieldCheck, LogOut, Sparkles, UserCheck } from 'lucide-react';

export default function Header({ apiStatus, activeNav, onNavChange }) {
  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analyzer', label: 'Image Analyzer' },
    { id: 'streams', label: 'Forensic Streams' },
    { id: 'provenance', label: 'Provenance' },
    { id: 'about', label: 'About SIH' },
  ];

  return (
    <header className="w-full px-4 sm:px-8 xl:px-12 pt-4 pb-3">
      <div className="w-full flex items-center justify-between gap-4">
        
        {/* Brand Logo & Name (matching reference image) */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center shadow-soft border border-gold-300/60">
            <ShieldCheck className="w-5 h-5 text-charcoal-900 stroke-[2.2]" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-lg font-bold tracking-tight text-charcoal-900">
              SignalScope
            </span>
            <span className="text-xs font-normal text-charcoal-400 hidden sm:inline">
              Forensics
            </span>
          </div>
        </div>

        {/* Center Navigation Pills (exact ObsidianAi pill style) */}
        <nav className="hidden lg:flex items-center space-x-1 bg-white border border-warm-border px-1.5 py-1 rounded-full shadow-soft">
          {navLinks.map((link) => {
            const isActive = activeNav === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavChange(link.id)}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                  isActive
                    ? 'bg-gold-400 text-charcoal-900 shadow-sm font-semibold'
                    : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-50'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Info: User Badge & Live API Status Indicator */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          
          {/* Live API Health Status */}
          <div 
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-white shadow-soft transition-colors"
            style={{
              borderColor: apiStatus.online ? '#BBF7D0' : '#FECACA',
              color: apiStatus.online ? '#15803D' : '#B91C1C'
            }}
            title={apiStatus.online ? `Connected to SignalScope API ${apiStatus.version || ''}` : 'API unreachable on localhost:8000'}
          >
            <span className="relative flex h-2 w-2">
              {apiStatus.online && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${apiStatus.online ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className="hidden sm:inline">
              {apiStatus.online ? `API Online ${apiStatus.version ? `v${apiStatus.version}` : ''}` : 'API Offline'}
            </span>
          </div>

          {/* Profile / Analyst Pill (matching reference image top-right user pill) */}
          <div className="hidden sm:flex items-center space-x-2.5 bg-white border border-warm-border pl-1.5 pr-3 py-1 rounded-full shadow-soft">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              SS
            </div>
            <div className="text-left text-[11px] leading-tight pr-1">
              <span className="font-semibold text-charcoal-900 block">Forensic Lab</span>
              <span className="text-charcoal-400 block text-[10px]">SIH-2026</span>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
