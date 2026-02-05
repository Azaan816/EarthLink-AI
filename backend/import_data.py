import os
import json
import shutil
from pathlib import Path
import argparse

def import_geojson(source_path: str, region: str, metric: str, target_base_dir: str = "../frontend/public/data"):
    """
    Imports a GeoJSON file from a source (e.g., Downloads folder) to the App's public data directory.
    Structure: public/data/{region}/{metric}.geojson
    """
    source = Path(source_path)
    if not source.exists():
        print(f"Error: Source file {source} does not exist.")
        return

    target_dir = Path(target_base_dir) / region.lower()
    target_dir.mkdir(parents=True, exist_ok=True)

    target_file = target_dir / f"{metric.lower()}.geojson"

    print(f"Copying {source} to {target_file}...")
    shutil.copy2(source, target_file)
    print("Import successful!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import offline geospatial data to the app.")
    parser.add_argument("source", help="Path to the source GeoJSON file")
    parser.add_argument("region", help="Name of the region (e.g., detroit)")
    parser.add_argument("metric", help="Name of the metric (e.g., ndvi, landuse)")
    
    args = parser.parse_args()
    
    import_geojson(args.source, args.region, args.metric)
