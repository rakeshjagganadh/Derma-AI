import React, { useState, useRef, useEffect } from 'react';
import { validateImage } from '../services/geminiService';

import skinGuideDo from '../src/assets/images/skin_guide_do_1785912099857.jpg';
import skinGuideDont from '../src/assets/images/skin_guide_dont_1785912114683.jpg';
import frontFaceGuide from '../src/assets/images/front_face_guide_1785912127997.jpg';
import leftProfileGuide from '../src/assets/images/left_profile_guide_1785912141733.jpg';
import rightProfileGuide from '../src/assets/images/right_profile_guide_1785912152733.jpg';

interface ImageUploaderProps {
  onImagesSelected: (files: { front: File; left: File; right: File }) => void;
  compact?: boolean;
}

type SlotType = 'front' | 'left' | 'right';

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected, compact = false }) => {
  const [images, setImages] = useState<{ front?: File; left?: File; right?: File }>({});
  const [previews, setPreviews] = useState<{ front?: string; left?: string; right?: string }>({});
  
  // Validation States
  const [validating, setValidating] = useState<{ front?: boolean; left?: boolean; right?: boolean }>({});
  const [validationErrors, setValidationErrors] = useState<{ front?: string; left?: string; right?: string }>({});

  // Modal States
  const [activeSlot, setActiveSlot] = useState<SlotType | null>(null);
  const [modalMode, setModalMode] = useState<'selection' | 'camera' | null>(null);
  
  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CLEANUP ---
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // --- HANDLERS ---

  const openSelectionModal = (type: SlotType) => {
    setActiveSlot(type);
    setModalMode('selection');
    setValidationErrors(prev => ({ ...prev, [type]: undefined })); // Clear errors on retry
  };

  const closeModal = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setModalMode(null);
    setActiveSlot(null);
  };

  const startCamera = async () => {
    try {
      setModalMode('camera');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      // Wait a tick for video element to render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      alert("Could not access camera. Please upload a file instead.");
      setModalMode('selection');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && activeSlot) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Horizontal flip for selfie mirror effect fix
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${activeSlot}.jpg`, { type: 'image/jpeg' });
            processFile(file, activeSlot);
            closeModal();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const triggerGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeSlot) {
      processFile(e.target.files[0], activeSlot);
      closeModal();
    }
  };

  // --- AI GATEKEEPER LOGIC ---
  const processFile = async (file: File, type: SlotType) => {
    // 1. Optimistic UI: Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviews(prev => ({ ...prev, [type]: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);

    // 2. Start Validation
    setValidating(prev => ({ ...prev, [type]: true }));
    setValidationErrors(prev => ({ ...prev, [type]: undefined }));

    try {
      const expectedView = type === 'front' ? 'front' : 'side';
      const result = await validateImage(file, expectedView);

      if (!result.isValid) {
        // REJECT
        setValidationErrors(prev => ({ ...prev, [type]: result.message || "Invalid image detected." }));
        setPreviews(prev => { const n = { ...prev }; delete n[type]; return n; }); // Remove preview
        setImages(prev => { const n = { ...prev }; delete n[type]; return n; });
      } else {
        // ACCEPT (With warning if angle mismatch)
        if (result.detectedAngle !== 'other' && result.detectedAngle !== expectedView) {
           // We allow it but could show a warning toast. For now, we trust the user knows best if AI is unsure.
           console.warn(`Angle mismatch: Expected ${expectedView}, got ${result.detectedAngle}`);
        }
        setImages(prev => ({ ...prev, [type]: file }));
      }
    } catch (e) {
      // On API error, fail open (allow upload)
      setImages(prev => ({ ...prev, [type]: file }));
    } finally {
      setValidating(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleRemove = (type: SlotType) => {
    setImages(prev => { const n = { ...prev }; delete n[type]; return n; });
    setPreviews(prev => { const n = { ...prev }; delete n[type]; return n; });
    setValidationErrors(prev => { const n = { ...prev }; delete n[type]; return n; });
  };

  const handleAnalyze = () => {
    if (images.front && images.left && images.right) {
      onImagesSelected({ front: images.front, left: images.left, right: images.right });
    }
  };

  // Guide image mapping
  const guideImages: Record<SlotType, string> = {
    front: frontFaceGuide,
    left: leftProfileGuide,
    right: rightProfileGuide,
  };

  // Helper to get view-specific icon/text
  const getViewConfig = (type: string) => {
    switch (type) {
      case 'front': return { label: 'Front Face', iconPath: "M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.23-2.843.65-4.13" };
      case 'left': return { label: 'Left Profile', iconPath: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" };
      case 'right': return { label: 'Right Profile', iconPath: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" };
      default: return { label: 'Upload', iconPath: "" };
    }
  };

  return (
    <div className={`w-full bg-white rounded-2xl border border-gray-200 ${compact ? 'p-4 sm:p-6' : 'max-w-4xl mx-auto p-4 sm:p-8'}`}>
      {!compact && (
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-black mb-1.5 sm:mb-2">Upload Your Photos</h2>
          <p className="text-xs sm:text-sm text-gray-500">Ensure good lighting, no filters, and no glasses for best results.</p>
        </div>
      )}

      {compact && (
         <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <h3 className="font-bold text-sm sm:text-base text-black">Start Diagnosis</h3>
            <span className="text-[10px] sm:text-xs bg-black text-white px-2 py-1 rounded font-medium">3-Step Process</span>
         </div>
      )}

      {/* ERROR MESSAGE BAR */}
      {Object.values(validationErrors).some(e => !!e) && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-xs sm:text-sm flex items-center gap-2 animate-pulse">
           <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           {Object.values(validationErrors).find(e => !!e)}
        </div>
      )}

      <div className={`grid gap-2.5 sm:gap-4 mb-6 ${compact ? 'grid-cols-3' : 'grid-cols-3'}`}>
        {(['front', 'left', 'right'] as const).map((type) => {
           const config = getViewConfig(type);
           const hasImage = !!previews[type];
           const isValidating = validating[type];
           const hasError = !!validationErrors[type];

           return (
            <div key={type} className="flex flex-col items-center group w-full">
              <label className={`block text-[10px] sm:text-xs font-bold mb-1.5 uppercase tracking-wide transition-colors text-center truncate w-full ${hasError ? 'text-red-500' : 'text-gray-500'}`}>
                {config.label} {hasError && '*'}
              </label>
              
              <div 
                onClick={() => !hasImage && !isValidating && openSelectionModal(type)}
                className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden transition-all duration-200 ${
                  hasImage 
                    ? 'border border-solid border-black' 
                    : hasError 
                      ? 'border border-dashed border-red-300 bg-red-50 cursor-pointer' 
                      : 'border border-dashed border-gray-300 bg-gray-50 hover:border-black hover:bg-white cursor-pointer'
                }`}
              >
                {/* LOADING SPINNER */}
                {isValidating && (
                   <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-1">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 sm:border-4 border-gray-200 border-t-black rounded-full animate-spin mb-1"></div>
                      <span className="text-[10px] sm:text-xs font-bold text-black">Validating...</span>
                   </div>
                )}

                {hasImage ? (
                  <>
                    <img src={previews[type]} alt={type} className="w-full h-full object-cover" />
                    {/* Trash/Remove Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemove(type); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black rounded-full flex items-center justify-center text-white opacity-90 hover:opacity-100 active:scale-95 transition-all shadow-sm z-10"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    {/* Checkmark Badge */}
                     <div className="absolute bottom-1.5 right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-black rounded-full flex items-center justify-center text-white shadow-sm">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </>
                ) : (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center p-2 text-center group-hover:scale-105 transition-transform ${hasError ? 'text-red-400 bg-red-50' : 'text-gray-600'}`}>
                    <img 
                      src={guideImages[type]} 
                      alt={`${config.label} guide`} 
                      className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-xs mb-1 text-black">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={config.iconPath} />
                        </svg>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-900 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded shadow-xs leading-tight">
                        {hasError ? 'Invalid' : `Add ${config.label}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!images.front || !images.left || !images.right || Object.values(validating).some(v => v)}
        className={`w-full py-3.5 sm:py-4 rounded-xl text-white font-bold text-base sm:text-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 ${
          (!images.front || !images.left || !images.right || Object.values(validating).some(v => v))
          ? 'bg-gray-300 cursor-not-allowed' 
          : 'bg-black hover:bg-gray-900 shadow-lg shadow-black/10'
        }`}
      >
        Generate My Analysis
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </button>

      {/* PRIVACY DISCLAIMER */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-2.5 sm:gap-3">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
          <span className="font-bold text-gray-700">100% Privacy Focused:</span> Your photos are processed in real-time and strictly used for analysis. They are deleted immediately after the report is generated.
        </p>
      </div>

      {/* GUIDE: How to take your picture */}
      {!compact && (
        <div className="mt-6 sm:mt-8 border-t border-gray-200 pt-6 sm:pt-8">
          <h3 className="text-base sm:text-lg font-bold text-black mb-4 sm:mb-6 text-center">How to take your picture for better skin analysis?</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Example 1: Good Lighting */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full mb-2 sm:mb-3 flex items-center justify-center border border-gray-200 group-hover:border-black transition-colors shadow-sm">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm font-bold text-black mb-0.5">Good Lighting</p>
              <p className="text-[11px] sm:text-xs text-gray-500 px-2 sm:px-4">Face a natural light source. Avoid harsh shadows.</p>
            </div>

            {/* Example 2: No Makeup */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full mb-2 sm:mb-3 flex items-center justify-center border border-gray-200 group-hover:border-black transition-colors shadow-sm">
                 <svg className="w-7 h-7 sm:w-8 sm:h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm font-bold text-black mb-0.5">No Makeup</p>
              <p className="text-[11px] sm:text-xs text-gray-500 px-2 sm:px-4">Clean face ensures accurate texture analysis.</p>
            </div>

            {/* Example 3: Neutral Expression */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full mb-2 sm:mb-3 flex items-center justify-center border border-gray-200 group-hover:border-black transition-colors shadow-sm">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm font-bold text-black mb-0.5">Neutral Expression</p>
              <p className="text-[11px] sm:text-xs text-gray-500 px-2 sm:px-4">Keep face relaxed. No smiling or frowning.</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200">
             <div className="flex flex-row justify-center gap-4 sm:gap-8">
                {/* DO example image */}
                <div className="text-center group">
                   <div className="w-28 h-36 sm:w-36 sm:h-48 rounded-xl mb-2 flex items-center justify-center border-2 border-emerald-500/50 group-hover:border-emerald-600 transition-colors relative overflow-hidden shadow-sm">
                      <img src={skinGuideDo} alt="Good photo example" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded shadow-sm">DO</div>
                   </div>
                   <p className="text-xs sm:text-sm font-bold text-black">Clear & Well-Lit</p>
                   <p className="text-[10px] sm:text-xs text-gray-500">Natural light, sharp focus</p>
                </div>
                
                {/* DON'T example image */}
                <div className="text-center group">
                   <div className="w-28 h-36 sm:w-36 sm:h-48 rounded-xl mb-2 flex items-center justify-center border-2 border-red-400/50 relative overflow-hidden shadow-sm">
                      <img src={skinGuideDont} alt="Bad photo example" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded shadow-sm">DON'T</div>
                   </div>
                   <p className="text-xs sm:text-sm font-bold text-gray-600">Blurry or Dark</p>
                   <p className="text-[10px] sm:text-xs text-gray-500">Shadows, glasses, or filters</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Gallery Fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryFileChange}
      />

      {/* --- SOURCE SELECTION & CAMERA MODAL --- */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
          <div className="bg-white w-[94vw] max-w-md rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-black z-10 p-2 bg-white/70 rounded-full"
            >
               <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {modalMode === 'selection' ? (
              <div className="p-5 sm:p-8 text-center">
                 <h3 className="text-lg sm:text-xl font-bold text-black mb-5">Choose Image Source</h3>
                 <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button 
                      onClick={startCamera}
                      className="flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50 border border-gray-200 rounded-2xl hover:border-black hover:bg-white active:scale-95 transition-all group"
                    >
                       <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-2 sm:mb-3 shadow-sm text-black group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       </div>
                       <span className="font-bold text-xs sm:text-sm text-gray-700">Take Photo</span>
                    </button>
                    
                    <button 
                      onClick={triggerGalleryUpload}
                      className="flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50 border border-gray-200 rounded-2xl hover:border-black hover:bg-white active:scale-95 transition-all group"
                    >
                       <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-2 sm:mb-3 shadow-sm text-black group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       </div>
                       <span className="font-bold text-xs sm:text-sm text-gray-700">Upload</span>
                    </button>
                 </div>
              </div>
            ) : (
              <div className="bg-black relative aspect-[3/4] flex items-center justify-center overflow-hidden">
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   muted 
                   className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" 
                 />
                 <canvas ref={canvasRef} className="hidden" />
                 
                 {/* Face Guide Overlay */}
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <svg className="w-48 h-64 sm:w-64 sm:h-80 opacity-50 text-white animate-pulse" viewBox="0 0 100 120">
                       <ellipse cx="50" cy="60" rx="35" ry="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                    </svg>
                 </div>

                 {/* Capture Button */}
                 <button 
                    onClick={capturePhoto}
                    className="absolute bottom-6 sm:bottom-8 w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white flex items-center justify-center z-20 hover:scale-110 transition-transform active:scale-95"
                 >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full"></div>
                 </button>
                 
                 <div className="absolute top-3 left-3 bg-black/50 text-white text-[10px] sm:text-xs px-2 py-1 rounded backdrop-blur">
                    {activeSlot === 'front' ? 'Front Face' : activeSlot === 'left' ? 'Left Profile' : 'Right Profile'}
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {compact && (
          <p className="text-center text-[10px] text-slate-300 mt-3">
            v2.5 • Anti-Spoofing Enabled
          </p>
      )}
    </div>
  );
};

export default ImageUploader;