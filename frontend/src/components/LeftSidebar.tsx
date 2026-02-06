"use client";

import React from "react";
import { X } from "lucide-react";
import { useLayout } from "@/context/LayoutContext";

export default function LeftSidebar() {
    const { isLeftSidebarOpen, leftSidebarContent, closeLeftSidebar } = useLayout();

    // If closed, we can either return null or keep it in DOM but hidden.
    // Sliding animation suggests keeping it in DOM with transform.

    return (
        <div
            className={`absolute left-0 top-0 h-full bg-gray-900 border-r border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out z-30 w-[500px] flex flex-col ${isLeftSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
        >
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
                <h2 className="font-semibold text-lg text-emerald-400">Analysis</h2>
                <button
                    onClick={closeLeftSidebar}
                    className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    title="Close Sidebar"
                >
                    <X size={20} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {leftSidebarContent || (
                    <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                        <p>Select an item from the chat to view details here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
