
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ImageUploader from './components/ImageUploader';
import DiagnosisReport from './components/DiagnosisReport';
import ProductRecommender from './components/ProductRecommender';
import GlowUpHub from './components/GlowUpHub';
import HairUploader from './components/HairUploader';
import HairReport from './components/HairReport';
import { analyzeSkin, getRoutineRecommendation, analyzeHair } from './services/geminiService';
import { DetailedDiagnosis, RoutineResult, AppStep, BudgetOption, HairDiagnosis } from './types';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [images, setImages] = useState<{ front?: File; left?: File; right?: File }>({});
  const [diagnosis, setDiagnosis] = useState<DetailedDiagnosis | null>(null);
  const [routine, setRoutine] = useState<RoutineResult | null>(null);
  
  const [hairImages, setHairImages] = useState<{ front?: File; top?: File; back?: File; scalp?: File }>({});
  const [hairDiagnosis, setHairDiagnosis] = useState<HairDiagnosis | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'diagnosis' | 'glowup'>('diagnosis');

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

  const handleHairImagesSelected = async (files: { front: File; top: File; back: File; scalp: File }) => {
    setHairImages(files);
    setStep(AppStep.ANALYZING);
    setLoading(true);
    setError(null);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const result = await analyzeHair(files.front, files.top, files.back, files.scalp);
      setHairDiagnosis(result);
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
    setHairImages({});
    setHairDiagnosis(null);
    setError(null);
    navigate('/');
  };

  // Reset state when navigating to uploaders
  useEffect(() => {
    if (location.pathname === '/scan/skin' || location.pathname === '/scan/hair') {
      setStep(AppStep.UPLOAD);
      setError(null);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('diagnosis'); handleReset(); }}>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">D</div>
            <span className="font-bold text-xl tracking-tight text-black">DermaAI</span>
          </div>
          
          <nav className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 mr-4">
                <button onClick={() => { navigate('/'); setTimeout(() => scrollToSection('how-it-works'), 100); }} className="text-sm font-medium text-gray-500 hover:text-black transition-colors">How it Works</button>
                <button onClick={() => { navigate('/'); setTimeout(() => scrollToSection('sample-report'), 100); }} className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Sample Report</button>
            </div>
            
            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

            <div className="flex bg-gray-100 p-1 rounded-full">
                <button 
                  onClick={() => { setView('diagnosis'); navigate('/'); }} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'diagnosis' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
                >
                  Diagnosis
                </button>
                <button 
                  onClick={() => setView('glowup')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'glowup' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
                >
                  Daily Tips
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

        {view === 'glowup' ? (
          <GlowUpHub />
        ) : (
          <Routes>
            <Route path="/" element={
              <div className="animate-fade-in">
                {/* HERO SECTION */}
                <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
                    <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left Content */}
                        <div className="max-w-2xl relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-black text-xs font-bold uppercase tracking-wider mb-6 border border-gray-200">
                                <span className="w-2 h-2 rounded-full bg-black"></span>
                                AI-Powered Dermatology & Trichology
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-bold text-black leading-[1.1] mb-6 tracking-tight">
                                Your Personal <br/>
                                <span className="text-black decoration-4 decoration-gray-300 underline underline-offset-4">AI Clinic.</span>
                            </h1>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
                                Get a medical-grade analysis of your Skin and Hair in seconds. 
                                <span className="font-semibold text-black"> 100% Private.</span>
                            </p>
                        </div>

                        {/* Right Action (Two Cards) */}
                        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Card 1: Skin Analysis */}
                            <button 
                              onClick={() => navigate('/scan/skin')}
                              className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-black hover:shadow-lg transition-all text-left flex flex-col group"
                            >
                               <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-black mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               </div>
                               <h3 className="font-bold text-black text-xl mb-2">Skin Analysis</h3>
                               <p className="text-sm text-gray-500">Clinical grade skin mapping</p>
                            </button>

                            {/* Card 2: Hair & Scalp Analysis */}
                            <button 
                              onClick={() => navigate('/scan/hair')}
                              className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-black hover:shadow-lg transition-all text-left flex flex-col group relative"
                            >
                               <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                  Beta 🧪
                               </div>
                               <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-black mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                               </div>
                               <h3 className="font-bold text-black text-xl mb-2">Hair & Scalp Analysis</h3>
                               <p className="text-sm text-gray-500">Deep-dive follicle & texture scan</p>
                            </button>
                        </div>
                    </div>
                </section>

                {/* FEATURES SECTION */}
                <section id="how-it-works" className="py-24 bg-white border-t border-gray-100">
                   <div className="container mx-auto px-4">
                      <div className="text-center max-w-2xl mx-auto mb-16">
                         <h2 className="text-3xl font-bold text-black mb-4">Precision Analysis</h2>
                         <p className="text-lg text-gray-500">Our multi-model AI scans distinct dimensions of skin and hair health to provide a holistic diagnosis.</p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                         {[
                            { title: "Texture & Pores", desc: "Detects micro-comedones and dehydration lines.", icon: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            )},
                            { title: "Acne Mapping", desc: "Identifies inflammatory vs. fungal acne types.", icon: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            )},
                            { title: "Scalp Health", desc: "Detects flakes, redness, and dryness.", icon: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            )},
                            { title: "Hair Texture", desc: "Analyzes curl pattern and strand health.", icon: (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                         ].map((feature, idx) => (
                             <div key={idx} className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-black hover:shadow-lg transition-all group">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-black mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      {feature.icon}
                                   </svg>
                                </div>
                                <h3 className="font-bold text-black text-xl mb-3">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                             </div>
                         ))}
                      </div>
                   </div>
                </section>

                {/* Global Footer */}
                <footer className="bg-black text-white py-16 border-t border-gray-800">
                    <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                        {/* Column 1: Brand */}
                        <div className="flex flex-col items-center md:items-start">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black font-bold text-lg">D</div>
                                <span className="font-bold text-2xl text-white">DermaAI</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                                AI-Powered Dermatologist © 2026. <br/>
                                Democratizing clinical skin analysis.
                            </p>
                        </div>
                        
                        {/* Column 2: Links */}
                        <div className="flex flex-col gap-3">
                           <h4 className="text-white font-bold mb-2">Legal & Privacy</h4>
                           <a href="#" className="text-sm hover:text-gray-300 transition-colors">Privacy Policy</a>
                           <a href="#" className="text-sm hover:text-gray-300 transition-colors">Terms of Service</a>
                           <a href="#" className="text-sm hover:text-gray-300 transition-colors">Medical Disclaimer</a>
                        </div>
                        
                        {/* Column 3: Disclaimer */}
                        <div>
                           <h4 className="text-white font-bold mb-2">Important Medical Disclaimer</h4>
                           <p className="text-xs text-gray-500 leading-relaxed">
                              This application is for educational and informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
                           </p>
                        </div>
                    </div>
                </footer>
              </div>
            } />

            <Route path="/scan/skin" element={
              <div className="max-w-7xl mx-auto px-4 py-8">
                {step === AppStep.UPLOAD && (
                  <div className="animate-fade-in">
                    <ImageUploader onImagesSelected={handleImagesSelected} />
                  </div>
                )}
                {step === AppStep.ANALYZING && (
                  <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-gray-200 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-24 h-24 border-4 border-black rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-black font-bold text-xl">AI</div>
                    </div>
                    <h2 className="mt-8 text-3xl font-bold text-black">Analyzing Your Skin Profile</h2>
                    <p className="mt-2 text-gray-500 text-lg">Cross-referencing 3 angles with dermatological data...</p>
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
                    loading={loading}
                    onReset={handleReset}
                  />
                )}
              </div>
            } />

            <Route path="/scan/hair" element={
              <div className="max-w-7xl mx-auto px-4 py-8">
                {step === AppStep.UPLOAD && (
                  <div className="animate-fade-in">
                    <HairUploader onImagesSelected={handleHairImagesSelected} />
                  </div>
                )}
                {step === AppStep.ANALYZING && (
                  <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-gray-200 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-24 h-24 border-4 border-black rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-black font-bold text-xl">AI</div>
                    </div>
                    <h2 className="mt-8 text-3xl font-bold text-black">Analyzing Your Hair Profile</h2>
                    <p className="mt-2 text-gray-500 text-lg">Cross-referencing 4 angles with trichological data...</p>
                  </div>
                )}
                {step === AppStep.REPORT && hairDiagnosis && hairImages.front && hairImages.top && hairImages.back && hairImages.scalp && (
                  <HairReport 
                    diagnosis={hairDiagnosis} 
                    images={{ front: hairImages.front, top: hairImages.top, back: hairImages.back, scalp: hairImages.scalp }} 
                  />
                )}
              </div>
            } />
          </Routes>
        )}
      </main>
    </div>
  );
};

export default App;
