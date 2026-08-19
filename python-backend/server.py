import os
import random
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import geopandas as gpd
import uvicorn
from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from geojson_pydantic import FeatureCollection
from pydantic import BaseModel, ConfigDict

from db_connection.get_from_postgis import geojson_from_db
from db_connection.radnetz_segments import (
    create_radnetz_segment,
    ensure_radnetz_segments_table_exists,
    get_radnetz_segmented_ids_from_db
)
from db_connection.survey_logs import (
    create_survey_log,
    ensure_survey_logs_table_exists,
    get_finished_segments_from_db,
    invalidate_previous_entries,
)
from db_connection.write_to_db import write_gdf_to_db
from formbricks_connection.response_details import get_response_details_from_formbricks

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
    write_gdf_to_db(gdf, "radrouten") # type: ignore
    
    gdf = gpd.read_file(this_dir / "radnetz" / "radnetz_fertiggestellt_ohne_radrouten.gpkg", fid_as_index=True)
    gdf = gdf[gdf.geometry.is_valid]
    gdf["fid"] = gdf.index
    gdf = gdf.set_crs("EPSG:25832", allow_override=True)
    gdf = gdf.to_crs("EPSG:4326")
    write_gdf_to_db(gdf, "radnetz") # type: ignore

    ensure_survey_logs_table_exists()
    ensure_radnetz_segments_table_exists()

    print("Startup complete.")

    # running the server
    yield

    # Shutdown code here
    print("Shutting down FastAPI...")


app = FastAPI(title="IMEQ-Backend", description=description, lifespan=lifespan)


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
    route_id: int = Query(None, description="radrouten id"),
    direction: str = Query(
        None,
        description=("route direction"),
    ),
) -> FeatureCollection:
    """Return a GeoJSON FeatureCollection for the requested layer and city.

    Query parameter descriptions above are shown in the OpenAPI docs.
    """
    try:
        return geojson_from_db(
            table_name=layer_name, route_id=route_id, direction=direction
        )
    except Exception as e:
        print(f"Error: {e}")
        # TODO better error handling. 404, 500, ...
        raise HTTPException(
            404,
            f"Error fetching layer {layer_name} {route_id} {direction} from db: {e}",
        ) from e


@app.get("/get_finished_segments")
async def get_finished_segments(
    route_id: int = Query(None, description="radrouten id"),
    direction: str = Query(
        None,
        description=("route direction"),
    ),
    user: str = Query(
        None,
        description=("team member"),
    ),
) -> list[str]:
    return get_finished_segments_from_db(route_id, direction, user)


@app.get("/get_response_details")
async def get_response_details(
    user: str = Query(
        None,
        description=("team member"),
    ),
    segment_id: str = Query(None, description="segment id")
) -> dict:
    try:
        return get_response_details_from_formbricks(user, segment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


class SurveyActivity(BaseModel):
    """Request model for calculating index for a street segment."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user": "Peter",
                "segment_id": "1_Ost_99",
                "action": "start",
                "route_id": 1,
                "route_direction": "Ost",
            }
        }
    )

    user: str
    segment_id: str
    route_id: int
    route_direction: str
    action: Literal["start", "stop", "delete"]
    formbricks_response_id: str | None = None


@app.post("/track_survey_activity")
async def track_survey_activity(
    request: SurveyActivity = Body(...),
):
    """Track survey activity for a specific street segment.

    Request body should be JSON with:
    - user: who is filling in the survey
    - segment_id: ID of the street segment
    - route_id
    - route_direction
    - action: 'delete' or 'start' or 'stop'
    - formbricks_response_id: None|str
    """
    print(
        f"Tracking survey activity for segment {request.segment_id} by {request.user}: {request.action}"
    )

    if request.action == "start":
        # check if we already can get the response id from the user, route_direction and route_id info
        # then return response id

        # TEMP FIX : for a quick solution that only has start and delete : fake response id.
        response_id = "%032x" % random.getrandbits(128)
        # response_id = get_formbricks_response_id(user, route_id, route_direction, start_time=datetime.datetime.now().date)
        create_survey_log(
            request.user,
            request.route_id,
            request.route_direction,
            request.segment_id,
            response_id,
        )

        return {"response_id": response_id}

    if request.action == "delete":
        # use this also for survey correction
        invalidate_previous_entries(
            request.user, request.route_id, request.route_direction, request.segment_id
        )
        return {"delete": "OK"}

    if request.action == "stop":
        pass
        """
        NOT AT ALL IMPLEMENTED __ SKETCH FOR LATER __

        if request.formbricks_response_id:
            response_id = request.formbricks_response_id
        else:
            ## in that function also check for potentially already invalided formbricks repsonse ids (to ignore)
            formbricks_data = get_formbricks_response_full(user, route_id, route_direction, start_time=datetime.datetime.now().date, response_id=response_id)
            response_id = formbricks_data["response_id"] #  TOOD check data
            update_survey_log(
                user, 
                route_id,
                route_direction,
                datetime.datetime.now(),
                response_id,
                formbricks_data.get("data")
            )
        """

        raise HTTPException(500, "Method not implemented")

    """
    TODO get survey_finished status / non-invalidaded survey_entry exists status for route,direction and user
    TODO route to get response data for response id

    TODO tests
    """


class RadnetzSegment(BaseModel):
    """Request model for saving a newly mapped radnetz segment."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "start": 12,
                "end": 42,
                "segment_ids": [12, 13, 14, 42],
            }
        }
    )

    start: int
    end: int
    segment_ids: list[int]


@app.post("/new_radnetz_segment")
async def new_radnetz_segment(
    request: RadnetzSegment = Body(...),
):
    """Save a new radnetz segment.

    Request body should be JSON with:
    - start: fid of the segment's start feature
    - end: fid of the segment's end feature
    - segment_ids: fids of all features belonging to the segment (including start and end)
    """
    try:
        segment_id = create_radnetz_segment(
            request.start, request.end, request.segment_ids
        )
        return {"id": segment_id}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(
            500, f"Error saving radnetz segment: {e}"
        ) from e



@app.get("/get_radnetz_fids_segmented")
async def get_radnetz_fids_segmented() -> list:
    try:
        return get_radnetz_segmented_ids_from_db()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=5000, workers=4, reload=True)
