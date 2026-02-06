"use client";

import React, { useMemo } from "react";
import { TamboProvider, TamboComponent, defineTool } from "@tambo-ai/react";
import { z } from "zod";
import { useMapChat } from "@/context/MapChatContext";
import { fetchPointInsight, fetchRegionInsight, fetchFindExtreme } from "@/lib/insight-api";
import InsightCard from "@/components/InsightCard";
import MetricsTable from "@/components/MetricsTable";
import KeyTakeaways from "@/components/KeyTakeaways";
import RegionSummaryCard from "@/components/RegionSummaryCard";

const components: TamboComponent[] = [
  {
    name: "InsightCard",
    description:
      "Display an environmental or geospatial insight summary. Use when presenting results from get_insight_at_point or get_insight_for_region: show a card with title, optional subtitle (e.g. feature_id), metrics (label-value pairs like NDVI, green_score, lst), and optional summary text.",
    component: InsightCard,
    propsSchema: z.object({
      title: z.string().optional().default("Environmental insight").describe("Card title"),
      subtitle: z.string().optional().describe("Optional subtitle, e.g. grid cell id"),
      metrics: z
        .array(
          z.object({
            label: z.string().optional().default(""),
            value: z.union([z.string(), z.number()]).optional().default("—"),
          })
        )
        .optional()
        .describe("Key metrics to show, e.g. [{ label: 'NDVI', value: 0.42 }]"),
      summary: z.string().optional().describe("Short human-readable summary"),
    }),
  },
  {
    name: "MetricsTable",
    description:
      "Display a table of metrics. Pass 'metrics' (array of { label, value }) for a two-column table. Good for comparing indicators (NDVI, LST, green_score, heat_score, elevation, slope, etc.).",
    component: MetricsTable,
    propsSchema: z.object({
      title: z.string().optional().default("Metrics").describe("Table title"),
      metrics: z
        .array(z.object({ label: z.string().optional().default(""), value: z.union([z.string(), z.number()]).optional().default("—") }))
        .optional()
        .default([])
        .describe("Two-column: label and value pairs"),
    }),
  },
  {
    name: "KeyTakeaways",
    description:
      "Display a bullet list of key takeaways or conclusions. Use after presenting data to summarize what matters: e.g. 'Area is heat-vulnerable', 'High greenery reduces heat', 'Consider shade and vegetation for cooling'.",
    component: KeyTakeaways,
    propsSchema: z.object({
      title: z.string().optional().default("Key takeaways").describe("Section title"),
      items: z.array(z.string()).optional().default([]).describe("List of short takeaway strings"),
    }),
  },
  {
    name: "RegionSummaryCard",
    description:
      "Display a summary for a selected region (multiple grid cells). Use when get_insight_for_region returns count and aggregates: show title, cell count, summary text, aggregatePairs (array of { name, value } e.g. ndvi_mean, green_score_max), and optional interpretation.",
    component: RegionSummaryCard,
    propsSchema: z.object({
      title: z.string().optional().default("Region summary").describe("Card title"),
      cellCount: z.number().optional().describe("Number of grid cells in the region"),
      summary: z.string().optional().describe("Short narrative summary of the region"),
      aggregatePairs: z
        .array(z.object({ name: z.string().optional().default(""), value: z.number().optional().default(0) }))
        .optional()
        .default([])
        .describe("Aggregate stats as [{ name: 'ndvi_mean', value: 0.42 }, ...]"),
      interpretation: z.string().optional().describe("Interpretation or recommendation"),
    }),
  },
];

