import React, { useState } from 'react';
import SidebarRail from './SidebarRail';
import UploadDock from './UploadDock';
import FunnelCard from './FunnelCard';
import OverviewCard from './OverviewCard';
import ModelAttention from './ModelAttention';
import IntelligentAlertsCard from './IntelligentAlertsCard';
import WhyThisResult from './WhyThisResult';
import ForensicMetrics from './ForensicMetrics';
import GeneratorAttribution from './GeneratorAttribution';
import MetadataCard from './MetadataCard';
import ExplanationSummary from './ExplanationSummary';
import LoadingState from './LoadingState';
import { Calendar, ChevronDown } from 'lucide-react';

export default function DashboardView({
  result,
  isLoading,
  error,
  currentFile,
  onAnalyze,
  onReset,
}) {
  const [activeSidebarTab, setActiveSidebarTab] = useState('overview');

  const scrollToSection = (id) => {
    setActiveSidebarTab(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full px-4 sm:px-8 xl:px-12 py-3 flex gap-5 sm:gap-6">
      
      {/* Left Icon Rail (matching reference image) */}
      <SidebarRail
        activeTab={activeSidebarTab}
        onSelectTab={scrollToSection}
      />

      {/* Main Dashboard Canvas (Full Width Grid) */}
      <div className="flex-1 min-w-0 space-y-6">
        
        {/* Dashboard Title & Top Bar (Exact replica of "Dashboard Overview" row in reference image) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal-900 font-sans">
              Dashboard Overview
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 mt-0.5">
              Overview of multi-stream AI forensics, visual attention rollout, and CMOS sensor health
            </p>
          </div>

          {/* Date & Filter Pills (matching reference image top right) */}
          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white border border-warm-border text-xs font-medium text-charcoal-700 shadow-soft">
              <Calendar className="w-3.5 h-3.5 text-gold-600" />
              <span>Today, 15 Sep 2026</span>
            </div>
            <div className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white border border-warm-border text-xs font-medium text-charcoal-600 shadow-soft">
              <span>Mode: Dual-Stream</span>
              <ChevronDown className="w-3 h-3 text-charcoal-400" />
            </div>
          </div>
        </div>

        {/* Horizontal Upload & Ingestion Control Dock */}
        <div id="overview">
          <UploadDock
            onAnalyze={onAnalyze}
            isLoading={isLoading}
            currentFile={currentFile}
            onReset={onReset}
          />
        </div>

        {/* Loading State Banner */}
        {isLoading && <LoadingState />}

        {/* Error Notification Banner */}
        {error && !isLoading && (
          <div className="p-4 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-3 shadow-card">
            <span className="font-bold text-rose-950 flex-shrink-0">Analysis Error:</span>
            <span>{error}</span>
          </div>
        )}

        {/* TOP ROW: Funnel Card (65% width) + Overview Radial Gauge (35% width) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Conversion / Forensic Funnel (8 cols) */}
          <div className="lg:col-span-8 flex flex-col">
            <FunnelCard
              result={result}
              onMenuClick={() => scrollToSection('attention')}
            />
          </div>

          {/* Radial Confidence Gauge Card (4 cols) */}
          <div className="lg:col-span-4 flex flex-col">
            <OverviewCard
              result={result}
              onMenuClick={() => scrollToSection('metrics')}
            />
          </div>
        </div>

        {/* MIDDLE ROW: Visual Attention & Saliency (8 cols) + Intelligent Alerts (4 cols) */}
        <div id="attention" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Model Attention Heatmap Card (8 cols) */}
          <div className="lg:col-span-8 flex flex-col">
            <ModelAttention
              originalImageFile={currentFile}
              overlayBase64={result?.overlay_base64}
              explanationCues={result?.explanation_cues}
              onMenuClick={() => scrollToSection('explanation')}
            />
          </div>

          {/* Intelligent Alerts Card (4 cols) */}
          <div id="alerts" className="lg:col-span-4 flex flex-col">
            <IntelligentAlertsCard
              result={result}
            />
          </div>
        </div>

        {/* EVIDENCE ROW: Why this result? 3 Cards Across Full Width */}
        <div className="w-full">
          <WhyThisResult explanationCues={result?.explanation_cues} />
        </div>

        {/* METRICS ROW: Forensic Metrics Grid */}
        <div id="metrics" className="w-full">
          <ForensicMetrics
            explanationCues={result?.explanation_cues}
            prediction={result}
          />
        </div>

        {/* GENERATOR ATTRIBUTION (if present) */}
        {result?.attribution && (
          <div className="w-full">
            <GeneratorAttribution attribution={result.attribution} />
          </div>
        )}

        {/* IMAGE METADATA */}
        <div className="w-full">
          <MetadataCard
            exifMetadata={result?.exif_metadata}
            filename={result?.filename || currentFile?.name}
          />
        </div>

        {/* FULL EXPLANATION & RAW JSON INSPECTOR */}
        <div id="explanation" className="w-full">
          <ExplanationSummary
            summary={result?.explanation_summary}
            rawResponse={result}
          />
        </div>

      </div>

    </div>
  );
}
