import React, { useState } from 'react';
import { BudgetOption, RoutineResult, RoutineStep } from '../types';

interface ProductRecommenderProps {
  onBudgetSelect: (budget: BudgetOption) => void;
  routine: RoutineResult | null;
  loading: boolean;
  onReset: () => void;
}

const ProductRecommender: React.FC<ProductRecommenderProps> = ({ onBudgetSelect, routine, loading, onReset }) => {
  const [selectedBudget, setSelectedBudget] = useState<BudgetOption | null>(null);

  const handleFindProduct = (brand: string, name: string) => {
    const query = encodeURIComponent(`${brand} ${name}`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  if (!routine && !loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Set Your Budget</h2>
          <p className="text-slate-500 mb-6">Choose a realistic budget for your complete kit.</p>
          
          <div className="space-y-3">
            {Object.values(BudgetOption).map((option) => (
              <button
                key={option}
                onClick={() => {
                  setSelectedBudget(option);
                  onBudgetSelect(option);
                }}
                className="w-full p-4 text-left border rounded-xl hover:border-medical-500 hover:bg-medical-50 transition-all flex justify-between items-center group"
              >
                <span className="font-medium text-slate-700 group-hover:text-medical-700">{option}</span>
                <span className="text-sm text-slate-400 group-hover:text-medical-500">
                  {option === BudgetOption.BUDGET ? 'Student Friendly' : 
                   option === BudgetOption.STANDARD ? 'Best Value' : 'Premium Care'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center py-20">
         <div className="w-16 h-16 border-4 border-medical-200 border-t-medical-600 rounded-full animate-spin mb-6"></div>
         <h3 className="text-xl font-semibold text-slate-800">Calculating Best Value...</h3>
         <p className="text-slate-500">Optimizing routine for {selectedBudget} budget...</p>
       </div>
     );
  }

  // Helper to get step icon
  const getStepIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('cleanse')) return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />; // Drop/Playish
    if (n.includes('treat') || n.includes('serum')) return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />; // Flask
    if (n.includes('moisturize')) return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />; // Cloud/Cream
    if (n.includes('protect') || n.includes('sun')) return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />; // Sun
    return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />; // Check
  };

  const TimelineStep: React.FC<{ step: RoutineStep; index: number; type: 'AM' | 'PM' }> = ({ step, index, type }) => {
    const isLast = false; // Simplified for this view, logic handled by CSS generally
    const colorClass = type === 'AM' ? 'text-amber-600 bg-amber-100 border-amber-200' : 'text-indigo-600 bg-indigo-100 border-indigo-200';
    const accentClass = type === 'AM' ? 'text-amber-600' : 'text-indigo-600';

    return (
      <div className="relative pl-8 pb-8 border-l-2 border-slate-200 last:border-0 last:pb-0">
        {/* Timeline Dot/Icon */}
        <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${colorClass} shadow-sm z-10`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             {getStepIcon(step.stepName)}
          </svg>
        </div>

        {/* Content Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-300 transition-colors group">
          <div className="flex justify-between items-start mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${type === 'AM' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
              Step {index + 1}: {step.stepName}
            </span>
            {step.frequency && (
              <span className="text-[10px] text-slate-400 font-medium">{step.frequency}</span>
            )}
          </div>
          
          <h4 className="font-bold text-slate-800 text-lg mb-2">{step.productName}</h4>
          
          {/* Instructional Sentence */}
          <div className="text-sm text-slate-600 mb-3 leading-relaxed">
            <span className={`font-bold ${accentClass}`}>{step.action}</span> for <span className="font-semibold text-slate-700">{step.duration}</span> on <span className="italic text-slate-700">{step.surface}</span>.
            {step.technique && (
               <span className="block mt-1 text-slate-500">Technique: {step.technique}</span>
            )}
          </div>

          {/* Pro Tip Tooltip/Card */}
          {step.proTip && (
            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-200/60">
               <div className={`mt-0.5 ${accentClass}`}>
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <p className="text-xs text-slate-500 italic">
                 <span className="font-bold">Esthetician Tip:</span> {step.proTip}
               </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (routine) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-12">
        {/* Products Grid */}
        <section>
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-medical-100 text-medical-700 font-bold text-sm tracking-wide mb-3 uppercase">
              Goal: {routine.routineGoal || "Budget-Optimized Protocol"}
            </span>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Your Essential Kit</h2>
            <p className="text-slate-500">
              {routine.essentialKit.length} items curated strictly for your budget.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {routine.essentialKit.map((product, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="bg-slate-800 p-3 text-center flex justify-between items-center">
                  <span className="text-xs font-bold tracking-wider text-white uppercase">{product.category}</span>
                  <span className="w-6 h-6 bg-slate-700 text-white rounded-full text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="font-bold text-slate-800 text-lg mb-1">{product.brand}</h4>
                  <p className="text-sm text-slate-600 mb-4">{product.name}</p>
                  
                  {/* Ingredients Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {product.keyIngredients && product.keyIngredients.map((ing, i) => (
                       <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-semibold rounded uppercase border border-teal-100">
                         {ing}
                       </span>
                    ))}
                  </div>

                  {/* Why this bottle? */}
                  <div className="bg-slate-50 p-3 rounded-lg mb-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Why this bottle?</p>
                    <p className="text-xs text-slate-600 italic leading-relaxed">"{product.reason}"</p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="font-semibold text-slate-800">{product.approxPrice}</span>
                    <button 
                      onClick={() => handleFindProduct(product.brand, product.name)}
                      className="text-xs bg-medical-600 text-white px-4 py-2 rounded-lg hover:bg-medical-700 transition-colors"
                    >
                      Find
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gap Analysis / Budget Reality Check */}
          {routine.recommendedAddon && (
             <div className="mt-12 bg-amber-50 border border-amber-200 rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                   <h3 className="text-xl font-bold text-amber-900 mb-2 flex items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Budget Reality Check
                   </h3>
                   <p className="text-amber-800 mb-4 font-medium italic">"{routine.compromiseNote}"</p>
                   <p className="text-sm text-amber-700">
                      If you can stretch your budget slightly, we strongly recommend adding this item next to complete your protocol.
                   </p>
                </div>
                <div className="w-full md:w-72 bg-white rounded-xl shadow-sm border border-amber-100 p-4">
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Recommended Add-on</span>
                      <span className="text-xs font-bold text-slate-400">{routine.recommendedAddon.approxPrice}</span>
                   </div>
                   <h4 className="font-bold text-slate-800">{routine.recommendedAddon.brand}</h4>
                   <p className="text-sm text-slate-600 mb-2">{routine.recommendedAddon.name}</p>
                   <p className="text-xs text-slate-500 italic">"{routine.recommendedAddon.reason}"</p>
                   <button 
                      onClick={() => handleFindProduct(routine.recommendedAddon!.brand, routine.recommendedAddon!.name)}
                      className="w-full mt-3 text-xs bg-amber-100 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-200 transition-colors font-bold"
                    >
                      Find Online
                    </button>
                </div>
             </div>
          )}
        </section>

        {/* Safety Protocol */}
        {routine.safety_warnings && routine.safety_warnings.length > 0 && (
          <section className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm">
             <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full text-red-600 mt-1">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-red-900 mb-1">Safety Protocols & Warnings</h3>
                   <p className="text-sm text-red-700 mb-4">Please observe these precautions to prevent irritation or damage.</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {routine.safety_warnings.map((warn, i) => (
                         <div key={i} className="bg-white p-3 rounded border border-red-100 flex items-start gap-2">
                            <span className="text-lg">
                              {warn.type === 'Sun Alert' ? '☀️' : warn.type === 'Conflict' ? '🧪' : '⚠️'}
                            </span>
                            <div>
                               <p className="text-xs font-bold text-red-800 uppercase">{warn.type}</p>
                               <p className="text-sm text-slate-700">{warn.warning}</p>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </section>
        )}

        {/* Detailed Ritual Guide */}
        <section className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8">
          <h3 className="text-2xl font-bold text-slate-800 mb-8 text-center">Your Daily Ritual Guide</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            
            {/* AM Routine */}
            <div>
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-amber-100">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800">Morning (AM)</h4>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Protect & Prevent</p>
                </div>
              </div>
              
              <div className="space-y-2">
                 {routine.amRoutine.map((step, i) => (
                    <TimelineStep key={i} step={step} index={i} type="AM" />
                 ))}
              </div>
            </div>

            {/* PM Routine */}
            <div>
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-indigo-100">
                 <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800">Night Repair Ritual</h4>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Treat & Restore</p>
                </div>
              </div>
              
              <div className="space-y-2">
                 {routine.pmRoutine.map((step, i) => (
                    <TimelineStep key={i} step={step} index={i} type="PM" />
                 ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-center pb-8">
           <button onClick={onReset} className="text-slate-400 hover:text-medical-600 underline">Start New Analysis</button>
        </div>
      </div>
    );
  }

  return null;
};

export default ProductRecommender;