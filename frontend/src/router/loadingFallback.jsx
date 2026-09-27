// src/router/loadingFallback.jsx
/* eslint-disable react-refresh/only-export-components */
import { Suspense } from "react";

export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <svg className="animate-spin size-8 text-primary" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
        <path className="opacity-75" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Cargando página…</span>
    </div>
  );
}

/**
 * Creates a wrapper component that renders the lazy component inside Suspense.
 * Returns a React component suitable for React Router's `element` prop.
 */
// eslint-disable-next-line no-unused-vars
export function createSuspenseWrapper(LazyComponent) {
  return function SuspenseWrapper() {
    return (
      <Suspense fallback={<PageLoading />}>
        <LazyComponent />
      </Suspense>
    );
  };
}