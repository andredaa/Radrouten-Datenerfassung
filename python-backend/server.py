from contextlib import asynccontextmanager
import os
from typing import List, Optional
import uvicorn

from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from geojson_pydantic import FeatureCollection
from pydantic import BaseModel, ConfigDict


from db_connection.get_from_postgis import geojson_from_db
from db_connection.write_to_db import write_gdf_to_db



ENV = os.getenv("ENV", "development")  # "production" or "development"

description = """
BAC Survey Backend.
API to fetch data from postgres
API to calculate indexes
---
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code here
    print("Starting up...")

    print("import radrouten to db")
    this_dir = Path(__file__).parent
    gdf = gpd.read_file(this_dir / "radrouten" / "all_routes_segmented.gpkg")
    gdf = gdf[gdf.geometry.is_valid]
    write_gdf_to_db(gdf, "radrouten")

    print("Startup complete.")

    # running the server
    yield

    # Shutdown code here
    print("Shutting down FastAPI...")


app = FastAPI(title="IMEQ-Backend", description=description, lifespan=lifespan)

# Include routers


@app.get("/")
def root():
    """Health check. Returns 200 with a text body when the app is running."""
    return "success"


origins = ["*"]  # TODO CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.get("/get_layer")
async def get_layer(
    layer_name: str = Query(
        ..., description="Name of the layer to retrieve, e.g. 'radrouten' "
    ),
    route_id: int = Query(
        None, description="radrouten id"
    ),
    direction: str = Query(
        None, 
        description=(
            "route direction"
        ),
    ),
) -> FeatureCollection:
    """Return a GeoJSON FeatureCollection for the requested layer and city.

    Query parameter descriptions above are shown in the OpenAPI docs.
    """
    try:
        return geojson_from_db(table_name=layer_name, route_id=route_id, direction=direction)
    except Exception as e:
        print(f"Error: {e}")
        # TODO better error handling. 404, 500, ...
        raise HTTPException(404, f"Error fetching layer {layer_name} {route_id} {direction} from db: {e}")


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=5000, workers=4, reload=True)
