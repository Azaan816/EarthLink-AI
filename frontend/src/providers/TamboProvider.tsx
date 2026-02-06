"use client";

import React, { useMemo } from "react";
import { TamboProvider, TamboComponent, defineTool } from "@tambo-ai/react";
import { z } from "zod";
import { useMapChat } from "@/context/MapChatContext";
import { fetchPointInsight, fetchRegionInsight, fetchFindExtreme, fetchProximity, fetchComparison, fetchTemporalTrend } from "@/lib/insight-api";
import InsightCard from "@/components/InsightCard";
import MetricsTable from "@/components/MetricsTable";
import KeyTakeaways from "@/components/KeyTakeaways";
import RegionSummaryCard from "@/components/RegionSummaryCard";
import ComparisonTable from "@/components/ComparisonTable";
import GrowthChart from "@/components/GrowthChart";

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
  {
    name: "ComparisonTable",
    description: "Display a side-by-side comparison of multiple locations. Use when the user asks to compare two or more places. Shows metrics for each location.",
    component: ComparisonTable,
    propsSchema: z.object({
      title: z.string().optional().default("Location Comparison"),
      comparison: z.array(z.any()).optional().default([]).describe("Array of comparison results from compare_locations tool"),
    }),
  },
  {
    name: "GrowthChart",
    description: "Display a line chart showing a trend over time. Use when analyzing temporal trends (e.g. 'how has NDVI changed?').",
    component: GrowthChart,
    propsSchema: z.object({
      title: z.string().optional(),
      metric: z.string().optional().default("Value").describe("Metric being displayed (e.g. NDVI)"),
      locationLabel: z.string().optional().describe("Label for the location"),
      trend: z.array(z.object({
        year: z.number().optional().default(0),
        value: z.number().optional().default(0)
      })).optional().default([]).describe("Array of {year, value} objects"),
    }),
  },
];

