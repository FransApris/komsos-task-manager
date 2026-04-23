import React from 'react';

export const MobileWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-black sm:bg-gray-900 flex items-center justify-center sm:p-8 font-sans text-slate-100 selection:bg-blue-500/30">
    <div className="w-full h-[100dvh] sm:h-[844px] sm:max-h-[100dvh] max-w-[390px] bg-[#0a0f18] sm:rounded-[3rem] shadow-2xl overflow-hidden relative sm:border-[8px] border-gray-800 flex flex-col">
      {/* Fake iOS Notch for desktop view */}
      <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-800 rounded-b-3xl z-50"></div>
      
      {children}
      
      {/* Fake iOS Home Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-gray-600/50 rounded-full z-50 pointer-events-none"></div>
    </div>
  </div>
);
