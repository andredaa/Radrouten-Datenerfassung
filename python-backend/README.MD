# Bike-Access-Check Kartierung Backend

Backend service for the Bike-Access-Check Kartierung (Field Survey) APP


# TODO
- import script to import radrouten segments into db -> set also wkb attribute.
- add formbricks to docker compose
- test docker compose setup
- fast api cors 
- route to send kartierungsupdates
- route to get kartierungsstati



## Table of Contents
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)

---

## Quick Start

This section provides the essential commands to run the IMEQ backend independently for index calculation and API usage.

### Setup
1. **Install uv** (Python package manager):
   ```bash
   pip install uv
   ```
   **Install dependencies:**
      ```bash
      cd backend
      uv sync
      ```

2. **Configure environment variables:**
   
   Create a `.env` file in the **project root directory** (parent of `backend/`) based on `template.env`:
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your database credentials and configuration:
   ```bash
   ENV=development
   
   # Database Configuration
   POSTGIS_USER=postgres
   POSTGIS_PASSWORD=your_password
   POSTGIS_DB=IMEQ
   DB_PORT=5432
   DB_HOST=localhost
   
   # Server Configuration
   BACKEND_PORT=5000
   BACKEND_HOST=http://localhost
   ```

3. **Database**

   In case you want to start from a fresh database, you can use 
   ```bash
   # From project root
   docker compose up db -d
   ```

   **Populating the database**
   TODO
   
   **Import script**
   TODO 
   # you can use the import script in backend/index_calc/input_files in order to import local files into the database, e.g. the valencia__segments_joined_fields
   
   
### Running the API Server

To start the FastAPI server and access the data-provision API.

```bash
# From backend directory
uv run --env-file .env server.py
```

**What this provides:**
- Automatically calculates the index for the all cities on startup
- REST API for calculating indices on-demand for specific segments
- API documentation at: `http://localhost:5000/docs`
- Server runs on `http://localhost:5000` (configurable via `BACKEND_PORT`)

**Key API Endpoints:**
- `GET /get_layer` - Retrieve layer from db

For detailed information on input data requirements, configuration, and advanced usage, see the sections below.

---

## Prerequisites

- **Python 3.10+**
- **uv** - Python package manager (install via `pip install uv` or see [uv documentation](https://github.com/astral-sh/uv))
- **Docker & Docker Compose** (for database and containerized deployment)
- **PostgreSQL with PostGIS extension** (managed via Docker)
