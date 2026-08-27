from functools import lru_cache
from typing import List
import geopandas as gpd
import json
import pandas as pd

from geojson_pydantic import FeatureCollection
from shapely import wkb, to_wkb

from db_connection.load_engine import get_engine
from db_connection.radnetz_segments import get_radnetz_segmented_ids_from_db,get_radnetz_segments_from_db
from sqlalchemy import inspect, text


"""
tables literally have different geometry column names depending on how they were imported.
ogr2ogr -> wkb_geometry
geopandas -> geometry
"""


def table_exists(table_name: str) -> bool:
    engine = get_engine()
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


@lru_cache(maxsize=32)
def get_column_names(table_name: str) -> List[str]:
    """Get all column names for a table in the database."""
    engine = get_engine()
    query = text(
        f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '{table_name}' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    """
    )

    with engine.connect() as conn:
        result = conn.execute(query)
        return [row[0] for row in result]


def get_geometry_column_name(table_name: str) -> str:
    all_columns = get_column_names(table_name)
    for geom_col in ["wkb_geometry", "geometry", "geom"]:
        if geom_col in all_columns:
            return geom_col

    for col in all_columns:
        if "geom" in col.lower():
            return col

    raise ValueError(f"No geometry column found in table '{table_name}'.")


def get_gdf_from_db(table_name: str, segment_id: str = None) -> gpd.GeoDataFrame:

    if not table_exists(table_name):
        raise ValueError(f"Table '{table_name}' does not exist in the database.")

    engine = get_engine()
    geometry_col_name = get_geometry_column_name(table_name)

    # Corrected SQL query
    # query = f"SELECT * FROM {table_name}"
    query = f"""
    SELECT 
        *,
        encode({geometry_col_name}, 'hex') as geom_hex
    FROM {table_name}
    """

    if segment_id is not None:
        print("Filtering for segment_id:", segment_id)
        query += f" WHERE segment_id = '{segment_id}'"

    # Read data from PostgreSQL into a DataFrame
    df = pd.read_sql(query, engine)
    print(f"Retrieved {len(df)} records from table '{table_name}'")

    # Convert WKB to shapely geometries
    df["geometry"] = df["geom_hex"].apply(
        lambda x: wkb.loads(x, hex=True) if x else None
    )

    # Create GeoDataFrame
    gdf = gpd.GeoDataFrame(df, geometry="geometry", crs="EPSG:4326")

    # Drop the original WKB column
    gdf = gdf.drop(columns=["geom_hex"])
    if geometry_col_name != "geometry":
        gdf = gdf.drop(columns=[geometry_col_name])

    return gdf


def geojson_from_db(
    table_name: str,
    route_id: int|None = None,
    direction: str|None = None
) -> FeatureCollection:
    """
    Docstring for geojson_from_db
    
    Gets a GeoJSON FeatureCollection from a PostGIS table.
    Args:
        table_name (str): Name of the PostGIS table to query.
        get_only_these_columns (List[str], optional): List of column names to include in the properties.
            If None, all columns (including centroid longitude and latitude) are included. Defaults to None.
            If includes 'centroid', centroid longitude and latitude will be added to properties.
    Returns:
        FeatureCollection: GeoJSON FeatureCollection object.
    """


    if not table_exists(table_name):
        raise ValueError(f"Table '{table_name}' does not exist in the database.")

    geometry_col_name = get_geometry_column_name(table_name)
    
    # Build WHERE clause based on filters
    where_clauses = []
    if route_id is not None:
        where_clauses.append(f"route_id = {route_id}")
    if direction is not None:
        where_clauses.append(f"route_direction = '{direction}'")
    
    where_clause = ""
    if where_clauses:
        where_clause = "WHERE " + " AND ".join(where_clauses)

    query = text(
        f"""
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
            jsonb_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(ST_Force2D({geometry_col_name}))::jsonb,
                'properties', to_jsonb(t.*) - '{geometry_col_name}' || jsonb_build_object(
                    'geometry_wkb', encode(ST_AsBinary({geometry_col_name}), 'hex')
                )
            )
        )
    ) as geojson
    FROM {table_name} t
    {where_clause}
    """
    )

    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(query)
        geojson = result.scalar()

    if geojson is None or geojson.get("features") is None:
        geojson = {"type": "FeatureCollection", "features": []}

    return geojson


def get_radnetz_clipped_by_neighborhood(stadtteil_name: str | None) -> FeatureCollection:
    """
    Fetches radnetz segments clipped to the geometry of the given Hamburg neighborhood.

    Args:
        stadtteil_name: The value of the 'stadtteil_name' column in the hamburg_neighborhoods table.

    Returns:
        FeatureCollection of radnetz geometries clipped to the neighborhood boundary.
    """
    neighborhood_geom_col = get_geometry_column_name("hamburg_neighborhoods")
    radnetz_geom_col = get_geometry_column_name("radnetz")

    if stadtteil_name:
        query = text(
            f"""
            SELECT jsonb_build_object(
                'type', 'FeatureCollection',
                'features', jsonb_agg(
                    jsonb_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJSON(ST_Force2D(
                            ST_Intersection(r.{radnetz_geom_col}, n.{neighborhood_geom_col})
                        ))::jsonb,
                        'properties', to_jsonb(r.*) - '{radnetz_geom_col}'
                    )
                )
            ) AS geojson
            FROM radnetz r
            JOIN hamburg_neighborhoods n
            ON ST_Intersects(r.{radnetz_geom_col}, n.{neighborhood_geom_col})
            WHERE n.stadtteil_name = :stadtteil_name
            AND NOT ST_IsEmpty(ST_Intersection(r.{radnetz_geom_col}, n.{neighborhood_geom_col}))
            """
        )
        
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(query, {"stadtteil_name": stadtteil_name})
            geojson = result.scalar()

        if geojson is None or geojson.get("features") is None:
            geojson = {"type": "FeatureCollection", "features": []}
        
    else:
        # if no neighborhood is specified, fetch the entire radnetz table
        geojson = geojson_from_db(table_name="radnetz")

    gdf = gpd.GeoDataFrame.from_features(geojson["features"])

    gdf_segmented = gdf[gdf["fid"].isin(get_radnetz_segmented_ids_from_db())].copy()
    
    neighborhood_fids = set(gdf_segmented["fid"].tolist())
    segmented_features_geometries = []
    segmented_features_props = []

    # create a new geojson with radnetz segments
    for segment_idx, segment_dict in enumerate(
        s for s in get_radnetz_segments_from_db()
        if any(fid in neighborhood_fids for fid in s["segments_ids"])
    ):
        props = segment_dict.copy()
        props["segment_features_fids"] = props["segments_ids"]
        segment_id = f"Radnetz_{segment_dict['start_fid']}_{segment_dict['end_fid']}"
        geometry = gdf_segmented[gdf_segmented["fid"].isin(props["segment_features_fids"])].union_all()
        segmented_features_geometries.append(geometry)
        props["segment_idx"] = segment_idx
        props["segment_id"] = segment_id
        props["geometry_wkb"] = to_wkb(geometry, hex=True)
        del props["segments_ids"]
        segmented_features_props.append(props)

    return json.loads(
        gpd.GeoDataFrame(segmented_features_props, geometry=segmented_features_geometries).to_json()
    )