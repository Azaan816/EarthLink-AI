"use client";

import React, { useRef, useEffect } from "react";
import Map, { NavigationControl, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapChat } from "@/context/MapChatContext";
import { MapPin, Square } from "lucide-react";

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


export default function MapComponent() {
  const mapRef = useRef<MapRef>(null);
  const {
    viewport,
    flyToRequest,
    selectedPoint,
    selectedRegion,
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
    mapStyle,
    clearFlyToRequest,
  } = useMapChat();


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

  return (
    <div className="w-full h-screen min-h-screen bg-gray-900 relative">
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        <div className="rounded bg-gray-900/80 px-2 py-1.5 text-xs text-gray-400 shadow">
          SF environmental grid — color by greenery
        </div>
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
        {activeDataUrl && isLayerVisible && (
          <Source id="sf-features" type="geojson" data={activeDataUrl}>
            <Layer
              id="sf-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "green_score"],
                  0,
                  "#1a1a2e",
                  0.3,
                  "#16213e",
                  0.6,
                  "#0f3460",
                  1,
                  "#00c853",
                ],
                "fill-opacity": [
                  "case",
                  ["boolean", ["get", "active_filter_match"], true],
                  0.5,
                  0.1
                ],
              }}
              filter={
                activeFilter
                  ? createMapboxFilter(activeFilter)
                  : ["all"]
              }
            />
            <Layer
              id="sf-outline"
              type="line"
              paint={{
                "line-color": "#334155",
                "line-width": 0.5,
              }}
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
              properties: {},
            }}
          >
            <Layer
              id="selected-point-circle"
              type="circle"
              paint={{
                "circle-radius": 8,
                "circle-color": "#10b981",
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
        <NavigationControl position="top-right" />
      </Map>
    </div>
  );
}
