import os
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from dotenv import load_dotenv
from pathlib import Path

# Load .env from parent directory
env_path = Path(__file__).parent.parent.parent / ".env"
print(env_path)
load_dotenv(env_path)


# PostgreSQL connection details from environment variable
db_user = os.getenv('POSTGIS_USER')
db_password = os.getenv('POSTGIS_PASSWORD')
db_host = os.getenv('DB_HOST')
db_port = os.getenv('DB_PORT')
db_name = os.getenv('POSTGIS_DB')

# DB_CONNECTION_STRING=postgresql://postgres:123456@localhost:5432/IMEQ
db_connection_string = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
print(f"DB connection string")

print(db_connection_string)

# Connect to the PostgreSQL database
engine = create_engine(db_connection_string)

print(engine)


def get_engine() -> Engine:
    return engine

