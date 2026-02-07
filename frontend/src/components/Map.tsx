"use client";

import React, { useRef, useEffect } from "react";
import Map, { NavigationControl, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapChat, type HighlightedLocation } from "@/context/MapChatContext";
import { MapPin, Square, Layers } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function bboxToGeoJSON(bbox: [number, number, number, number]) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
    properties: {},
  };
}

function createMapboxFilter(filterExpression: string): any[] {
  // Simple parser for "Metric > Value" or "Metric < Value"
  // e.g. "NDVI > 0.5", "Heat Score < 0.3"
  // Returns a Mapbox filter expression
  try {
    const lower = filterExpression.toLowerCase();
    const parts = lower.split(/(>|<|=)/).map(s => s.trim());

    if (parts.length !== 3) return ["all"];

    const [metricRaw, operator, valueRaw] = parts;
    const value = parseFloat(valueRaw);

    if (isNaN(value)) return ["all"];

    // Map human metric names to properties
    const metricMap: Record<string, string> = {
      "ndvi": "ndvi",
      "green_score": "green_score",
      "green score": "green_score",
      "heat_score": "heat_score",
      "heat score": "heat_score",
      "lst": "lst",
      "elevation": "elevation"
    };

    const prop = metricMap[metricRaw] || metricRaw;

    // Mapbox filter syntax: [operator, property, value]
    // Note: 'properties.' prefix is implied in data-driven styling but for filter we use ["get", prop] usually, 
    // or ["operator", ["get", prop], value]

    // For 'filter' prop on Layer/Source, we can use:
    // [">", ["get", "ndvi"], 0.5]

    return [operator, ["get", prop], value];

  } catch (e) {
    console.warn("Failed to parse filter:", filterExpression);
    return ["all"];
  }
}


const PULSE_SPEED = 0.5;

function highlightedToGeoJSON(locations: HighlightedLocation[]) {
  const points: Array<{ type: 'Feature'; properties: { index: number }; geometry: { type: 'Point'; coordinates: [number, number] } }> = [];
  const polygons: Array<{ type: 'Feature'; properties: { index: number }; geometry: { type: 'Polygon'; coordinates: number[][][] } }> = [];
  locations.forEach((loc, i) => {
    if (loc.type === 'point') {
      points.push({
        type: 'Feature',
        properties: { index: i },
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      });
    } else {
      const [minLng, minLat, maxLng, maxLat] = loc.bbox;
      polygons.push({
        type: 'Feature',
        properties: { index: i },
        geometry: {
          type: 'Polygon',
          coordinates: [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]],
        },
      });
    }
  });
  return {
    points: { type: 'FeatureCollection' as const, features: points },
    polygons: { type: 'FeatureCollection' as const, features: polygons },
  };
}

function HighlightedLocationsLayer({ locations }: { locations: HighlightedLocation[] }) {
  console.log("Rendering HighlightedLocationsLayer with:", locations);
  const { points, polygons } = highlightedToGeoJSON(locations);
  console.log("GeoJSON generated:", { points, polygons });
  return (
    <>
      {points.features.length > 0 && (
        <Source id="highlighted-points" type="geojson" data={points}>
          <Layer
            id="highlighted-points-circle"
            type="circle"
            paint={{
              "circle-radius": 10,
              "circle-color": "#22d3ee",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fff",
              "circle-opacity": 0.9,
            }}
          />
        </Source>
      )}
      {polygons.features.length > 0 && (
        <Source id="highlighted-polygons" type="geojson" data={polygons}>
          <Layer
            id="highlighted-polygons-fill"
            type="fill"
            paint={{
              "fill-color": "#6366f1",
              "fill-opacity": 0.2,
            }}
          />
          <Layer
            id="highlighted-polygons-outline"
            type="line"
            paint={{
              "line-color": "#6366f1",
              "line-width": 2,
            }}
          />
        </Source>
      )}
    </>
  );
}

