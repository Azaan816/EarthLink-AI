"use client";

import React from "react";
import { TamboProvider, TamboComponent, TamboTool } from "@tambo-ai/react";

// Initial components registry (empty for now, will be populated in Phase 4)
const components: TamboComponent[] = [];

// Initial tools registry (empty for now, will be populated in Phase 4)
const tools: TamboTool[] = [];

export function TamboAIProvider({ children }: { children: React.ReactNode }) {
    const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;

    if (!apiKey) {
        console.warn("Tambo API key is missing. Generative UI features may be limited.");
    }

    return (
        <TamboProvider
            apiKey={apiKey || ""}
            components={components}
            tools={tools}
            streaming={true}
            autoGenerateThreadName={true}
        >
            {children}
        </TamboProvider>
    );
}
