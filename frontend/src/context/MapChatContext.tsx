"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface Viewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

export type SelectedRegion =
  | { type: "bbox"; bbox: [number, number, number, number] }
  | { type: "featureId"; id: string };

export type SelectionMode = "point" | "region";

export interface MapChatState {
  viewport: Viewport;
  flyToRequest: Viewport | null;
  selectedPoint: { lng: number; lat: number } | null;
  selectedRegion: SelectedRegion | null;
  /** When drawing a region, first click sets this; second click completes bbox. */
  bboxCorner1: { lng: number; lat: number } | null;
  selectionMode: SelectionMode;
  activeDataUrl: string | null;
  activeFilter: string | null;
  isLayerVisible: boolean;
  mapStyle: "dark" | "satellite";
}


const SAN_FRANCISCO_VIEWPORT: Viewport = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 11,
};

const defaultState: MapChatState = {
  viewport: SAN_FRANCISCO_VIEWPORT,
  flyToRequest: null,
  selectedPoint: null,
  selectedRegion: null,
  bboxCorner1: null,
  selectionMode: "point",
  activeDataUrl: "/data/sf/features.geojson",
  activeFilter: null,
  isLayerVisible: true,
  mapStyle: "dark",
};


interface MapChatContextValue extends MapChatState {
  setViewport: (v: Viewport) => void;
  setSelectedPoint: (p: { lng: number; lat: number } | null) => void;
  setSelectedRegion: (r: SelectedRegion | null) => void;
  setBboxCorner1: (p: { lng: number; lat: number } | null) => void;
  setSelectionMode: (m: SelectionMode) => void;
  setActiveDataUrl: (url: string | null) => void;
  setActiveFilter: (filter: string | null) => void;
  setIsLayerVisible: (visible: boolean) => void;
  setMapStyle: (style: "dark" | "satellite") => void;
  flyTo: (longitude: number, latitude: number, zoom?: number) => void;

  clearFlyToRequest: () => void;
}

const MapChatContext = createContext<MapChatContextValue | null>(null);

export function MapChatProvider({ children }: { children: React.ReactNode }) {
  const [viewport, setViewportState] = useState<Viewport>(defaultState.viewport);
  const [flyToRequest, setFlyToRequest] = useState<Viewport | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapChatState["selectedPoint"]>(defaultState.selectedPoint);
  const [selectedRegion, setSelectedRegion] = useState<MapChatState["selectedRegion"]>(defaultState.selectedRegion);
  const [bboxCorner1, setBboxCorner1] = useState<MapChatState["bboxCorner1"]>(defaultState.bboxCorner1);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(defaultState.selectionMode);
  const [activeDataUrl, setActiveDataUrl] = useState<string | null>(defaultState.activeDataUrl);
  const [activeFilter, setActiveFilter] = useState<string | null>(defaultState.activeFilter);
  const [isLayerVisible, setIsLayerVisible] = useState<boolean>(defaultState.isLayerVisible);
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite">(defaultState.mapStyle);

  const setViewport = useCallback((v: Viewport) => setViewportState(v), []);

  const clearFlyToRequest = useCallback(() => setFlyToRequest(null), []);
  const flyTo = useCallback((longitude: number, latitude: number, zoom?: number) => {
    setViewportState((prev) => ({
      longitude,
      latitude,
      zoom: zoom ?? prev.zoom,
    }));
    setFlyToRequest((prev) => ({
      longitude,
      latitude,
      zoom: zoom ?? prev?.zoom ?? 11,
    }));
  }, []);

  const value = useMemo<MapChatContextValue>(
    () => ({
      viewport,
      flyToRequest,
      selectedPoint,
      selectedRegion,
      bboxCorner1,
      selectionMode,
      activeDataUrl,
      activeFilter,
      isLayerVisible,
      mapStyle,
      setViewport,

      setSelectedPoint,
      setSelectedRegion,
      setBboxCorner1,
      setSelectionMode,
      setActiveDataUrl,
      setActiveFilter,
      setIsLayerVisible,
      setMapStyle,
      flyTo,
      clearFlyToRequest,

    }),
    [viewport, flyToRequest, selectedPoint, selectedRegion, bboxCorner1, selectionMode, activeDataUrl, activeFilter, isLayerVisible, mapStyle, setViewport, flyTo, clearFlyToRequest]
  );


  return <MapChatContext.Provider value={value}>{children}</MapChatContext.Provider>;
}

export function useMapChat() {
  const ctx = useContext(MapChatContext);
  if (!ctx) throw new Error("useMapChat must be used within MapChatProvider");
  return ctx;
}
