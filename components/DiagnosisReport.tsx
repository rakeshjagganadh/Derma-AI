import React, { useEffect, useRef, useState } from 'react';
import { DetailedDiagnosis, IssueDetail } from '../types';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface DiagnosisReportProps {
  diagnosis: DetailedDiagnosis;
  images: { front: File; left: File; right: File };
  onProceed: () => void;
}

type OverlayCategory = 'All' | 'Inflammation' | 'Dryness' | 'Pigmentation' | 'Aging';
type ViewAngle = 'Front' | 'Left' | 'Right';

// Helper functions for colors
const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Inflammation': return 'rgba(0, 0, 0, 0.1)'; // Black transparent
    case 'Dryness': return 'rgba(100, 100, 100, 0.1)'; // Gray transparent
    case 'Pigmentation': return 'rgba(50, 50, 50, 0.1)'; // Dark Gray transparent
    case 'Aging': return 'rgba(150, 150, 150, 0.1)'; // Light Gray transparent
    default: return 'rgba(0, 0, 0, 0.05)';
  }
};

const getCategoryBorder = (category: string) => {
  switch (category) {
    case 'Inflammation': return '#000000'; // Black
    case 'Dryness': return '#525252'; // Neutral 600
    case 'Pigmentation': return '#262626'; // Neutral 800
    case 'Aging': return '#a3a3a3'; // Neutral 400
    default: return '#000000';
  }
};

// --- Sub-component for Static PDF rendering ---
const StaticAnalysisImage: React.FC<{
  image: File;
  view: ViewAngle;
  diagnosis: DetailedDiagnosis;
}> = ({ image, view, diagnosis }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ensure high resolution for PDF text clarity
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      diagnosis.zones.forEach(zone => {
        zone.issues.forEach(issue => {
          if (issue.locations) {
            issue.locations.forEach(loc => {
              if (loc.view === view && loc.box && loc.box.length === 4) {
                const [ymin, xmin, ymax, xmax] = loc.box;
                
                let x = (xmin / 1000) * canvas.width;
                let y = (ymin / 1000) * canvas.height;
                let w = ((xmax - xmin) / 1000) * canvas.width;
                let h = ((ymax - ymin) / 1000) * canvas.height;

                const color = getCategoryColor(issue.category);
                const borderColor = getCategoryBorder(issue.category);

                // Draw Box
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 4; // Thicker for print
                ctx.strokeRect(x, y, w, h);

                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
                
                // Draw Label - Large & Readable for PDF
                ctx.fillStyle = borderColor;
                ctx.font = 'bold 24px Arial'; // Larger font for print
                const textMetrics = ctx.measureText(issue.commonName);
                const textWidth = textMetrics.width + 20;
                const textHeight = 30;
                
                // Background for text
                ctx.fillRect(x, y - textHeight, textWidth, textHeight);
                
                // Text
                ctx.fillStyle = 'white';
                ctx.fillText(issue.commonName, x + 10, y - 8);
              }
            });
          }
        });
      });
    };

    if (img.complete) {
      draw();
    } else {
      img.onload = draw;
    }
  }, [image, view, diagnosis]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-bold uppercase mb-2 text-slate-700">{view} Analysis</p>
      <div className="relative w-full aspect-[3/4] bg-slate-100 border border-slate-300 rounded overflow-hidden">
        <img 
          ref={imageRef}
          src={URL.createObjectURL(image)} 
          className="w-full h-full object-cover"
          alt={`${view} View`}
        />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
};

