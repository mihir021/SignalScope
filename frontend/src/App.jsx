import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import UploadCard from './components/UploadCard';
import LoadingState from './components/LoadingState';
import ResultBanner from './components/ResultBanner';
import WhyThisResult from './components/WhyThisResult';
import ModelAttention from './components/ModelAttention';
import ForensicMetrics from './components/ForensicMetrics';
import GeneratorAttribution from './components/GeneratorAttribution';
import MetadataCard from './components/MetadataCard';
import ExplanationSummary from './components/ExplanationSummary';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';

import { checkHealth, analyzeImage, getImageSummary } from './services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [apiStatus, setApiStatus] = useState({ online: false, version: null });
  const [currentFile, setCurrentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Check API health on mount and periodically
  const pingHealth = async () => {
    try {
      const data = await checkHealth();
      setApiStatus({ online: true, version: data.version || '1.0.0' });
    } catch {
      setApiStatus({ online: false, version: null });
    }
  };

  useEffect(() => {
    pingHealth();
    const interval = setInterval(pingHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAnalyze = async (file, caption) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCurrentFile(file);

    try {
      // Concurrently fetch detailed forensic prediction and whole-image summary
      const [responseData, summaryResponse] = await Promise.all([
        analyzeImage(file, caption),
        getImageSummary(file).catch(err => {
          console.warn('Image summary fetch failed, using fallback:', err);
          return null;
        })
      ]);

      // If /image/summary provided a response, attach its summary and data
      if (summaryResponse && summaryResponse.summary) {
        responseData.image_summary = summaryResponse.summary;
        responseData.image_summary_data = summaryResponse;
      }

      setResult(responseData);

      // Smooth scroll to results
      setTimeout(() => {
        const resEl = document.getElementById('results-section');
        if (resEl) {
          resEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(
        err.message || 'Unable to analyze this image. Check that the SignalScope API is running on localhost:8000 and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCurrentFile(null);
    handleNavigate('analyzer');
  };

  return (
    <div className="min-h-screen bg-warm-100 flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <Header apiStatus={apiStatus} onNavigate={handleNavigate} />

        <main className="pb-16">
          {/* Hero Intro */}
          <Hero onScrollToAnalyzer={() => handleNavigate('analyzer')} />

          {/* Upload & Analyzer Card */}
          <div className="mt-4">
            <UploadCard
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              error={error}
            />
          </div>

          {/* Loading Multi-Stage State */}
          {isLoading && <LoadingState />}

          {/* Error State Banner */}
          {error && !isLoading && (
            <div className="w-full max-w-2xl mx-auto px-4 sm:px-0 mt-6">
              <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 shadow-card text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-rose-950">
                    Unable to analyze this image.
                  </h4>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    {error}
                  </p>
                  <div className="mt-4 flex items-center space-x-3">
                    <button
                      onClick={() => handleAnalyze(currentFile)}
                      className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Try Again</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-1.5 rounded-full bg-white hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-semibold shadow-sm transition-colors"
                    >
                      Analyze another image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results View */}
          {result && !isLoading && (
            <div id="results-section" className="mt-12 space-y-6 animate-in fade-in duration-500">
              {/* Primary Verdict & Confidence */}
              <ResultBanner result={result} onReset={handleReset} />

              {/* Full Model Explanation — MOVED TO TOP OF RESULTS (fetched from /image/summary) */}
              <ExplanationSummary
                summary={result.image_summary || result.explanation_summary}
                imageSummaryData={result.image_summary_data}
                forensicSummary={result.explanation_summary}
                rawResponse={result}
              />

              {/* 3 Evidence Cards */}
              <WhyThisResult explanationCues={result.explanation_cues} />

              {/* Model Attention Heatmap */}
              <ModelAttention
                originalImageFile={currentFile}
                overlayBase64={result.overlay_base64}
                explanationCues={result.explanation_cues}
              />

              {/* Forensic Metrics Grid */}
              <ForensicMetrics
                explanationCues={result.explanation_cues}
                prediction={result}
              />

              {/* Generator Attribution (if returned) */}
              {result.attribution && (
                <GeneratorAttribution attribution={result.attribution} />
              )}

              {/* Image Metadata */}
              <MetadataCard
                exifMetadata={result.exif_metadata}
                filename={result.filename}
              />
            </div>
          )}

          {/* How It Works Explainer */}
          <HowItWorks />
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
