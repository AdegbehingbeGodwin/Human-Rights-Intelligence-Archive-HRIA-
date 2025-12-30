
import React from 'react';
import { MOCK_DOCUMENTS } from '../constants.tsx';
import { Region } from '../types';

interface ExplorerPageProps {
  onSelectDocument: (id: string) => void;
}

const ExplorerPage: React.FC<ExplorerPageProps> = ({ onSelectDocument }) => {
  const years = [2024, 2023, 2022, 2021, 2020];
  const regions = Object.values(Region);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-20 flex flex-col md:flex-row gap-12 md:gap-20">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="sticky top-32 space-y-12">
          <div>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-archive-black mb-6">By Region</h3>
            <ul className="space-y-3">
              {regions.map(r => (
                <li key={r}>
                  <button className="px-4 py-1.5 rounded-full text-left text-xs text-archive-muted hover:text-archive-black hover:bg-archive-accent/10 transition-all w-full">{r}</button>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-archive-black mb-6">By Year</h3>
            <div className="grid grid-cols-2 gap-2">
              {years.map(y => (
                <button key={y} className="px-3 py-1.5 rounded-lg border border-transparent hover:border-archive-border text-xs text-archive-muted hover:text-archive-black text-center transition-all">{y}</button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-archive-black mb-6">Institutions</h3>
            <ul className="space-y-3">
              <li><button className="text-xs text-archive-muted hover:text-archive-black text-left">UN Agencies</button></li>
              <li><button className="text-xs text-archive-muted hover:text-archive-black text-left">Amnesty International</button></li>
              <li><button className="text-xs text-archive-muted hover:text-archive-black text-left">Human Rights Watch</button></li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Main Content: Editorial Document List */}
      <main className="flex-1 max-w-2xl">
        <header className="mb-12 md:mb-24">
          <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-archive-black mb-4">The Digital Archive</h2>
          <p className="text-archive-muted text-xs md:text-sm italic font-light">Curated intelligence on global human rights trends.</p>
        </header>

        <section className="space-y-24">
          {MOCK_DOCUMENTS.map(doc => (
            <article 
              key={doc.id} 
              className="group cursor-pointer p-8 md:p-10 border border-transparent hover:border-archive-border rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-500"
              onClick={() => onSelectDocument(doc.id)}
            >
              <div className="flex justify-between items-baseline mb-6">
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-archive-muted/60">
                  {doc.region} — {doc.year}
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-archive-muted/40">
                  REF: {doc.id}
                </span>
              </div>
              
              <h3 className="text-xl md:text-2xl font-bold text-archive-black mb-4 md:mb-6 group-hover:text-archive-muted transition-colors leading-tight uppercase">
                {doc.title}
              </h3>
              
              <p className="text-editorial-body text-archive-muted/80 font-light mb-8 line-clamp-3 leading-relaxed">
                {doc.abstract}
              </p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black border border-archive-black px-3 py-1.5 text-archive-black rounded-lg">
                  {doc.institution}
                </span>
                <div className="hidden sm:block h-px flex-1 bg-archive-border group-hover:bg-archive-accent transition-all duration-700"></div>
                <button className="text-[10px] uppercase tracking-[0.2em] font-bold text-archive-black group-hover:translate-x-2 transition-transform">
                  Examine Document &rarr;
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default ExplorerPage;
