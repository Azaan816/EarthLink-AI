"use client";

import React, { useEffect } from 'react';
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
} from 'recharts';
import { useLayoutDispatch } from '@/context/LayoutContext';
import { ArrowRightLeft, Maximize2 } from 'lucide-react';

interface ComparisonResult {
  type: "feature" | "not_found";
  id?: string;
  label: string;
  metrics?: {
    [key: string]: number | string | null;
  };
}

interface ComparisonTableProps {
  title?: string;
  comparison?: ComparisonResult[];
  /** Optional: only show these metrics in charts. Omit to show all. Use when only certain metrics matter (e.g. ["LST", "Green Score"] for temperature comparison). */
  metricsToShow?: string[];
}

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

function getNumericValue(v: number | string | null): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

export function ComparisonTableContent({ title = "Location Comparison", comparison = [], metricsToShow }: ComparisonTableProps) {
  const safeComparisons = comparison.filter(c => c != null && c.metrics && Object.keys(c.metrics).length > 0);

  if (safeComparisons.length === 0) {
    return <div className="text-gray-400 text-sm p-4">No data to compare.</div>;
  }

  let metricKeys = Array.from(new Set(
    safeComparisons.flatMap(c => c.metrics ? Object.keys(c.metrics) : [])
  )).filter(k => safeComparisons.some(c => {
    const v = c.metrics?.[k];
    return getNumericValue(v) != null;
  }));

  if (metricsToShow && metricsToShow.length > 0) {
    const wanted = metricsToShow.map(m => m.trim().toLowerCase().replace(/\s+/g, ' '));
    const filtered = metricKeys.filter(k => {
      const norm = k.toLowerCase().replace(/_/g, ' ');
      return wanted.some(w => norm === w || norm.includes(w) || w.includes(norm));
    });
    if (filtered.length > 0) metricKeys = filtered;
  }

  // Bar chart data: one row per metric, one bar per location
  const barChartData = metricKeys.map(metric => {
    const row: Record<string, string | number> = { metric: metric.replace(/_/g, ' ') };
    safeComparisons.forEach((item, idx) => {
      const v = getNumericValue(item.metrics?.[metric]);
      row[item.label || `Location ${idx + 1}`] = v ?? 0;
    });
    return row;
  });

  // Radar chart data: one series per location
  const radarData = metricKeys.map(metric => {
    const point: Record<string, string | number> = { subject: metric.replace(/_/g, ' ') };
    safeComparisons.forEach((item, idx) => {
      const v = getNumericValue(item.metrics?.[metric]);
      point[item.label || `Location ${idx + 1}`] = v ?? 0;
    });
    return point;
  });

  // Line/Area chart: metrics as lines, locations as X (or vice versa) - show metric values per location
  const locationLabels = safeComparisons.map((c, i) => c.label || `Location ${i + 1}`);
  const lineChartData = metricKeys.map(metric => {
    const row: Record<string, string | number> = { name: metric.replace(/_/g, ' ') };
    locationLabels.forEach((label, idx) => {
      const item = safeComparisons[idx];
      const v = getNumericValue(item?.metrics?.[metric]);
      row[label] = v ?? 0;
    });
    return row;
  });

  const chartColors = CHART_COLORS.slice(0, Math.max(safeComparisons.length, metricKeys.length));

  return (
    <div className="flex flex-col gap-6 bg-gray-900 text-white">
      <div className="bg-gray-900/50 p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl text-emerald-400">{title}</h3>
          <span className="text-xs text-gray-400 border border-gray-700 px-2 py-1 rounded-full">{safeComparisons.length} locations</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">Side-by-side comparison with charts.</p>
      </div>

      <div className="overflow-auto p-4 custom-scrollbar space-y-8">
        {/* Bar Chart - Metrics comparison across locations */}
        {barChartData.length > 0 && locationLabels.length > 0 && (
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <h4 className="text-sm font-semibold text-emerald-400 mb-3">Metric Comparison (Bar Chart)</h4>
            <div className="h-[280px] w-full min-w-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="metric" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                    formatter={(value: number, name: string) => [Number(value).toFixed(3), name]}
                    labelFormatter={(label) => `Metric: ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {locationLabels.map((label, idx) => (
                    <Bar key={label} dataKey={label} fill={chartColors[idx % chartColors.length]} radius={[0, 4, 4, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Radar Chart - Multi-metric profile per location */}
        {radarData.length > 0 && locationLabels.length <= 6 && (
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <h4 className="text-sm font-semibold text-emerald-400 mb-3">Multi-Metric Profile (Radar Chart)</h4>
            <div className="h-[300px] w-full min-w-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                    formatter={(value: number) => [Number(value).toFixed(3)]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {locationLabels.map((label, idx) => (
                    <Radar key={label} name={label} dataKey={label} stroke={chartColors[idx % chartColors.length]} fill={chartColors[idx % chartColors.length]} fillOpacity={0.3} strokeWidth={2} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Line Chart - Trends across locations per metric */}
        {lineChartData.length > 0 && locationLabels.length > 0 && (
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <h4 className="text-sm font-semibold text-emerald-400 mb-3">Metric Values by Location (Line Chart)</h4>
            <div className="h-[260px] w-full min-w-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                    formatter={(value: number) => [Number(value).toFixed(3)]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {locationLabels.map((label, idx) => (
                    <Line
                      key={label}
                      type="monotone"
                      dataKey={label}
                      stroke={chartColors[idx % chartColors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="rounded-lg border border-gray-700 overflow-hidden">
          <h4 className="text-sm font-semibold text-emerald-400 p-4 pb-0">Data Table</h4>
          <table className="w-full text-sm text-left text-gray-300 border-collapse mt-2">
            <thead className="bg-gray-800 text-xs uppercase text-gray-400 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium border-b border-gray-700 bg-gray-800">Metric</th>
                {safeComparisons.map((item, idx) => (
                  <th key={idx} className="px-4 py-3 font-medium min-w-[140px] border-b border-gray-700 bg-gray-800">
                    <div className="flex flex-col gap-1">
                      <span className="text-emerald-400 font-semibold text-sm line-clamp-1" title={item.label}>{item.label}</span>
                      <span className="text-[10px] text-gray-500 font-mono tracking-wide">{item.id ?? "—"}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {metricKeys.map((metric) => (
                <tr key={metric} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-400 border-r border-gray-800/50">{metric.replace(/_/g, ' ')}</td>
                  {safeComparisons.map((item, idx) => (
                    <td key={idx} className="px-4 py-3">
                      {item.metrics ? (
                        <span className={
                          typeof item.metrics[metric] === 'number'
                            ? "font-mono text-emerald-100 font-medium"
                            : "text-gray-500 italic"
                        }>
                          {item.metrics[metric] ?? "—"}
                        </span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonTable(props: ComparisonTableProps) {
  const { setLeftSidebarContent, openLeftSidebar } = useLayoutDispatch();
  const safeComparisons = (props.comparison || []).filter(c => c != null && c.metrics && Object.keys(c.metrics).length > 0);
  const count = safeComparisons.length;

  useEffect(() => {
    if (count > 0) {
      setLeftSidebarContent(<ComparisonTableContent {...props} />);
      openLeftSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props), count, setLeftSidebarContent, openLeftSidebar]);

  return (
    <div
      className="bg-gray-800/80 rounded-lg border border-gray-700 p-4 my-2 flex items-center justify-between group hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={() => {
        // Only overwrite content when we have data; otherwise just reopen to show existing content
        if (count > 0) {
          setLeftSidebarContent(<ComparisonTableContent {...props} />);
        }
        openLeftSidebar();
      }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
          <ArrowRightLeft size={20} />
        </div>
        <div>
          <h4 className="font-medium text-gray-200 text-sm">{props.title || "Comparison Ready"}</h4>
          <p className="text-xs text-gray-400">
            {count > 0 ? `Comparing ${count} locations — view charts in sidebar` : "Comparing locations"}
          </p>
        </div>
      </div>
      <button className="text-gray-500 group-hover:text-blue-400 transition-colors">
        <Maximize2 size={18} />
      </button>
    </div>
  );
}
