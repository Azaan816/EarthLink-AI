"use client";

import React, { createContext, useContext, useReducer, ReactNode, useMemo } from "react";

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

type Action =
    | { type: 'OPEN' }
    | { type: 'CLOSE' }
    | { type: 'SET_CONTENT'; content: ReactNode; keepAlt?: boolean }
    | { type: 'TOGGLE' };

function layoutReducer(state: LayoutState, action: Action): LayoutState {
    switch (action.type) {
        case 'OPEN':
            return { ...state, isLeftSidebarOpen: true };
        case 'CLOSE':
            return { ...state, isLeftSidebarOpen: false };
        case 'SET_CONTENT': {
            let newAlt = state.leftSidebarAltContent;
            if (action.keepAlt) {
                if (state.leftSidebarContent) {
                    newAlt = state.leftSidebarContent;
                }
            } else {
                newAlt = null;
            }
            return {
                ...state,
                leftSidebarContent: action.content,
                leftSidebarAltContent: newAlt,
            };
        }
        case 'TOGGLE': {
            if (state.leftSidebarAltContent) {
                return {
                    ...state,
                    leftSidebarContent: state.leftSidebarAltContent,
                    leftSidebarAltContent: state.leftSidebarContent,
                };
            }
            return state;
        }
        default:
            return state;
    }
}

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(layoutReducer, {
        isLeftSidebarOpen: false,
        leftSidebarContent: null,
        leftSidebarAltContent: null,
    });

    const openLeftSidebar = React.useCallback(() => dispatch({ type: 'OPEN' }), []);
    const closeLeftSidebar = React.useCallback(() => dispatch({ type: 'CLOSE' }), []);
    const setLeftSidebarContent = React.useCallback((content: ReactNode, options?: { keepAlt?: boolean }) => {
        dispatch({ type: 'SET_CONTENT', content, keepAlt: options?.keepAlt });
    }, []);
    const toggleSidebarView = React.useCallback(() => dispatch({ type: 'TOGGLE' }), []);

    const dispatchValue = useMemo(() => ({
        openLeftSidebar,
        closeLeftSidebar,
        setLeftSidebarContent,
        toggleSidebarView,
    }), [openLeftSidebar, closeLeftSidebar, setLeftSidebarContent, toggleSidebarView]);

    return (
        <LayoutStateContext.Provider value={state}>
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
