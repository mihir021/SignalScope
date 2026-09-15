import React, { useState } from 'react';
import ModelAttention from './ModelAttention';
import SpectralChart from './SpectralChart';
import SensorNoiseVisualizer from './SensorNoiseVisualizer';
import GeneratorAttribution from './GeneratorAttribution';
import MetadataCard from './MetadataCard';
import DualStreamDiagram from './DualStreamDiagram';
import RobustnessCard from './RobustnessCard';
import ForensicMetrics from './ForensicMetrics';
import { Layers, Activity, Cpu, Sliders } from 'lucide-react';

export default function ForensicTabs({ result, currentFile }) {
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' | 'physics' | 'attribution' | 'architecture'

  const cues = result?.explanation_cues || {};

  const tabs = [
    { id: 'visual', label: 'Visual Saliency', icon: Layers, badge: 'LayerCAM ViT' },
    { id: 'physics', label: 'Sensor & Frequency Physics', icon: Activity, badge: '2D-FFT + SRM' },
    { id: 'attribution', label: 'Model Provenance & EXIF', icon: Cpu, badge: 'Source Classifier' },
    { id: 'architecture', label: 'Fusion & Stress Robustness', icon: Sliders, badge: 'Degradation Test' },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* Light Bento Tab Bar */}
      <div className="flex items-center space-x-2 p-1.5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-sm overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-300' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="animate-in fade-in duration-300">
        {/* TAB 1: VISUAL ATTENTION (HEATMAP) */}
        {activeTab === 'visual' && (
          <div className="space-y-6">
            <ModelAttention
              originalImageFile={currentFile}
              overlayBase64={result?.overlay_base64}
              explanationCues={cues}
            />
            <ForensicMetrics
              explanationCues={cues}
              prediction={result}
            />
          </div>
        )}

        {/* TAB 2: DUAL-STREAM PHYSICS */}
        {activeTab === 'physics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpectralChart
                spectralRatio={cues.spectral_ratio}
                radialProfile={result?.radial_profile}
                hasResult={Boolean(result)}
              />
              <SensorNoiseVisualizer
                noiseVariance={cues.noise_variance}
                sensorAutocorr={result?.sensor_autocorr}
                isReal={result?.label?.toLowerCase() === 'real'}
                hasResult={Boolean(result)}
              />
            </div>
            <ForensicMetrics
              explanationCues={cues}
              prediction={result}
            />
          </div>
        )}

        {/* TAB 3: ATTRIBUTION & EXIF PROVENANCE */}
        {activeTab === 'attribution' && (
          <div className="space-y-6">
            {result?.attribution && (
              <GeneratorAttribution attribution={result.attribution} />
            )}
            <MetadataCard
              exifMetadata={result?.exif_metadata}
              hasResult={Boolean(result)}
            />
          </div>
        )}

        {/* TAB 4: ARCHITECTURE & STRESS BENCHMARKS */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <DualStreamDiagram />
            <RobustnessCard />
          </div>
        )}
      </div>

    </div>
  );
}
