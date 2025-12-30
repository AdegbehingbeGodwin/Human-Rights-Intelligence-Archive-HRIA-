
import React, { useState, useRef, useEffect } from 'react';

interface SearchPageProps {
  initialQuery?: string;
}

interface Source {
  text: string;
  score: number;
  metadata: Record<string, string>;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: Source[];
}

const API_URL = import.meta.env.VITE_API_URL || 'https://human-rights-intelligence-archive-hria.onrender.com';

const NarrativeRenderer: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="space-y-8">
      {paragraphs.map((p, pIdx) => {
        const headerMatch = p.match(/^\*\*(.*?)\*\*:\s*(.*)/s);
        
        if (headerMatch) {
          const [_, header, body] = headerMatch;
          return (
            <div key={pIdx} className="group mb-12 animate-fade-in" style={{ animationDelay: `${pIdx * 150}ms` }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[1px] w-12 bg-archive-accent/40 group-hover:w-20 transition-all duration-700"></div>
                <h4 className="text-[11px] uppercase tracking-[0.4em] font-black text-archive-accent whitespace-nowrap">
                  {header}
                </h4>
              </div>
              <div className="pl-16 border-l border-archive-border/30 group-hover:border-archive-accent/20 transition-colors">
                <div className="opacity-90 leading-[1.8] text-[1.15rem]">
                  <TextFormatter text={body} isFirstParagraph={true} />
                </div>
              </div>
            </div>
          );
        }

        return (
          <p key={pIdx} className="opacity-95 leading-[1.8] text-[1.15rem] mb-6 last:mb-0">
            <TextFormatter text={p} isFirstParagraph={false} />
          </p>
        );
      })}
    </div>
  );
};

const TextFormatter: React.FC<{ text: string; isFirstParagraph: boolean }> = ({ text, isFirstParagraph }) => {
  // Pattern for Bold text, Citations, and Years (2000-2025)
  const parts = text.split(/(\*\*.*?\*\*|\[.*? \d{4}\]|\b(?:19|20)\d{2}\b)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        // Special case: Drop cap for first paragraph of a section
        if (isFirstParagraph && i === 0 && part.length > 0) {
          const firstChar = part.charAt(0);
          const rest = part.slice(1);
          return (
            <React.Fragment key={i}>
              <span className="float-left text-5xl font-black text-archive-black mr-3 mt-1 leading-[0.8] font-sans border-b-4 border-archive-accent/30">{firstChar}</span>
              {rest}
            </React.Fragment>
          );
        }

        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-archive-black relative inline-block px-1">
              <span className="absolute bottom-0 left-0 w-full h-[20%] bg-archive-accent/20 -z-10"></span>
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith('[') && part.endsWith(']')) {
          return (
            <span key={i} className="mx-1.5 px-2 py-0.5 bg-archive-offwhite border-b border-archive-accent text-[10px] font-bold tracking-tight text-archive-black uppercase rounded-none inline-flex items-center gap-1.5 align-middle transform translate-y-[-2px] hover:bg-archive-accent/10 transition-colors cursor-help">
              <span className="w-1.5 h-1.5 bg-archive-accent rounded-full animate-pulse"></span>
              {part.slice(1, -1)}
            </span>
          );
        }

        // Highlight years
        if (/^\d{4}$/.test(part)) {
          return (
            <span key={i} className="font-black text-archive-black underline decoration-archive-accent/40 decoration-wavy decoration-1 underline-offset-4">
              {part}
            </span>
          );
        }

        return part;
      })}
    </>
  );
};

