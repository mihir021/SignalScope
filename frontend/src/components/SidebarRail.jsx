import React from 'react';
import { 
  Scan, 
  BarChart3, 
  Layers, 
  Cpu, 
  AlertCircle, 
  FileSearch,
  Sparkles
} from 'lucide-react';

export default function SidebarRail({ activeTab, onSelectTab }) {
  const navItems = [
    { id: 'overview', icon: Scan, label: 'Overview & Analyzer' },
    { id: 'metrics', icon: BarChart3, label: 'Forensic Metrics' },
    { id: 'attention', icon: Layers, label: 'Attention Heatmap' },
    { id: 'alerts', icon: AlertCircle, label: 'Intelligent Alerts' },
    { id: 'explanation', icon: FileSearch, label: 'Full Explanation' },
  ];

  return (
    <aside className="hidden md:flex flex-col items-center space-y-3 flex-shrink-0 pt-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            title={item.label}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-soft group relative ${
              isActive
                ? 'bg-gold-400 text-charcoal-900 shadow-card border border-gold-300'
                : 'bg-white hover:bg-warm-50 text-charcoal-500 hover:text-charcoal-900 border border-warm-border'
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 stroke-[2] ${
              isActive ? 'text-charcoal-900' : 'text-charcoal-600'
            }`} />

            {/* Custom Tooltip */}
            <span className="absolute left-16 px-2.5 py-1 bg-charcoal-900 text-warm-100 text-[11px] rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {item.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
