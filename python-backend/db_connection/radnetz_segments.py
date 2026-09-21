import json
from typing import List

from sqlalchemy import text

from db_connection.load_engine import get_engine


def ensure_radnetz_segments_table_exists():
    """Create the radnetz_segments table if it doesn't exist."""
    engine = get_engine()

    create_table_query = text("""
        CREATE TABLE IF NOT EXISTS radnetz_segments (
            id SERIAL PRIMARY KEY,
            start_fid INTEGER NOT NULL,
            end_fid INTEGER NOT NULL,
            segment_ids JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    with engine.connect() as conn:
        conn.execute(create_table_query)
        conn.commit()

    print("radnetz_segments table ready.")


def create_radnetz_segment(start: int, end: int, segment_ids: List[int]) -> int:
    """Insert a new radnetz segment and return its id."""
    engine = get_engine()

    insert_query = text("""
        INSERT INTO radnetz_segments (start_fid, end_fid, segment_ids)
        VALUES (:start_fid, :end_fid, :segment_ids)
        RETURNING id
    """)

    with engine.connect() as conn:
        result = conn.execute(
            insert_query,
            {
                "start_fid": start,
                "end_fid": end,
                "segment_ids": json.dumps(segment_ids),
            },
        )
        conn.commit()
        return result.scalar()


def get_radnetz_segmented_ids_from_db() -> list[str]:
    
    """Get all fids for already segmented radnetz features"""
    engine = get_engine()

    query = text(f"""
    SELECT segment_ids
    FROM radnetz_segments
""")

    with engine.connect() as conn:
        result = conn.execute(query)
        
        # Return list of segment_id values
        segments_lists = [row[0] for row in result]
        segments = [val for segment_list in segments_lists for val in segment_list]

        return segments


def get_radnetz_segments_from_db() -> list[dict]:
    """Get all fids for already segmented radnetz features"""
    engine = get_engine()

    query = text(f"""
    SELECT start_fid, end_fid, segment_ids
    FROM radnetz_segments
    """)

    """
    There is some weird short and isolated segments in random places. 
    Ignore them for now
    """
    ignored_segments_start_fids = [
        28380,85485,34404,80445,69490,85856,89025,4241,15746
    ]

    with engine.connect() as conn:
        result = conn.execute(query)
    
        segment_dicts = []
        for row in result:
            if row[0] in ignored_segments_start_fids:
                continue

            segment_dicts.append({
                "start_fid": row[0],
                "end_fid": row[1],
                "segments_ids": row[2]
            })

        return segment_dicts