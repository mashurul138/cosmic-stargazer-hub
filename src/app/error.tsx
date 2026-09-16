"use client";

import Link from "next/link";
import { useEffect } from "react";

import { logger } from "@/lib/utils/logger";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    logger.error("Application route error caught by the error boundary.", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-red-400/30 bg-slate-900 p-6 text-center shadow-2xl shadow-red-950/20 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">
          Navigation anomaly
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">We lost the signal</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          An unexpected error interrupted this part of your cosmic journey. You can retry the request or return to your dashboard.
        </p>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Error details</p>
          <p className="mt-2 break-words font-mono text-sm text-red-200">
            {error.message || "An unknown application error occurred."}
          </p>
          {error.digest ? <p className="mt-2 text-xs text-slate-500">Reference: {error.digest}</p> : null}
        </div>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800"
          >
            Return to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
