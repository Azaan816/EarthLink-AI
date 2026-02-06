"use client";

import React, { useEffect } from 'react';
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
}

function ComparisonTableContent({ title = "Location Comparison", comparison = [] }: ComparisonTableProps) {
    // Filter out null/undefined comparisons
    console.log("ComparisonTableContent received:", comparison);
    const safeComparisons = comparison.filter(c => c != null);

    if (safeComparisons.length === 0) {
        return <div className="text-gray-400 text-sm p-4">No data to compare.</div>;
    }

    // Extract all unique metric keys
    const metricKeys = Array.from(new Set(
        safeComparisons.flatMap(c => c.metrics ? Object.keys(c.metrics) : [])
    ));

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">
            <div className="bg-gray-900/50 p-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xl text-emerald-400">{title}</h3>
                    <span className="text-xs text-gray-400 border border-gray-700 px-2 py-1 rounded-full">{safeComparisons.length} locations</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Side-by-side comparison of environmental metrics.</p>
            </div>

            <div className="overflow-auto p-4 custom-scrollbar">
                <table className="w-full text-sm text-left text-gray-300 border-collapse">
                    <thead className="bg-gray-800 text-xs uppercase text-gray-400 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 font-medium border-b border-gray-700 bg-gray-800">Metric</th>
                            {safeComparisons.map((item, idx) => (
                                <th key={idx} className="px-4 py-3 font-medium min-w-[140px] border-b border-gray-700 bg-gray-800">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-emerald-400 font-semibold text-sm line-clamp-1" title={item.label}>{item.label}</span>
                                        <span className="text-[10px] text-gray-500 font-mono tracking-wide">{item.id ?? "Unknown ID"}</span>
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
    );
}

export default function ComparisonTable(props: ComparisonTableProps) {
    const { setLeftSidebarContent, openLeftSidebar } = useLayoutDispatch();
    const count = props.comparison?.length || 0;

    useEffect(() => {
        if (count > 0) {
            setLeftSidebarContent(<ComparisonTableContent {...props} />);
            openLeftSidebar();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(props), count, setLeftSidebarContent, openLeftSidebar]);

    return (
        <div className="bg-gray-800/80 rounded-lg border border-gray-700 p-4 my-2 flex items-center justify-between group hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => {
                setLeftSidebarContent(<ComparisonTableContent {...props} />);
                openLeftSidebar();
            }}
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <ArrowRightLeft size={20} />
                </div>
                <div>
                    <h4 className="font-medium text-gray-200 text-sm">{props.title || "Comparison Ready"}</h4>
                    <p className="text-xs text-gray-400">Comparing {count} locations in sidebar</p>
                </div>
            </div>
            <button className="text-gray-500 group-hover:text-blue-400 transition-colors">
                <Maximize2 size={18} />
            </button>
        </div>
    );
}
