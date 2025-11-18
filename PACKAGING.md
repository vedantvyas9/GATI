# GATI Packaging Guide

This document explains how the GATI SDK is packaged and distributed.

## Package Structure

The GATI package is structured to provide:
1. **Python SDK** - Core library for instrumenting AI agents
2. **CLI Tool** - Command-line interface for managing services
3. **Docker Compose Configuration** - Pre-configured backend and dashboard services

## How It Works

When users run `pip install gati`, they get:

- **SDK Package** (`gati/`) - Located in `sdk/gati/`
  - Core observability functionality
  - LangChain/LangGraph auto-instrumentation
  - Telemetry client
  - CLI tool

- **Docker Compose** - Bundled in the package at `gati/docker-compose.yml`
  - Backend API (FastAPI) - Port 8000
  - Dashboard (React) - Port 3000
  - MCP Server - For Claude Desktop/GitHub Copilot integration

## Key Files

### Root Files
- `setup.py` - Main package configuration (legacy)
- `pyproject.toml` - Modern Python packaging configuration (preferred)
- `MANIFEST.in` - Specifies which non-Python files to include
- `docker-compose.yml` - Development version (also copied to package)

### Package Files
- `sdk/gati/` - Main Python package
- `sdk/gati/docker-compose.yml` - Production docker-compose (included in pip package)
- `sdk/gati/cli/main.py` - CLI entry point

## Usage Flow

1. **Installation**
   ```bash
   pip install gati
   ```

2. **Start Services**
   ```bash
   gati start
   ```
   This runs `docker-compose up` using the bundled `docker-compose.yml`

3. **Use SDK**
   ```python
   from gati import observe

   @observe()
   def my_agent():
       # Your code here
       pass
   ```

## Docker Images

The docker-compose.yml references these images:
- `gati/backend:latest` - FastAPI backend
- `gati/dashboard:latest` - React dashboard
- `gati/mcp-server:latest` - MCP server

**You need to build and push these images to Docker Hub before distribution.**

## Building for Distribution

### 1. Build Docker Images

First, build and tag the Docker images:

```bash
# Backend
cd backend
docker build -t gati/backend:latest .
docker push gati/backend:latest

# Dashboard
cd ../dashboard
docker build -t gati/dashboard:latest .
docker push gati/dashboard:latest

# MCP Server
cd ../mcp-server
docker build -t gati/mcp-server:latest .
docker push gati/mcp-server:latest
```

### 2. Build Python Package

```bash
# Clean previous builds
rm -rf dist/ build/ *.egg-info sdk/*.egg-info

# Build using modern method (recommended)
pip install build
python -m build

# Or using setup.py (legacy)
python setup.py sdist bdist_wheel
```

### 3. Test Locally

```bash
# Install in editable mode for development
pip install -e .

# Or test the built package
pip install dist/gati-*.whl

# Verify installation
gati --help
python -c "import gati; print(gati.__version__)"
```

### 4. Publish to PyPI

```bash
# Install twine
pip install twine

# Upload to TestPyPI first
twine upload --repository testpypi dist/*

# Test installation from TestPyPI
pip install --index-url https://test.pypi.org/simple/ gati

# If everything works, upload to PyPI
twine upload dist/*
```

## Development vs Production

### Development Setup
For development, use the root `docker-compose.yml` which can mount local code:

```bash
docker-compose up
```

### Production Setup
For end users, they get the packaged version:

```bash
pip install gati
gati start
```

## Environment Variables

The docker-compose.yml is pre-configured with sensible defaults:

- **Backend**: http://localhost:8000
- **Dashboard**: http://localhost:3000
- **Database**: SQLite in Docker volume `gati_data`

Users don't need to configure anything - it works out of the box.

## Troubleshooting

### Package not including docker-compose.yml
- Check `MANIFEST.in` includes the file
- Check `setup.py` or `pyproject.toml` has correct `package_data`
- Rebuild: `python -m build --no-isolation`

### CLI can't find docker-compose.yml
- The CLI uses `Path(gati.__file__).parent` to find it
- Verify file is in the installed package location
- Check with: `python -c "import gati; from pathlib import Path; print(list(Path(gati.__file__).parent.glob('*')))"`

### Docker images not found
- Build and push images to Docker Hub first
- Or update `docker-compose.yml` to use local builds

## File Checklist

Before publishing:
- [ ] `setup.py` updated with correct version
- [ ] `pyproject.toml` matches setup.py
- [ ] `sdk/gati/version.py` updated
- [ ] `sdk/gati/docker-compose.yml` exists
- [ ] Docker images pushed to Docker Hub
- [ ] `README.md` has clear installation instructions
- [ ] Test with `pip install -e .`
- [ ] Test with `pip install dist/*.whl`
- [ ] Test `gati start` works