function useMapChatTools() {
  const { flyTo, selectedPoint, selectedRegion, setSelectedPoint, setSelectedRegion } = useMapChat();

  return useMemo(() => {
    const navigateMap = defineTool({
      name: "navigate_map",
      description:
        "Fly the map to a given latitude and longitude. Use this when the user asks to go to a location, show an area, or zoom to a place in San Francisco.",
      inputSchema: z.object({
        longitude: z.number().describe("Longitude (e.g. -122.42 for SF)"),
        latitude: z.number().describe("Latitude (e.g. 37.77 for SF)"),
        zoom: z.number().min(1).max(18).optional().describe("Map zoom level (default 11)"),
      }),
      outputSchema: z.object({ success: z.boolean() }),
      tool: ({ longitude, latitude, zoom }) => {
        flyTo(longitude, latitude, zoom);
        return { success: true };
      },
    });

    const getInsightAtPoint = defineTool({
      name: "get_insight_at_point",
      description:
        "Get environmental insight at a single POINT (one grid cell). Use only when the user selected a single point (Point mode, one click). Do NOT use when the user drew a rectangular area—use get_insight_for_region instead. Pass longitude/latitude, or omit to use the user's current point selection.",
      inputSchema: z.object({
        longitude: z.number().optional().describe("Longitude. Omit to use current map selection."),
        latitude: z.number().optional().describe("Latitude. Omit to use current map selection."),
      }),
      outputSchema: z.any(),
      tool: async ({ longitude, latitude }) => {
        let lng = longitude;
        let lat = latitude;
        if (lng == null || lat == null) {
          if (!selectedPoint) return { error: "No point selected on the map. Ask the user to click a location first, or provide longitude and latitude." };
          lng = selectedPoint.lng;
          lat = selectedPoint.lat;
        }
        const data = await fetchPointInsight(lng, lat);
        return data;
      },
    });

    const getInsightForRegion = defineTool({
      name: "get_insight_for_region",
      description:
        "Get environmental insight for an AREA (multiple grid cells). Use this when the user drew a rectangle on the map or asks about 'this area' or 'the selected region'. Omit arguments to use the user's current region selection. Returns cell count and aggregates (mean/min/max across the area)—use this to describe the whole area, not a single cell. Prefer this over get_insight_at_point whenever a rectangular area is selected.",
      inputSchema: z.object({
        bbox: z.array(z.number()).length(4).optional().describe("Bounding box [min_lng, min_lat, max_lng, max_lat]"),
        feature_id: z.string().optional().describe("Grid cell feature id (e.g. from the SF layer)"),
      }),
      outputSchema: z.any(),
      tool: async ({ bbox, feature_id }) => {
        let useBbox = bbox;
        let useFeatureId = feature_id;
        if (useBbox == null && useFeatureId == null && selectedRegion) {
          if (selectedRegion.type === "bbox") useBbox = selectedRegion.bbox;
          else useFeatureId = selectedRegion.id;
        }
        if (useBbox == null && useFeatureId == null) {
          return { error: "No region selected. Ask the user to draw or select a region, or provide bbox or feature_id." };
        }
        const data = await fetchRegionInsight({ bbox: useBbox ?? undefined, feature_id: useFeatureId ?? undefined });
        return data;
      },
    });

    const findExtreme = defineTool({
      name: "find_extreme",
      description:
        "Find the location(s) with highest or lowest value for a metric in San Francisco. Use for questions like 'hottest area', 'greenest spot', 'coolest place'. Returns for each: center (longitude, latitude), bbox [min_lng, min_lat, max_lng, max_lat]. Then call show_on_map with bbox to highlight the area, or with center for a pin only.",
      inputSchema: z.object({
        metric: z
          .enum([
            "heat_score",
            "green_score",
            "lst",
            "ndvi",
            "evi",
            "ndbi",
            "bsi",
            "fog_score",
            "elevation",
            "slope",
            "night_lights",
          ])
          .describe("Metric: heat_score (heat), green_score (greenery), lst (temp), ndvi, etc."),
        mode: z.enum(["max", "min"]).optional().default("max").describe("max = hottest/greenest, min = coolest/least green"),
        top_n: z.number().min(1).max(20).optional().default(1).describe("Return top N locations (1-20, default 1)"),
      }),
      outputSchema: z.any(),
      tool: async ({ metric, mode, top_n }) => {
        const data = await fetchFindExtreme({ metric, mode: mode as "max" | "min", top_n });
        return data;
      },
    });

    const showOnMap = defineTool({
      name: "show_on_map",
      description:
        "Show a location on the map: either as a pinpoint (green pin) or by highlighting the area (green rectangle). Use after find_extreme. To highlight the area, pass the result's bbox (e.g. results[0].bbox). For only a pin, pass longitude and latitude (e.g. results[0].center.longitude, results[0].center.latitude). Prefer bbox when the user asks for 'area' or 'location' so the cell is visibly highlighted.",
      inputSchema: z.object({
        longitude: z.number().optional().describe("Center longitude for a pin. Omit if using bbox to highlight area."),
        latitude: z.number().optional().describe("Center latitude for a pin. Omit if using bbox to highlight area."),
        bbox: z.array(z.number()).length(4).optional().describe("[min_lng, min_lat, max_lng, max_lat] from find_extreme result—use this to highlight the area (green rectangle) on the map"),
        zoom: z.number().min(1).max(18).optional().describe("Map zoom (default 14 for pin, 12 for area)"),
      }),
      outputSchema: z.object({ success: z.boolean() }),
      tool: ({ longitude, latitude, bbox, zoom }) => {
        if (bbox != null && bbox.length === 4) {
          const numBbox: [number, number, number, number] = [
            Number(bbox[0]),
            Number(bbox[1]),
            Number(bbox[2]),
            Number(bbox[3]),
          ];
          setSelectedRegion({ type: "bbox", bbox: numBbox });
          setSelectedPoint(null);
          const centerLng = (numBbox[0] + numBbox[2]) / 2;
          const centerLat = (numBbox[1] + numBbox[3]) / 2;
          flyTo(centerLng, centerLat, zoom ?? 12);
        } else if (longitude != null && latitude != null) {
          setSelectedPoint({ lng: longitude, lat: latitude });
          setSelectedRegion(null);
          flyTo(longitude, latitude, zoom ?? 14);
        } else {
          return { success: false, error: "Provide either (longitude, latitude) or bbox." };
        }
        return { success: true };
      },
    });

    return [navigateMap, getInsightAtPoint, getInsightForRegion, findExtreme, showOnMap];
  }, [flyTo, selectedPoint, selectedRegion, setSelectedPoint, setSelectedRegion]);
}

export function TamboAIProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;
  const tools = useMapChatTools();

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
