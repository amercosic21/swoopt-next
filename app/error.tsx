'use client';

import { useEffect } from 'react';

// Error boundary for the page tree. Next renders this (inside the root layout)
// when a render error is thrown, instead of a blank/broken screen. Copy is
// hardcoded English: the i18n provider lives in page.tsx, which is the subtree
// that just failed, so it isn't available here.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-surface border border-edge rounded p-8 max-w-md w-full flex flex-col items-center gap-4 text-center shadow-[var(--shadow)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={36} height={36} className="text-danger">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2 className="text-[1.05rem] font-semibold text-primary">Something went wrong</h2>
        <p className="text-[0.85rem] text-secondary leading-relaxed">
          An unexpected error occurred in the app. Any downloads already running continue in the background and your history is safe.
        </p>
        <div className="flex items-center gap-2.5 mt-1">
          <button
            className="btn-primary border-none rounded-sm text-white cursor-pointer inline-flex items-center font-sans text-[0.82rem] font-semibold py-[7px] px-4"
            onClick={() => reset()}
          >
            Try again
          </button>
          <button
            className="btn-ghost inline-flex items-center bg-surface-2 border border-edge-2 rounded-sm text-secondary cursor-pointer font-sans text-[0.82rem] font-medium py-[7px] px-4"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
