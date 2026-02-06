"""Simple point-in-polygon and bbox helpers for GeoJSON (no shapely)."""

from typing import Any, Dict, List, Optional


def point_in_polygon(lng: float, lat: float, coordinates: List) -> bool:
    """Ray-casting point-in-polygon. coordinates is first ring of polygon (list of [lng, lat])."""
    n = len(coordinates)
    if n < 3:
        return False
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = coordinates[i][0], coordinates[i][1]
        xj, yj = coordinates[j][0], coordinates[j][1]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def bbox_intersects(
    bbox: List[float], coordinates: List
) -> bool:
    """Check if polygon (first ring) intersects bbox [min_lng, min_lat, max_lng, max_lat]."""
    w, s, e, n = bbox[0], bbox[1], bbox[2], bbox[3]
    for coord in coordinates:
        x, y = coord[0], coord[1]
        if w <= x <= e and s <= y <= n:
            return True
    # also check if bbox center is inside polygon
    cx, cy = (w + e) / 2, (s + n) / 2
    return point_in_polygon(cx, cy, coordinates)


def get_polygon_ring(feature: Dict[str, Any]) -> Optional[List]:
    """Get first ring of polygon from a GeoJSON feature."""
    geom = feature.get("geometry")
    if not geom or geom.get("type") != "Polygon":
        return None
    coords = geom.get("coordinates")
    if not coords:
        return None
    return coords[0]


def ring_center(ring: List) -> tuple:
    """Return (lng, lat) centroid of a closed ring (first and last point same)."""
    if not ring or len(ring) < 3:
        return (0.0, 0.0)
    # exclude duplicate closing point for centroid
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    n = len(pts)
    lng = sum(p[0] for p in pts) / n
    lat = sum(p[1] for p in pts) / n
    return (lng, lat)


def ring_bbox(ring: List) -> List[float]:
    """Return [min_lng, min_lat, max_lng, max_lat] for a ring."""
    if not ring:
        return [0.0, 0.0, 0.0, 0.0]
    lngs = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    return [min(lngs), min(lats), max(lngs), max(lats)]


def haversine_distance(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in meters.
    """
    import math

    # Convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371000 # Radius of earth in meters
    return c * r
