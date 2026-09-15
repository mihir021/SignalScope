import React, { useState } from 'react';
import { FileText, Code2, Copy, Check, ChevronDown, ChevronUp, Tag, Globe, Sparkles } from 'lucide-react';

export default function ExplanationSummary({ summary, imageSummaryData, forensicSummary, rawResponse }) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('wholeImage'); // 'wholeImage' | 'forensic'

  const handleCopy = () => {
    if (!rawResponse) return;
    navigator.clipboard.writeText(JSON.stringify(rawResponse, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine what text to show based on activeTab
  const displayText = activeTab === 'wholeImage'
    ? (summary || forensicSummary || 'No image summary available.')
    : (forensicSummary || summary || 'No forensic explanation available.');

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-0 mt-8">
      <div className="bg-white rounded-3xl border border-warm-border p-6 sm:p-8 shadow-card">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-warm-border/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold-100 border border-gold-200 text-gold-700 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-charcoal-900 tracking-tight">
                  Full Model Explanation
                </h3>
                {imageSummaryData && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gold-100 text-gold-800 border border-gold-200">
                    Whole-Image Grounded
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-500">
                Complete multi-domain semantic description synthesized across the entire image
              </p>
            </div>
          </div>

          {/* Optional Tab Switcher if forensicSummary is also present */}
          {forensicSummary && imageSummaryData && (
            <div className="flex items-center space-x-1 bg-warm-100 p-1 rounded-full border border-warm-border/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('wholeImage')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  activeTab === 'wholeImage'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Scene Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('forensic')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  activeTab === 'forensic'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Forensic Cues
              </button>
            </div>
          )}
        </div>

        {/* Narrative Paragraph */}
        <div className="mt-5 p-5 rounded-2xl bg-warm-50/70 border border-warm-border text-charcoal-800 text-sm leading-relaxed relative">
          <p className="font-normal whitespace-pre-wrap">
            {displayText}
          </p>
        </div>

        {/* Concept Badges if whole-image summary data is available */}
        {imageSummaryData && activeTab === 'wholeImage' && (
          <div className="mt-4 pt-3 border-t border-warm-border/60 flex flex-wrap items-center gap-2 text-xs">
            {imageSummaryData.primary_subject && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-warm-100 border border-warm-border text-charcoal-800 font-medium">
                <Tag className="w-3 h-3 mr-1.5 text-gold-600" />
                Subject: <strong>&nbsp;{imageSummaryData.primary_subject}</strong>
                {imageSummaryData.subject_confidence && (
                  <span className="ml-1 text-[11px] text-charcoal-500 font-mono">
                    ({Math.round(imageSummaryData.subject_confidence * 100)}%)
                  </span>
                )}
              </span>
            )}
            {imageSummaryData.scene_type && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-warm-100 border border-warm-border text-charcoal-700">
                <Globe className="w-3 h-3 mr-1.5 text-charcoal-500" />
                Scene: <strong>&nbsp;{imageSummaryData.scene_type}</strong>
              </span>
            )}
            {imageSummaryData.detected_style && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-warm-100 border border-warm-border text-charcoal-700">
                <Sparkles className="w-3 h-3 mr-1.5 text-gold-600" />
                Style: <strong>&nbsp;{imageSummaryData.detected_style}</strong>
              </span>
            )}
          </div>
        )}

        {/* Raw JSON Debugging Toggle */}
        <div className="mt-6 pt-4 border-t border-warm-border/60">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 flex items-center space-x-1.5 transition-colors"
          >
            <Code2 className="w-4 h-4 text-charcoal-400" />
            <span>{showRaw ? 'Hide Raw API Response' : 'View Raw Response (Developer Inspection)'}</span>
            {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRaw && (
            <div className="mt-3 relative rounded-2xl bg-charcoal-900 text-warm-100 p-4 font-mono text-xs overflow-x-auto shadow-inner">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-charcoal-700">
                <span className="text-[11px] text-charcoal-400 font-sans">
                  Payload returned by API
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-[11px] text-warm-200 border border-charcoal-700 flex items-center space-x-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-[11px] text-charcoal-300 overflow-x-auto max-h-96">
                {JSON.stringify(rawResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
