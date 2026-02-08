import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from geo_utils import bbox_intersects, get_polygon_ring, point_in_polygon, ring_bbox, ring_center, haversine_distance

# Reverse geocoding: Mapbox Geocoding API v5 only
MAPBOX_REVERSE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places"

# Initialize FastAPI
app = FastAPI(title="EarthLink AI - Python MCP Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://earth-link-ai.vercel.app",
        "https://earth-link-ai.vercel.app/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
FRONTEND_PUBLIC_DATA_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data"
SF_FEATURES_PATH = FRONTEND_PUBLIC_DATA_DIR / "sf" / "features.geojson"

# Cached SF GeoJSON (loaded on first insight request)
_sf_geojson: Optional[Dict[str, Any]] = None


def get_sf_features() -> List[Dict[str, Any]]:
    global _sf_geojson
    if _sf_geojson is None:
        if not SF_FEATURES_PATH.exists():
            raise HTTPException(status_code=503, detail="SF features GeoJSON not found. Ensure public/data/sf/features.geojson exists.")
        with open(SF_FEATURES_PATH, "r") as f:
            _sf_geojson = json.load(f)
    features = _sf_geojson.get("features") or []
    return features

class Server:
    """
    A simple implementation of an MCP-like Server structure.
    In a full implementation, this would handle JSON-RPC negotiation.
    Here, it serves as a registry for our geospatial tools.
    """
    def __init__(self, name: str, version: str):
        self.name = name
        self.version = version
        self.tools = {}

    def register_tool(self, name: str, func, description: str, schema: Dict[str, Any]):
        self.tools[name] = {
            "function": func,
            "description": description,
            "inputSchema": schema
        }

    async def call_tool(self, name: str, arguments: Dict[str, Any]):
        if name not in self.tools:
            raise KeyError(f"Tool {name} not found")
        return await self.tools[name]["function"](**arguments)

    def list_tools(self):
        return [
            {
                "name": name,
                "description": tool["description"],
                "inputSchema": tool["inputSchema"]
            }
            for name, tool in self.tools.items()
        ]

# Initialize our custom Server instance
mcp_server = Server(name="EarthLink Geoserver", version="0.1.0")

# --- Tool Implementations ---

async def get_precomputed_data(
    dataset_id: str,
    region_name: str,
    metric: str
) -> Dict[str, Any]:
    """
    Retrieves metadata and paths for precomputed datasets (Option B).
    Instead of running live GEE analysis, this returns links to static assets
    hosted in the frontend's public folder.
    """
    # Construct expected file paths
    # Structure: /public/data/{region_name}/{metric}_{dataset_id}.geojson
    # Example: /public/data/detroit/ndvi_2023.geojson
    
    # Sanitize inputs to prevent directory traversal
    region_safe = "".join([c for c in region_name if c.isalnum() or c in ('-','_')]).lower()
    metric_safe = "".join([c for c in metric if c.isalnum() or c in ('-','_')]).lower()
    
    file_name = f"{metric_safe}.geojson" # Simplified naming for demo
    local_path = FRONTEND_PUBLIC_DATA_DIR / region_safe / file_name
    
    # In a real app, we might check if file exists here, or just return the URL
    # public_url = f"/data/{region_safe}/{file_name}"
    
    if not local_path.exists():
         return {
            "status": "error",
            "message": f"Precomputed data not found for region: {region_name}, metric: {metric}",
            "available_datasets": ["detroit/ndvi", "detroit/landuse"] # Mock suggestion
        }
        
    return {
        "status": "success",
        "dataset_id": dataset_id,
        "region": region_name,
        "metric": metric,
        "url": f"/data/{region_safe}/{file_name}",  # Frontend relative URL
        "type": "FeatureCollection"
    }

# Register the tool
mcp_server.register_tool(
    name="get_precomputed_data",
    func=get_precomputed_data,
    description="Retrieves precomputed geospatial data URLs for a given region and metric.",
    schema={
        "type": "object",
        "properties": {
            "dataset_id": {"type": "string", "description": "ID of the dataset query"},
            "region_name": {"type": "string", "description": "Target city or region (e.g., 'detroit')"},
            "metric": {"type": "string", "description": "Metric to retrieve (e.g., 'ndvi', 'landuse')"}
        },
        "required": ["region_name", "metric"]
    }
)


def _reverse_geocode_mapbox(longitude: float, latitude: float, token: str) -> Dict[str, Any]:
    """Reverse geocoding via Mapbox Geocoding API v5 (current, no 403)."""
    try:
        url = f"{MAPBOX_REVERSE_URL}/{longitude},{latitude}.json"
        resp = requests.get(url, params={"access_token": token}, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        features = data.get("features") or []
        if not features:
            return {"status": "not_found", "display_name": None, "address": {}}
        f = features[0]
        place_name = f.get("place_name") or ""
        context = f.get("context") or []
        address: Dict[str, Any] = {}
        if f.get("address"):
            address["address"] = f["address"]
        for c in context:
            key = (c.get("id") or "region").split(".")[0]
            if c.get("text") and key and not address.get(key):
                address[key] = c["text"]
        return {
            "status": "success",
            "display_name": place_name,
            "address": address,
        }
    except requests.RequestException as e:
        return {"status": "error", "message": str(e), "display_name": None}


async def reverse_geocode(longitude: float, latitude: float) -> Dict[str, Any]:
    """
    Convert coordinates to a human-readable place name or address using Mapbox Geocoding API v5.
    Requires MAPBOX_ACCESS_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN in the environment.
    """
    mapbox_token = os.environ.get("MAPBOX_ACCESS_TOKEN") or os.environ.get("NEXT_PUBLIC_MAPBOX_TOKEN")
    if not mapbox_token:
        return {"status": "error", "message": "Mapbox token not set. Set MAPBOX_ACCESS_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN.", "display_name": None}
    return _reverse_geocode_mapbox(longitude, latitude, mapbox_token)


mcp_server.register_tool(
    name="reverse_geocode",
    func=reverse_geocode,
    description="Get the human-readable place name or address for a location (latitude/longitude). Use when the user asks for the name of the place, what this location is called, where is this, or the address of the selected point.",
    schema={
        "type": "object",
        "properties": {
            "longitude": {"type": "number", "description": "Longitude of the point"},
            "latitude": {"type": "number", "description": "Latitude of the point"},
        },
        "required": ["longitude", "latitude"],
    },
)

# --- FastAPI Routes ---

@app.get("/")
async def root():
    return {
        "server": mcp_server.name,
        "version": mcp_server.version,
        "status": "active"
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}



@app.get("/mcp/tools")
async def list_tools():
    """List all available MCP tools."""
    return mcp_server.list_tools()

class ToolCallRequest(BaseModel):
    name: str
    arguments: Dict[str, Any]

@app.post("/mcp/call")
async def call_tool_endpoint(request: ToolCallRequest):
    """Execute a tool call."""
    try:
        result = await mcp_server.call_tool(request.name, request.arguments)
        return {"content": [{"type": "text", "text": json.dumps(result)}]}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Tool {request.name} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Insight endpoints (San Francisco GeoJSON) ---


class PointInsightRequest(BaseModel):
    longitude: float
    latitude: float


class ReverseGeocodeRequest(BaseModel):
    longitude: float
    latitude: float


class RegionInsightRequest(BaseModel):
    bbox: Optional[List[float]] = None  # [min_lng, min_lat, max_lng, max_lat]
    feature_id: Optional[str] = None


class FindExtremeRequest(BaseModel):
    metric: str  # e.g. heat_score, green_score, lst, ndvi
    mode: str = "max"  # "max" or "min"
    top_n: int = 1  # return top N features
    land_only: bool = True  # exclude water (elevation <= 0); set False when user asks for ocean/water areas


@app.post("/insight/point")
async def insight_point(req: PointInsightRequest):
    """Return the SF grid cell properties at the given point (point-in-polygon)."""
    features = get_sf_features()
    for f in features:
        ring = get_polygon_ring(f)
        if ring and point_in_polygon(req.longitude, req.latitude, ring):
            props = f.get("properties") or {}
            return {"status": "success", "feature_id": f.get("id"), "properties": props}
    return {"status": "not_found", "message": "No grid cell contains this point (outside SF data extent)."}


@app.post("/insight/reverse-geocode")
async def insight_reverse_geocode(req: ReverseGeocodeRequest):
    """Return human-readable place name or address for the given coordinates (reverse geocoding)."""
    return await reverse_geocode(req.longitude, req.latitude)


@app.post("/insight/region")
async def insight_region(req: RegionInsightRequest):
    """Return features in bbox or the single feature by id. For bbox, returns list of properties + optional aggregates."""
    features = get_sf_features()
    if req.feature_id is not None:
        for f in features:
            if str(f.get("id")) == str(req.feature_id):
                return {"status": "success", "feature": f.get("properties"), "feature_id": req.feature_id}
        raise HTTPException(status_code=404, detail=f"Feature id {req.feature_id} not found")
    if req.bbox is not None:
        if len(req.bbox) != 4:
            raise HTTPException(status_code=400, detail="bbox must be [min_lng, min_lat, max_lng, max_lat]")
        matching = []
        for f in features:
            ring = get_polygon_ring(f)
            if ring and bbox_intersects(req.bbox, ring):
                matching.append({"id": f.get("id"), "properties": f.get("properties") or {}})
        # Simple aggregates
        if not matching:
            return {"status": "success", "features": [], "count": 0, "aggregates": {}}
        keys = [
            "ndvi", "evi", "ndbi", "bsi", "lst",
            "green_score", "heat_score", "fog_score",
            "elevation", "slope", "night_lights",
        ]
        agg: Dict[str, Any] = {}
        for k in keys:
            vals = [m["properties"].get(k) for m in matching if m["properties"].get(k) is not None]
            if vals:
                agg[f"{k}_mean"] = round(sum(vals) / len(vals), 4)
                agg[f"{k}_min"] = round(min(vals), 4)
                agg[f"{k}_max"] = round(max(vals), 4)
        n = len(matching)
        return {
            "status": "success",
            "features": matching,
            "count": n,
            "aggregates": agg,
            "hint": f"Region contains {n} grid cells. Use aggregates (e.g. ndvi_mean, green_score_mean, heat_score_max) to describe vegetation, heat, and built-up intensity. Prefer InsightCard, MetricsTable, RegionSummaryCard, and KeyTakeaways for detailed UI.",
        }
    raise HTTPException(status_code=400, detail="Provide either bbox or feature_id")


ALLOWED_FIND_METRICS = {
    "heat_score", "green_score", "lst", "ndvi", "evi", "ndbi", "bsi",
    "fog_score", "elevation", "slope", "night_lights",
}


@app.post("/insight/find")
async def find_extreme(req: FindExtremeRequest):
    """Find the cell(s) with highest or lowest value for a metric (e.g. hottest, greenest)."""
    if req.metric not in ALLOWED_FIND_METRICS:
        raise HTTPException(
            status_code=400,
            detail=f"metric must be one of: {sorted(ALLOWED_FIND_METRICS)}",
        )
    if req.mode not in ("max", "min"):
        raise HTTPException(status_code=400, detail="mode must be 'max' or 'min'")
    if req.top_n < 1 or req.top_n > 20:
        raise HTTPException(status_code=400, detail="top_n must be 1–20")

    features = get_sf_features()
    candidates: List[Dict[str, Any]] = []
    for f in features:
        props = f.get("properties") or {}
        if req.land_only:
            elev = props.get("elevation")
            if elev is not None:
                try:
                    if float(elev) <= 0:
                        continue  # exclude water / sea-level cells
                except (TypeError, ValueError):
                    pass
        val = props.get(req.metric)
        if val is None:
            continue
        try:
            v = float(val)
        except (TypeError, ValueError):
            continue
        ring = get_polygon_ring(f)
        if not ring:
            continue
        center = ring_center(ring)
        bbox = ring_bbox(ring)
        candidates.append({
            "feature_id": f.get("id"),
            "value": round(v, 4),
            "center": {"longitude": center[0], "latitude": center[1]},
            "bbox": bbox,
            "properties": props,
        })
    if not candidates:
        return {"status": "not_found", "message": f"No features with metric '{req.metric}'."}

    candidates.sort(key=lambda x: x["value"], reverse=(req.mode == "max"))
    top = candidates[: req.top_n]
    compare_targets = [
        f"point:{r['center']['longitude']},{r['center']['latitude']}"
        for r in top
    ]
    return {
        "status": "success",
        "metric": req.metric,
        "mode": req.mode,
        "results": top,
        "compare_targets": compare_targets,
        "hint": "Regions are plotted on the map automatically. Call compare_locations(targets: compare_targets) to compare in the sidebar.",
    }



class ProximityRequest(BaseModel):
    longitude: float
    latitude: float
    radius_meters: float = 1000.0
    metric: Optional[str] = None
    threshold: Optional[float] = None  # e.g. 0.5 (find green_score > 0.5)


@app.post("/insight/proximity")
async def insight_proximity(req: ProximityRequest):
    """Find SF grid cells within radius_meters of a point, optionally filtering by metric > threshold."""
    if req.radius_meters <= 0 or req.radius_meters > 10000:
        raise HTTPException(status_code=400, detail="radius_meters must be between 0 and 10000")

    features = get_sf_features()
    results = []

    for f in features:
        ring = get_polygon_ring(f)
        if not ring:
            continue
        
        # Check distance from center
        center = ring_center(ring)
        dist = haversine_distance(req.longitude, req.latitude, center[0], center[1])
        
        if dist <= req.radius_meters:
            props = f.get("properties") or {}
            
            # Optional metric filtering
            if req.metric and req.threshold is not None:
                val = props.get(req.metric)
                if val is None:
                    continue
                try:
                    if float(val) < req.threshold:
                        continue
                except (ValueError, TypeError):
                    continue
            
            bbox = ring_bbox(ring)
            center = ring_center(ring)
            results.append({
                "feature_id": f.get("id"),
                "distance": round(dist, 1),
                "properties": props,
                "bbox": bbox,
                "center": {"longitude": center[0], "latitude": center[1]},
            })

    # Sort by distance
    results.sort(key=lambda x: x["distance"])
    
    # Cap results to avoid overwhelming payload
    results = results[:50]
    compare_targets = [
        f"point:{r['center']['longitude']},{r['center']['latitude']}"
        for r in results[:20]
    ]

    return {
        "status": "success",
        "count": len(results),
        "radius_meters": req.radius_meters,
        "results": results,
        "compare_targets": compare_targets,
        "hint": "Regions are plotted on the map automatically. Call compare_locations(targets: compare_targets) to compare in the sidebar.",
    }


class CompareRequest(BaseModel):
    targets: List[Dict[str, Any]]


@app.post("/insight/compare")
async def insight_compare(req: CompareRequest):
    """Compare multiple locations (by feature_id or point). Returns side-by-side metrics."""
    features = get_sf_features()
    results = []

    for target in req.targets:
        fid = target.get("feature_id")
        lng = target.get("longitude")
        lat = target.get("latitude")
        
        found = None
        if fid:
            # Find by ID
            for f in features:
                if str(f.get("id")) == str(fid):
                    found = f
                    break
        elif lng is not None and lat is not None:
            # Find by Point
            for f in features:
                ring = get_polygon_ring(f)
                if ring and point_in_polygon(lng, lat, ring):
                    found = f
                    break
        
        if found:
            props = found.get("properties") or {}
            # Ensure we have a label
            label = fid if fid else f"({round(lng,4)}, {round(lat,4)})"
            results.append({
                "type": "feature",
                "id": found.get("id"),
                "label": label,
                "metrics": {
                    "NDVI": props.get("ndvi"),
                    "LST": props.get("lst"),
                    "Heat Score": props.get("heat_score"),
                    "Green Score": props.get("green_score"),
                    "Elevation": props.get("elevation")
                }
            })
        else:
            results.append({
                "type": "not_found",
                "target": target,
                "label": "Unknown Location"
            })

    return {
        "status": "success",
        "comparison": results
    }


class TemporalRequest(BaseModel):
    feature_id: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    metric: str = "ndvi"  # Default metric


@app.post("/insight/temporal")
async def insight_temporal(req: TemporalRequest):
    """Return mock temporal trend data for a location."""
    # Validate metric
    if req.metric not in ALLOWED_FIND_METRICS:
         raise HTTPException(status_code=400, detail=f"Invalid metric. Allowed: {ALLOWED_FIND_METRICS}")

    # Identify location (just to ensure it exists, though data is mock)
    features = get_sf_features()
    found = None
    if req.feature_id:
        for f in features:
            if str(f.get("id")) == str(req.feature_id):
                found = f
                break
    elif req.longitude is not None and req.latitude is not None:
         for f in features:
            ring = get_polygon_ring(f)
            if ring and point_in_polygon(req.longitude, req.latitude, ring):
                found = f
                break
    
    if not found:
        return {"status": "error", "message": "Location not found"}

    # Generate Mock Data (Yearly trend)
    # Base value from current property
    current_val = found["properties"].get(req.metric) or 0.5
    
    # Create artificial trend: slightly increasing or decreasing noise
    import random
    random.seed(str(found.get("id")) + req.metric)
    
    trend = []
    start_year = 2018
    end_year = 2024
    
    val = float(current_val) * 0.9 # Start a bit lower?
    
    for year in range(start_year, end_year + 1):
        # random fluctuation
        change = random.uniform(-0.05, 0.08)
        val = val * (1 + change)
        val = max(0, min(1, val)) # Clamp 0-1 for scores
        if req.metric in ["lst", "elevation", "slope"]:
            val = max(0, val) # No clamp 1 for absolute values
            
        trend.append({
            "year": year,
            "value": round(val, 3)
        })
        
    return {
        "status": "success",
        "location_id": found.get("id"),
        "metric": req.metric,
        "trend": trend,
        "hint": "Render this data using a LineChart."
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
