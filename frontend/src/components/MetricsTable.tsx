"use client";

import React, { useEffect } from "react";
import { useLayoutDispatch } from '@/context/LayoutContext';
import { Table, Maximize2 } from 'lucide-react';

export interface MetricsTableProps {
  title?: string;
  headers?: string[];
  rows?: Array<Record<string, string | number>>;
  /** Alternative: array of { label, value } pairs for a two-column table */
  metrics?: Array<{ label: string; value: string | number }>;
}

function MetricsTableContent({ title, headers, rows, metrics }: MetricsTableProps) {
  const safeTitle = title ?? "Metrics";
  const safeMetrics = metrics ?? [];
  const hasKeyValue = safeMetrics.length > 0;
  const safeHeaders = headers ?? [];
  const safeRows = rows ?? [];
  const hasTable = safeHeaders.length > 0 && safeRows.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="bg-gray-900/50 p-4 border-b border-gray-800">
        <h3 className="font-bold text-xl text-emerald-400">{safeTitle}</h3>
      </div>
      <div className="p-4 overflow-auto custom-scrollbar">
        <div className="rounded-xl border border-gray-700 bg-gray-800/90 overflow-hidden shadow-lg">
          {hasKeyValue && (
            <table className="w-full text-sm">
              <tbody>
                {safeMetrics.map((m, i) => (
                  <tr key={i} className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-medium border-r border-gray-700/30">{m?.label ?? ""}</td>
                    <td className="px-4 py-3 text-gray-200 font-mono">{m?.value != null ? String(m.value) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {hasTable && !hasKeyValue && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-700">
                  {safeHeaders.map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {safeRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-700/30 transition-colors">
                    {safeHeaders.map((key) => (
                      <td key={key} className="px-4 py-3 text-gray-200">
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
    </div>
  );
}

export default function MetricsTable(props: MetricsTableProps) {
  const { setLeftSidebarContent, openLeftSidebar } = useLayoutDispatch();

  useEffect(() => {
    setLeftSidebarContent(<MetricsTableContent {...props} />);
    openLeftSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props), setLeftSidebarContent, openLeftSidebar]);

  return (
    <div className="bg-gray-800/80 rounded-lg border border-gray-700 p-4 my-2 flex items-center justify-between group hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={() => {
        setLeftSidebarContent(<MetricsTableContent {...props} />);
        openLeftSidebar();
      }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
          <Table size={20} />
        </div>
        <div>
          <h4 className="font-medium text-gray-200 text-sm">{props.title || "Metrics Table"}</h4>
          <p className="text-xs text-gray-400">View detailed metrics in sidebar</p>
        </div>
      </div>
      <button className="text-gray-500 group-hover:text-emerald-400 transition-colors">
        <Maximize2 size={18} />
      </button>
    </div>
  );
}
