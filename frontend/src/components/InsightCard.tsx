"use client";

import React from "react";

export interface InsightCardProps {
  title?: string;
  subtitle?: string;
  metrics?: Array<{ label?: string; value?: string | number }>;
  summary?: string;
}

export default function InsightCard({ title, subtitle, metrics, summary }: InsightCardProps) {
  const safeTitle = title ?? "Environmental insight";
  const safeSubtitle = subtitle ?? "";
  const safeMetrics = Array.isArray(metrics) ? metrics : [];
  const safeSummary = summary ?? "";

  return (
    <div className="min-w-0 w-full max-w-full rounded-xl border border-gray-700 bg-gray-800/90 p-4 shadow-lg">
      <h4 className="text-sm font-semibold text-emerald-400">{safeTitle}</h4>
      {safeSubtitle && <p className="mt-0.5 text-xs text-gray-400">{safeSubtitle}</p>}
      {safeMetrics.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
          {safeMetrics.map((m, i) => (
            <div key={i} className="flex flex-col">
              <dt className="text-gray-500">{m?.label ?? ""}</dt>
              <dd className="font-medium text-gray-200">{m?.value != null ? String(m.value) : "—"}</dd>
            </div>
          ))}
        </dl>
      )}
      {safeSummary && (
        <p className="mt-3 text-sm text-gray-300 break-words" style={{ wordBreak: "break-word" }}>
          {safeSummary}
        </p>
      )}
    </div>
  );
}
