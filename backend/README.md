# GATI Backend

FastAPI-based backend service that receives and stores agent trace data from the GATI SDK.

## Overview

The backend provides a REST API for:
- Receiving trace events from the GATI SDK
- Storing agent runs, events, and metrics in PostgreSQL
- Serving trace data to the dashboard
- Aggregating metrics and analytics

## Architecture

```
GATI SDK → Backend API → PostgreSQL
                ↓
            Dashboard
```

### Key Components

- **FastAPI Application** - Async REST API server
- **PostgreSQL Database** - Stores all trace data
- **SQLAlchemy ORM** - Database models and queries
- **Alembic** - Database migrations

### Database Schema

**agents** - Tracked AI agents
- name (PK)
- description
- created_at, updated_at

**runs** - Individual agent executions
- run_id (PK, UUID)
- agent_name (FK)
- environment
- status (active, completed, failed)
- total_duration_ms
- total_cost
- tokens_in, tokens_out
- run_metadata (JSONB)
- created_at, updated_at

**events** - Operation events within runs
- event_id (PK, UUID)
- run_id (FK)
- agent_name
- event_type (llm_call, tool_call, agent_start, etc.)
- timestamp
- data (JSONB) - Contains parent_run_id for hierarchical tracing
- created_at, updated_at

## Setup

### Using Docker Compose (Recommended)

From the project root:

```bash
docker-compose up -d
```

This starts:
- Backend API on http://localhost:8000
- PostgreSQL on port 5432
- Dashboard on http://localhost:3000

### Local Development

1. Install dependencies:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Run migrations:
```bash
alembic upgrade head
```

4. Start server:
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health
- `GET /health` - Health check

### Events
- `POST /api/events` - Bulk ingest events (up to 10,000 per batch)

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/{agent_name}` - Get agent details
- `GET /api/agents/{agent_name}/runs` - Get agent runs

### Runs
- `GET /api/runs/{run_id}` - Get run details
- `GET /api/runs/{run_id}/timeline` - Get event timeline
- `GET /api/runs/{run_id}/trace` - Get execution tree

### Metrics
- `GET /api/metrics/summary` - Global metrics
- `GET /api/agents/{agent_name}/metrics` - Per-agent metrics

## Configuration

Environment variables (`.env`):

```bash
# Database
DATABASE_URL=postgresql://gati_user:gati_password@localhost:5432/gati_db
DATABASE_POOL_SIZE=20

# CORS
CORS_ORIGINS=*

# Application
DEBUG=false
ENVIRONMENT=production
API_PREFIX=/api
```

## Development

### Running Tests
```bash
pytest tests/ -v
```

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Quality
```bash
black .
mypy .
flake8 .
```

## Performance

- **Event Ingestion**: ~10,000 events/second
- **Connection Pooling**: 20 connections (configurable)
- **Bulk Inserts**: Single transaction for batch events
- **Indexes**: Optimized for common query patterns

## Troubleshooting

### Database connection issues
```bash
# Test connection
psql postgresql://user:password@localhost:5432/gati_db -c "SELECT 1"

# Check Docker logs
docker-compose logs backend
```

### Migration issues
```bash
# Check current migration
alembic current

# View history
alembic history
```

## License

MIT
