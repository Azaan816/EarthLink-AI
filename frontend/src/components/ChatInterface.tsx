"use client";

import React from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import { Send, Plus, Loader2 } from "lucide-react";

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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim() || isPending) return;
        await submit();
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white border-l border-gray-800">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
                <h2 className="font-semibold text-lg text-emerald-400">EarthLink AI</h2>
                <button
                    onClick={() => startNewThread()}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
                    title="New Conversation"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
                {thread.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                            <Plus size={32} />
                        </div>
                        <h3 className="text-xl font-medium text-gray-200">Start your analysis</h3>
                        <p className="text-gray-400 max-w-xs">
                            Ask about site selection, vegetation changes, or satellite imagery in any location.
                        </p>
                    </div>
                ) : (
                    thread.messages.map((message) => (
                        <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2 ${message.role === 'user'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-800 text-gray-200'
                                    }`}
                            >
                                {Array.isArray(message.content) ? (
                                    message.content.map((part, i) =>
                                        part.type === "text" ? <p key={i} className="whitespace-pre-wrap">{part.text}</p> : null
                                    )
                                ) : (
                                    <p className="whitespace-pre-wrap">{String(message.content)}</p>
                                )}
                            </div>

                            {/* Tambo Generative UI Component */}
                            {message.renderedComponent && (
                                <div className="mt-4 w-full">
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

            {/* Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-md">
                <form onSubmit={handleSend} className="relative">
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
                        className="w-full bg-gray-800 border-gray-700 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none scrollbar-hide text-white placeholder-gray-500"
                        disabled={isPending}
                    />
                    <button
                        type="submit"
                        disabled={isPending || !value.trim()}
                        className="absolute right-2 top-1.5 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
                    >
                        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                    Powered by Gemini 1.5 Pro & Tambo AI
                </p>
            </div>
        </div>
    );
}
