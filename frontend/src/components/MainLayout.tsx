"use client";

import React from "react";
import MapComponent from "@/components/Map";
import ChatInterface from "@/components/ChatInterface";
import LeftSidebar from "@/components/LeftSidebar";
import { useLayout } from "@/context/LayoutContext";

export default function MainLayout() {
    const { isLeftSidebarOpen } = useLayout();

    return (
        <main className="flex h-screen w-screen overflow-hidden bg-gray-900 relative">
            {/* Left Sidebar (Absolute to slide in) or Relative if we want push? 
          Plan said "Collapsible Left Sidebar... Map shrinks when Left pane opens" -> Fly-to-Fit.
          So we probably want flex layout where LeftSidebar takes space when open.
          Let's change LeftSidebar to NOT be absolute, but controlled by width/flex. 
          WAIT, the previous LeftSidebar code I generated WAS absolute. 
          Refining plan: Let's make it push the map so we can resize.
      */}

            {/* Left Sidebar Container - Handling the transition here for layout shift */}
            <div
                className={`flex-shrink-0 h-full transition-all duration-300 ease-in-out border-r border-gray-800 bg-gray-900 overflow-hidden relative ${isLeftSidebarOpen ? "w-[500px]" : "w-0"
                    }`}
            >
                <div className="w-[500px] h-full absolute right-0 top-0">
                    {/* We render a simplified version of LeftSidebar logic here or just import content */}
                    <LeftSidebarContentWrapper />
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative min-w-0">
                <MapComponent />
            </div>

            {/* Right Sidebar (Chat) */}
            <div className="w-[400px] flex-shrink-0 z-20 shadow-2xl border-l border-gray-800">
                <ChatInterface />
            </div>
        </main>
    );
}

// Inner component to properly use context inside the sidebar area if needed, 
// but actually I should probably just rewrite LeftSidebar to be "content only" or adapt it.
// Let's re-use the LeftSidebar component but modify its CSS in the next step to fit this "flex push" model 
// OR just put the content here.
import { X, BarChart3 } from "lucide-react";

function LeftSidebarContentWrapper() {
    const { leftSidebarContent, leftSidebarAltContent, closeLeftSidebar, toggleSidebarView } = useLayout();
    const canToggle = leftSidebarAltContent != null;
    return (
        <div className="flex flex-col h-full w-full bg-gray-900">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md gap-2">
                <h2 className="font-semibold text-lg text-emerald-400 shrink-0">Analysis</h2>
                <div className="flex items-center gap-1 shrink-0">
                    {canToggle && (
                        <button
                            onClick={toggleSidebarView}
                            className="p-1.5 text-gray-400 hover:text-emerald-400 rounded transition-colors"
                            title="Toggle between summary and graphs"
                        >
                            <BarChart3 size={18} />
                        </button>
                    )}
                    <button
                        onClick={closeLeftSidebar}
                        className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                        title="Close Sidebar"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {leftSidebarContent || (
                    <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                        <p>Select an item from the chat to view details here.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
