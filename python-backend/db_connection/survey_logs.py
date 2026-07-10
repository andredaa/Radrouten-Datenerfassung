
from db_connection.load_engine import get_engine
from sqlalchemy import text
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import HTTPException
import json

# Berlin timezone
BERLIN_TZ = ZoneInfo("Europe/Berlin")

def now_berlin():
    """Get current datetime in Berlin timezone."""
    return datetime.now(BERLIN_TZ)


def to_berlin_time(dt):
    """Convert a datetime object to Berlin timezone. If you need
    to convert a :class:`datetime.datetime` object at any time to Berlin
    timezone, this function can be used.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo('UTC'))
    return dt.astimezone(BERLIN_TZ)


def ensure_survey_logs_table_exists():
    """Create the survey_logs table if it doesn't exist."""
    engine = get_engine()
    
    create_table_query = text("""
        CREATE TABLE IF NOT EXISTS survey_logs (
            formbricks_response_id TEXT PRIMARY KEY,
            user_name TEXT NOT NULL,
            route_id INTEGER NOT NULL,
            route_direction TEXT NOT NULL,
            segment_id TEXT NOT NULL,
            formbricks_data JSONB,
            survey_completed BOOLEAN,
            invalid_entry BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    with engine.connect() as conn:
        conn.execute(create_table_query)
        conn.commit()
    
    print("survey_logs table ready.")


def invalidate_previous_entries(
    user: str,
    route_id: int,
    route_direction: str,
    segment_id: str,
    force_deleting_all_matching_entries: bool = False
):
    """Find and invalidate all previous entries for the given query parameters."""
    print(f"Invalidating previous entries for user={user}, route={route_id}, direction={route_direction}, segment={segment_id}")
    engine = get_engine()
    
    # Build query to find all response IDs matching criteria where not already invalid
    conditions = ["invalid_entry = FALSE"]
    params = {
        "user": user,
        "route_id": route_id,
        "route_direction": route_direction,
        "segment_id": segment_id
    }
    
    conditions.append("user_name = :user")
    conditions.append("route_id = :route_id")
    conditions.append("route_direction = :route_direction")
    conditions.append("segment_id = :segment_id")
    
    where_clause = " AND ".join(conditions)
    
    query = text(f"""
        SELECT formbricks_response_id, created_at
        FROM survey_logs
        WHERE {where_clause}
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, params)
        result = [[row[0], row[1]] for row in result]
        response_ids = [row[0] for row in result]
        timestamps = [row[1] for row in result]

    # Check if any entry was created within the last 10 minutes
    # Convert naive timestamps from DB to Berlin timezone for comparison
    current_time = now_berlin()
    if timestamps and not any([
        (current_time - to_berlin_time(timestamp)).total_seconds() < 60*20
        for timestamp in timestamps
    ]):
        if not force_deleting_all_matching_entries:
            raise HTTPException(401, "Survey entries older than 20 min cannot be deleted")
    
    # Invalidate each found response
    for response_id in response_ids:
        flag_survey_response_invalid(response_id)
    
    print(f"Invalidated {len(response_ids)} previous entries")


def create_survey_log(
    user: str,
    route_id: int,
    route_direction: str, 
    segment_id: str,
    response_id: str,
    formbricks_data: dict = None
) -> str:
    """Insert a new survey log entry into the database."""
    print("creating survey log")
    engine = get_engine()

    invalidate_previous_entries(
        user,
        route_id,
        route_direction,
        segment_id,
        force_deleting_all_matching_entries=True
    )
    
    insert_log_query = text("""
        INSERT INTO survey_logs (
            formbricks_response_id,
            user_name,
            route_id,
            route_direction,
            segment_id,
            formbricks_data
        ) VALUES (
            :response_id,
            :user,
            :route_id,
            :route_direction,
            :segment_id,
            :formbricks_data
        )
    """)
    
    with engine.connect() as conn:
        conn.execute(
            insert_log_query,
            {
                "response_id": response_id,
                "user": user,
                "route_id": route_id,
                "route_direction": route_direction,
                "segment_id": segment_id,
                "formbricks_data": json.dumps(formbricks_data) if formbricks_data else None
            }
        )
        conn.commit()
    
    print(f"Survey log created for response_id: {response_id}")

    return response_id



def flag_survey_response_invalid(
    response_id: str,
):
    """Mark a survey log entry as invalid."""
    print("invalidating survey entry")
    engine = get_engine()
    
    update_query = text("""
        UPDATE survey_logs
        SET invalid_entry = TRUE
        WHERE formbricks_response_id = :response_id
    """)
    
    with engine.connect() as conn:
        result = conn.execute(
            update_query,
            {"response_id": response_id}
        )
        conn.commit()
    
    print(f"Survey entry flagged as invalid: {response_id}")
    

def get_finished_segments_from_db(route_id: int = None, route_direction: str = None, user: str = None):
    """
    Get valid and completed (TODO) segments
    TODO get completed only!
    """
    print("getting list of completed segments")
    engine = get_engine()

    # Build dynamic WHERE clause based on provided filters
    conditions = ["invalid_entry = FALSE"]
    params = {}
    
    if route_id is not None:
        conditions.append("route_id = :route_id")
        params["route_id"] = route_id
    
    if route_direction is not None:
        conditions.append("route_direction = :route_direction")
        params["route_direction"] = route_direction
    
    if user is not None:
        conditions.append("user_name = :user")
        params["user"] = user
    
    where_clause = " AND ".join(conditions)
    
    query = text(f"""
        SELECT segment_id 
        FROM survey_logs
        WHERE {where_clause}
    """)

    with engine.connect() as conn:
        result = conn.execute(query, params)
        
        # Return list of segment_id values
        segment_list = [row[0] for row in result]
        return segment_list
    

def get_newest_survey_activity(user: str, segment_id: str) -> dict:
    """
    Get valid and completed (TODO) segments
    TODO get completed only!
    """
    print(f"getting details of newest survey activity from db {user} segment: {segment_id}")
    engine = get_engine()

    # Build dynamic WHERE clause based on provided filters
    conditions = ["invalid_entry = FALSE"]
    params = {}

    conditions.append("user_name = :user")
    params["user"] = user

    conditions.append("segment_id = :segment_id")
    params["segment_id"] = segment_id

    where_clause = " AND ".join(conditions)
    
    query = text(f"""
        SELECT segment_id, formbricks_response_id, user_name, route_id, route_direction, created_at
        FROM survey_logs
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT 1
    """)

    with engine.connect() as conn:
        result = conn.execute(query, params)
        row = result.fetchone()
        if row is None:
            return None
        return {
            "segment_id": row[0],
            "response_id": row[1],
            "user_name": row[2],
            "route_id": row[3],
            "route_direction": row[4],
            "timestamp": row[5]
        }
    