function useMapChatTools() {
  const { flyTo, selectedPoint, selectedRegion, setSelectedPoint, setSelectedRegion, setActiveFilter, setIsLayerVisible, setMapStyle } = useMapChat();

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
      description: `Highlight a location on the map by showing a pin or highlighting an area.

USAGE AFTER find_extreme or analyze_proximity:
- These tools return results with a 'bbox' field
- ALWAYS pass that bbox directly: show_on_map(bbox: results[0].bbox)
- Example: If results[0].bbox = [-122.46, 37.70, -122.45, 37.71], pass that exact array

USAGE FOR COORDINATES:
- Pass both longitude AND latitude together: show_on_map(longitude: -122.4613, latitude: 37.7073)

CRITICAL: You MUST provide EITHER bbox OR (longitude AND latitude). Never call this tool without parameters.`,
      inputSchema: z.object({
        longitude: z.number().optional().describe("Center longitude. Required if bbox not provided. Example: -122.4613"),
        latitude: z.number().optional().describe("Center latitude. Required if bbox not provided. Example: 37.7073"),
        bbox: z.array(z.number()).length(4).optional().describe("Array [minLng, minLat, maxLng, maxLat]. Get from results[0].bbox after find_extreme or analyze_proximity. Example: [-122.46, 37.70, -122.45, 37.71]. PREFERRED for highlighting grid cells."),
        zoom: z.number().min(1).max(18).optional().describe("Map zoom level (default 14 for pin, 12 for area)"),
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



    const filterMapView = defineTool({
      name: "filter_map_view",
      description:
        "Filter the map visual style to show only specific areas. Use when user says 'show me only hot areas' or 'highlight areas with high NDVI'. This sets a visual filter on the map.",
      inputSchema: z.object({
        filter: z.string().describe("Filter expression description (e.g. 'NDVI > 0.5', 'Heat Score > 0.8')"),
      }),
      outputSchema: z.object({ success: z.boolean() }),
      tool: ({ filter }) => {
        setActiveFilter(filter);
        return { success: true, message: `Map filter set to: ${filter}` };
      },
    });

    const analyzeProximity = defineTool({
      name: "analyze_proximity",
      description:
        "Find grid cells within a radius of a specific point. Use for 'find greenest spot within 500m' or 'what is near here'. Returns specific matching cells with their distance.",
      inputSchema: z.object({
        longitude: z.number().optional().describe("Center longitude (defaults to selected point)"),
        latitude: z.number().optional().describe("Center latitude (defaults to selected point)"),
        radius_meters: z.number().optional().default(1000).describe("Radius in meters (default 1000)"),
        metric: z.enum(["green_score", "heat_score", "ndvi", "lst"]).optional().describe("Optional metric to filter by (e.g. green_score)"),
        threshold: z.number().optional().describe("Optional minimum threshold for the metric (e.g. 0.5)"),
      }),
      outputSchema: z.any(),
      tool: async ({ longitude, latitude, radius_meters, metric, threshold }) => {
        let lng = longitude;
        let lat = latitude;
        if (lng == null || lat == null) {
          if (!selectedPoint) return { error: "No point selected. Provide location or select a point." };
          lng = selectedPoint.lng;
          lat = selectedPoint.lat;
        }
        return await fetchProximity({ longitude: lng, latitude: lat, radius_meters, metric, threshold });
      },
    });

    const searchPlaces = defineTool({
      name: "search_places",
      description:
        "Search for a place by name (Geocoding) and fly to it. Use when user asks to 'go to [Place Name]'.",
      inputSchema: z.object({
        query: z.string().describe("Place name to search for (e.g. 'Golden Gate Bridge', 'Ferry Building')"),
      }),
      outputSchema: z.any(),
      tool: async ({ query }) => {
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!mapboxToken) return { error: "Mapbox token missing" };

        try {
          // Increase limit to 5 to find better matches
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&bbox=-122.5155,37.7024,-122.3549,37.8324&proximity=-122.4194,37.7749&limit=5`
          );
          const data = await res.json();
          if (!data.features || data.features.length === 0) {
            return { found: false, message: "Place not found in San Francisco." };
          }

          // Improved selection logic: prioritize POIs and exact name matches
          let bestFeature = data.features[0];

          // Look for a POI with high relevance
          const poiMatch = data.features.find((f: any) =>
            (f.place_type.includes("poi") || f.place_type.includes("landmark")) && f.relevance > 0.8
          );

          if (poiMatch) {
            bestFeature = poiMatch;
          }

          const feature = bestFeature;
          const [lng, lat] = feature.center;
          flyTo(lng, lat, 14);
          setSelectedPoint({ lng, lat });
          setSelectedRegion(null);
          return { found: true, name: feature.text, coordinates: { lng, lat } };
        } catch (e) {
          return { error: "Geocoding failed" };
        }
      },
    });


    const toggleMapLayer = defineTool({
      name: "toggle_map_layer",
      description: "Control map visibility and style. Use to hide/show data or switch to satellite view.",
      inputSchema: z.object({
        layer_visible: z.boolean().optional().describe("True to show data layer, false to hide"),
        map_style: z.enum(["dark", "satellite"]).optional().describe("Map style"),
      }),
      outputSchema: z.object({ success: z.boolean() }),
      tool: ({ layer_visible, map_style }) => {
        if (layer_visible !== undefined) setIsLayerVisible(layer_visible);
        if (map_style !== undefined) setMapStyle(map_style);
        return { success: true };
      },
    });

    const compareLocations = defineTool({
      name: "compare_locations",
      description: "Compare the user's selected location (or specific points) with others. Use for questions like 'compare this with Ferry Building'.",
      inputSchema: z.object({
        targets: z.array(z.union([
          z.object({
            feature_id: z.string().optional(),
            longitude: z.number().optional(),
            latitude: z.number().optional()
          }),
          z.string().describe("Shorthand: 'selected' for current point, 'point:lng,lat' for coords, 'feature:id' for ID")
        ])).optional().describe("List of targets. Can be objects or shorthand strings."),
        placeholder_target_query: z.string().optional()
      }),
      outputSchema: z.any(),
      tool: async ({ targets }) => {
        console.log("[Tambo] compare_locations called with:", JSON.stringify(targets));
        let rawTargets = targets || [];
        const finalTargets: Array<{ feature_id?: string; longitude?: number; latitude?: number }> = [];

        for (const t of rawTargets) {
          console.log(`[Tambo] processing target: ${JSON.stringify(t)}, type: ${typeof t}`);
          if (typeof t === "string") {
            const lower = t.toLowerCase();
            if (lower === "selected" || lower === "current") {
              if (selectedPoint) {
                finalTargets.push({ longitude: selectedPoint.lng, latitude: selectedPoint.lat });
              }
            } else if (lower.startsWith("point:")) {
              const parts = lower.replace("point:", "").split(",");
              if (parts.length === 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lng) && !isNaN(lat)) {
                  finalTargets.push({ longitude: lng, latitude: lat });
                }
              }
            } else if (lower.startsWith("feature:")) {
              finalTargets.push({ feature_id: lower.replace("feature:", "") });
            }
          } else if (typeof t === "object" && t !== null) {
            // It's already an object, pass it through
            finalTargets.push(t);
          }
        }

        // Fallback: If no targets and we have a selection, use it as one target
        // (though comparison usually needs >1, the backend handles single lookup too)
        if (finalTargets.length === 0 && selectedPoint) {
          finalTargets.push({ longitude: selectedPoint.lng, latitude: selectedPoint.lat });
        }

        if (finalTargets.length === 0) return { error: "No valid locations to compare." };

        const response = await fetchComparison(finalTargets);

        // Extract just the comparison array from the backend response
        // Backend returns: { status: "success", comparison: [...] }
        // Component expects: just the array
        if (response && response.comparison) {
          return response.comparison;
        }

        return response;
      },
    });

    const analyzeTemporalTrends = defineTool({
      name: "analyze_temporal_trends",
      description: "Show a trend over time for a location. Use for 'how has vegetation changed here?'. Returns trend data.",
      inputSchema: z.object({
        metric: z.enum(
          ["heat_score", "green_score", "lst", "ndvi", "evi", "ndbi", "bsi", "fog_score", "elevation", "slope", "night_lights"]
        ).describe("Metric to analyze"),
        longitude: z.number().optional(),
        latitude: z.number().optional(),
        feature_id: z.string().optional()
      }),
      outputSchema: z.any(),
      tool: async ({ metric, longitude, latitude, feature_id }) => {
        let lng = longitude;
        let lat = latitude;
        // Use selection if not provided
        if (lng == null && lat == null && feature_id == null) {
          if (selectedPoint) {
            lng = selectedPoint.lng;
            lat = selectedPoint.lat;
          } else if (selectedRegion && selectedRegion.type === "featureId") {
            // Not supported well yet, but maybe
          } else {
            return { error: "No location selected." };
          }
        }
        const response = await fetchTemporalTrend({ metric, longitude: lng, latitude: lat, feature_id });

        // Extract and format data for GrowthChart component
        // Backend returns: { status, location_id, metric, trend, hint }
        // Component expects: { title, metric, locationLabel, trend }
        if (response && response.trend) {
          return {
            trend: response.trend,
            metric: response.metric || metric,
            locationLabel: response.location_id ? `Grid Cell ${response.location_id}` : undefined,
            title: `${metric.toUpperCase()} Trend Over Time`
          };
        }

        return response;
      }
    });

    return [navigateMap, getInsightAtPoint, getInsightForRegion, findExtreme, showOnMap, filterMapView, analyzeProximity, searchPlaces, toggleMapLayer, compareLocations, analyzeTemporalTrends];
  }, [flyTo, selectedPoint, selectedRegion, setSelectedPoint, setSelectedRegion, setActiveFilter, setIsLayerVisible, setMapStyle]);
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
