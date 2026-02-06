"use client";

import React from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import { Send, Plus, Loader2, MapPin, Square, HelpCircle } from "lucide-react";
import { useMapChat } from "@/context/MapChatContext";

export default function ChatInterface() {
    const {
        thread,
        isIdle,
        generationStage,
        startNewThread,
    } = useTamboThread();

    const {
        value,
        setValue,
        submit,
        isPending,
    } = useTamboThreadInput();

    const { selectedPoint, selectedRegion } = useMapChat();
    const [showHelp, setShowHelp] = React.useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim() || isPending) return;
        await submit();
    };

    const hasSelection = !!selectedPoint || !!selectedRegion;

    return (
        <div className="flex flex-col h-full min-w-0 bg-gray-900 text-white border-l border-gray-800">
            {/* Header */}
            <div className="flex shrink-0 p-4 border-b border-gray-800 justify-between items-center bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
                <h2 className="font-semibold text-lg text-emerald-400 truncate">EarthLink AI</h2>
                <button
                    onClick={() => startNewThread()}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
                    title="New Conversation"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
                {thread.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                            <Plus size={32} />
                        </div>
                        <h3 className="text-xl font-medium text-gray-200">Start your analysis</h3>
                        <p className="text-gray-400 max-w-xs">
                            Click a point on the map for insight, or ask to go somewhere in San Francisco. Select a region to analyze an area.
                        </p>
                    </div>
                ) : (
                    thread.messages
                        .map((message) => (
                            <div key={message.id} className={`flex flex-col min-w-0 w-full ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-2 break-words ${message.role === 'user'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-800 text-gray-200'
                                        }`}
                                    style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                                >
                                    {Array.isArray(message.content) ? (
                                        message.content.map((part, i) =>
                                            part.type === "text" ? (
                                                <p key={i} className="whitespace-pre-wrap break-words" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                                    {part.text}
                                                </p>
                                            ) : null
                                        )
                                    ) : (
                                        <p className="whitespace-pre-wrap break-words" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                            {String(message.content)}
                                        </p>
                                    )}
                                </div>

                                {/* Tambo Generative UI Component */}
                                {message.renderedComponent && (
                                    <div className="mt-4 w-full min-w-0 max-w-full overflow-hidden">
                                        {message.renderedComponent}
                                    </div>
                                )}
                            </div>
                        ))
                )}

                {/* Status Indicator */}
                {!isIdle && (
                    <div className="flex items-center space-x-2 text-sm text-gray-400 p-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span>
                            {generationStage === "STREAMING_RESPONSE" && "EarthLink is thinking..."}
                            {generationStage === "FETCHING_CONTEXT" && "Gathering geospatial data..."}
                        </span>
                    </div>
                )}
            </div>

            {/* Selection + Input — stacked so nothing overlaps */}
            <div className="flex shrink-0 flex-col gap-3 border-t border-gray-800 bg-gray-900/50 p-4 min-w-0 max-w-full">
                {hasSelection && (
                    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-800/80 px-3 py-2 text-sm text-gray-300">
                        {selectedPoint ? (
                            <MapPin size={14} className="flex-shrink-0 text-emerald-400" />
                        ) : (
                            <Square size={14} className="flex-shrink-0 text-emerald-400" />
                        )}
                        <span className="min-w-0 break-all flex-1">
                            {selectedPoint
                                ? `Point: ${Number(selectedPoint.lat).toFixed(4)}, ${Number(selectedPoint.lng).toFixed(4)}`
                                : selectedRegion?.type === "featureId"
                                    ? `Region: ${selectedRegion.id}`
                                    : selectedRegion?.type === "bbox" && Array.isArray(selectedRegion.bbox) && selectedRegion.bbox.length >= 4
                                        ? `Area: ${Number(selectedRegion.bbox[0]).toFixed(3)}, ${Number(selectedRegion.bbox[1]).toFixed(3)} → ${Number(selectedRegion.bbox[2]).toFixed(3)}, ${Number(selectedRegion.bbox[3]).toFixed(3)}`
                                        : "Region selected"}
                        </span>
                    </div>
                )}
                <form onSubmit={handleSend} className="relative min-w-0 max-w-full">
                    <textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                        placeholder="Ask a question..."
                        rows={1}
                        className="w-full min-w-0 max-w-full bg-gray-800 border border-gray-700 rounded-xl pl-4 pr-20 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none scrollbar-hide text-white placeholder-gray-500 box-border"
                        disabled={isPending}
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                            type="button"
                            onClick={() => setShowHelp(true)}
                            className="p-2 hover:bg-gray-700 text-gray-400 hover:text-emerald-400 rounded-lg transition-all"
                            aria-label="Help"
                            title="Show available capabilities"
                        >
                            <HelpCircle size={18} />
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !value.trim()}
                            className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
                            aria-label="Send"
                        >
                            {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </form>
                <p className="shrink-0 text-[10px] text-gray-500 text-center min-w-0 break-words">
                    Powered by Gemini 1.5 Pro & Tambo AI
                </p>
            </div>


            {/* Help Modal */}
            {
                showHelp && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
                        <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-700" onClick={(e) => e.stopPropagation()}>
                            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 pb-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-emerald-400">EarthLink AI Capabilities</h3>
                                    <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white">
                                        <Plus size={24} className="rotate-45" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-400 mt-2">What you can analyze and retrieve from EarthLink</p>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Environmental Analysis */}
                                <div>
                                    <h4 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                        <MapPin size={16} />
                                        Environmental Analysis
                                    </h4>
                                    <ul className="space-y-2 text-sm text-gray-300">
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Vegetation index (NDVI) - measure greenness</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Land surface temperature (LST)</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Heat score & green score metrics</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Elevation & terrain slope data</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Night lights intensity</li>
                                    </ul>
                                </div>

                                {/* Spatial Queries */}
                                <div>
                                    <h4 className="font-semibold text-emerald-400 mb-3">Spatial Queries</h4>
                                    <ul className="space-y-2 text-sm text-gray-300">
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Find extreme values (hottest, coolest, greenest areas)</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Analyze proximity (find nearby locations)</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Search and navigate to named places</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Filter map view by environmental conditions</li>
                                    </ul>
                                </div>

                                {/* Comparisons & Trends */}
                                <div>
                                    <h4 className="font-semibold text-emerald-400 mb-3">Comparisons & Trends</h4>
                                    <ul className="space-y-2 text-sm text-gray-300">
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Compare multiple locations side-by-side</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Analyze temporal trends over time</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">•</span> Regional statistics & aggregations</li>
                                    </ul>
                                </div>

                                {/* Example Queries */}
                                <div>
                                    <h4 className="font-semibold text-emerald-400 mb-3">Example Questions</h4>
                                    <div className="space-y-2 text-sm">
                                        <button onClick={() => { setValue("Find the greenest park near Golden Gate Bridge"); setShowHelp(false); }} className="w-full text-left px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                                            "Find the greenest park near Golden Gate Bridge"
                                        </button>
                                        <button onClick={() => { setValue("Show me the hottest areas in the city"); setShowHelp(false); }} className="w-full text-left px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                                            "Show me the hottest areas in the city"
                                        </button>
                                        <button onClick={() => { setValue("Compare this location with a cooler neighborhood"); setShowHelp(false); }} className="w-full text-left px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                                            "Compare this location with a cooler neighborhood"
                                        </button>
                                        <button onClick={() => { setValue("What's the heat trend over time for this area?"); setShowHelp(false); }} className="w-full text-left px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                                            "What's the heat trend over time for this area?"
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

