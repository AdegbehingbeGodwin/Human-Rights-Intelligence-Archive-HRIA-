
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DocumentEntry, DocumentIntelligence } from '../types';
import { extractDocumentInsights, createDocumentChat } from '../services/geminiService';
import { Chat } from '@google/genai';

interface DocumentIntelligencePageProps {
  document: DocumentEntry;
  onBack: () => void;
}

const DocumentIntelligencePage: React.FC<DocumentIntelligencePageProps> = ({ document, onBack }) => {
  const [intelligence, setIntelligence] = useState<DocumentIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Chat State
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session
  const chatSession = useMemo(() => createDocumentChat(document.fullText), [document]);

  useEffect(() => {
    async function loadIntelligence() {
      setLoading(true);
      const data = await extractDocumentInsights(document.fullText);
      setIntelligence(data);
      setLoading(false);
    }
    loadIntelligence();
  }, [document]);

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || queryLoading) return;

    const currentQuery = query;
    setQuery("");
    setQueryLoading(true);
    
    // Add user message to local state
    setChatHistory(prev => [...prev, { role: 'user', text: currentQuery }]);
    
    try {
      const response = await chatSession.sendMessage({ message: currentQuery });
      setChatHistory(prev => [...prev, { role: 'model', text: response.text || "No data returned." }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Error: Could not retrieve archival intelligence." }]);
    } finally {
      setQueryLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-64px)] md:overflow-hidden">
      {/* Left: Document Reader */}
      <div className="w-full md:w-3/5 overflow-y-auto bg-white border-b md:border-b-0 md:border-r border-archive-border p-6 md:p-12 lg:p-24 scroll-smooth">
        <button 
          onClick={onBack}
          className="text-[10px] uppercase tracking-widest font-bold text-archive-muted hover:text-archive-black mb-12 flex items-center gap-2"
        >
          &larr; Back to Archive
        </button>
        
        <header className="mb-16">
          <div className="flex gap-4 mb-6">
            <span className="text-[10px] uppercase tracking-widest font-bold text-archive-accent bg-archive-black px-2 py-1">
              {document.year} Report
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-archive-muted py-1">
              {document.institution}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-archive-black uppercase leading-[0.9] mb-6 md:mb-8">
            {document.title}
          </h1>
          <div className="h-px w-full bg-archive-border mb-8"></div>
        </header>

        <div className="max-w-[70ch] mx-auto serif text-[1rem] md:text-editorial-body text-archive-black space-y-6 md:space-y-8 pb-10 md:pb-32">
          {document.fullText.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Right: Intelligence Panel (RAG Chat) */}
      <div className="w-full md:w-2/5 flex flex-col bg-archive-offwhite border-t md:border-t-0 md:border-l border-archive-border h-[600px] md:h-full">
        <div className="p-8 border-b border-archive-border flex justify-between items-center flex-shrink-0">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-archive-black">
            Document Analyst Assistant
          </h2>
          {loading ? (
            <span className="text-[10px] uppercase tracking-widest font-bold text-archive-muted animate-pulse">
              Context Loading...
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-widest font-bold text-green-600">
              RAG Session Active
            </span>
          )}
        </div>

        {/* Chat History Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 md:space-y-12">
          {intelligence && (
            <div className="space-y-6 animate-fade-in border-b border-archive-border pb-8">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-archive-muted">Initial Assessment</h3>
              <p className="text-sm font-light text-archive-black leading-relaxed italic">
                {intelligence.insights}
              </p>
              <div className="flex flex-wrap gap-2">
                {intelligence.violations.map(v => (
                  <span key={v} className="px-2 py-0.5 border border-archive-violation/30 text-archive-violation text-[9px] uppercase tracking-widest font-bold">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {chatHistory.map((msg, idx) => (
            <div key={idx} className="space-y-4 animate-slide-up">
              {msg.role === 'user' ? (
                <div className="border-l-2 border-archive-black pl-6 py-1">
                  <p className="text-[9px] uppercase tracking-widest font-bold mb-2 text-archive-muted">Researcher Inquiry</p>
                  <p className="text-sm font-medium text-archive-black">{msg.text}</p>
                </div>
              ) : (
                <div className="pl-6 py-1 border-l-2 border-archive-accent bg-archive-border/10 p-4">
                  <p className="text-[9px] uppercase tracking-widest font-bold mb-2 text-archive-accent-darker text-archive-black">Archival Evidence</p>
                  <p className="text-sm text-archive-black font-light leading-relaxed serif whitespace-pre-wrap">{msg.text}</p>
                </div>
              )}
            </div>
          ))}
          
          {queryLoading && (
            <div className="pl-6 animate-pulse flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-archive-black rounded-full animate-bounce"></div>
              <span className="text-[10px] uppercase tracking-widest text-archive-muted font-bold">Processing Document...</span>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 md:p-8 border-t border-archive-border bg-white flex-shrink-0">
          <form onSubmit={handleInquiry} className="relative">
            <input 
              type="text"
              placeholder="Ask the archive about this document..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={queryLoading}
              className="w-full bg-transparent border-b border-archive-black py-4 text-sm font-light focus:outline-none placeholder:text-archive-muted pr-12"
            />
            <button 
              type="submit"
              disabled={!query.trim() || queryLoading}
              className="absolute right-0 bottom-4 text-archive-black font-bold uppercase text-[10px] tracking-widest disabled:opacity-30"
            >
              Send Inquiry
            </button>
          </form>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-[8px] uppercase tracking-[0.2em] text-archive-muted">
              Evidence is grounded in source text
            </p>
            <button 
              onClick={() => setChatHistory([])}
              className="text-[8px] uppercase tracking-[0.2em] font-bold text-archive-muted hover:text-archive-violation transition-colors"
            >
              Reset Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentIntelligencePage;
