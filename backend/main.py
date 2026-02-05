import os
import json
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Initialize FastAPI
app = FastAPI(title="EarthLink AI - Python MCP Server")

# Constants
# We assume the frontend public directory is accessible relative to this backend
# Adjust this path based on actual deployment/project structure
FRONTEND_PUBLIC_DATA_DIR = Path("../frontend/public/data")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
