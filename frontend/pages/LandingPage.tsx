
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
        
        <h1 className="text-archive-title mb-16 tracking-tighter leading-[0.85] text-archive-black uppercase">
          Human Rights <br />
          Archive <br />
          Intelligence
        </h1>
        
        {/* Primary Feature: Global RAG Chatbot Entry */}
        <div className="w-full max-w-3xl mx-auto mb-20">
          <form onSubmit={handleSubmit} className="relative group">
            <input 
              type="text"
              placeholder="Query the global archive for patterns, trends, or evidence..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white border border-archive-black px-8 py-7 text-xl font-medium tracking-tight text-archive-black focus:outline-none placeholder:text-archive-muted/40 transition-all"
            />
            <button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-archive-black text-white px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-neutral-800 transition-colors"
            >
              Dispatch Inquiry
            </button>
          </form>
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] uppercase tracking-[0.2em] font-bold text-archive-muted">
            <button onClick={() => setQuery("Identify recurring themes in digital surveillance reports.")} className="hover:text-archive-black transition-colors underline-offset-4 hover:underline">
              Digital Surveillance
            </button>
            <button onClick={() => setQuery("Compare human rights trends in the Sahel vs Amazon regions.")} className="hover:text-archive-black transition-colors underline-offset-4 hover:underline">
              Regional Cross-Analysis
            </button>
            <button onClick={() => setQuery("What specific violations are most common in 2023 reports?")} className="hover:text-archive-black transition-colors underline-offset-4 hover:underline">
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
