import React, { useState } from 'react';
import SidebarRail from './SidebarRail';
import UploadDock from './UploadDock';
import FunnelCard from './FunnelCard';
import OverviewCard from './OverviewCard';
import ModelAttention from './ModelAttention';
import IntelligentAlertsCard from './IntelligentAlertsCard';
import DualStreamDiagram from './DualStreamDiagram';
import SpectralChart from './SpectralChart';
import SensorNoiseVisualizer from './SensorNoiseVisualizer';
import WhyThisResult from './WhyThisResult';
import ForensicMetrics from './ForensicMetrics';
import GeneratorAttribution from './GeneratorAttribution';
import RobustnessCard from './RobustnessCard';
import MetadataCard from './MetadataCard';
import ExplanationSummary from './ExplanationSummary';
import LoadingState from './LoadingState';
import { Calendar, ChevronDown, Sparkles } from 'lucide-react';

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

  const cues = result?.explanation_cues || {};

  return (
    <div className="w-full px-4 sm:px-8 xl:px-12 py-3 flex gap-5 sm:gap-6">
      
      {/* Left Icon Rail */}
      <SidebarRail
        activeTab={activeSidebarTab}
        onSelectTab={scrollToSection}
      />

      {/* Main Dashboard Canvas (Full Width Grid) */}
      <div className="flex-1 min-w-0 space-y-6">
        
        {/* Dashboard Title & Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal-900 font-sans">
              Forensic Lab Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 mt-0.5">
              SIH-2026 dual-stream AI forensics, visual attention rollout, and CMOS sensor health
            </p>
          </div>

          {/* Date & Mode Pills */}
          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white border border-warm-border text-xs font-medium text-charcoal-700 shadow-soft">
              <Calendar className="w-3.5 h-3.5 text-gold-600" />
              <span>SIH-2026 Evaluation Suite</span>
            </div>
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white border border-warm-border text-xs font-medium text-charcoal-700 shadow-soft">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Mode: Dual-Stream Fused</span>
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

        {/* TOP ROW: Funnel Card (8 cols) + Radial Confidence Gauge (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 flex flex-col">
            <FunnelCard
              result={result}
              onMenuClick={() => scrollToSection('attention')}
            />
          </div>

          <div className="lg:col-span-4 flex flex-col">
            <OverviewCard
              result={result}
              onMenuClick={() => scrollToSection('metrics')}
            />
          </div>
        </div>

        {/* SPOTLIGHT: Whole-Image Content & Scene Explanation (From /image/summary) */}
        <div id="explanation" className="w-full">
          <ExplanationSummary
            summary={result?.image_summary || result?.explanation_summary}
            imageSummaryData={result?.image_summary_data}
            forensicSummary={result?.explanation_summary}
            rawResponse={result}
          />
        </div>

        {/* INTERACTIVE ARCHITECTURE DIAGRAM */}
        <div id="diagram" className="w-full">
          <DualStreamDiagram />
        </div>

        {/* MIDDLE ROW: Visual Attention & Saliency (8 cols) + Intelligent Alerts (4 cols) */}
        <div id="attention" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 flex flex-col">
            <ModelAttention
              originalImageFile={currentFile}
              overlayBase64={result?.overlay_base64}
              explanationCues={result?.explanation_cues}
              onMenuClick={() => scrollToSection('explanation')}
            />
          </div>

          <div id="alerts" className="lg:col-span-4 flex flex-col">
            <IntelligentAlertsCard
              result={result}
            />
          </div>
        </div>

        {/* DUAL-PHYSICS FORENSIC CHARTS ROW: 2D-FFT Spectrum (6 cols) + CMOS Sensor Noise (6 cols) */}
        <div id="streams" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <SpectralChart
            spectralRatio={cues.spectral_ratio}
            hasResult={Boolean(result)}
          />
          <SensorNoiseVisualizer
            noiseVariance={cues.noise_variance}
            sensorAutocorr={result?.sensor_autocorr}
            isReal={result?.label?.toLowerCase() === 'real'}
            hasResult={Boolean(result)}
          />
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

        {/* ROBUSTNESS & ADVERSARIAL BENCHMARKS (Bonus Tracks C & G) */}
        <div id="robustness" className="w-full">
          <RobustnessCard />
        </div>

        {/* GENERATOR ATTRIBUTION (Bonus Track B) */}
        {result?.attribution && (
          <div className="w-full">
            <GeneratorAttribution attribution={result.attribution} />
          </div>
        )}

        {/* IMAGE METADATA & EXIF PROVENANCE (Bonus Track D) */}
        <div id="provenance" className="w-full">
          <MetadataCard
            exifMetadata={result?.exif_metadata}
            filename={result?.filename || currentFile?.name}
          />
        </div>

      </div>

    </div>
  );
}
