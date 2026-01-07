import React, { useState } from 'react';
import { editImage, generateImage } from '../services/geminiService';
import { AspectRatio, ImageSize } from '../types';

const Tools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'generator'>('editor');
  
  // Editor State
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Generator State
  const [genPrompt, setGenPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleEditUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditFile(e.target.files[0]);
      setEditPreview(URL.createObjectURL(e.target.files[0]));
      setEditedImage(null);
    }
  };

  const handleEdit = async () => {
    if (!editFile || !editPrompt) return;
    setIsEditing(true);
    try {
      const result = await editImage(editFile, editPrompt);
      setEditedImage(result);
    } catch (e) {
      alert("Editing failed");
    } finally {
      setIsEditing(false);
    }
  };

  const handleGenerate = async () => {
    if (!genPrompt) return;
    setIsGenerating(true);
    try {
      const result = await generateImage(genPrompt, aspectRatio, imageSize);
      setGeneratedImage(result);
    } catch (e) {
      alert("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-4 font-medium ${activeTab === 'editor' ? 'bg-slate-50 text-medical-600 border-b-2 border-medical-500' : 'text-slate-500'}`}
        >
          AI Photo Editor
        </button>
        <button
          onClick={() => setActiveTab('generator')}
          className={`flex-1 py-4 font-medium ${activeTab === 'generator' ? 'bg-slate-50 text-medical-600 border-b-2 border-medical-500' : 'text-slate-500'}`}
        >
          Skin Goal Simulator
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-500">Upload a selfie and use AI to fix lighting, background, or add artistic filters.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-dashed border-slate-200 rounded-xl h-64 flex items-center justify-center relative bg-slate-50">
                {editPreview ? (
                  <img src={editPreview} alt="Original" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-slate-400">Upload Image</span>
                )}
                 <input type="file" onChange={handleEditUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>

              <div className="border-2 border-slate-100 rounded-xl h-64 flex items-center justify-center bg-slate-50">
                 {isEditing ? (
                   <div className="animate-spin w-8 h-8 border-2 border-medical-500 rounded-full border-t-transparent"></div>
                 ) : editedImage ? (
                   <img src={editedImage} alt="Edited" className="w-full h-full object-contain" />
                 ) : (
                   <span className="text-slate-400">Result will appear here</span>
                 )}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="e.g., 'Remove the background', 'Make it cinematic lighting'"
                className="flex-1 border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
              <button
                onClick={handleEdit}
                disabled={!editFile || isEditing}
                className="bg-medical-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {activeTab === 'generator' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-500">Visualize perfect skin textures or educational anatomical charts.</p>

            <div className="flex flex-wrap gap-4">
              <select 
                value={aspectRatio} 
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="border p-2 rounded-lg"
              >
                <option value="1:1">1:1 (Square)</option>
                <option value="3:4">3:4</option>
                <option value="4:3">4:3</option>
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
              </select>
              <select 
                value={imageSize} 
                onChange={(e) => setImageSize(e.target.value as ImageSize)}
                 className="border p-2 rounded-lg"
              >
                <option value="1K">1K</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>
            </div>

            <div className="flex gap-2">
               <input
                type="text"
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="e.g., 'Anatomy chart of human skin layers', 'Hyper-realistic face with glowing skin'"
                className="flex-1 border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
               <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-medical-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
              >
                Generate
              </button>
            </div>

             <div className="border border-slate-100 rounded-xl min-h-[300px] flex items-center justify-center bg-slate-50">
                 {isGenerating ? (
                   <div className="animate-spin w-8 h-8 border-2 border-medical-500 rounded-full border-t-transparent"></div>
                 ) : generatedImage ? (
                   <img src={generatedImage} alt="Generated" className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg" />
                 ) : (
                   <span className="text-slate-400">Generated image will appear here</span>
                 )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tools;