const SearchPage: React.FC<SearchPageProps> = ({ initialQuery }) => {
  const [query, setQuery] = useState(initialQuery || "");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (loading) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      // When response is ready, scroll to the top of the message
      const target = latestMessageRef.current || scrollRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [chatHistory, loading]);

  const handleGlobalSearch = async (msg?: string) => {
    const activeQuery = msg || query;
    if (!activeQuery.trim() || loading) return;

    setQuery("");
    setLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', text: activeQuery }]);
    
    try {
      const response = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: activeQuery, top_k: 5 })
      });
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      setChatHistory(prev => [...prev, { 
        role: 'model', 
        text: data.answer,
        sources: data.sources
      }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'model', 
        text: "Error: Could not connect to the RAG backend. Make sure the server is running on " + API_URL
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      handleGlobalSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGlobalSearch();
  };

  const toggleSources = (idx: number) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 min-h-screen flex flex-col">
      <header className="mb-20 text-center">
        <h2 className="text-[10px] uppercase tracking-[0.5em] font-bold text-archive-black mb-4">
          Global Archive Analyst
        </h2>
        <p className="text-sm text-archive-muted italic mb-8">Synthesizing intelligence across the institutional record.</p>
        
        <div className="flex justify-center gap-8 text-[9px] uppercase tracking-widest font-bold border-t border-archive-muted/10 pt-8 mt-4">
          <a 
            href="https://www.amnesty.org/en/annual-report-archive/#h-2024-25-amnesty-international-annual-report" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-archive-muted hover:text-black transition-colors flex items-center gap-2"
          >
            <span>Amnesty Archive</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
          <a 
            href="https://www.hrw.org/previous-world-reports" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-archive-muted hover:text-black transition-colors flex items-center gap-2"
          >
            <span>HRW Previous Reports</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
        </div>
      </header>

      {/* Chat Display Area */}
      <div className="flex-1 space-y-16 mb-32">
        {chatHistory.length === 0 && !loading && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-16 h-px bg-archive-border mx-auto mb-12"></div>
            <p className="text-4xl font-bold tracking-tight text-archive-black uppercase mb-12 opacity-20">
              Archive Idle
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <button 
                onClick={() => handleGlobalSearch("Compare human rights trends between Africa and the Americas.")}
                className="p-6 border border-archive-border text-[10px] uppercase tracking-widest font-bold text-archive-muted hover:border-archive-black hover:text-archive-black transition-all text-left leading-relaxed"
              >
                Trend Comparison: Regional Cross-Analysis
              </button>
              <button 
                onClick={() => handleGlobalSearch("Synthesize the impact of surveillance technology on civil society in 2022.")}
                className="p-6 border border-archive-border text-[10px] uppercase tracking-widest font-bold text-archive-muted hover:border-archive-black hover:text-archive-black transition-all text-left leading-relaxed"
              >
                Thematic Review: Digital Sovereignty
              </button>
              <button 
                onClick={() => handleGlobalSearch("Identify recurring land rights violations mentioned in the archive.")}
                className="p-6 border border-archive-border text-[10px] uppercase tracking-widest font-bold text-archive-muted hover:border-archive-black hover:text-archive-black transition-all text-left leading-relaxed"
              >
                Pattern Recognition: Land Defenders
              </button>
            </div>
          </div>
        )}

        {chatHistory.map((msg, idx) => (
          <div 
            key={idx} 
            className="animate-slide-up"
            ref={idx === chatHistory.length - 1 ? latestMessageRef : null}
          >
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] border-r-2 border-archive-black pr-8 text-right">
                  <p className="text-[9px] uppercase tracking-[0.4em] font-black mb-3 text-archive-muted/40">Researcher Inquiry</p>
                  <p className="text-3xl font-bold tracking-tight text-archive-black leading-tight">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="max-w-full border border-archive-border p-12 bg-white relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-archive-accent"></div>
                  <header className="flex justify-between items-center mb-10 border-b border-archive-border pb-6">
                    <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-archive-black">Observatory Synthesis</h3>
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-archive-muted/60">
                      {msg.sources ? `${msg.sources.length} Points of Evidence` : 'Grounded Analysis'}
                    </span>
                  </header>
                  <div className="serif text-editorial-body text-archive-black leading-relaxed">
                    <NarrativeRenderer text={msg.text} />
                  </div>
                  
                  {/* Sources Section */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-12 space-y-8 border-t border-archive-border pt-10">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[9px] uppercase tracking-widest font-black text-archive-muted">Evidence Base</h4>
                        <button 
                          onClick={() => toggleSources(idx)}
                          className="text-[9px] uppercase tracking-widest font-bold text-archive-accent hover:underline"
                        >
                          {expandedSources.has(idx) ? 'Collapse Sources' : 'View Raw Sources'}
                        </button>
                      </div>
                      
                      {expandedSources.has(idx) && (
                        <div className="space-y-6 animate-fade-in">
                          {msg.sources.map((source, sIdx) => (
                            <div key={sIdx} className="p-6 bg-archive-bg border-l-2 border-archive-muted/30">
                              <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-bold text-archive-black uppercase tracking-tight">
                                  {source.metadata.organization || 'UNSPECIFIED'} {source.metadata.year || ''}
                                </span>
                                <span className="text-[10px] text-archive-muted font-mono">
                                  Score: {source.score.toFixed(4)}
                                </span>
                              </div>
                              <p className="text-xs text-archive-black/80 leading-relaxed italic mb-4">
                                "...{source.text}..."
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {source.metadata.countries && typeof source.metadata.countries === 'string' && (
                                  <span className="px-2 py-0.5 bg-white border border-archive-border text-[8px] uppercase font-bold text-archive-muted">
                                    📍 {source.metadata.countries}
                                  </span>
                                )}
                                {source.metadata.themes && Array.isArray(source.metadata.themes) && source.metadata.themes.map((theme: string) => (
                                  <span key={theme} className="px-2 py-0.5 bg-archive-accent/10 text-archive-accent text-[8px] uppercase font-bold">
                                    # {theme.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="max-w-[70%] border border-archive-border p-12 bg-white flex items-center space-x-4">
              <div className="w-2 h-2 bg-archive-accent rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-archive-accent rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-2 h-2 bg-archive-accent rounded-full animate-bounce [animation-delay:-.5s]"></div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-archive-muted ml-4">Processing Intelligence...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Floating Sticky Input (Bottom) */}
      <div className="sticky bottom-12 z-20">
        <div className="bg-white border border-archive-black p-4 md:p-6">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input 
              type="text"
              placeholder="Query the human rights intelligence archive..."
              className="flex-1 bg-transparent py-4 text-lg font-bold tracking-tight text-archive-black focus:outline-none placeholder:text-archive-muted/40"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="px-8 bg-archive-black text-white text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-neutral-800 transition-colors disabled:opacity-20 flex items-center gap-3"
              disabled={!query.trim() || loading}
            >
              <span>Consult Archive</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>
          </form>
          {chatHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-archive-border flex justify-between items-center">
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-archive-muted">Active Session: {chatHistory.filter(m => m.role === 'user').length} Queries</span>
              <button 
                onClick={() => setChatHistory([])}
                className="text-[9px] uppercase tracking-[0.2em] font-bold text-archive-violation hover:underline"
              >
                Clear Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
