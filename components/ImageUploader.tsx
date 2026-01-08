import React, { useState, useRef, useEffect } from 'react';
import { validateImage } from '../services/geminiService';

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
    <div className={`w-full bg-white rounded-2xl shadow-xl border border-slate-100 ${compact ? 'p-6' : 'max-w-4xl mx-auto p-8'}`}>
      {!compact && (
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Upload Your Photos</h2>
          <p className="text-slate-500">Ensure good lighting, no filters, and no glasses for best results.</p>
        </div>
      )}

      {compact && (
         <div className="mb-6 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Start Diagnosis</h3>
            <span className="text-xs bg-medical-50 text-medical-600 px-2 py-1 rounded font-medium">3-Step Process</span>
         </div>
      )}

      {/* ERROR MESSAGE BAR */}
      {Object.values(validationErrors).some(e => !!e) && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           {Object.values(validationErrors).find(e => !!e)}
        </div>
      )}

      <div className={`grid gap-4 mb-6 ${compact ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
        {(['front', 'left', 'right'] as const).map((type) => {
           const config = getViewConfig(type);
           const hasImage = !!previews[type];
           const isValidating = validating[type];
           const hasError = !!validationErrors[type];

           return (
            <div key={type} className="flex flex-col items-center group">
              <label className={`block text-xs font-bold mb-2 uppercase tracking-wide transition-colors ${hasError ? 'text-red-500' : 'text-slate-500'}`}>
                {config.label} {hasError && '*'}
              </label>
              
              <div 
                onClick={() => !hasImage && !isValidating && openSelectionModal(type)}
                className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden transition-all duration-200 ${
                  hasImage 
                    ? 'border-2 border-solid border-medical-500 shadow-md' 
                    : hasError 
                      ? 'border-2 border-dashed border-red-300 bg-red-50 cursor-pointer' 
                      : 'border-2 border-dashed border-slate-300 bg-slate-50 hover:border-medical-400 hover:bg-slate-100 cursor-pointer'
                }`}
              >
                {/* LOADING SPINNER */}
                {isValidating && (
                   <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-medical-200 border-t-medical-600 rounded-full animate-spin mb-2"></div>
                      <span className="text-xs font-bold text-medical-600">Validating...</span>
                   </div>
                )}

                {hasImage ? (
                  <>
                    <img src={previews[type]} alt={type} className="w-full h-full object-cover" />
                    {/* Trash/Remove Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemove(type); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-90 hover:opacity-100 hover:scale-110 transition-all shadow-sm z-10"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    {/* Checkmark Badge */}
                     <div className="absolute bottom-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </>
                ) : (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center ${hasError ? 'text-red-400' : 'text-slate-400 group-hover:text-medical-500'}`}>
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={config.iconPath} />
                    </svg>
                    <span className="text-[10px] font-medium leading-tight">
                       {hasError ? 'Invalid - Retry' : `Add ${config.label}`}
                    </span>
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
        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 ${
          (!images.front || !images.left || !images.right || Object.values(validating).some(v => v))
          ? 'bg-slate-300 cursor-not-allowed shadow-none' 
          : 'bg-medical-600 hover:bg-medical-500 shadow-medical-500/30'
        }`}
      >
        Generate My Analysis
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </button>

      {/* PRIVACY DISCLAIMER */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3">
        <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-700">100% Privacy Focused:</span> Your photos are processed in real-time and strictly used for analysis. They are automatically deleted from our servers immediately after the report is generated. We do not store or share your personal images.
        </p>
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 p-2 bg-white/50 rounded-full"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {modalMode === 'selection' ? (
              <div className="p-8 text-center">
                 <h3 className="text-xl font-bold text-slate-800 mb-6">Choose Image Source</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={startCamera}
                      className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-medical-500 hover:bg-medical-50 transition-all group"
                    >
                       <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-medical-600 group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       </div>
                       <span className="font-bold text-slate-700">Take Photo</span>
                    </button>
                    
                    <button 
                      onClick={triggerGalleryUpload}
                      className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-teal-500 hover:bg-teal-50 transition-all group"
                    >
                       <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-teal-600 group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       </div>
                       <span className="font-bold text-slate-700">Upload</span>
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
                    <svg className="w-64 h-80 opacity-50 text-white animate-pulse" viewBox="0 0 100 120">
                       <ellipse cx="50" cy="60" rx="35" ry="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                    </svg>
                 </div>

                 {/* Capture Button */}
                 <button 
                    onClick={capturePhoto}
                    className="absolute bottom-8 w-16 h-16 rounded-full border-4 border-white flex items-center justify-center z-20 hover:scale-110 transition-transform active:scale-95"
                 >
                    <div className="w-12 h-12 bg-white rounded-full"></div>
                 </button>
                 
                 <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur">
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