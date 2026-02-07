"use client";

import React, { useMemo } from "react";
import { TamboProvider, TamboComponent, defineTool } from "@tambo-ai/react";
import { z } from "zod";
import { useMapChat } from "@/context/MapChatContext";
import { useLayoutDispatch } from "@/context/LayoutContext";
import { fetchPointInsight, fetchRegionInsight, fetchFindExtreme, fetchProximity, fetchComparison, fetchTemporalTrend } from "@/lib/insight-api";
import InsightCard from "@/components/InsightCard";
import MetricsTable from "@/components/MetricsTable";
import KeyTakeaways from "@/components/KeyTakeaways";
import RegionSummaryCard from "@/components/RegionSummaryCard";
import ComparisonTable, { ComparisonTableContent } from "@/components/ComparisonTable";
import GrowthChart from "@/components/GrowthChart";

const components: TamboComponent[] = [
  {
    name: "InsightCard",
    description:
      "Display an environmental or geospatial insight summary. Use when presenting results from get_insight_at_point or get_insight_for_region: show a card with title, optional subtitle (use place name or 'This area'—never feature_id or grid cell id), metrics (label-value pairs like NDVI, green_score, lst), and optional summary text.",
    component: InsightCard,
    propsSchema: z.object({
      title: z.string().optional().default("Environmental insight").describe("Card title"),
      subtitle: z.string().optional().describe("Optional subtitle: use place name or 'This area', never internal IDs"),
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
      "Display a table of metrics with bar, radar, and line charts whenever possible. For comparison: ALWAYS pass 'headers' (e.g. ['Metric','Western Addition','Mission']) and 'rows' (e.g. [{ Metric: 'LST', 'Western Addition': 35.82, 'Mission': 39.95 }]). Charts auto-render when headers+rows have 1+ location columns with numeric values. For single-location: pass 'metrics' (array of { label, value }).",
    component: MetricsTable,
    propsSchema: z.object({
      title: z.string().optional().default("Metrics").describe("Table title"),
      headers: z.array(z.string()).optional().describe("For comparison: e.g. ['Metric','Sunset','Mission']"),
      rows: z.array(z.any()).optional().describe("For comparison: array of objects e.g. [{ Metric: 'Heat score', Sunset: 0.23, Mission: 1 }]"),
      metricsToShow: z.array(z.string()).optional().describe("Only show these metrics in charts. Omit to show all."),
      metrics: z
        .array(z.object({ label: z.string().optional().default(""), value: z.union([z.string(), z.number()]).optional().default("—") }))
        .optional()
        .default([])
        .describe("Two-column: label and value pairs (use when not comparing)"),
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
      "Display a summary for a selected region. Use when get_insight_for_region returns count and aggregates: show title, area size (cell count), summary text, aggregatePairs (array of { name, value } e.g. ndvi_mean, green_score_max), and optional interpretation. Do not mention 'grid cells' or internal IDs to the user; say 'area' or 'region'.",
    component: RegionSummaryCard,
    propsSchema: z.object({
      title: z.string().optional().default("Region summary").describe("Card title"),
      cellCount: z.number().optional().describe("Number of areas in the region (internal; describe to user as 'area size' or similar)"),
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
    description: "Display comparison with bar/radar/line charts and table. Pass metricsToShow to show only relevant metrics (e.g. ['LST','Green Score'] for temp/greenness). Omit to show all metrics.",
    component: ComparisonTable,
    propsSchema: z.object({
      title: z.string().optional().default("Location Comparison"),
      comparison: z.array(z.any()).optional().default([]).describe("Array of comparison results from compare_locations tool."),
      metricsToShow: z.array(z.string()).optional().describe("Only show these metrics in charts. Omit to show all. E.g. ['LST','Green Score'] for temperature/greenness focus."),
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
  const { flyTo, selectedPoint, selectedRegion, setSelectedPoint, setSelectedRegion, setHighlightedLocations, setActiveFilter, setIsLayerVisible, setHeatmapMetric, setMapStyle } = useMapChat();
  const { setLeftSidebarContent, openLeftSidebar } = useLayoutDispatch();

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
        "Get environmental insight at a single point. Use only when the user selected a single point (one click). Do NOT use when the user drew a rectangle—use get_insight_for_region instead. Pass longitude/latitude, or omit to use the user's current point selection. When describing the location to the user, use get_place_name or 'this spot'—never mention feature_id or grid cell id.",
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
        "Get environmental insight for an area. Use when the user drew a rectangle on the map or asks about 'this area' or 'the selected region'. A selected point is treated as a small area around that point. Omit arguments to use the user's current selection (region or point). Returns area size and aggregates (mean/min/max).",
      inputSchema: z.object({
        bbox: z.array(z.number()).length(4).optional().describe("Bounding box [min_lng, min_lat, max_lng, max_lat]"),
        feature_id: z.string().optional().describe("Internal region id; do not expose to user"),
      }),
      outputSchema: z.any(),
      tool: async ({ bbox, feature_id }) => {
        let useBbox = bbox;
        let useFeatureId = feature_id;
        if (useBbox == null && useFeatureId == null && selectedRegion) {
          if (selectedRegion.type === "bbox") useBbox = selectedRegion.bbox;
          else useFeatureId = selectedRegion.id;
        }
        // Fallback: treat selected point as "this area" - create small bbox around it
        if (useBbox == null && useFeatureId == null && selectedPoint) {
          const d = 0.003; // ~300m - captures the grid cell containing the point
          useBbox = [
            selectedPoint.lng - d,
            selectedPoint.lat - d,
            selectedPoint.lng + d,
            selectedPoint.lat + d,
          ];
        }
        if (useBbox == null && useFeatureId == null) {
          return { error: "No region or point selected. Ask the user to click a point or draw a region on the map, or provide bbox or feature_id." };
        }
        const data = await fetchRegionInsight({ bbox: useBbox ?? undefined, feature_id: useFeatureId ?? undefined });
        return data;
      },
    });

    const findExtreme = defineTool({
      name: "find_extreme",
      description:
        "Find location(s) with highest or lowest value for a metric. Use for 'quieter place', 'hottest area', 'greenest spot', 'coolest place'. Set top_n>1 for multiple recommendations. ALWAYS call show_on_map after: with locations array when top_n>1 (to show all on map), or bbox/longitude+latitude when top_n=1.",
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
      description: `Highlight one or more locations on the map. Use for recommendations, find_extreme results, etc.

SINGLE LOCATION: pass bbox OR (longitude, latitude).
MULTIPLE LOCATIONS: pass locations array - e.g. from find_extreme with top_n>1. Show all recommended areas at once.

USAGE AFTER find_extreme (multiple results):
- show_on_map(locations: results.map(r => r.bbox ? { bbox: r.bbox } : { longitude: r.center.longitude, latitude: r.center.latitude }))
- Always show multiple recommended areas on the map when you return 2+ options.`,
      inputSchema: z.object({
        longitude: z.number().optional(),
        latitude: z.number().optional(),
        bbox: z.array(z.number()).length(4).optional().describe("[minLng, minLat, maxLng, maxLat]"),
        zoom: z.number().min(1).max(18).optional(),
        locations: z.array(z.union([
          z.object({ longitude: z.number(), latitude: z.number(), label: z.string().optional() }),
          z.object({ bbox: z.array(z.number()).length(4), label: z.string().optional() }),
        ])).optional().describe("Multiple locations to show. Use when recommending 2+ areas (e.g. find_extreme top_n>1)."),
      }),
      outputSchema: z.object({ success: z.boolean() }),
      tool: ({ longitude, latitude, bbox, zoom, locations }) => {
        if (locations && locations.length > 0) {
          const highlights: Array<{ type: "bbox"; bbox: [number, number, number, number] } | { type: "point"; lng: number; lat: number }> = [];
          for (const loc of locations as Array<{ longitude?: number; latitude?: number; bbox?: number[] }>) {
            if (loc.bbox && loc.bbox.length === 4) {
              highlights.push({ type: "bbox", bbox: [loc.bbox[0], loc.bbox[1], loc.bbox[2], loc.bbox[3]] as [number, number, number, number] });
            } else if (loc.longitude != null && loc.latitude != null) {
              highlights.push({ type: "point", lng: loc.longitude, lat: loc.latitude });
            }
          }
          setHighlightedLocations(highlights);
          setSelectedPoint(null);
          setSelectedRegion(null);
          const first = highlights[0];
          if (first?.type === "point") {
            flyTo(first.lng, first.lat, zoom ?? 11);
          } else if (first?.type === "bbox") {
            const [a, b, c, d] = first.bbox;
            flyTo((a + c) / 2, (b + d) / 2, zoom ?? 11);
          }
          return { success: true };
        }
        if (bbox != null && bbox.length === 4) {
          setHighlightedLocations([]);
          const numBbox: [number, number, number, number] = [Number(bbox[0]), Number(bbox[1]), Number(bbox[2]), Number(bbox[3])];
          setSelectedRegion({ type: "bbox", bbox: numBbox });
          setSelectedPoint(null);
          const centerLng = (numBbox[0] + numBbox[2]) / 2;
          const centerLat = (numBbox[1] + numBbox[3]) / 2;
          flyTo(centerLng, centerLat, zoom ?? 12);
        } else if (longitude != null && latitude != null) {
          setHighlightedLocations([]);
          setSelectedPoint({ lng: longitude, lat: latitude });
          setSelectedRegion(null);
          flyTo(longitude, latitude, zoom ?? 14);
        } else {
          return { success: false, error: "Provide locations array, or (longitude, latitude), or bbox." };
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
        "Find areas within a radius of a specific point. Use for 'find greenest spot within 500m' or 'what is near here'. Returns matching areas with distance. When describing results to the user, use place names or 'this area'—never feature_id or grid cell id.",
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

    const getPlaceName = defineTool({
      name: "get_place_name",
      description:
        "Get the human-readable name or address for a location (reverse geocoding). Use when the user asks for the name of the place, what this location is called, where is this, what address is this, or the name of the selected point. Pass longitude/latitude or omit to use the user's current point selection.",
      inputSchema: z.object({
        longitude: z.number().optional().describe("Longitude. Omit to use current map selection."),
        latitude: z.number().optional().describe("Latitude. Omit to use current map selection."),
      }),
      outputSchema: z.any(),
      tool: async ({ longitude, latitude }) => {
        let lng = longitude;
        let lat = latitude;
        if (lng == null || lat == null) {
          if (!selectedPoint) return { error: "No point selected. Click a location on the map first, or provide longitude and latitude." };
          lng = selectedPoint.lng;
          lat = selectedPoint.lat;
        }
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!mapboxToken) return { status: "error", error: "Mapbox token missing. Set NEXT_PUBLIC_MAPBOX_TOKEN for reverse geocoding.", display_name: null };
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&limit=1`
          );
          if (!res.ok) return { status: "error", message: `Mapbox API ${res.status}`, display_name: null };
          const data = await res.json();
          const features = data.features || [];
          if (features.length === 0) return { status: "not_found", display_name: null, address: {} };
          const f = features[0];
          const placeName = f.place_name || "";
          const context = f.context || [];
          const address: Record<string, string> = {};
          if (f.address) address.address = f.address;
          context.forEach((c: { id?: string; text?: string }) => {
            const key = (c.id || "").split(".")[0] || "region";
            if (c.text && !address[key]) address[key] = c.text;
          });
          return { status: "success", display_name: placeName, address };
        } catch (e) {
          return { status: "error", message: String(e), display_name: null };
        }
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

    const visualizeHeatmap = defineTool({
      name: "visualize_heatmap",
      description:
        "Show or hide a heatmap (choropleth) layer on the map. Use when the user asks to visualize heat, temperature, greenness, or vegetation on the map. Choose 'heat' for land surface heat (red = hot, blue = cool) or 'greenness' for vegetation (green scale). Call with visible: true and the chosen metric to show; use visible: false or metric: null to hide.",
      inputSchema: z.object({
        metric: z.enum(["heat", "greenness"]).optional().describe("'heat' = heat/temperature layer (warm colors), 'greenness' = vegetation layer (green colors). Omit to hide heatmap."),
        visible: z.boolean().optional().describe("True to show the heatmap layer, false to hide. Default true when metric is provided."),
      }),
      outputSchema: z.object({ success: z.boolean(), message: z.string().optional() }),
      tool: ({ metric, visible }) => {
        const show = visible !== false;
        if (metric) {
          setHeatmapMetric(metric);
          setIsLayerVisible(show);
          return { success: true, message: `Heatmap set to ${metric} (${show ? "visible" : "hidden"}).` };
        }
        setHeatmapMetric(null);
        setIsLayerVisible(show);
        return { success: true, message: "Heatmap layer turned off." };
      },
    });

    const compareLocations = defineTool({
      name: "compare_locations",
      description: `Compare multiple locations (points/regions) with bar charts, radar charts, and tables in the Analysis sidebar.

IMPORTANT - targets can be place names (geocoded automatically):
- compare_locations(targets: ["Sunset District", "Glen Park"]) - geocodes place names and compares.
- compare_locations(targets: ["Mission District", "Western Addition"]) - works with neighborhood names.
- compare_locations(targets: ["selected"]) - uses current map selection.
- For "compare with cooler neighborhood": add add_extreme: { metric: "lst", mode: "min" }.`,
      inputSchema: z.object({
        targets: z.array(z.union([
          z.object({
            feature_id: z.string().optional(),
            longitude: z.number().optional(),
            latitude: z.number().optional()
          }),
          z.string().describe("Place name (geocoded), 'selected' for map selection, 'point:lng,lat' for coords, 'feature:id' for ID")
        ])).optional().describe("List of targets. Place names like 'Sunset District' or 'Glen Park' are geocoded automatically."),
        add_extreme: z.object({
          metric: z.enum(["heat_score", "green_score", "lst", "ndvi", "evi", "ndbi", "bsi", "fog_score", "elevation", "slope", "night_lights"]).describe("Metric for extreme (e.g. lst for temp, green_score for vegetation)"),
          mode: z.enum(["min", "max"]).describe("min = coolest/greenest, max = hottest"),
          top_n: z.number().min(1).max(5).optional().default(1).describe("Number of extreme locations to add"),
        }).optional().describe("Auto-add extreme location(s) - e.g. { metric: 'lst', mode: 'min' } for coolest area. Use when user asks to compare with cooler/hotter/greenest neighborhood."),
        metricsToShow: z.array(z.string()).optional().describe("Only show these metrics in charts. E.g. ['LST','Heat Score','Green Score'] for temp focus. Omit to show all."),
      }),
      outputSchema: z.any(),
      tool: async ({ targets, add_extreme, metricsToShow }) => {
        let rawTargets = targets || [];
        const finalTargets: Array<{ feature_id?: string; longitude?: number; latitude?: number }> = [];

        for (const t of rawTargets) {
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
            } else {
              // Treat as place name - geocode it
              const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
              if (mapboxToken) {
                try {
                  const res = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(t)}.json?access_token=${mapboxToken}&bbox=-122.5155,37.7024,-122.3549,37.8324&proximity=-122.4194,37.7749&limit=1`
                  );
                  const data = await res.json();
                  const features = data?.features ?? [];
                  if (features.length > 0) {
                    const [lng, lat] = features[0].center;
                    finalTargets.push({ longitude: lng, latitude: lat });
                  }
                } catch {
                  // Skip on geocode failure
                }
              }
            }
          } else if (typeof t === "object" && t !== null) {
            finalTargets.push(t);
          }
        }

        // Fallback: If no targets and we have a selection, use it as one target
        if (finalTargets.length === 0 && selectedPoint) {
          finalTargets.push({ longitude: selectedPoint.lng, latitude: selectedPoint.lat });
        }

        // Auto-add extreme location (e.g. coolest area) when user asks "compare with cooler neighborhood"
        if (add_extreme) {
          const extremeRes = await fetchFindExtreme({
            metric: add_extreme.metric,
            mode: add_extreme.mode as "max" | "min",
            top_n: add_extreme.top_n ?? 1,
          });
          const results = extremeRes?.results ?? extremeRes;
          const arr = Array.isArray(results) ? results : [];
          for (let i = 0; i < Math.min(arr.length, add_extreme.top_n ?? 1); i++) {
            const r = arr[i];
            const center = r?.center;
            if (center?.longitude != null && center?.latitude != null) {
              finalTargets.push({ longitude: Number(center.longitude), latitude: Number(center.latitude) });
            } else {
              const bbox = r?.bbox;
              if (bbox && Array.isArray(bbox) && bbox.length >= 4) {
                const centerLng = (Number(bbox[0]) + Number(bbox[2])) / 2;
                const centerLat = (Number(bbox[1]) + Number(bbox[3])) / 2;
                finalTargets.push({ longitude: centerLng, latitude: centerLat });
              }
            }
          }
        }

        if (finalTargets.length === 0) return { error: "No valid locations to compare. Pass place names (e.g. 'Sunset District', 'Glen Park') in targets, click a point on the map and use 'selected', or provide coordinates as 'point:lng,lat'." };

        const response = await fetchComparison(finalTargets);

        // Extract comparison array from backend
        const comparison = (response && response.comparison) ? response.comparison : (Array.isArray(response) ? response : []);

        // Directly update Analysis sidebar with graphs when comparison data exists
        if (comparison && comparison.length > 0) {
          const safe = comparison.filter((c: { metrics?: unknown }) => {
            if (!c || !c.metrics || typeof c.metrics !== 'object' || Array.isArray(c.metrics)) return false;
            return Object.keys(c.metrics).length > 0;
          });
          if (safe.length > 0) {
            const metrics = metricsToShow && metricsToShow.length > 0 ? metricsToShow : (add_extreme ? (add_extreme.metric === "lst" ? ["LST", "Heat Score", "Green Score"] : add_extreme.metric === "green_score" ? ["Green Score", "NDVI", "LST"] : undefined) : undefined);
            setLeftSidebarContent(
              <ComparisonTableContent title="Location Comparison" comparison={safe} metricsToShow={metrics} />
            );
            openLeftSidebar();
          }
        }

        return comparison;
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
            locationLabel: undefined,
            title: `${metric.toUpperCase()} Trend Over Time`
          };
        }

        return response;
      }
    });

    return [navigateMap, getInsightAtPoint, getInsightForRegion, findExtreme, showOnMap, filterMapView, analyzeProximity, getPlaceName, searchPlaces, toggleMapLayer, visualizeHeatmap, compareLocations, analyzeTemporalTrends];
  }, [flyTo, selectedPoint, selectedRegion, setSelectedPoint, setSelectedRegion, setHighlightedLocations, setActiveFilter, setIsLayerVisible, setHeatmapMetric, setMapStyle, setLeftSidebarContent, openLeftSidebar]);
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
