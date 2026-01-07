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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleImagesSelected = async (files: { front: File; left: File; right: File }) => {
    setImages(files);
    setStep(AppStep.ANALYZING);
    setLoading(true);
    setError(null);

    // If user uploads from hero, scroll to top for analysis view
    window.scrollTo({ top: 0, behavior: 'smooth' });

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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('diagnosis'); handleReset(); }}>
            <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-medical-500/20">D</div>
            <span className="font-bold text-xl tracking-tight text-slate-800">DermaAI</span>
          </div>
          
          <nav className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 mr-4">
                <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-slate-600 hover:text-medical-600 transition-colors">How it Works</button>
                <button onClick={() => scrollToSection('sample-report')} className="text-sm font-medium text-slate-600 hover:text-medical-600 transition-colors">Sample Report</button>
            </div>
            
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

            <div className="flex bg-slate-100 p-1 rounded-full">
                <button 
                  onClick={() => setView('diagnosis')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'diagnosis' ? 'bg-white text-medical-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Diagnosis
                </button>
                <button 
                  onClick={() => setView('tools')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'tools' ? 'bg-white text-medical-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  AI Tools
                </button>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {error && (
          <div className="max-w-7xl mx-auto mt-6 px-4">
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
             </div>
          </div>
        )}

        {view === 'tools' ? (
          <div className="max-w-7xl mx-auto px-4 py-8">
             <Tools />
          </div>
        ) : (
          <>
            {step === AppStep.UPLOAD ? (
              // LANDING PAGE LAYOUT
              <div className="animate-fade-in">
                
                {/* HERO SECTION */}
                <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
                    <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left Content */}
                        <div className="max-w-2xl relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-50 text-medical-600 text-xs font-bold uppercase tracking-wider mb-6 border border-medical-100">
                                <span className="w-2 h-2 rounded-full bg-medical-500 animate-pulse"></span>
                                AI-Powered Dermatology
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight">
                                Your Personal <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-medical-600 to-teal-500">AI Dermatologist.</span>
                            </h1>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
                                Get a medical-grade analysis of acne, texture, and aging markers in 3 seconds. 
                                <span className="font-semibold text-slate-900"> 100% Private.</span>
                            </p>
                            <div className="flex flex-col sm:flex-row gap-6 mb-10">
                                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                                    <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    Trained on 50k+ Clinical Images
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                                    <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    Dermatologist Approved Logic
                                </div>
                            </div>
                        </div>

                        {/* Right Action (Upload Card) */}
                        <div className="relative z-10">
                            {/* Decorative Blobs */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-medical-100 to-teal-100 rounded-full blur-3xl opacity-60 -z-10"></div>
                            <ImageUploader onImagesSelected={handleImagesSelected} compact={true} />
                        </div>
                    </div>
                </section>

                {/* FEATURES SECTION */}
                <section id="how-it-works" className="py-24 bg-white border-t border-slate-100">
                   <div className="container mx-auto px-4">
                      <div className="text-center max-w-2xl mx-auto mb-16">
                         <h2 className="text-3xl font-bold text-slate-900 mb-4">Precision Skin Analysis</h2>
                         <p className="text-lg text-slate-500">Our multi-model AI scans 4 distinct dimensions of skin health to provide a holistic diagnosis.</p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                         {[
                            { title: "Texture & Pores", desc: "Detects micro-comedones and dehydration lines.", icon: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            )},
                            { title: "Acne Mapping", desc: "Identifies inflammatory vs. fungal acne types.", icon: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            )},
                            { title: "Pigmentation", desc: "Scans for PIH, sun spots, and melasma.", icon: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            )},
                            { title: "Biological Age", desc: "Estimates skin age based on elasticity and wrinkles.", icon: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                         ].map((feature, idx) => (
                             <div key={idx} className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-medical-200 hover:shadow-lg transition-all group">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-medical-600 mb-6 group-hover:scale-110 transition-transform">
                                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      {feature.icon}
                                   </svg>
                                </div>
                                <h3 className="font-bold text-slate-900 text-xl mb-3">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                             </div>
                         ))}
                      </div>
                   </div>
                </section>

                {/* SAMPLE REPORT SECTION */}
                <section id="sample-report" className="py-24 bg-slate-50 border-t border-slate-200 overflow-hidden">
                   <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-16">
                      <div className="flex-1 order-2 lg:order-1 relative">
                         {/* Abstract background shapes */}
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-white/50 rounded-full blur-3xl -z-10"></div>
                         
                         {/* Visual Representation of Report */}
                         <div className="relative mx-auto max-w-sm" style={{ perspective: '1000px' }}>
                            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 transform rotate-y-12 rotate-x-6 hover:rotate-0 transition-transform duration-700 ease-out">
                               {/* Mock Header */}
                               <div className="flex justify-between items-center mb-6">
                                  <div>
                                     <div className="w-24 h-4 bg-slate-900 rounded mb-2"></div>
                                     <div className="w-16 h-3 bg-slate-300 rounded"></div>
                                  </div>
                                  <div className="w-10 h-10 bg-medical-500 rounded-full opacity-20"></div>
                               </div>
                               
                               {/* Mock Face */}
                               <div className="relative aspect-[3/4] bg-slate-100 rounded-2xl mb-6 overflow-hidden border border-slate-100">
                                   <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                      <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" opacity="0.3"/></svg>
                                   </div>
                                   {/* Floating Bounding Boxes */}
                                   <div className="absolute top-[30%] left-[20%] w-16 h-16 border-2 border-red-400 rounded-lg flex items-start">
                                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded ml-[-10px] mt-[-10px]">Acne</span>
                                   </div>
                                   <div className="absolute bottom-[30%] right-[25%] w-12 h-10 border-2 border-teal-400 rounded-lg flex items-end justify-end">
                                      <span className="bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-[-10px] mb-[-10px]">Pores</span>
                                   </div>
                               </div>

                               {/* Mock Stats */}
                               <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                     <div className="w-1/3 h-3 bg-slate-200 rounded"></div>
                                     <div className="w-8 h-3 bg-teal-100 rounded"></div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                     <div className="w-1/2 h-3 bg-slate-200 rounded"></div>
                                     <div className="w-8 h-3 bg-red-100 rounded"></div>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                      
                      <div className="flex-1 order-1 lg:order-2">
                         <div className="inline-block text-medical-600 font-bold tracking-wider uppercase text-sm mb-4">Under The Surface</div>
                         <h2 className="text-4xl font-bold text-slate-900 mb-6">See exactly what your skin is trying to tell you.</h2>
                         <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            Our advanced computer vision engine draws precise bounding boxes around every concern, giving you a visual map of your skin's health. 
                            Understand exactly where your issues are concentrated (left cheek vs. right jawline) to identify root causes like phone bacteria or pillowcase friction.
                         </p>
                         <button 
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                            className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 group"
                         >
                            Start Free Analysis 
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                         </button>
                      </div>
                   </div>
                </section>
                
                {/* Global Footer */}
                <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
                    <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                        {/* Column 1: Brand */}
                        <div className="flex flex-col items-center md:items-start">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">D</div>
                                <span className="font-bold text-2xl text-white">DermaAI</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">
                                AI-Powered Dermatologist © 2026. <br/>
                                Democratizing clinical skin analysis.
                            </p>
                        </div>
                        
                        {/* Column 2: Links */}
                        <div className="flex flex-col gap-3">
                           <h4 className="text-white font-bold mb-2">Legal & Privacy</h4>
                           <a href="#" className="text-sm hover:text-medical-400 transition-colors">Privacy Policy</a>
                           <a href="#" className="text-sm hover:text-medical-400 transition-colors">Terms of Service</a>
                           <a href="#" className="text-sm hover:text-medical-400 transition-colors">Medical Disclaimer</a>
                        </div>
                        
                        {/* Column 3: Disclaimer */}
                        <div>
                           <h4 className="text-white font-bold mb-2">Important Medical Disclaimer</h4>
                           <p className="text-xs text-slate-500 leading-relaxed">
                              This application is for educational and informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
                           </p>
                        </div>
                    </div>
                </footer>
              </div>
            ) : (
              // APP PROCESS LAYOUT
              <div className="max-w-7xl mx-auto px-4 py-8">
                {step === AppStep.ANALYZING && (
                  <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-slate-100 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-24 h-24 border-4 border-medical-500 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-medical-600 font-bold text-xl">AI</div>
                    </div>
                    <h2 className="mt-8 text-3xl font-bold text-slate-800">Analyzing Your Skin Profile</h2>
                    <p className="mt-2 text-slate-500 text-lg">Cross-referencing 3 angles with dermatological data...</p>
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
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;