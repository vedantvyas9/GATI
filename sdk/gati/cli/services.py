"""Service launchers for GATI services."""
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional, List, Dict


def find_backend_dir() -> Optional[Path]:
    """Find the backend directory.
    
    Tries:
    1. Local development: ../../backend from package
    2. GitHub clone location
    3. Returns None if not found
    """
    # Try relative to package (for development)
    package_dir = Path(__file__).parent.parent.parent.parent
    backend_dir = package_dir / "backend"
    if backend_dir.exists() and (backend_dir / "app").exists():
        return backend_dir
    
    # Try from current working directory
    cwd_backend = Path.cwd() / "backend"
    if cwd_backend.exists() and (cwd_backend / "app").exists():
        return cwd_backend
    
    return None


def find_dashboard_dir() -> Optional[Path]:
    """Find the dashboard directory."""
    package_dir = Path(__file__).parent.parent.parent.parent
    dashboard_dir = package_dir / "dashboard"
    if dashboard_dir.exists() and (dashboard_dir / "dist").exists():
        return dashboard_dir
    
    cwd_dashboard = Path.cwd() / "dashboard"
    if cwd_dashboard.exists() and (cwd_dashboard / "dist").exists():
        return cwd_dashboard
    
    return None


def find_mcp_server_path() -> Optional[Path]:
    """Find the MCP server executable path.
    
    Returns:
        Path to mcp-server/dist/index.js, or None if not found
    """
    # Try relative to package (for development)
    package_dir = Path(__file__).parent.parent.parent.parent
    mcp_dir = package_dir / "mcp-server"
    mcp_server = mcp_dir / "dist" / "index.js"
    
    if mcp_server.exists():
        return mcp_server
    
    # Try from current working directory
    cwd_mcp = Path.cwd() / "mcp-server" / "dist" / "index.js"
    if cwd_mcp.exists():
        return cwd_mcp
    
    # Try to find in installed package location
    try:
        import gati
        gati_pkg = Path(gati.__file__).parent.parent.parent
        installed_mcp = gati_pkg / "mcp-server" / "dist" / "index.js"
        if installed_mcp.exists():
            return installed_mcp
    except Exception:
        pass
    
    return None


def check_dependencies() -> Dict[str, bool]:
    """Check if required dependencies are available."""
    deps = {
        "python": shutil.which("python3") or shutil.which("python"),
        "node": shutil.which("node"),
        "uvicorn": None,
    }
    
    # Check if uvicorn is available
    if deps["python"]:
        try:
            result = subprocess.run(
                [deps["python"], "-m", "pip", "show", "uvicorn"],
                capture_output=True,
                text=True,
            )
            deps["uvicorn"] = result.returncode == 0
        except Exception:
            deps["uvicorn"] = False
    
    return deps


def start_backend(
    data_dir: Path,
    port: int = 8000,
    host: str = "0.0.0.0",
) -> tuple[List[str], Dict[str, str], Optional[Path]]:
    """Start the backend service.
    
    Args:
        data_dir: Directory to store database and data
        port: Port to run on
        host: Host to bind to
        
    Returns:
        Command to run
    """
    backend_dir = find_backend_dir()
    if not backend_dir:
        raise RuntimeError(
            "Backend directory not found. Please ensure you're running from "
            "the GATI SDK repository root, or install the backend separately."
        )
    
    # Check and install backend dependencies
    requirements_file = backend_dir / "requirements.txt"
    if requirements_file.exists():
        print("Checking backend dependencies...")
        try:
            # Try importing fastapi to check if dependencies are installed
            import fastapi
        except ImportError:
            print("Installing backend dependencies...")
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "-q", "-r", str(requirements_file)],
                check=False,
            )
    
    # Ensure data directory exists
    data_dir.mkdir(parents=True, exist_ok=True)
    db_path = data_dir / "gati.db"
    
    # Set environment variables
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"
    env["PYTHONPATH"] = str(backend_dir)
    
    # Check if migrations need to be run
    alembic_ini = backend_dir / "alembic.ini"
    if alembic_ini.exists():
        # Run migrations first (don't fail if alembic not available)
        try:
            result = subprocess.run(
                [sys.executable, "-m", "alembic", "upgrade", "head"],
                cwd=backend_dir,
                env=env,
                capture_output=True,
                check=False,
            )
            if result.returncode != 0:
                # If migrations fail, try to continue anyway (database might already exist)
                pass
        except Exception:
            # If alembic is not available, continue anyway
            pass
    
    # Start uvicorn
    cmd = [
        sys.executable,
        "-m", "uvicorn",
        "app.main:app",
        "--host", host,
        "--port", str(port),
        "--workers", "1",  # Single worker for SQLite
    ]
    
    return cmd, env, backend_dir


def start_dashboard(port: int = 3000) -> tuple[List[str], Dict[str, str], Optional[Path]]:
    """Start the dashboard service.
    
    Args:
        port: Port to run on
        
    Returns:
        Command, environment, and working directory
    """
    dashboard_dir = find_dashboard_dir()
    if not dashboard_dir:
        raise RuntimeError(
            "Dashboard directory not found. Please ensure the dashboard is built "
            "and available in the dashboard/dist directory."
        )
    
    dist_dir = dashboard_dir / "dist"
    if not dist_dir.exists():
        raise RuntimeError(
            f"Dashboard dist directory not found at {dist_dir}. "
            "Please build the dashboard first: cd dashboard && npm run build"
        )
    
    # Use Python's http.server to serve static files
    cmd = [
        sys.executable,
        "-m", "http.server",
        str(port),
        "--directory", str(dist_dir),
    ]
    
    return cmd, os.environ.copy(), None


def start_mcp_server(
    data_dir: Path,
    backend_url: str = "http://localhost:8000",
) -> Optional[tuple[List[str], Dict[str, str], Optional[Path]]]:
    """Start the MCP server (optional).
    
    Args:
        data_dir: Directory with database
        backend_url: Backend API URL
        
    Returns:
        Command, environment, and working directory, or None if not available
    """
    package_dir = Path(__file__).parent.parent.parent.parent
    mcp_dir = package_dir / "mcp-server"
    
    if not mcp_dir.exists():
        return None
    
    dist_dir = mcp_dir / "dist"
    if not dist_dir.exists() or not (dist_dir / "index.js").exists():
        # Try to build it
        if (mcp_dir / "package.json").exists():
            subprocess.run(
                ["npm", "run", "build"],
                cwd=mcp_dir,
                check=False,
            )
    
    if not (dist_dir / "index.js").exists():
        return None
    
    db_path = data_dir / "gati.db"
    env = os.environ.copy()
    env["DATABASE_PATH"] = str(db_path)
    env["BACKEND_URL"] = backend_url
    
    cmd = ["node", str(dist_dir / "index.js")]
    
    return cmd, env, None

