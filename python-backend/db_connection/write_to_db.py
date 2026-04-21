import geopandas as gpd
from pathlib import Path

from db_connection.load_engine import get_engine
from sqlalchemy import text


def enable_postgis():
    """Enable PostGIS extension in the database if not already enabled."""
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()
    print("PostGIS extension enabled.")


def write_gdf_to_db(gdf: gpd.GeoDataFrame, table_name: str, if_exists: str ="replace"):
    """
    Writes a GeoDataFrame to a PostGIS table.

    Parameters:
    gdf (gpd.GeoDataFrame): The GeoDataFrame to write to the database.
    table_name (str): The name of the target table in the database.
    if_exists (str): What to do if the table already exists. Options are 'fail', 'replace', or 'append'.
    """
    engine = get_engine()
    gdf.to_postgis(name=table_name, con=engine, if_exists=if_exists, index=False)

    print(f"GeoDataFrame written to table '{table_name}' in the database.")



if __name__ == "__main__":
    print("hello")
    enable_postgis()
    this_dir = Path(__file__).parent
    gdf = gpd.read_file(this_dir / "all_routes_segmented 3.gpkg")
    print(gdf.geometry)
    gdf = gdf[gdf.geometry.is_valid]
    write_gdf_to_db(gdf, "radrouten")