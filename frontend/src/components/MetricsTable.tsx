"use client";

import React, { useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import { useLayoutDispatch } from '@/context/LayoutContext';
import { Table, Maximize2 } from 'lucide-react';

export interface MetricsTableProps {
  title?: string;
  headers?: string[];
  rows?: Array<Record<string, string | number>>;
  /** Alternative: array of { label, value } pairs for a two-column table */
  metrics?: Array<{ label: string; value: string | number }>;
  /** Optional: only show these metrics in charts. Omit to show all. */
  metricsToShow?: string[];
}

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

function toNum(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

export function MetricsTableContent({ title, headers, rows, metrics, metricsToShow }: MetricsTableProps) {
  const safeTitle = title ?? "Metrics";
  const safeMetrics = metrics ?? [];
  const hasKeyValue = safeMetrics.length > 0;
  
  let safeRows = (rows ?? []).filter((r): r is Record<string, string | number> => r != null && typeof r === 'object' && !Array.isArray(r));
  
  // Auto-generate headers if missing but rows exist
  let safeHeaders = headers ?? [];
  if (safeHeaders.length === 0 && safeRows.length > 0) {
    // Assuming first key is metric/label and others are values
    safeHeaders = Object.keys(safeRows[0]);
  }

  const hasTable = safeHeaders.length > 0 && safeRows.length > 0;

  // Detect comparison table: first column = metric labels, rest = location values. Show charts whenever we have 1+ location columns with numeric data.
  const metricKey = safeHeaders[0] || "Metric";
  let locationKeys = safeHeaders.slice(1);
  const hasNumericData = safeRows.some(r => locationKeys.some(k => toNum(r?.[k]) != null));
  const isComparison = hasTable && locationKeys.length >= 1 && hasNumericData;

  // Single-location: metrics array with numeric values → show charts (bar, radar, line)
  const SINGLE_LOCATION_LABEL = "This location";
  const singleMetricsWithNums = safeMetrics
    .filter(m => toNum(m?.value) != null)
    .map(m => ({ label: String(m?.label ?? "").replace(/_/g, ' '), value: toNum(m?.value) ?? 0 }));
  let singleMetricsFiltered = singleMetricsWithNums;
  if (metricsToShow && metricsToShow.length > 0) {
    const wanted = metricsToShow.map(m => m.trim().toLowerCase().replace(/\s+/g, ' '));
    const filtered = singleMetricsWithNums.filter(m => {
      const norm = m.label.toLowerCase();
      return wanted.some(w => norm === w || norm.includes(w) || w.includes(norm));
    });
    if (filtered.length > 0) singleMetricsFiltered = filtered;
  }
  const isSingleLocation = hasKeyValue && singleMetricsFiltered.length > 0;

  if (metricsToShow && metricsToShow.length > 0 && isComparison) {
    const wanted = metricsToShow.map(m => m.trim().toLowerCase().replace(/\s+/g, ' '));
    const filtered = safeRows.filter(row => {
      const label = String(row?.[metricKey] ?? "").toLowerCase().replace(/_/g, ' ');
      return wanted.some(w => label === w || label.includes(w) || w.includes(label));
    });
    if (filtered.length > 0) safeRows = filtered;
  }

  // Build chart data from comparison table or single-location metrics
  const barChartData = isComparison
    ? safeRows.map(row => {
        const out: Record<string, string | number> = { metric: String(row?.[metricKey] ?? "").replace(/_/g, ' ') };
        locationKeys.forEach((k) => { out[k] = toNum(row?.[k]) ?? 0; });
        return out;
      })
    : isSingleLocation
      ? singleMetricsFiltered.map(m => ({ metric: m.label, [SINGLE_LOCATION_LABEL]: m.value }))
      : [];

  const radarData = isComparison
    ? safeRows.map(row => {
        const out: Record<string, string | number> = { subject: String(row?.[metricKey] ?? "").replace(/_/g, ' ') };
        locationKeys.forEach(k => { out[k] = toNum(row?.[k]) ?? 0; });
        return out;
      })
    : isSingleLocation
      ? singleMetricsFiltered.map(m => ({ subject: m.label, [SINGLE_LOCATION_LABEL]: m.value }))
      : [];

  const lineChartData = isComparison
    ? safeRows.map(row => {
        const out: Record<string, string | number> = { name: String(row?.[metricKey] ?? "").replace(/_/g, ' ') };
        locationKeys.forEach(k => { out[k] = toNum(row?.[k]) ?? 0; });
        return out;
      })
    : isSingleLocation
      ? singleMetricsFiltered.map(m => ({ name: m.label, [SINGLE_LOCATION_LABEL]: m.value }))
      : [];

  if (isSingleLocation && locationKeys.length === 0) {
    locationKeys = [SINGLE_LOCATION_LABEL];
  }
  const showCharts = (isComparison || isSingleLocation) && barChartData.length > 0;
  const chartColors = CHART_COLORS.slice(0, Math.max(locationKeys.length, 1));

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="bg-gray-900/50 p-4 border-b border-gray-800">
        <h3 className="font-bold text-xl text-emerald-400">{safeTitle}</h3>
      </div>
      <div className="p-4 overflow-auto custom-scrollbar space-y-6">
        {/* Charts - show for comparison or single-location metrics */}
        {showCharts && (
          <>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <h4 className="text-sm font-semibold text-emerald-400 mb-3">Metric Comparison (Bar Chart)</h4>
              <div className="h-[260px] w-full min-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="metric" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={90} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }} formatter={(v: number | undefined) => [Number(v ?? 0).toFixed(3)]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {locationKeys.map((k, i) => <Bar key={k} dataKey={k} fill={chartColors[i % chartColors.length]} radius={[0, 4, 4, 0]} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {locationKeys.length <= 6 && (
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h4 className="text-sm font-semibold text-emerald-400 mb-3">Multi-Metric Profile (Radar Chart)</h4>
                <div className="h-[280px] w-full min-w-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }} formatter={(v: number | undefined) => [Number(v ?? 0).toFixed(3)]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {locationKeys.map((k, i) => <Radar key={k} name={k} dataKey={k} stroke={chartColors[i % chartColors.length]} fill={chartColors[i % chartColors.length]} fillOpacity={0.3} strokeWidth={2} />)}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <h4 className="text-sm font-semibold text-emerald-400 mb-3">Metric Values (Line Chart)</h4>
              <div className="h-[240px] w-full min-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }} formatter={(v: number | undefined) => [Number(v ?? 0).toFixed(3)]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {locationKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={chartColors[i % chartColors.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

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
                        {row?.[key] != null ? String(row[key]) : "—"}
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
  const safeRowsCount = (props.rows ?? []).filter((r): r is Record<string, string | number> => r != null && typeof r === 'object' && !Array.isArray(r)).length;
  // Also consider it "hasData" if rows exist, because we auto-generate headers now
  const hasData = (safeRowsCount > 0) || (props.metrics && props.metrics.length > 0);

  useEffect(() => {
    console.log("MetricsTable useEffect:", { hasData, props });
    if (hasData) {
      console.log("Setting LeftSidebarContent inside MetricsTable useEffect");
      setLeftSidebarContent(<MetricsTableContent {...props} />, { keepAlt: true });
      openLeftSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props), hasData, setLeftSidebarContent, openLeftSidebar]);

  return (
    <div className="bg-gray-800/80 rounded-lg border border-gray-700 p-4 my-2 flex items-center justify-between group hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={() => {
        if (hasData) {
          setLeftSidebarContent(<MetricsTableContent {...props} />, { keepAlt: true });
        }
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
