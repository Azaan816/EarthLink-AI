"use client";

import React from "react";

export interface RegionSummaryCardProps {
  title?: string;
  cellCount?: number;
  summary?: string;
  aggregates?: Record<string, number>;
  /** Preferred: explicit list for Tambo (no dynamic keys) */
  aggregatePairs?: Array<{ name?: string; value?: number }>;
  interpretation?: string;
}

export default function RegionSummaryCard({
  title,
  cellCount,
  summary,
  aggregates,
  aggregatePairs,
  interpretation,
}: RegionSummaryCardProps) {
  const safeTitle = title ?? "Region summary";
  const safeCount = cellCount ?? 0;
  const safeSummary = summary ?? "";
  const safeInterpretation = interpretation ?? "";
  const fromPairs = Array.isArray(aggregatePairs)
    ? aggregatePairs.filter((p) => p?.name != null && p?.value != null && !Number.isNaN(Number(p.value)))
    : [];
  const fromRecord =
    aggregates && typeof aggregates === "object"
      ? Object.entries(aggregates).filter(([, v]) => v != null && typeof v === "number" && !Number.isNaN(v))
      : [];
  const aggEntries =
    fromPairs.length > 0
      ? fromPairs.map((p) => [p.name!, p.value!] as [string, number])
      : fromRecord;

  return (
    <div className="min-w-0 w-full max-w-full rounded-xl border border-gray-700 bg-gray-800/90 p-4 shadow-lg">
      <h4 className="text-sm font-semibold text-emerald-400">{safeTitle}</h4>
      {safeCount > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          {safeCount} area{safeCount !== 1 ? "s" : ""} in selected region
        </p>
      )}
      {safeSummary && (
        <p className="mt-2 text-sm text-gray-300 break-words" style={{ wordBreak: "break-word" }}>
          {safeSummary}
        </p>
      )}
      {aggEntries.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
          {aggEntries.slice(0, 12).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <span className="text-gray-500">{key.replace(/_/g, " ")}</span>
              <span className="font-medium text-gray-200">
                {typeof value === "number" && value % 1 !== 0 ? value.toFixed(3) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
      {safeInterpretation && (
        <p className="mt-3 text-sm text-gray-400 italic border-t border-gray-700 pt-3">
          {safeInterpretation}
        </p>
      )}
    </div>
  );
}
