"use client";

import React, { useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLayoutDispatch } from '@/context/LayoutContext';
import { TrendingUp, Maximize2 } from 'lucide-react';

interface TrendDataPoint {
    year: number;
    value: number;
}

interface GrowthChartProps {
    title?: string;
    metric?: string;
    trend?: TrendDataPoint[];
    locationLabel?: string;
}

// Separate component for the actual chart logic to be reused
function GrowthChartContent({ title, metric = "Value", trend = [], locationLabel }: GrowthChartProps) {
    if (!trend || trend.length === 0) {
        return <div className="text-gray-400 text-sm p-4 text-center">No trend data available.</div>;
    }

    const getStrokeColor = (m: string) => {
        const lower = m.toLowerCase();
        if (lower.includes("green") || lower.includes("ndvi")) return "#10b981"; // Emerald
        if (lower.includes("heat") || lower.includes("lst")) return "#f59e0b"; // Amber
        return "#6366f1"; // Indigo
    };

    const color = getStrokeColor(metric);

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">
            <div className="mb-6 p-4 border-b border-gray-800">
                <h3 className="font-bold text-xl text-emerald-400">{title || `${metric} Trend`}</h3>
                {locationLabel && <p className="text-sm text-gray-400 mt-1">{locationLabel}</p>}
                <p className="text-xs text-gray-500 mt-2">
                    Analyzing historical data from {trend[0]?.year} to {trend[trend.length - 1]?.year}.
                </p>
            </div>

            <div className="flex-1 min-h-[400px] w-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis
                            dataKey="year"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                            itemStyle={{ color: '#e5e7eb' }}
                            labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                            formatter={(value: any) => [value, metric]}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={3}
                            dot={{ fill: color, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="p-4 bg-gray-800/50 m-4 rounded-lg border border-gray-700">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Analysis Interpretation</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                    The chart shows the temporal progression of {metric}.
                    Increasing trends might indicate urban development or vegetation growth, while decreasing trends could suggest degradation.
                </p>
            </div>
        </div>
    );
}

export default function GrowthChart(props: GrowthChartProps) {
    const { setLeftSidebarContent, openLeftSidebar } = useLayoutDispatch();

    useEffect(() => {
        // Automatically open sidebar and show the chart content
        setLeftSidebarContent(<GrowthChartContent {...props} />);
        openLeftSidebar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(props), setLeftSidebarContent, openLeftSidebar]);

    return (
        <div className="bg-gray-800/80 rounded-lg border border-gray-700 p-4 my-2 flex items-center justify-between group hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => {
                setLeftSidebarContent(<GrowthChartContent {...props} />);
                openLeftSidebar();
            }}
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <TrendingUp size={20} />
                </div>
                <div>
                    <h4 className="font-medium text-gray-200 text-sm">{props.title || "Trend Analysis Generated"}</h4>
                    <p className="text-xs text-gray-400">View detailed growth chart in sidebar</p>
                </div>
            </div>
            <button className="text-gray-500 group-hover:text-emerald-400 transition-colors">
                <Maximize2 size={18} />
            </button>
        </div>
    );
}
