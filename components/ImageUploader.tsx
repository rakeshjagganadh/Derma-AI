import React, { useState } from 'react';

interface ImageUploaderProps {
  onImagesSelected: (files: { front: File; left: File; right: File }) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected }) => {
  const [images, setImages] = useState<{ front?: File; left?: File; right?: File }>({});
  const [previews, setPreviews] = useState<{ front?: string; left?: string; right?: string }>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'left' | 'right') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImages(prev => ({ ...prev, [type]: file }));
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews(prev => ({ ...prev, [type]: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    if (images.front && images.left && images.right) {
      onImagesSelected({ front: images.front, left: images.left, right: images.right });
    }
  };

  const isReady = images.front && images.left && images.right;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">Upload Your Photos</h2>
        <p className="text-slate-500">Ensure good lighting, no filters, and no glasses for best results.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {(['front', 'left', 'right'] as const).map((type) => (
          <div key={type} className="flex flex-col items-center">
            <label className="block text-sm font-medium text-slate-700 mb-2 capitalize">
              {type === 'front' ? 'Front Face' : `${type} Profile`}
            </label>
            <div className="relative w-full aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden hover:border-medical-500 transition-colors group">
              {previews[type] ? (
                <img src={previews[type]} alt={type} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-medical-500">
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs">Click to upload</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => handleFileChange(e, type)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleAnalyze}
          disabled={!isReady}
          className={`px-8 py-3 rounded-full text-white font-medium shadow-lg transition-all transform hover:scale-105 ${
            isReady
              ? 'bg-medical-600 hover:bg-medical-500 shadow-medical-500/30'
              : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          {isReady ? 'Analyze My Skin' : 'Upload All Photos'}
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;