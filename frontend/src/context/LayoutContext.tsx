"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface LayoutState {
    isLeftSidebarOpen: boolean;
    leftSidebarContent: ReactNode | null;
}

interface LayoutDispatch {
    openLeftSidebar: () => void;
    closeLeftSidebar: () => void;
    setLeftSidebarContent: (content: ReactNode) => void;
}

const LayoutStateContext = createContext<LayoutState | undefined>(undefined);
const LayoutDispatchContext = createContext<LayoutDispatch | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [leftSidebarContent, setLeftSidebarContent] = useState<ReactNode | null>(null);

    const openLeftSidebar = React.useCallback(() => setIsLeftSidebarOpen(true), []);
    const closeLeftSidebar = React.useCallback(() => setIsLeftSidebarOpen(false), []);
    // setLeftSidebarContent is already stable from useState, but good to be explicit if we wrapped it. 
    // Actually setLeftSidebarContent from useState is stable.

    const stateValue = React.useMemo(() => ({
        isLeftSidebarOpen,
        leftSidebarContent
    }), [isLeftSidebarOpen, leftSidebarContent]);

    const dispatchValue = React.useMemo(() => ({
        openLeftSidebar,
        closeLeftSidebar,
        setLeftSidebarContent
    }), [openLeftSidebar, closeLeftSidebar]);

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
