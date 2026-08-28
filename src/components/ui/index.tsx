import React from 'react';

export * from './beams-background';
export * from './card-stack';
export * from './slide-text-button';
export * from './switch-button';
export * from './kokonut-loader';

// Legacy UI helpers compatibility
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-4 h-4 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}

export function ErrorNote({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium">
      {children}
    </div>
  );
}
