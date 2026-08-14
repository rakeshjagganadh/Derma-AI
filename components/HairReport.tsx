import React, { useEffect, useRef, useState } from 'react';
import { HairDiagnosis } from '../types';
import { useNavigate } from 'react-router-dom';

interface HairReportProps {
  diagnosis: HairDiagnosis;
  images: { front: File; top: File; back: File; scalp: File };
}

type ViewAngle = 'Front' | 'Top' | 'Back' | 'Scalp';

const HairReport: React.FC<HairReportProps> = ({ diagnosis, images }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const navigate = useNavigate();
  
  const [currentView, setCurrentView] = useState<ViewAngle>('Front');

  const getCurrentImage = () => {
    switch(currentView) {
      case 'Front': return images.front;
      case 'Top': return images.top;
      case 'Back': return images.back;
      case 'Scalp': return images.scalp;
    }
  };

  const drawOverlays = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (diagnosis.bounding_boxes) {
      diagnosis.bounding_boxes.forEach(loc => {
        if (loc.view === currentView && loc.box && loc.box.length === 4) {
          const [ymin, xmin, ymax, xmax] = loc.box;
          
          let x = (xmin / 1000) * canvas.width;
          let y = (ymin / 1000) * canvas.height;
          let w = ((xmax - xmin) / 1000) * canvas.width;
          let h = ((ymax - ymin) / 1000) * canvas.height;

          const color = loc.color || 'red';
          const borderColor = loc.color || 'red';

          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);

          ctx.fillStyle = `${color}33`; // 20% opacity
          ctx.fillRect(x, y, w, h);
          
          if (w > 20) {
             ctx.fillStyle = borderColor;
             const lblY = y - 22 > 0 ? y - 22 : y;
             const textWidth = ctx.measureText(loc.label).width + 10;
             ctx.fillRect(x, lblY, textWidth, 22);
             
             ctx.fillStyle = 'white';
             ctx.font = 'bold 12px Inter';
             ctx.fillText(loc.label, x + 5, lblY + 16);
          }
        }
      });
    }
  };

  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete) {
      drawOverlays();
    } else if (img) {
      img.onload = drawOverlays;
    }
  }, [diagnosis, currentView]);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8 animate-fade-in">
      
      {/* Header */}
      <div className="mb-6 sm:mb-8 border-b border-black pb-4 sm:pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black font-mono tracking-tight flex items-center gap-2 sm:gap-3">
            HAIR PROFILE
            <span className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded-full uppercase tracking-wider">Beta 🧪</span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 font-mono">
            DEEP-DIVE FOLLICLE & TEXTURE SCAN | REF: {Math.random().toString(36).substr(2, 9).toUpperCase()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Left Column: Visuals */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200">
             {/* Main Stage */}
             <div className="relative rounded-lg overflow-hidden bg-gray-50 border border-gray-100 aspect-[3/4] mb-3 sm:mb-4">
                <img
                  ref={imageRef}
                  src={URL.createObjectURL(getCurrentImage())}
                  alt={currentView}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
             </div>

             {/* Angle Thumbnails */}
             <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {(['Front', 'Top', 'Back', 'Scalp'] as ViewAngle[]).map(view => (
                  <button
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={`relative rounded-md overflow-hidden border transition-all h-14 sm:h-16 ${
                      currentView === view ? 'border-black ring-1 ring-black' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img 
                       src={URL.createObjectURL(view === 'Front' ? images.front : view === 'Top' ? images.top : view === 'Back' ? images.back : images.scalp)} 
                       className="w-full h-full object-cover" 
                       alt={view}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] sm:text-[9px] font-bold text-center py-0.5">
                      {view}
                    </div>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Right Column: Data */}
        <div className="lg:col-span-7 flex flex-col space-y-4 sm:space-y-6">
            
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-black mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg border-b pb-2">
                    <svg className="w-5 h-5 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    The Diagnosis
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                   <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mb-0.5 sm:mb-1">Hair Type & Pattern</p>
                      <p className="text-sm sm:text-base font-medium text-black">{diagnosis.hair_type}</p>
                   </div>
                   <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mb-0.5 sm:mb-1">Density Score</p>
                      <p className="text-sm sm:text-base font-medium text-black">{diagnosis.density_score}</p>
                   </div>
                   <div className="col-span-2">
                      <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mb-0.5 sm:mb-1">Scalp Condition</p>
                      <p className="text-sm sm:text-base font-medium text-black">{diagnosis.scalp_condition}</p>
                   </div>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-black mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg border-b pb-2">
                    <svg className="w-5 h-5 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    The Root Cause
                </h3>
                <div className="space-y-2.5 sm:space-y-3">
                   {diagnosis.root_causes.map((cause, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 sm:gap-3 bg-gray-50 p-2.5 sm:p-3 rounded-lg">
                         <span className="mt-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-black shrink-0"></span>
                         <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">{cause}</p>
                      </div>
                   ))}
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-black mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg border-b pb-2">
                    <svg className="w-5 h-5 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    The Protocol
                </h3>
                <div className="space-y-2.5 sm:space-y-3">
                   {diagnosis.routine_steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 sm:gap-3 bg-blue-50 p-2.5 sm:p-3 rounded-lg border border-blue-100">
                         <span className="font-bold text-xs sm:text-sm text-blue-800 shrink-0">{idx + 1}.</span>
                         <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">{step}</p>
                      </div>
                   ))}
                </div>
            </div>

            {/* Cross-Marketing Loop Banner */}
            <div className="mt-6 sm:mt-8 bg-gradient-to-r from-pink-50 to-orange-50 p-5 sm:p-6 rounded-xl border border-pink-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
               <div>
                  <h4 className="font-bold text-black text-base sm:text-lg mb-1">Hair is only half the story.</h4>
                  <p className="text-xs sm:text-sm text-gray-600">Discover what your skin needs with our clinical grade skin mapping.</p>
               </div>
               <button 
                  onClick={() => navigate('/scan/skin')}
                  className="shrink-0 bg-black text-white px-5 py-3 rounded-full font-bold text-xs sm:text-sm hover:bg-gray-800 active:scale-95 transition-all text-center shadow-md"
               >
                  Try Clinical Skin Analysis ➔
               </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default HairReport;
