"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  const isStreamingOrLimit =
    error?.message?.toLowerCase().includes("streaming") ||
    error?.message?.toLowerCase().includes("limit") ||
    error?.message?.toLowerCase().includes("quota") ||
    error?.message?.toLowerCase().includes("rate");

  return (
    <div className="min-h-screen bg-[#0c0f14] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-cyan-500/20 bg-gray-900/90 p-8 shadow-xl">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Something went wrong</h2>
        <p className="text-gray-300 text-sm mb-4">
          {isStreamingOrLimit ? (
            <>
              The AI service may be temporarily unavailable or you may have reached a usage limit
              (Tambo or Gemini). Please try again in a few minutes, or check your API keys and
              quotas.
            </>
          ) : (
            error?.message || "An unexpected error occurred."
          )}
        </p>
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 px-4 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
