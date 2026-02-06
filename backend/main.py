import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from geo_utils import bbox_intersects, get_polygon_ring, point_in_polygon, ring_bbox, ring_center

# Initialize FastAPI
app = FastAPI(title="EarthLink AI - Python MCP Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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

# --- FastAPI Routes ---

@app.get("/")
async def root():
    return {
        "server": mcp_server.name,
        "version": mcp_server.version,
        "status": "active"
    }

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


class RegionInsightRequest(BaseModel):
    bbox: Optional[List[float]] = None  # [min_lng, min_lat, max_lng, max_lat]
    feature_id: Optional[str] = None


class FindExtremeRequest(BaseModel):
    metric: str  # e.g. heat_score, green_score, lst, ndvi
    mode: str = "max"  # "max" or "min"
    top_n: int = 1  # return top N features


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
    return {
        "status": "success",
        "metric": req.metric,
        "mode": req.mode,
        "results": top,
        "hint": "Use show_on_map with the first result's center (longitude, latitude) to show a pin, or bbox to highlight the area.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
