"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface LayoutState {
    isLeftSidebarOpen: boolean;
    leftSidebarContent: ReactNode | null;
    /** Previous content (e.g. graphs) - used for toggle between summary and graphs */
    leftSidebarAltContent: ReactNode | null;
}

interface LayoutDispatch {
    openLeftSidebar: () => void;
    closeLeftSidebar: () => void;
    setLeftSidebarContent: (content: ReactNode, options?: { keepAlt?: boolean }) => void;
    toggleSidebarView: () => void;
}

const LayoutStateContext = createContext<LayoutState | undefined>(undefined);
const LayoutDispatchContext = createContext<LayoutDispatch | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [leftSidebarContent, setLeftSidebarContentState] = useState<ReactNode | null>(null);
    const [leftSidebarAltContent, setLeftSidebarAltContent] = useState<ReactNode | null>(null);

    const openLeftSidebar = React.useCallback(() => setIsLeftSidebarOpen(true), []);
    const closeLeftSidebar = React.useCallback(() => setIsLeftSidebarOpen(false), []);

    const setLeftSidebarContent = React.useCallback((content: ReactNode, options?: { keepAlt?: boolean }) => {
        setLeftSidebarContentState((prev) => {
            if (options?.keepAlt && prev) {
                setLeftSidebarAltContent(prev);
            } else if (!options?.keepAlt) {
                setLeftSidebarAltContent(null);
            }
            return content;
        });
    }, []);

    const toggleSidebarView = React.useCallback(() => {
        setLeftSidebarContentState((prev) => {
            setLeftSidebarAltContent((alt) => {
                if (alt != null) setLeftSidebarContentState(alt);
                return prev;
            });
            return prev;
        });
    }, []);

    const stateValue = React.useMemo(() => ({
        isLeftSidebarOpen,
        leftSidebarContent,
        leftSidebarAltContent,
    }), [isLeftSidebarOpen, leftSidebarContent, leftSidebarAltContent]);

    const dispatchValue = React.useMemo(() => ({
        openLeftSidebar,
        closeLeftSidebar,
        setLeftSidebarContent,
        toggleSidebarView,
    }), [openLeftSidebar, closeLeftSidebar, setLeftSidebarContent, toggleSidebarView]);

    return (
        <LayoutStateContext.Provider value={stateValue}>
            <LayoutDispatchContext.Provider value={dispatchValue}>
                {children}
            </LayoutDispatchContext.Provider>
        </LayoutStateContext.Provider>
    );
}

export function useLayoutState() {
    const context = useContext(LayoutStateContext);
    if (context === undefined) {
        throw new Error("useLayoutState must be used within a LayoutProvider");
    }
    return context;
}

export function useLayoutDispatch() {
    const context = useContext(LayoutDispatchContext);
    if (context === undefined) {
        throw new Error("useLayoutDispatch must be used within a LayoutProvider");
    }
    return context;
}

// Legacy support if needed, or for components that need both
export function useLayout() {
    return { ...useLayoutState(), ...useLayoutDispatch() };
}
