# Kartierung Software

Server stack for the Bike-Access-Check field survey ("Kartierung") of Hamburg's bicycle routes. Surveyors bike along route segments on a map and fill in a Formbricks survey per segment; progress is tracked in a PostGIS database.

## Architecture

| Service | Image / Source | Purpose |
|---|---|---|
| `nginx` | `nginx:alpine` | Reverse proxy, TLS (certbot), basic auth. Only service exposing ports 80/443. |
| `frontend` | [frontend/](frontend/) | Static web app (Leaflet-style map, vanilla ES modules). |
| `backend` | [python-backend/](python-backend/) | FastAPI service: serves GeoJSON layers, tracks survey activity, reads Formbricks responses. |
| `db` | `postgis/postgis` | Kartierung database (route segments, survey logs). |
| `formbricks` | `ghcr.io/formbricks/formbricks` | Survey platform. |
| `formbricks-postgres` | `pgvector/pgvector:pg17` | Formbricks database. |
| `redis` | `valkey/valkey` | Formbricks cache. |

Frontend pages in [frontend/app/](frontend/app/): main kartierung map, `befragung/`, `bike-shops/`, `radnetz/`.

## Backend API

Defined in [python-backend/server.py](python-backend/server.py). Interactive docs are available at `/docs` on the backend.

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/get_layer` | GeoJSON layer (`layer_name`, optional `route_id`, `direction`) |
| GET | `/get_radnetz_by_neighborhood` | Radnetz segments clipped to Stadtteil(e) |
| GET | `/get_finished_segments` | Finished segment IDs (`route_id`, `direction`, `user`) |
| GET | `/get_invalid_response_ids` | Invalidated Formbricks response IDs |
| GET | `/get_response_details` | Formbricks response for a `user` and `segment_id` |
| POST | `/track_survey_activity` | Log `start` / `stop` / `delete` of a segment survey |

## Configuration

Create a `.env` file in the project root:

```bash
POSTGIS_USER=postgres
POSTGIS_PASSWORD=<password>
POSTGIS_DB=<db name>
DB_HOST=db
FORMBRICKS_API_KEY=<formbricks api key>
```

In [docker-compose.yml](docker-compose.yml), `NEXTAUTH_SECRET`, `ENCRYPTION_KEY` and `CRON_SECRET` are placeholders (`__generate_me__`) that must be replaced, e.g. with `openssl rand -hex 32`.

## Local development

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Formbricks: http://localhost:3000
- PostGIS: `localhost:5432`

Frontend and backend dev details: [frontend/DEV_README.md](frontend/DEV_README.md), [python-backend/README.MD](python-backend/README.MD).

## Production deployment

```bash
./deploy-with-secrets.sh <user_id> <nextauth_secret> <encryption_key> <cron_secret>
```

The script stops the containers, fixes certbot permissions, runs `git pull`, injects the Formbricks secrets into `docker-compose.yml` (backup saved as `docker-compose.yml.backup`), and rebuilds and starts the stack.

TLS certificates are managed via [certbot/certbot_init.sh](certbot/certbot_init.sh) and [certbot/certbot_renew.sh](certbot/certbot_renew.sh).

## Backup, restore and migration

- [BACKUP_README.md](BACKUP_README.md): `backup_database.sh` / `restore_database.sh` for both databases.
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md): moving the stack to another server.

## Data and utility scripts

- [python-backend/radrouten/](python-backend/radrouten/) and [python-backend/radnetz/](python-backend/radnetz/): source GeoPackages for route and network segments.
- [survey_definitions/](survey_definitions/): Formbricks survey exports.
- Root-level `create_*_excel.py`, `create_kartierung_csv.py`, `kartierungsstatus.py`, `check_identical_segments.py`: reporting and analysis helpers.

## TODO 
- Upgrade Formbricks version
- Currently protected by basic auth. Integrate keycloak for login
