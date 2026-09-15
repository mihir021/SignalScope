import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroUpload from './components/HeroUpload';
import VerdictSummary from './components/VerdictSummary';
import ForensicTabs from './components/ForensicTabs';
import LoadingState from './components/LoadingState';
import Footer from './components/Footer';

import { checkHealth, analyzeImage, getImageSummary } from './services/api';
import { AlertCircle, RefreshCw, Clock, Sparkles } from 'lucide-react';

export default function App() {
  const [apiStatus, setApiStatus] = useState({ online: false, version: null });
  const [currentFile, setCurrentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);

  // Periodic API health check
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

  const handleAnalyze = async (file, caption) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCurrentFile(file);
    const start = performance.now();

    try {
      // Concurrently execute detailed classification and whole-image summary
      const [responseData, summaryResponse] = await Promise.all([
        analyzeImage(file, caption),
        getImageSummary(file).catch(err => {
          console.warn('Image summary fetch fallback:', err);
          return null;
        })
      ]);

      const duration = Math.round(performance.now() - start);
      setLatencyMs(duration);

      // Attach whole-image scene summary from /image/summary
      if (summaryResponse && summaryResponse.summary) {
        responseData.image_summary = summaryResponse.summary;
        responseData.image_summary_data = summaryResponse;
      }

      setResult(responseData);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(
        err.message || 'Unable to connect to SignalScope backend. Please ensure the server is running on localhost:8000.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCurrentFile(null);
    setLatencyMs(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between text-slate-800">
      <div>
        {/* Floating Light Header */}
        <Header
          apiStatus={apiStatus}
          onReset={handleReset}
          hasResult={Boolean(result)}
        />

        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-8">
          
          {/* STEP 1: UPLOAD & INGESTION (Shown when no result yet, or during loading) */}
          {!result && (
            <div className="animate-in fade-in duration-300">
              <HeroUpload
                onAnalyze={handleAnalyze}
                isLoading={isLoading}
                error={error}
              />
            </div>
          )}

          {/* LOADING STATE */}
          {isLoading && <LoadingState />}

          {/* ERROR ALERT */}
          {error && !isLoading && (
            <div className="w-full max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <strong className="text-rose-950 block font-bold mb-0.5 text-sm">Analysis Request Failed</strong>
                <span className="text-rose-800">{error}</span>
                <div className="mt-3 flex items-center space-x-2">
                  <button
                    onClick={() => handleAnalyze(currentFile)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors flex items-center space-x-1 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-medium transition-colors border border-slate-200 shadow-sm"
                  >
                    Select Another Image
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 & 3: RESULTS + FORENSIC DEEP-DIVE TABS */}
          {result && !isLoading && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* STEP 2: CLEAR VERDICT & PLAIN-ENGLISH BREAKDOWN */}
              <VerdictSummary
                result={result}
                onReset={handleReset}
                latencyMs={latencyMs}
              />

              {/* STEP 3: ORGANIZED FORENSIC TABS */}
              <div className="pt-2">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    Forensic Evidence & Physical Verification Explorer
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inspect visual attention saliency heatmaps, 2D-FFT optical spectra, CMOS sensor PRNU, and model provenance
                  </p>
                </div>

                <ForensicTabs
                  result={result}
                  currentFile={currentFile}
                />
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-6 pb-4 text-center border-t border-slate-200/80">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300/90 text-slate-800 font-bold text-xs transition-all shadow-sm flex items-center space-x-2 mx-auto hover:border-slate-400"
                >
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  <span>Analyze Another Image or Try Different Sample</span>
                </button>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Light Refined Footer */}
      <Footer />
    </div>
  );
}
