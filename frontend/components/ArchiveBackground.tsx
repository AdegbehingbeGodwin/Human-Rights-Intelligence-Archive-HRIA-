
import React from 'react';

const ArchiveBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none bg-archive-offwhite">
      {/* 
        Subtle Archival Texture / Grain 
      */}
      <div 
        className="absolute inset-0 w-full h-full opacity-[0.03]"
        style={{
          backgroundImage: `url('https://www.transparenttextures.com/patterns/paper-fibers.png')`,
        }}
      />
      {/* Subtle Bottom Fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-archive-offwhite/50" />
    </div>
  );
};

export default ArchiveBackground;
