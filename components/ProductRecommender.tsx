import React, { useState } from 'react';
import { BudgetOption, RoutineResult } from '../types';

interface ProductRecommenderProps {
  onBudgetSelect: (budget: BudgetOption) => void;
  routine: RoutineResult | null;
  loading: boolean;
  onReset: () => void;
}

const ProductRecommender: React.FC<ProductRecommenderProps> = ({ onBudgetSelect, routine, loading, onReset }) => {
  const [selectedBudget, setSelectedBudget] = useState<BudgetOption | null>(null);

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
                    <button className="text-xs bg-medical-600 text-white px-4 py-2 rounded-lg hover:bg-medical-700 transition-colors">Find</button>
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
                </div>
             </div>
          )}
        </section>

        {/* Routine Timeline */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h3 className="text-2xl font-bold text-slate-800 mb-8 text-center">Your Daily Protocol</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* AM Routine */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <h4 className="text-xl font-semibold text-slate-800">Morning (AM)</h4>
              </div>
              <ul className="space-y-4">
                {routine.amRoutine.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                    <p className="text-slate-600 text-sm">{step}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* PM Routine */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                </div>
                <h4 className="text-xl font-semibold text-slate-800">Evening (PM)</h4>
              </div>
              <ul className="space-y-4">
                {routine.pmRoutine.map((step, i) => (
                  <li key={i} className="flex gap-4">
                     <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                    <p className="text-slate-600 text-sm">{step}</p>
                  </li>
                ))}
              </ul>
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