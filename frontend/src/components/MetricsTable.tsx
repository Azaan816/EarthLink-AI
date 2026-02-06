"use client";

import React from "react";

export interface MetricsTableProps {
  title?: string;
  headers?: string[];
  rows?: Array<Record<string, string | number>>;
  /** Alternative: array of { label, value } pairs for a two-column table */
  metrics?: Array<{ label: string; value: string | number }>;
}

export default function MetricsTable({ title, headers, rows, metrics }: MetricsTableProps) {
  const safeTitle = title ?? "Metrics";
  const safeMetrics = metrics ?? [];
  const hasKeyValue = safeMetrics.length > 0;
  const safeHeaders = headers ?? [];
  const safeRows = rows ?? [];
  const hasTable = safeHeaders.length > 0 && safeRows.length > 0;

  return (
    <div className="min-w-0 w-full max-w-full rounded-xl border border-gray-700 bg-gray-800/90 overflow-hidden shadow-lg">
      <div className="px-4 py-2 border-b border-gray-700">
        <h4 className="text-sm font-semibold text-emerald-400">{safeTitle}</h4>
      </div>
      <div className="overflow-x-auto">
        {hasKeyValue && (
          <table className="w-full text-sm">
            <tbody>
              {safeMetrics.map((m, i) => (
                <tr key={i} className="border-b border-gray-700/50 last:border-0">
                  <td className="px-4 py-2 text-gray-500 font-medium">{m?.label ?? ""}</td>
                  <td className="px-4 py-2 text-gray-200">{m?.value != null ? String(m.value) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {hasTable && !hasKeyValue && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                {safeHeaders.map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-700/50 last:border-0">
                  {safeHeaders.map((key) => (
                    <td key={key} className="px-4 py-2 text-gray-200">
                      {row[key] != null ? String(row[key]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
