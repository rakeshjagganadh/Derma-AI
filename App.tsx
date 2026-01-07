import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import DiagnosisReport from './components/DiagnosisReport';
import ProductRecommender from './components/ProductRecommender';
import Tools from './components/Tools';
import { analyzeSkin, getRoutineRecommendation } from './services/geminiService';
import { DetailedDiagnosis, RoutineResult, AppStep, BudgetOption } from './types';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [images, setImages] = useState<{ front?: File; left?: File; right?: File }>({});
  const [diagnosis, setDiagnosis] = useState<DetailedDiagnosis | null>(null);
  const [routine, setRoutine] = useState<RoutineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'diagnosis' | 'tools'>('diagnosis');

  const handleImagesSelected = async (files: { front: File; left: File; right: File }) => {
    setImages(files);
    setStep(AppStep.ANALYZING);
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeSkin(files.front, files.left, files.right);
      setDiagnosis(result);
      setStep(AppStep.REPORT);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
      setStep(AppStep.UPLOAD);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRoutine = () => {
    setStep(AppStep.BUDGET);
  };

  const handleBudgetSelect = async (budget: BudgetOption) => {
    if (!diagnosis) return;
    setLoading(true);
    // Don't change step immediately, show loading in ProductRecommender
    try {
      const result = await getRoutineRecommendation(diagnosis, budget);
      setRoutine(result);
      setStep(AppStep.ROUTINE);
    } catch (err: any) {
      setError('Failed to generate routine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(AppStep.UPLOAD);
    setImages({});
    setDiagnosis(null);
    setRoutine(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center text-white font-bold">D</div>
            <span className="font-bold text-xl tracking-tight text-slate-800">DermaAI</span>
          </div>
          <nav className="flex gap-4">
            <button 
              onClick={() => setView('diagnosis')} 
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'diagnosis' ? 'bg-medical-50 text-medical-700' : 'text-slate-600 hover:text-medical-600'}`}
            >
              Diagnosis
            </button>
            <button 
              onClick={() => setView('tools')} 
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'tools' ? 'bg-medical-50 text-medical-700' : 'text-slate-600 hover:text-medical-600'}`}
            >
              AI Tools
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {view === 'tools' ? (
          <Tools />
        ) : (
          <>
            {step === AppStep.UPLOAD && (
              <ImageUploader onImagesSelected={handleImagesSelected} />
            )}

            {step === AppStep.ANALYZING && (
              <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-20 h-20 border-4 border-medical-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h2 className="mt-8 text-2xl font-bold text-slate-800">Analyzing Your Skin Profile</h2>
                <p className="mt-2 text-slate-500">AI Dermatologist is examining texture, tone, and concerns...</p>
              </div>
            )}

            {step === AppStep.REPORT && diagnosis && images.front && images.left && images.right && (
              <DiagnosisReport 
                diagnosis={diagnosis} 
                images={{ front: images.front, left: images.left, right: images.right }} 
                onProceed={handleGetRoutine} 
              />
            )}

            {(step === AppStep.BUDGET || step === AppStep.ROUTINE) && (
              <ProductRecommender 
                onBudgetSelect={handleBudgetSelect} 
                routine={routine} 
                loading={loading && step !== AppStep.ANALYZING}
                onReset={handleReset}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;