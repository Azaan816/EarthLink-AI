"use client";

import React from 'react';
import Map, { NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapComponent() {
    if (!MAPBOX_TOKEN) {
        console.error("Mapbox token is missing. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your .env.local file.");
    }

    return (
        <div className="w-full h-screen min-h-screen bg-gray-900 relative">
            <Map
                initialViewState={{
                    longitude: -83.045753,
                    latitude: 42.331429, // Detroit
                    zoom: 11
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
                attributionControl={false}
                onError={(e) => console.error("Mapbox Error:", e)}
            >
                <NavigationControl position="top-right" />
            </Map>
        </div>
    );
}