const DiagnosisReport: React.FC<DiagnosisReportProps> = ({ diagnosis, images, onProceed }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [activeCategory, setActiveCategory] = useState<OverlayCategory>('All');
  const [currentView, setCurrentView] = useState<ViewAngle>('Front');
  const [expandedZone, setExpandedZone] = useState<string | null>(diagnosis.zones[0]?.zoneName || null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Check if skin is generally "Good"
  const allIssues = diagnosis.zones.flatMap(z => z.issues);
  const severeCount = allIssues.filter(i => i.severity === 'Severe').length;
  const moderateCount = allIssues.filter(i => i.severity === 'Moderate').length;
  const isGoodSkin = severeCount === 0 && moderateCount <= 1;

  const getCurrentImage = () => {
    switch(currentView) {
      case 'Front': return images.front;
      case 'Left': return images.left;
      case 'Right': return images.right;
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

    diagnosis.zones.forEach(zone => {
      zone.issues.forEach(issue => {
        if (activeCategory !== 'All' && issue.category !== activeCategory) return;

        if (issue.locations) {
          issue.locations.forEach(loc => {
            if (loc.view === currentView && loc.box && loc.box.length === 4) {
              const [ymin, xmin, ymax, xmax] = loc.box;
              
              let x = (xmin / 1000) * canvas.width;
              let y = (ymin / 1000) * canvas.height;
              let w = ((xmax - xmin) / 1000) * canvas.width;
              let h = ((ymax - ymin) / 1000) * canvas.height;

              const color = getCategoryColor(issue.category);
              const borderColor = getCategoryBorder(issue.category);

              ctx.strokeStyle = borderColor;
              ctx.lineWidth = 3;
              ctx.strokeRect(x, y, w, h);

              ctx.fillStyle = color;
              ctx.fillRect(x, y, w, h);
              
              if (w > 20) {
                 ctx.fillStyle = borderColor;
                 const lblY = y - 22 > 0 ? y - 22 : y;
                 const textWidth = ctx.measureText(issue.commonName).width + 10;
                 ctx.fillRect(x, lblY, textWidth, 22);
                 
                 ctx.fillStyle = 'white';
                 ctx.font = 'bold 12px Inter';
                 ctx.fillText(issue.commonName, x + 5, lblY + 16);
              }
            }
          });
        }
      });
    });
  };

  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete) {
      drawOverlays();
    } else if (img) {
      img.onload = drawOverlays;
    }
  }, [diagnosis, currentView, activeCategory]);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    
    // Wait for DOM to stabilize and images/canvases in the hidden div to render
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true, // Crucial for some image environments
        logging: false,
        windowWidth: 1200, // Ensure wide enough capture
        width: 1200,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`DermaAI_Clinical_Report_${Date.now()}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed", error);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-fade-in" ref={reportRef}>
      
      {/* Header */}
      <div className="mb-8 border-b border-black pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black font-mono tracking-tight">
            {isGoodSkin ? "SKIN HEALTH CELEBRATION" : "CLINICAL SKIN PROFILE"}
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-mono">
            {isGoodSkin ? "EXCELLENT CONDITION DETECTED" : "MULTI-ANGLE ANALYSIS REPORT"} | REF: {Math.random().toString(36).substr(2, 9).toUpperCase()}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
             <div className="text-right border-r border-gray-200 pr-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Skin Age</p>
                  <p className="font-mono font-bold text-black">{diagnosis.faceArchitecture.skinAge} Years</p>
              </div>
            <button 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="ml-4 px-4 py-2 bg-black text-white text-xs font-bold uppercase rounded hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              {isGeneratingPdf ? 'Processing PDF...' : 'Download Clinical Report'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visuals (Angle Switcher) (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Visual Carousel */}
          <div className="bg-white p-4 rounded-xl border border-gray-200">
             {/* Concern Toggles */}
             <div className="flex flex-wrap gap-2 mb-4">
                {(['All', 'Inflammation', 'Dryness', 'Pigmentation', 'Aging'] as OverlayCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all border ${
                      activeCategory === cat 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
             </div>

             {/* Main Stage */}
             <div className="relative rounded-lg overflow-hidden bg-gray-50 border border-gray-100 aspect-[3/4] mb-4">
                <img
                  ref={imageRef}
                  src={URL.createObjectURL(getCurrentImage())}
                  alt={currentView}
                  className="w-full h-full object-cover transition-opacity duration-300 grayscale-[20%]"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
             </div>

             {/* Angle Thumbnails */}
             <div className="grid grid-cols-3 gap-2">
                {(['Front', 'Left', 'Right'] as ViewAngle[]).map(view => (
                  <button
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={`relative rounded-md overflow-hidden border transition-all h-20 ${
                      currentView === view ? 'border-black ring-1 ring-black' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img 
                       src={URL.createObjectURL(view === 'Front' ? images.front : view === 'Left' ? images.left : images.right)} 
                       className="w-full h-full object-cover grayscale-[20%]" 
                       alt={view}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] font-bold text-center py-0.5">
                      {view}
                    </div>
                  </button>
                ))}
             </div>
          </div>

           {/* LIFESTYLE TRIGGERS (Face Mapping) */}
           {diagnosis.lifestyle_triggers && diagnosis.lifestyle_triggers.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <h3 className="font-bold text-black mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Lifestyle Root Causes
              </h3>
              <div className="space-y-3">
                {diagnosis.lifestyle_triggers.map((trigger, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">{trigger.issue}</p>
                    <p className="text-sm font-semibold text-black mb-1">
                      Did you know? <span className="text-black underline decoration-dotted">{trigger.trigger}</span> could be the cause.
                    </p>
                    <p className="text-xs text-gray-500 italic">Try this: {trigger.habit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skin Strengths */}
          {diagnosis.positiveAttributes && diagnosis.positiveAttributes.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-bold text-black mb-3 flex items-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 Clinical Strengths
              </h3>
              <ul className="space-y-2">
                {diagnosis.positiveAttributes.map((attr, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black flex-shrink-0"></span>
                    {attr}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Data (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
            <h3 className="font-bold text-black mb-4 flex items-center gap-2 text-lg">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                Detailed Zone Analysis
            </h3>
            
            <div className="flex-1 space-y-4">
              {diagnosis.zones.map((zone, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm transition-all hover:border-black">
                  
                  {/* Accordion Header */}
                  <button 
                    onClick={() => setExpandedZone(expandedZone === zone.zoneName ? null : zone.zoneName)}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${expandedZone === zone.zoneName ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-4">
                       <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${
                         zone.issues.length > 0 ? 'border-black text-black bg-white' : 'border-gray-300 text-gray-400 bg-gray-50'
                       }`}>
                         {idx + 1}
                       </span>
                       <div className="text-left">
                          <h4 className="font-bold text-black">{zone.zoneName}</h4>
                          <p className="text-xs text-gray-500">
                             Oil: <span className="font-medium text-black">{zone.oilLevel}</span> • Texture: <span className="font-medium text-black">{zone.textureScore}/10</span>
                          </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       {zone.issues.length > 0 && (
                          <span className="text-xs font-medium text-black border border-black px-2 py-1 rounded-full">{zone.issues.length} Concerns</span>
                       )}
                       <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedZone === zone.zoneName ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {expandedZone === zone.zoneName && (
                    <div className="p-5 border-t border-gray-100 bg-white animate-fade-in">
                       {zone.issues.length === 0 ? (
                         <div className="text-center py-4 text-gray-500 flex flex-col items-center">
                           <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           <p>No major concerns detected in this zone.</p>
                           <p className="text-sm">You are doing a great job maintaining this area!</p>
                         </div>
                       ) : (
                         <div className="space-y-6">
                            {zone.issues.map((issue, i) => (
                               <div key={i} className="pl-4 border-l-2 border-black">
                                  <div className="flex justify-between items-start mb-2">
                                     <div>
                                        <h5 className="font-bold text-black text-lg">{issue.commonName}</h5>
                                        <p className="font-mono text-xs text-gray-500 uppercase tracking-wide">{issue.medicalTerm}</p>
                                     </div>
                                     <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${
                                        issue.severity === 'Severe' ? 'border-black text-black' : 
                                        issue.severity === 'Moderate' ? 'border-gray-400 text-gray-700' : 'border-gray-200 text-gray-500'
                                     }`}>
                                        {issue.severity}
                                     </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                     <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Root Cause</p>
                                        <p className="text-sm text-black leading-snug">{issue.rootCause}</p>
                                     </div>
                                     <div className="bg-white p-3 rounded-lg border border-black">
                                        <p className="text-xs text-black font-bold uppercase mb-1">Clinical Strategy</p>
                                        <p className="text-sm text-black leading-snug">{issue.cureStrategy}</p>
                                     </div>
                                  </div>
                               </div>
                            ))}
                         </div>
                       )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Dermatologist Note */}
            <div className="mt-8 bg-black text-white p-6 rounded-xl shadow-lg">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   Clinical Note
                </h4>
                <p className="text-sm leading-relaxed opacity-90 italic">
                   "{diagnosis.summary}"
                </p>
            </div>

            <button
              onClick={onProceed}
              className="w-full mt-6 py-4 bg-white border-2 border-black text-black hover:bg-black hover:text-white rounded-xl font-bold text-lg transition-all transform flex items-center justify-center gap-2"
            >
              Generate Budget-Optimized Routine <span className="">→</span>
            </button>
        </div>
      </div>

      {/* Hidden Print Layout */}
      <div 
        ref={printRef} 
        className="fixed top-0 left-[-9999px] w-[1200px] bg-white p-12 text-black"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
          {/* PDF Header */}
          <div className="flex justify-between items-end border-b-4 border-black pb-6 mb-8">
             <div>
                <h1 className="text-5xl font-bold text-black mb-2">CLINICAL SKIN REPORT</h1>
                <p className="text-lg text-gray-500 font-medium tracking-wide">AI-ASSISTED DERMATOLOGY ANALYSIS</p>
             </div>
             <div className="text-right">
                <p className="font-mono text-base font-bold text-black">PROFILE: GUEST-001</p>
                <p className="font-mono text-base text-gray-500">{new Date().toLocaleDateString()}</p>
             </div>
          </div>

          {/* Visual Analysis Row - The Flattened Visual Evidence */}
          <div className="mb-10">
             <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
               <span className="w-8 h-1 bg-black inline-block"></span>
               Visual Analysis & Mapping
             </h2>
             <div className="grid grid-cols-3 gap-8">
               <StaticAnalysisImage image={images.front} view="Front" diagnosis={diagnosis} />
               <StaticAnalysisImage image={images.left} view="Left" diagnosis={diagnosis} />
               <StaticAnalysisImage image={images.right} view="Right" diagnosis={diagnosis} />
             </div>
          </div>

          {/* Clinical Findings Table */}
          <div className="grid grid-cols-2 gap-12 mb-10">
             <div>
                <h3 className="text-xl font-bold border-b-2 border-gray-200 mb-4 pb-2 text-black">Primary Concerns</h3>
                <div className="space-y-4">
                  {diagnosis.zones.flatMap(z => z.issues).slice(0, 5).map((issue, i) => (
                    <div key={i} className="flex flex-col">
                       <div className="flex justify-between items-baseline mb-1">
                          <span className="font-bold text-black text-lg">{issue.commonName}</span>
                          <span className="text-xs font-bold uppercase px-2 py-0.5 border border-black rounded text-black">{issue.severity}</span>
                       </div>
                       <p className="text-sm text-gray-600 leading-snug">{issue.rootCause}</p>
                    </div>
                  ))}
                </div>
             </div>
             <div>
                <h3 className="text-xl font-bold border-b-2 border-gray-200 mb-4 pb-2 text-black">Dermatological Profile</h3>
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div className="mb-4">
                      <p className="text-xs font-bold text-gray-400 uppercase">Skin Age</p>
                      <p className="text-2xl font-bold text-black">{diagnosis.faceArchitecture.skinAge} Years</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-xs font-bold text-gray-400 uppercase">Face Shape</p>
                      <p className="text-lg font-medium text-black">{diagnosis.faceArchitecture.shape}</p>
                    </div>
                    <div className="mb-4">
                       <p className="text-xs font-bold text-gray-400 uppercase mb-2">Strengths</p>
                       <ul className="list-disc pl-4 text-sm space-y-1 text-black font-medium">
                        {diagnosis.positiveAttributes.map((attr, i) => (
                          <li key={i}>{attr}</li>
                        ))}
                      </ul>
                    </div>
                    {/* Lifestyle in PDF */}
                    {diagnosis.lifestyle_triggers && diagnosis.lifestyle_triggers.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Lifestyle Insights</p>
                        <div className="space-y-2">
                           {diagnosis.lifestyle_triggers.slice(0, 2).map((trigger, i) => (
                             <div key={i} className="text-sm text-black">
                               <span className="font-bold text-black">{trigger.issue}:</span> {trigger.trigger}
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                </div>
             </div>
          </div>

          <div className="mb-8 bg-gray-50 p-6 border-l-4 border-black">
             <h2 className="text-lg font-bold mb-2 text-black">Physician's Summary</h2>
             <p className="text-base leading-relaxed text-gray-700 italic">"{diagnosis.summary}"</p>
          </div>
          
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 uppercase tracking-widest">
             Generated by DermaAI • Clinical Logic v2.5 • Not a substitute for professional medical advice
          </div>
      </div>
    </div>
  );
};

export default DiagnosisReport;