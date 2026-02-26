
import React, { useState, useEffect, useRef } from 'react';
import { getDailyFeed, getFeedHistory, forceRegenerateToday } from '../services/contentService';
import { Gender, DailyFeed, BlogPost, GenderContent } from '../types';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const GlowUpHub: React.FC = () => {
  const [gender, setGender] = useState<Gender>('Women');
  const [todayFeed, setTodayFeed] = useState<DailyFeed | null>(null);
  const [history, setHistory] = useState<DailyFeed[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Reader Mode State
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  // --- INITIAL LOAD (Simulate Server Fetch) ---
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const feed = await getDailyFeed();
      setTodayFeed(feed);
      setHistory(getFeedHistory());
    } catch (e) {
      console.error("Failed to load daily feed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminTrigger = async () => {
    if (!confirm("Admin Override: Force regenerate today's content? This consumes API credits.")) return;
    setLoading(true);
    try {
      await forceRegenerateToday();
      await loadContent();
    } catch (e) {
      alert("Generation failed");
      setLoading(false);
    }
  };

  const handleDownloadArticle = async () => {
    if (!articleRef.current || !selectedPost) return;
    setIsDownloading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for render

    try {
        const canvas = await html2canvas(articleRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${selectedPost.title.substring(0, 15)}_Guide.pdf`);
    } catch (error) {
        alert("Download failed. Please try again.");
    } finally {
        setIsDownloading(false);
    }
  };

  // Helper to get gender specific content from a feed item
  const getContent = (feed: DailyFeed | null): GenderContent | null => {
    if (!feed) return null;
    return gender === 'Men' ? feed.men : feed.women;
  };

  const currentContent = getContent(todayFeed);

  return (
    <div className="min-h-screen bg-white animate-fade-in pb-20">
      
      {/* --- READER MODE MODAL --- */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden relative">
                    <button 
                        onClick={() => setSelectedPost(null)}
                        className="absolute top-4 right-4 z-50 bg-white/50 backdrop-blur p-2 rounded-full hover:bg-white transition-colors"
                    >
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <button 
                        onClick={handleDownloadArticle}
                        className="absolute bottom-8 right-8 z-50 bg-black text-white px-6 py-3 rounded-full font-bold shadow-xl hover:bg-gray-800 transition-transform hover:scale-105 flex items-center gap-2"
                    >
                        {isDownloading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        )}
                        Download Guide
                    </button>

                    <div ref={articleRef} className="bg-white pb-20">
                        <div className="relative h-80 md:h-96 w-full">
                            {selectedPost.generated_image_url ? (
                                <img src={selectedPost.generated_image_url} alt={selectedPost.title} className="w-full h-full object-cover grayscale" />
                            ) : (
                                <div className="w-full h-full bg-gray-200 animate-pulse"></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                                <div>
                                    <span className="px-3 py-1 bg-white text-black text-xs font-bold rounded-full mb-3 inline-block uppercase tracking-wider border border-black">
                                        {selectedPost.category}
                                    </span>
                                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight">
                                        {selectedPost.title}
                                    </h1>
                                    <p className="text-gray-300 font-medium">{selectedPost.readTime} Read • Curated for {gender}</p>
                                </div>
                            </div>
                        </div>

                        <div className="max-w-3xl mx-auto px-8 py-12 prose prose-lg prose-slate">
                            <div className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                                {selectedPost.full_markdown_content.split('\n').map((line, i) => {
                                    if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold text-black mt-8 mb-4">{line.replace('# ', '')}</h1>;
                                    if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-gray-800 mt-8 mb-4">{line.replace('## ', '')}</h2>;
                                    if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-2">{line.replace('- ', '')}</li>;
                                    if (line.trim() === '') return <br key={i} />;
                                    return <p key={i} className="mb-4">{line}</p>;
                                })}
                            </div>
                            <div className="mt-12 p-6 bg-gray-50 border-l-4 border-black rounded-r-lg">
                                <p className="text-sm text-gray-500 italic">
                                    "Generated by DermaAI. Always patch test new products."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">
                    ✨
                </div>
                <h2 className="text-xl font-bold text-black">GlowUp Hub</h2>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200">
                <button 
                    onClick={() => setGender('Women')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${gender === 'Women' ? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-500 hover:text-black'}`}
                >
                    <span>👩</span> Women
                </button>
                <button 
                    onClick={() => setGender('Men')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${gender === 'Men' ? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-500 hover:text-black'}`}
                >
                    <span>👨</span> Men
                </button>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* --- TIP OF THE DAY (HERO) --- */}
        {loading || !currentContent ? (
            <div className="w-full h-64 bg-gray-100 rounded-3xl animate-pulse mb-12 flex flex-col justify-center items-center">
                 <p className="text-gray-400 font-medium">Fetching Daily Feed...</p>
                 <p className="text-xs text-gray-400 mt-2">Connecting to Content Database...</p>
            </div>
        ) : (
            <div className="bg-black rounded-3xl p-8 md:p-12 mb-12 text-white shadow-xl relative overflow-hidden group transition-all hover:shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">Tip of the Day</span>
                            <span className="text-gray-400 text-sm">{todayFeed?.date}</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">{currentContent.tip.title}</h2>
                        <p className="text-gray-300 text-lg md:text-xl max-w-2xl leading-relaxed">
                            "{currentContent.tip.content}"
                        </p>
                    </div>
                    {/* Hero Blog Preview (Today's Blog) */}
                    <div 
                       onClick={() => setSelectedPost(currentContent.blog)}
                       className="w-full md:w-80 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
                    >
                         <div className="aspect-video rounded-xl bg-black/20 mb-3 overflow-hidden relative">
                            {currentContent.blog.generated_image_url && (
                                <img src={currentContent.blog.generated_image_url} className="w-full h-full object-cover grayscale" alt="Blog" />
                            )}
                            <div className="absolute bottom-2 left-2 bg-black text-[10px] px-2 py-1 rounded text-white backdrop-blur-sm">Read Story</div>
                         </div>
                         <h3 className="font-bold text-white text-sm line-clamp-2">{currentContent.blog.title}</h3>
                    </div>
                </div>
            </div>
        )}

        {/* --- FEED HISTORY GRID --- */}
        <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2 border-b border-gray-200 pb-4">
            Feed Archive
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{history.length} Posts</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {history.map((feedItem) => {
                const itemContent = getContent(feedItem);
                if (!itemContent) return null;
                const article = itemContent.blog;

                return (
                    <div 
                        key={feedItem.date + article.id}
                        onClick={() => setSelectedPost(article)}
                        className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 hover:border-black transition-all duration-300 cursor-pointer flex flex-col"
                    >
                        <div className="relative h-56 overflow-hidden bg-gray-100">
                            {article.generated_image_url ? (
                                <img 
                                    src={article.generated_image_url} 
                                    alt={article.title} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 grayscale group-hover:grayscale-0" 
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                    <span className="text-xs">No Image Available</span>
                                </div>
                            )}
                            
                            <div className="absolute top-4 left-4">
                                <span className="px-3 py-1 bg-white border border-black text-black text-xs font-bold rounded-full shadow-sm">
                                    {article.category}
                                </span>
                            </div>
                            
                            {/* Date Badge */}
                             <div className="absolute bottom-4 right-4 bg-black text-white text-[10px] px-2 py-1 rounded">
                                {feedItem.date}
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-black mb-3 group-hover:text-black transition-colors line-clamp-2">
                                {article.title}
                            </h3>
                            <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                                {article.summary}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs text-gray-400 font-medium border-t border-gray-100 pt-4 mt-auto">
                                <span>{article.readTime} Read</span>
                                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-black font-bold">
                                    Read Article <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
        
        {/* --- ADMIN FOOTER --- */}
        <div className="mt-20 pt-10 border-t border-gray-200 text-center">
             <button 
               onClick={handleAdminTrigger}
               className="text-[10px] text-gray-300 hover:text-red-400 transition-colors uppercase tracking-widest font-bold"
             >
                Admin: Force Daily Cron Job
             </button>
        </div>
      </div>
    </div>
  );
};

export default GlowUpHub;
