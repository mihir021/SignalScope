import React, { useState } from 'react';
import { Cpu, Activity, ShieldCheck, ArrowRight, Sparkles, Layers, CheckCircle2 } from 'lucide-react';

export default function DualStreamDiagram() {
  const [selectedNode, setSelectedNode] = useState('fusion');

  const nodes = {
    input: {
      title: '1. Raw Uploaded Photo',
      subtitle: 'Original Pixel Preservation',
      badge: 'Input Stage',
      desc: 'Accepts standard uncompressed or compressed images (PNG, JPG, WEBP). Preserves microscopic pixel variances before applying standard resizing.',
      advantage: 'Standard detectors downscale images immediately, which destroys camera sensor micro-textures. SignalScope extracts physical noise before any geometric distortion.',
    },
    stream1: {
      title: '2. Brain 1: Visual Appearance AI',
      subtitle: 'CLIP Vision Transformer (ViT-B/16)',
      badge: 'Semantic Brain',
      desc: 'Examines lighting consistency, facial anatomy, natural reflections, and background depth across 12 transformer attention layers.',
      advantage: 'Pretrained on 400M real-world concept pairs, giving SignalScope high zero-shot generalization across Midjourney, DALL-E, and FLUX generators.',
    },
    stream2: {
      title: '3. Brain 2: Hardware Sensor Physics AI',
      subtitle: '2D-FFT Fourier Optics + Silicon Noise (SRM)',
      badge: 'Physics Brain',
      desc: 'Measures natural optical light decay (1/f physics law) and microscopic CMOS silicon shot noise (PRNU) to detect artificial deconvolution checkerboard grids.',
      advantage: 'Cannot be tricked by realistic visual styling or artistic filters. Mathematical physics laws of glass lenses remain invariant even on photorealistic AI images.',
    },
    fusion: {
      title: '4. Two-Brain Consensus Fusion',
      subtitle: 'Joint 640-Dimensional Forensic Space',
      badge: 'Core Engine',
      desc: 'Fuses what the image looks like (visual semantics) with how it was physically created (camera sensor physics) into a single unified forensic decision.',
      advantage: 'Prevents single-stream blind spots: an AI image might look visually perfect, but its sensor physics will instantly fail.',
    },
    gate: {
      title: '5. Smartphone Portrait Shield (Anti-FP)',
      subtitle: 'Hardware Sensor Consensus Gate',
      badge: 'False-Alarm Shield',
      desc: 'Checks for genuine silicon photon shot noise. If real camera sensor grain is present, it protects authentic iPhone/Android portrait mode photos from false AI flags.',
      advantage: 'Solves the #1 trap in AI detection: standard detectors falsely accuse authentic iPhone portrait photos of being AI. SignalScope stays truthful.',
    },
    output: {
      title: '6. Calibrated Official Verdict',
      subtitle: 'Non-Absolute Probability & Explainability',
      badge: 'Final Verdict',
      desc: 'Outputs a responsible "Likely Authentic (REAL)" or "Likely AI-Generated (SYNTHETIC)" verdict with attention heatmaps, generator attribution, and scene narrative.',
      advantage: 'Strictly complies with legal forensic standards: calibrated probabilities prevent reckless over-confidence.',
    },
  };

  const active = nodes[selectedNode];

  return (
    <div className="bg-white/95 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-bento">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Dual-Stream Architecture & Forensic Pipeline
            </h3>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Two-Brain Fusion Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any step below to see how SignalScope couples semantic vision with physical camera optics.
          </p>
        </div>
        <span className="text-[11px] text-indigo-700 font-mono self-start sm:self-auto bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 shadow-sm font-semibold">
          Vision + Physics
        </span>
      </div>

      {/* Interactive Diagram Map */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Step 1: Input & Streams */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelectedNode('input')}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              selectedNode === 'input'
                ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step 1</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-blue-700 font-mono">Original</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 mt-1">1. Raw Uploaded Photo</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Full-resolution pixel preservation</p>
          </button>

          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-center text-[10px] text-slate-500 font-mono">
            Dual-Brain Split
          </div>

          <button
            type="button"
            onClick={() => setSelectedNode('stream1')}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              selectedNode === 'stream1'
                ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-xs text-blue-700 font-semibold mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Brain 1: Visual Appearance AI</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">CLIP ViT-B/16 Transformer</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Lighting, reflections, and anatomy</p>
          </button>
        </div>

        {/* Step 2: Stream 2 & Fusion */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelectedNode('stream2')}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              selectedNode === 'stream2'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Brain 2: Camera Physics AI</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">2D-FFT & Sensor Noise PRNU</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Lens optics & physical silicon grain</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedNode('fusion')}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              selectedNode === 'fusion'
                ? 'bg-indigo-50/90 border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Two-Brain Consensus</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-700 font-mono font-bold">Fusion</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Dual-Stream Latent Space</h4>
            <p className="text-[11px] text-slate-600 mt-0.5">Combines visual cues with hardware physics</p>
          </button>
        </div>

        {/* Step 3: Gate & Output */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelectedNode('gate')}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              selectedNode === 'gate'
                ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-xs text-blue-700 font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Smartphone Filter Shield</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">Sensor Noise Lock (Anti-FP)</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Protects real phone portrait mode</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedNode('output')}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              selectedNode === 'output'
                ? 'bg-amber-50/80 border-amber-500 shadow-sm ring-1 ring-amber-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Verdict & Proof</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">Likely Authentic vs AI-Generated</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Calibrated certainty & scene narrative</p>
          </button>
        </div>
      </div>

      {/* Detail Inspector Card */}
      <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-sm">{active.title}</span>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                {active.badge}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">{active.subtitle}</span>
          </div>
        </div>

        <p className="mt-3 text-slate-700 leading-relaxed font-normal">
          {active.desc}
        </p>

        <div className="mt-3.5 pt-3 border-t border-slate-200 flex items-start space-x-2.5 text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-slate-900 font-bold">Why This Matters:</strong> {active.advantage}
          </p>
        </div>
      </div>
    </div>
  );
}
