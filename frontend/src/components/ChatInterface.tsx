"use client";

import React, { useEffect, useState } from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import { ArrowUp, Plus, Loader2, MapPin, Square, HelpCircle, ChevronDown, ChevronUp, Satellite, User, Sparkles } from "lucide-react";
import { useMapChat } from "@/context/MapChatContext";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function usePointDetails(selectedPoint: { lng: number; lat: number } | null) {
    const [placeName, setPlaceName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedPoint || !MAPBOX_TOKEN) {
            setPlaceName(null);
            return;
        }
        setPlaceName(null);
        setLoading(true);
        const { lng, lat } = selectedPoint;
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`)
            .then((res) => res.json())
            .then((data) => {
                const features = data?.features || [];
                setPlaceName(features.length > 0 ? features[0].place_name : null);
            })
            .catch(() => setPlaceName(null))
            .finally(() => setLoading(false));
    }, [selectedPoint?.lng, selectedPoint?.lat]);

    const staticMapUrl = selectedPoint && MAPBOX_TOKEN
        ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${selectedPoint.lng},${selectedPoint.lat},15,0/240x160@2x?access_token=${MAPBOX_TOKEN}`
        : null;

    return { placeName, staticMapUrl, loading };
}

/** Format AI text: **bold**, paragraphs, bullet lines — smooth futuristic typography */
function formatAIText(text: string) {
    const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
    
    // Filter out raw JSON lines (likely tool outputs/logs)
    const cleanLines = lines.filter(line => {
        const startsWithJson = line.startsWith("{") || line.startsWith("[");
        const hasJsonKey = line.includes('":') || line.includes("':");
        // If it starts with { or [ and has a "key": pattern, it's likely a raw JSON dump
        return !(startsWithJson && hasJsonKey);
    });

    return (
        <div className="space-y-2">
            {cleanLines.map((line, i) => {
                const isBullet = /^[-•*]\s+/.test(line) || /^\*\*[^*]+\*\*:?\s*/.test(line);
                const clean = line.replace(/^\s*[-•*]\s*/, "");
                const parts = clean.split(/(\*\*[^*]+\*\*)/g);
                return (
                    <div key={i} className={isBullet ? "flex gap-2 items-start" : "block"}>
                        {isBullet && <span className="text-cyan-400 shrink-0 mt-0.5">•</span>}
                        <span className="text-gray-300 text-sm leading-relaxed">
                            {parts.map((p, j) =>
                                p.startsWith("**") && p.endsWith("**") ? (
                                    <strong key={j} className="font-semibold text-gray-100">{p.slice(2, -2)}</strong>
                                ) : (
                                    <span key={j}>{p}</span>
                                )
                            )}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

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

    const { selectedPoint, selectedRegion, mapStyle } = useMapChat();
    const [showHelp, setShowHelp] = useState(false);
    const [pointDetailsOpen, setPointDetailsOpen] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const { placeName, staticMapUrl, loading } = usePointDetails(selectedPoint);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim() || isPending) return;
        setStreamError(null);
        try {
            await submit();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error in streaming response.";
            const friendly = /limit|quota|rate|429|503|streaming/i.test(msg)
                ? "Usage limit reached or service busy. Please try again in a few minutes."
                : msg;
            setStreamError(friendly);
        }
    };

    const hasSelection = !!selectedPoint || !!selectedRegion;

    return (
        <div className="flex flex-col h-full min-w-0 bg-[#0c0f14] text-white border-l border-gray-800/80">
            {/* Header — futuristic teal glow */}
            <div className="flex shrink-0 p-4 border-b border-cyan-500/20 justify-between items-center bg-[#0c0f14]/90 backdrop-blur-md sticky top-0 z-10 chat-glow">
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-semibold text-lg text-cyan-400 truncate">EarthLink AI</h2>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-800/80 text-gray-300 border border-cyan-500/20 shrink-0">
                        <Satellite size={12} className={mapStyle === "satellite" ? "text-cyan-400" : "text-gray-500"} />
                        {mapStyle === "satellite" ? "Satellite" : "Map"}
                    </span>
                </div>
                <button
                    onClick={() => startNewThread()}
                    className="p-2 hover:bg-gray-800/80 rounded-xl transition-all duration-200 text-gray-400 hover:text-cyan-400"
                    title="New Conversation"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-5 scrollbar-thin scrollbar-thumb-gray-800">
                {thread.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-5">
                        <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 chat-glow">
                            <Plus size={36} />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-100">Start your analysis</h3>
                        <p className="text-gray-400 max-w-xs text-sm leading-relaxed">
                            Click a point on the map for insight, or ask to go somewhere in San Francisco. Select a region to analyze an area.
                        </p>
                    </div>
                ) : (
                    (() => {
                        type Message = (typeof thread.messages)[number];
                        const blocks: { role: "user" | "assistant"; messages: Message[] }[] = [];
                        for (const msg of thread.messages) {
                            if (msg.role === "user") {
                                blocks.push({ role: "user", messages: [msg] });
                            } else {
                                const last = blocks[blocks.length - 1];
                                if (last?.role === "assistant") {
                                    last.messages.push(msg);
                                } else {
                                    blocks.push({ role: "assistant", messages: [msg] });
                                }
                            }
                        }
                        return blocks.map((block, blockIdx) => (
                            <div key={block.messages[0]?.id ?? blockIdx} className={`flex flex-col min-w-0 w-full gap-2 ${block.role === "user" ? "items-end" : "items-start"}`}>
                                {block.role === "user" ? (
                                    <>
                                        <div className="flex items-end gap-2 max-w-[88%] min-w-0">
                                            <div
                                                className="rounded-2xl px-4 py-3 bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg border border-cyan-400/30 transition-all duration-200"
                                                style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                                            >
                                                {Array.isArray(block.messages[0].content) ? (
                                                    block.messages[0].content.map((part: { type?: string; text?: string }, i: number) =>
                                                        part.type === "text" ? (
                                                            <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>
                                                        ) : null
                                                    )
                                                ) : (
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{String(block.messages[0].content)}</p>
                                                )}
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gray-700/80 flex items-center justify-center shrink-0 border border-cyan-500/20">
                                                <User size={14} className="text-gray-400" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-full max-w-[95%] min-w-0 rounded-2xl bg-gray-800/90 border border-cyan-500/20 chat-glow overflow-hidden transition-all duration-200">
                                            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/80">
                                                <div className="p-1.5 rounded-lg bg-cyan-500/10">
                                                    <Sparkles size={14} className="text-cyan-400" />
                                                </div>
                                                <span className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider">Analysis</span>
                                            </div>
                                            <div className="px-4 py-4 space-y-4">
                                                {block.messages.flatMap((msg) =>
                                                    Array.isArray(msg.content)
                                                        ? msg.content.filter((part: { type?: string }) => part.type === "text").map((part: { text?: string }, i: number) => (
                                                            <div key={`${msg.id}-${i}`}>
                                                                {formatAIText(typeof part.text === "string" ? part.text : "")}
                                                            </div>
                                                          ))
                                                        : [<div key={msg.id}>{formatAIText(String(msg.content))}</div>]
                                                )}
                                            </div>
                                        </div>
                                        {block.messages.some((m) => m.renderedComponent) && (
                                            <div className="mt-2 w-full max-w-[95%] min-w-0 rounded-2xl overflow-hidden border border-cyan-500/20 chat-glow bg-gray-800/80 space-y-2">
                                                {block.messages.map((msg) => msg.renderedComponent ? <div key={msg.id}>{msg.renderedComponent}</div> : null)}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ));
                    })()
                )}

                {/* Status */}
                {!isIdle && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 px-3 py-2 rounded-xl bg-gray-800/50 border border-cyan-500/10 w-fit">
                        <Loader2 size={16} className="animate-spin text-cyan-400" />
                        <span>
                            {generationStage === "STREAMING_RESPONSE" && "EarthLink is thinking..."}
                            {generationStage === "FETCHING_CONTEXT" && "Gathering geospatial data..."}
                        </span>
                    </div>
                )}
            </div>

            {/* Selection + Input — futuristic glow */}
            <div className="flex shrink-0 flex-col gap-3 border-t border-cyan-500/20 bg-[#0c0f14]/95 p-4 min-w-0 max-w-full">
                {hasSelection && (
                    <>
                        <div className="flex min-w-0 items-center gap-2 rounded-xl bg-gray-800/80 border border-cyan-500/20 px-3 py-2.5 text-sm text-gray-300 chat-glow transition-all duration-200">
                            {selectedPoint ? (
                                <MapPin size={14} className="flex-shrink-0 text-cyan-400" />
                            ) : (
                                <Square size={14} className="flex-shrink-0 text-cyan-400" />
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
                        {selectedPoint && (
                            <div className="rounded-xl border border-cyan-500/20 bg-gray-800/80 overflow-hidden min-w-0 chat-glow transition-all duration-200">
                                <button
                                    type="button"
                                    onClick={() => setPointDetailsOpen((o) => !o)}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-cyan-400 hover:bg-gray-700/50 transition-colors rounded-xl"
                                >
                                    <span>Point details</span>
                                    {pointDetailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {pointDetailsOpen && (
                                    <div className="px-3 pb-3 pt-0 flex flex-col gap-2 min-w-0">
                                        {staticMapUrl && (
                                            <img
                                                src={staticMapUrl}
                                                alt="Location"
                                                className="w-full h-24 object-cover rounded-lg border border-cyan-500/20"
                                            />
                                        )}
                                        <p className="text-sm text-gray-300 min-w-0 break-words">
                                            {loading ? (
                                                <span className="flex items-center gap-2 text-gray-500">
                                                    <Loader2 size={14} className="animate-spin flex-shrink-0" />
                                                    Loading place name…
                                                </span>
                                            ) : placeName ? (
                                                placeName
                                            ) : (
                                                <span className="text-gray-500">No place name found</span>
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
                <form onSubmit={handleSend} className="flex gap-2 items-end min-w-0 max-w-full">
                    <textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                        placeholder="Input your message"
                        rows={2}
                        className="input-glow flex-1 min-w-0 min-h-[56px] py-3.5 px-4 bg-gray-800/90 border border-cyan-500/30 rounded-2xl text-sm outline-none resize-y max-h-[160px] scrollbar-thin scrollbar-thumb-gray-700 text-white placeholder-gray-500 box-border transition-all duration-200 focus:border-cyan-500/50"
                        disabled={isPending}
                    />
                    <div className="flex gap-1.5 shrink-0 pb-0.5">
                        <button
                            type="button"
                            onClick={() => setShowHelp(true)}
                            className="p-2.5 h-11 w-11 flex items-center justify-center hover:bg-gray-700/80 text-gray-400 hover:text-cyan-400 rounded-xl transition-all duration-200 border border-gray-700/80"
                            aria-label="Help"
                            title="Show available capabilities"
                        >
                            <HelpCircle size={20} />
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !value.trim()}
                            className="p-2.5 h-11 w-11 flex items-center justify-center bg-cyan-500/90 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-all duration-200 shadow-[0_0_16px_rgba(34,211,238,0.3)]"
                            aria-label="Send"
                        >
                            {isPending ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={20} />}
                        </button>
                    </div>
                </form>
                <p className="shrink-0 text-[10px] text-gray-500 text-center min-w-0 break-words">
                    Powered by Gemini 1.5 Pro & Tambo AI
                </p>
            </div>


            {/* Help Modal — same futuristic glow */}
            {
                showHelp && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
                        <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-cyan-500/20 chat-glow-strong overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="shrink-0 border-b border-cyan-500/20 p-6 pb-4 bg-gray-800 z-10">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-cyan-400">EarthLink AI Capabilities</h3>
                                    <button onClick={() => setShowHelp(false)} className="p-2 rounded-xl text-gray-400 hover:text-cyan-400 hover:bg-gray-700/80 transition-all">
                                        <Plus size={24} className="rotate-45" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-400 mt-2">What you can analyze and retrieve from EarthLink</p>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                                {/* Environmental Analysis */}
                                <div>
                                    <h4 className="font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                                        <MapPin size={16} />
                                        Environmental Analysis
                                    </h4>
                                    <ul className="space-y-2 text-sm text-gray-300">
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Vegetation index (NDVI) - measure greenness</li>
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Land surface temperature (LST)</li>
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Heat score & green score metrics</li>
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Elevation & terrain slope data</li>
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Night lights intensity</li>
                                    </ul>
                                </div>

                                {/* Spatial Queries */}
                                <div>
                                    <h4 className="font-semibold text-cyan-400 mb-3">Spatial Queries</h4>
                                    <ul className="space-y-2 text-sm text-gray-300">
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Find extreme values (hottest, coolest, greenest areas)</li>
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Analyze proximity (find nearby locations)</li>
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Search and navigate to named places</li>
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Filter map view by environmental conditions</li>
                                    </ul>
                                </div>

                                {/* Comparisons & Trends */}
                                <div>
                                    <h4 className="font-semibold text-cyan-400 mb-3">Comparisons & Trends</h4>
                                    <ul className="space-y-2 text-sm text-gray-300">
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Compare multiple locations side-by-side</li>
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Analyze temporal trends over time</li>
                                        <li className="flex gap-2"><span className="text-cyan-400">•</span> Regional statistics & aggregations</li>
                                    </ul>
                                </div>

                                {/* Example Queries */}
                                <div>
                                    <h4 className="font-semibold text-cyan-400 mb-3">Example Questions</h4>
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

