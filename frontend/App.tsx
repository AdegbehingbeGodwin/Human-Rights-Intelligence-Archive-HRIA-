
import React, { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Header from './components/Header';
import ArchiveBackground from './components/ArchiveBackground';
import LandingPage from './pages/LandingPage';
import ExplorerPage from './pages/ExplorerPage';
import SearchPage from './pages/SearchPage';
import DocumentIntelligencePage from './pages/DocumentIntelligencePage';
import { Page } from './types';
import { MOCK_DOCUMENTS } from './constants.tsx';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [initialSearchQuery, setInitialSearchQuery] = useState("");

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    setSelectedDocId(null);
    if (page !== 'search') setInitialSearchQuery("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDocSelection = (id: string) => {
    setSelectedDocId(id);
    setCurrentPage('document');
  };

  const handleInitialQuery = (query: string) => {
    setInitialSearchQuery(query);
    setCurrentPage('search');
  };

  const currentDocument = selectedDocId 
    ? MOCK_DOCUMENTS.find(d => d.id === selectedDocId) 
    : null;

  return (
    <div className="min-h-screen">
      <ArchiveBackground />
      <Analytics />
      
      {currentPage !== 'landing' && (
        <Header onNavigate={navigateTo} activePage={currentPage} />
      )}

      <main className="relative z-10">
        {currentPage === 'landing' && (
          <LandingPage 
            onStart={() => navigateTo('explorer')} 
            onInitialQuery={handleInitialQuery}
          />
        )}
        
        {currentPage === 'explorer' && (
          <ExplorerPage onSelectDocument={handleDocSelection} />
        )}

        {currentPage === 'document' && currentDocument && (
          <DocumentIntelligencePage 
            document={currentDocument} 
            onBack={() => navigateTo('explorer')} 
          />
        )}

        {currentPage === 'search' && (
          <SearchPage initialQuery={initialSearchQuery} />
        )}
      </main>

      {/* Institutional Footer */}
      {currentPage !== 'landing' && currentPage !== 'document' && (
        <footer className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 border-t border-archive-border mt-16 md:mt-32">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-xs">
              <p className="text-[10px] uppercase tracking-widest font-bold text-archive-black mb-4">
                The Archive Project
              </p>
              <p className="text-xs text-archive-muted font-light leading-relaxed">
                A non-partisan digital observatory utilizing advanced intelligence to safeguard human rights documentation. Operated as a global public good.
              </p>
            </div>
            <div className="flex flex-wrap gap-10 md:gap-20">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-archive-black mb-4">Contact</p>
                <p className="text-xs text-archive-muted font-light">info@archive-intel.org</p>
                <p className="text-xs text-archive-muted font-light">Geneva Office</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-archive-black mb-4">Legal</p>
                <p className="text-xs text-archive-muted font-light">Privacy Framework</p>
                <p className="text-xs text-archive-muted font-light">Terms of Access</p>
              </div>
            </div>
          </div>
          <div className="mt-12 md:mt-20 pt-8 border-t border-archive-border flex flex-col sm:flex-row justify-between gap-4">
             <span className="text-[9px] uppercase tracking-widest font-bold text-archive-muted">
               © {new Date().getFullYear()} Global Human Rights Observatory
             </span>
             <span className="text-[9px] uppercase tracking-widest font-bold text-archive-muted">
               Build v.2.4.0-Editorial
             </span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
