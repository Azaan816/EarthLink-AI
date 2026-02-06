"use client";

import React from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import { Send, Plus, Loader2, MapPin, Square } from "lucide-react";
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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim() || isPending) return;
        await submit();
    };

    const handleUseSelection = () => {
        if (selectedPoint) {
            setValue("What are the environmental conditions at the location I selected on the map? Use the current map selection.");
        } else if (selectedRegion) {
            setValue(
                "I selected a rectangular AREA on the map (multiple grid cells), not a single point. Use get_insight_for_region with my current region selection to analyze the whole area. Report how many cells are in the area, aggregate stats (e.g. mean NDVI, green score, heat) across the area, and a summary for the region—do not describe a single cell."
            );
        }
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
                    thread.messages.map((message) => (
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
                    <div className="flex min-w-0 flex-col gap-2 rounded-lg bg-gray-800/80 px-3 py-2 text-sm text-gray-300">
                        <div className="flex min-w-0 items-center gap-1.5">
                            {selectedPoint ? (
                                <MapPin size={14} className="flex-shrink-0 text-emerald-400" />
                            ) : (
                                <Square size={14} className="flex-shrink-0 text-emerald-400" />
                            )}
                            <span className="min-w-0 break-all">
                                {selectedPoint
                                    ? `Point: ${Number(selectedPoint.lat).toFixed(4)}, ${Number(selectedPoint.lng).toFixed(4)}`
                                    : selectedRegion?.type === "featureId"
                                      ? `Region: ${selectedRegion.id}`
                                      : selectedRegion?.type === "bbox" && Array.isArray(selectedRegion.bbox) && selectedRegion.bbox.length >= 4
                                        ? `Area: ${Number(selectedRegion.bbox[0]).toFixed(3)}, ${Number(selectedRegion.bbox[1]).toFixed(3)} → ${Number(selectedRegion.bbox[2]).toFixed(3)}, ${Number(selectedRegion.bbox[3]).toFixed(3)}`
                                        : "Region selected"}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleUseSelection}
                            disabled={isPending}
                            className="w-fit rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                            title="Insert message and press Enter to send"
                        >
                            Ask about this
                        </button>
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
                        className="w-full min-w-0 max-w-full bg-gray-800 border border-gray-700 rounded-xl pl-4 pr-11 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none scrollbar-hide text-white placeholder-gray-500 box-border"
                        disabled={isPending}
                    />
                    <button
                        type="submit"
                        disabled={isPending || !value.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
                        aria-label="Send"
                    >
                        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
                <p className="shrink-0 text-[10px] text-gray-500 text-center min-w-0 break-words">
                    Powered by Gemini 1.5 Pro & Tambo AI
                </p>
            </div>
        </div>
    );
}