export default function MapComponent() {
  const mapRef = useRef<MapRef>(null);
  const selectedPointRef = useRef<{ lng: number; lat: number } | null>(null);
  const {
    viewport,
    flyToRequest,
    selectedPoint,
    selectedRegion,
    highlightedLocations,
    setHighlightedLocations,
    bboxCorner1,
    selectionMode,
    setViewport,
    setSelectedPoint,
    setSelectedRegion,
    setBboxCorner1,
    setSelectionMode,
    activeDataUrl,
    activeFilter,
    isLayerVisible,
    heatmapMetric,
    mapStyle,
    setMapStyle,
    clearFlyToRequest,
  } = useMapChat();

  const heatmapDataUrl =
    activeDataUrl && (activeDataUrl.startsWith("http") ? activeDataUrl : (typeof window !== "undefined" ? `${window.location.origin}${activeDataUrl}` : ""));
  const showHeatmapLayer = isLayerVisible && heatmapMetric && heatmapDataUrl;
  const rawHeatmapFilter = activeFilter ? createMapboxFilter(activeFilter) : undefined;
  const heatmapFilter = rawHeatmapFilter && (rawHeatmapFilter[0] !== "all" || rawHeatmapFilter.length > 1) ? rawHeatmapFilter : undefined;


  selectedPointRef.current = selectedPoint ?? null;

  // Smooth radiating pulse via requestAnimationFrame (no React re-renders per frame)
  useEffect(() => {
    if (!selectedPoint) return;
    const start = performance.now();
    let rafId: number;
    const tick = (now: number) => {
      const map = mapRef.current?.getMap();
      const source = map?.getSource("selected-point") as GeoJSONSource | undefined;
      const pt = selectedPointRef.current;
      if (!pt || !source) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const elapsed = (now - start) / 1000;
      const pulse = (1 + Math.sin(elapsed * Math.PI * PULSE_SPEED)) / 2;
      source.setData({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pt.lng, pt.lat] },
        properties: { pulse },
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [selectedPoint]);

  useEffect(() => {
    if (!flyToRequest || !mapRef.current) return;
    const lng = Number(flyToRequest.longitude);
    const lat = Number(flyToRequest.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      clearFlyToRequest();
      return;
    }
    const clampedLng = Math.max(-180, Math.min(180, lng));
    const clampedLat = Math.max(-90, Math.min(90, lat));
    const map = mapRef.current.getMap();
    if (map) {
      map.flyTo({
        center: [clampedLng, clampedLat],
        zoom: Math.max(1, Math.min(18, Number(flyToRequest.zoom) || 11)),
        duration: 1500,
      });
      clearFlyToRequest();
    }
  }, [flyToRequest, clearFlyToRequest]);

  if (!MAPBOX_TOKEN) {
    console.error("Mapbox token is missing. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your .env.local file.");
  }

  const bboxGeoJSON =
    selectedRegion?.type === "bbox" ? bboxToGeoJSON(selectedRegion.bbox) : null;

  useEffect(() => {
    console.log("MapComponent highlightedLocations changed:", highlightedLocations);
  }, [highlightedLocations]);

  return (
    <div className="w-full h-screen min-h-screen bg-gray-900 relative">
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        <div className="flex rounded bg-gray-900/90 shadow overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setSelectionMode("point");
              setBboxCorner1(null);
              setSelectedRegion(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${selectionMode === "point" ? "bg-emerald-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}
            title="Click map to select a single point"
          >
            <MapPin size={14} /> Point
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectionMode("region");
              setSelectedPoint(null);
              setBboxCorner1(null);
              setSelectedRegion(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${selectionMode === "region" ? "bg-emerald-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}
            title="Click twice to draw a rectangle: first corner, then opposite corner"
          >
            <Square size={14} /> Region
          </button>
          <button
            type="button"
            onClick={() => setMapStyle(mapStyle === "dark" ? "satellite" : "dark")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-gray-800 ${mapStyle === "satellite" ? "bg-emerald-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}
            title="Toggle Satellite View"
          >
            <Layers size={14} /> {mapStyle === "satellite" ? "Map" : "Satellite"}
          </button>
        </div>
        {selectionMode === "region" && bboxCorner1 && (
          <div className="rounded bg-amber-900/80 px-2 py-1 text-xs text-amber-200 shadow">
            Click opposite corner to complete area
          </div>
        )}
      </div>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -122.4194,
          latitude: 37.7749,
          zoom: 11,
        }}
        onMove={(evt) => setViewport(evt.viewState)}
        onClick={(evt) => {
          const { lng, lat } = evt.lngLat;
          setHighlightedLocations([]);
          if (selectionMode === "point") {
            setSelectedPoint({ lng, lat });
            setSelectedRegion(null);
            setBboxCorner1(null);
          } else {
            if (!bboxCorner1) {
              setBboxCorner1({ lng, lat });
              setSelectedPoint(null);
              setSelectedRegion(null);
            } else {
              const minLng = Math.min(bboxCorner1.lng, lng);
              const maxLng = Math.max(bboxCorner1.lng, lng);
              const minLat = Math.min(bboxCorner1.lat, lat);
              const maxLat = Math.max(bboxCorner1.lat, lat);
              setSelectedRegion({ type: "bbox", bbox: [minLng, minLat, maxLng, maxLat] });
              setBboxCorner1(null);
              setSelectedPoint(null);
            }
          }
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle === "satellite" ? "mapbox://styles/mapbox/satellite-v9" : "mapbox://styles/mapbox/dark-v11"}
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        onError={(e) => console.error("Mapbox Error:", e)}
      >
        {showHeatmapLayer && (
          <Source id="heatmap-data" type="geojson" data={heatmapDataUrl}>
            <Layer
              id="heatmap-fill"
              type="fill"
              {...(heatmapFilter != null ? { filter: heatmapFilter } : {})}
              paint={
                heatmapMetric === "heat"
                  ? {
                      "fill-color": [
                        "interpolate",
                        ["linear"],
                        ["coalesce", ["get", "heat_score"], 0],
                        0, "#1e3a5f",
                        0.25, "#3b82f6",
                        0.5, "#fbbf24",
                        0.75, "#f97316",
                        1, "#dc2626",
                      ],
                      "fill-opacity": [
                        "case",
                        [">", ["coalesce", ["get", "heat_score"], 0], 0.01],
                        0.65,
                        0,
                      ],
                      "fill-outline-color": "rgba(255,255,255,0.15)",
                    }
                  : {
                      "fill-color": [
                        "interpolate",
                        ["linear"],
                        ["coalesce", ["get", "green_score"], 0],
                        0, "#4b5563",
                        0.25, "#86efac",
                        0.5, "#22c55e",
                        0.75, "#15803d",
                        1, "#14532d",
                      ],
                      "fill-opacity": [
                        "case",
                        [">", ["coalesce", ["get", "green_score"], 0], 0.01],
                        0.65,
                        0,
                      ],
                      "fill-outline-color": "rgba(255,255,255,0.15)",
                    }
              }
            />
          </Source>
        )}
        {selectedPoint && (
          <Source
            id="selected-point"
            type="geojson"
            data={{
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [selectedPoint.lng, selectedPoint.lat],
              },
              properties: { pulse: 0 },
            }}
          >
            {/* Outer glow — radiates and fades (blinking) */}
            <Layer
              id="selected-point-glow-outer"
              type="circle"
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["get", "pulse"],
                  0, 28,
                  0.5, 38,
                  1, 28,
                ],
                "circle-color": "#22d3ee",
                "circle-opacity": [
                  "interpolate",
                  ["linear"],
                  ["get", "pulse"],
                  0, 0.25,
                  0.5, 0.5,
                  1, 0.25,
                ],
                "circle-blur": 0.85,
              }}
            />
            {/* Mid glow — pulse */}
            <Layer
              id="selected-point-glow-mid"
              type="circle"
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["get", "pulse"],
                  0, 16,
                  0.5, 22,
                  1, 16,
                ],
                "circle-color": "#22d3ee",
                "circle-opacity": [
                  "interpolate",
                  ["linear"],
                  ["get", "pulse"],
                  0, 0.45,
                  0.5, 0.7,
                  1, 0.45,
                ],
                "circle-blur": 0.5,
              }}
            />
            {/* Bright core — subtle pulse */}
            <Layer
              id="selected-point-glow-core"
              type="circle"
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["get", "pulse"],
                  0, 6,
                  0.5, 8,
                  1, 6,
                ],
                "circle-color": "#67e8f9",
                "circle-opacity": [
                  "interpolate",
                  ["linear"],
                  ["get", "pulse"],
                  0, 1,
                  0.5, 0.85,
                  1, 1,
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-opacity": 0.9,
              }}
            />
          </Source>
        )}
        {selectionMode === "region" && bboxCorner1 && (
          <Source
            id="bbox-corner-1"
            type="geojson"
            data={{
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [bboxCorner1.lng, bboxCorner1.lat],
              },
              properties: {},
            }}
          >
            <Layer
              id="bbox-corner-1-circle"
              type="circle"
              paint={{
                "circle-radius": 6,
                "circle-color": "#f59e0b",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
        )}
        {bboxGeoJSON && (
          <Source id="selected-bbox" type="geojson" data={bboxGeoJSON}>
            <Layer
              id="bbox-fill"
              type="fill"
              paint={{
                "fill-color": "#10b981",
                "fill-opacity": 0.15,
              }}
            />
            <Layer
              id="bbox-outline"
              type="line"
              paint={{
                "line-color": "#10b981",
                "line-width": 2,
                "line-dasharray": [1, 1],
              }}
            />
          </Source>
        )}
        {highlightedLocations.length > 0 && (
          <HighlightedLocationsLayer locations={highlightedLocations} />
        )}
        <NavigationControl position="top-right" />
      </Map>
    </div>
  );
}
