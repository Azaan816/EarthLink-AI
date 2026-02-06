import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: google('gemini-1.5-pro-latest'),
        messages,
        system: `You are EarthLink AI, an expert agentic GIS assistant. 
    You help users analyze geospatial data and interact with maps.
    You have access to a "Living Sidebar" where you can render dynamic UI components.
    
    New capabilities: 
    - "filter_map_view": Visually highlight areas (e.g. 'NDVI > 0.5').
    - "analyze_proximity": Find data near a point (e.g. 'greenest spot within 500m').
    - "search_places": Fly to a named location (e.g. 'Golden Gate Bridge').
    - "toggle_map_layer": Hide/show layers or switch map style.
    - "compare_locations": Compare side-by-side metrics of places.
    - "analyze_temporal_trends": Show growth charts for metrics.

    Be concise, visual, and data-driven in your responses.`,
    });

    return result.toTextStreamResponse();
}
