
import React from 'react';

interface HeaderProps {
  onNavigate: (page: 'landing' | 'explorer' | 'search') => void;
  activePage: string;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, activePage }) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-archive-offwhite/90 backdrop-blur-md border-b border-archive-border py-3 md:py-4">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center md:items-end">
        <div>
          <button 
            onClick={() => onNavigate('landing')}
            className="text-[10px] md:text-sm font-bold tracking-tighter uppercase text-archive-black hover:text-archive-muted transition-colors text-left"
          >
            Human Rights Archive <br className="hidden md:block" /> Intelligence
          </button>
        </div>
        
        <nav className="flex gap-4 md:gap-12">
          <button 
            onClick={() => onNavigate('explorer')}
            className={`text-[9px] md:text-xs font-semibold uppercase tracking-widest transition-colors ${activePage === 'explorer' ? 'text-archive-black border-b-2 border-archive-accent pb-1' : 'text-archive-muted hover:text-archive-black'}`}
          >
            Archive
          </button>
          <button 
            onClick={() => onNavigate('search')}
            className={`text-[9px] md:text-xs font-semibold uppercase tracking-widest transition-colors ${activePage === 'search' ? 'text-archive-black border-b-2 border-archive-accent pb-1' : 'text-archive-muted hover:text-archive-black'}`}
          >
            Search
          </button>
          <span className="hidden sm:inline text-[9px] md:text-xs font-semibold uppercase tracking-widest text-archive-muted/40 cursor-default">
            Observatory
          </span>
        </nav>
      </div>
    </header>
  );
};

export default Header;
