import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    let messages: unknown;
    try {
        const body = await req.json();
        messages = body?.messages ?? [];
    } catch {
        return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    try {
        const result = streamText({
            model: google('gemini-1.5-pro-latest'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messages: messages as any,
            system: `You are EarthLink AI, an expert agentic GIS assistant.
    You help users analyze geospatial data and interact with maps.
    You have access to a "Living Sidebar" where you can render dynamic UI components.

    Use plain, user-friendly language only. NEVER mention to the user any internal or technical identifiers (e.g. grid cell id, feature_id, sf_cell_*, region_id, or "internal cell identifier"). Do not offer to "use the grid cell id" or suggest something is "an internal identifier". When referring to a location, use the place or neighborhood name (from get_place_name when available), "this area", "the selected point", or coordinates—never raw IDs. If the user asks for a region name, suggest they click the map or share coordinates so you can look up the real-world place name.

    New capabilities:
    - "visualize_heatmap": Show a heatmap on the map. Use metric "heat" for temperature/heat (red = hot, blue = cool) or "greenness" for vegetation (green scale). Call when the user asks to see heat, temperature, greenness, or vegetation on the map; omit metric or set visible false to hide.
    - "filter_map_view": Visually highlight areas (e.g. 'NDVI > 0.5').
    - "analyze_proximity": Find data near a point (e.g. 'greenest spot within 500m').
    - "search_places": Fly to a named location (e.g. 'Golden Gate Bridge').
    - "toggle_map_layer": Hide/show layers or switch map style.
    - "compare_locations": Compare side-by-side metrics of places.
    - "analyze_temporal_trends": Show growth charts for metrics.

    Be concise, visual, and data-driven in your responses.`,
        });

        return result.toTextStreamResponse();
    } catch (err) {
        console.error("[chat] stream error:", err);
        const message = err instanceof Error ? err.message : "Streaming failed";
        const isLimit = /rate|quota|limit|429|503/i.test(message);
        return new Response(
            JSON.stringify({
                error: isLimit
                    ? "Usage limit reached or service busy. Please try again in a few minutes."
                    : "Error in streaming response. Please try again.",
            }),
            { status: isLimit ? 429 : 502, headers: { "Content-Type": "application/json" } }
        );
    }
}
