
import React, { useState } from 'react';
import { APP_SUBTITLE } from '../constants.tsx';

interface LandingPageProps {
  onStart: () => void;
  onInitialQuery: (query: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onInitialQuery }) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onInitialQuery(query);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 pb-20">
      <div className="max-w-4xl w-full animate-fade-in text-center">
        <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-archive-muted mb-8 block">
          Institutional Archive & Intelligence
        </span>
        
        <h1 className="text-3xl md:text-5xl lg:text-archive-title mb-10 md:mb-16 tracking-tighter leading-[0.9] md:leading-[0.85] text-archive-black uppercase">
          Human Rights <br className="hidden sm:block" />
          Archive <br className="hidden sm:block" />
          Intelligence
        </h1>
        
        {/* Primary Feature: Global RAG Chatbot Entry */}
        <div className="w-full max-w-3xl mx-auto mb-20">
          <form onSubmit={handleSubmit} className="relative group flex flex-col sm:block bg-white border border-archive-black/10 rounded-[2rem] shadow-xl overflow-hidden p-2 md:p-3">
            <input 
              type="text"
              placeholder="Query the global archive..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent px-6 md:px-10 py-5 md:py-6 text-lg md:text-xl font-medium tracking-tight text-archive-black focus:outline-none placeholder:text-archive-muted/40 transition-all mb-3 sm:mb-0"
            />
            <button 
              type="submit"
              className="sm:absolute sm:right-3 sm:top-1/2 sm:-translate-y-1/2 bg-archive-black text-white px-6 md:px-12 py-4 text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-neutral-800 transition-colors w-full sm:w-auto rounded-2xl md:rounded-3xl shadow-lg"
            >
              Dispatch Inquiry
            </button>
          </form>
          <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-4 text-[10px] uppercase tracking-[0.2em] font-bold text-archive-muted">
            <button onClick={() => setQuery("Identify recurring themes in digital surveillance reports.")} className="px-4 py-2 border border-archive-border rounded-full hover:border-archive-black hover:text-archive-black transition-all shadow-sm">
              Digital Surveillance
            </button>
            <button onClick={() => setQuery("Compare human rights trends in the Sahel vs Amazon regions.")} className="px-4 py-2 border border-archive-border rounded-full hover:border-archive-black hover:text-archive-black transition-all shadow-sm">
              Regional Cross-Analysis
            </button>
            <button onClick={() => setQuery("What specific violations are most common in 2023 reports?")} className="px-4 py-2 border border-archive-border rounded-full hover:border-archive-black hover:text-archive-black transition-all shadow-sm">
              2023 Violations
            </button>
          </div>
        </div>

        <div className="h-px w-16 bg-archive-border mx-auto mb-12"></div>
        
        <div className="flex flex-col items-center gap-8">
          <p className="text-archive-subtitle text-archive-muted max-w-xl mx-auto font-light leading-relaxed">
            {APP_SUBTITLE}. Systematic synthesis of human rights documentation grounded in institutional evidence.
          </p>
          
          <button 
            onClick={onStart}
            className="text-xs font-bold uppercase tracking-widest text-archive-black border-b border-archive-black pb-1 hover:text-archive-muted hover:border-archive-muted transition-colors"
          >
            Or browse the archive explorer
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-12 left-0 right-0 flex justify-center opacity-20 pointer-events-none">
        <div className="w-px h-24 bg-archive-black"></div>
      </div>
    </div>
  );
};

export default LandingPage;
