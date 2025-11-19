#!/usr/bin/env python3
"""
MCP Server Launcher for GATI

This script finds and launches the GATI MCP server.
It works both in development and after pip install.
"""

import os
import sys
import subprocess
from pathlib import Path


def find_mcp_server():
    """Find the MCP server executable path.

    Supports multiple installation scenarios:
    1. Development: mcp-server at repo root
    2. Pip install: mcp-server in site-packages alongside package
    3. Editable install (pip install -e): mcp-server at repo root
    """
    # Strategy 1: Development mode - relative to this file
    # Path structure: gati-sdk/sdk/gati/cli/mcp_launcher.py
    # MCP server at: gati-sdk/mcp-server/dist/index.js
    script_dir = Path(__file__).parent.parent.parent.parent
    dev_mcp = script_dir / "mcp-server" / "dist" / "index.js"
    if dev_mcp.exists():
        return dev_mcp

    # Strategy 2: Pip install - look in site-packages
    # When installed via pip, MANIFEST.in includes mcp-server/
    # Structure: site-packages/gati-0.1.3/mcp-server/dist/index.js
    try:
        import gati
        import importlib.util

        # Get the installed package location
        gati_spec = importlib.util.find_spec("gati")
        if gati_spec and gati_spec.origin:
            gati_init = Path(gati_spec.origin)  # .../site-packages/gati/__init__.py
            site_packages = gati_init.parent.parent  # .../site-packages/

            # Look for gati-X.X.X directory structure
            for item in site_packages.glob("gati-*"):
                if item.is_dir():
                    pip_mcp = item / "mcp-server" / "dist" / "index.js"
                    if pip_mcp.exists():
                        return pip_mcp

            # Fallback: check directly in site-packages
            direct_mcp = site_packages / "mcp-server" / "dist" / "index.js"
            if direct_mcp.exists():
                return direct_mcp
    except Exception:
        pass

    # Strategy 3: Check current working directory (if user is in project root)
    cwd_mcp = Path.cwd() / "mcp-server" / "dist" / "index.js"
    if cwd_mcp.exists():
        return cwd_mcp

    return None


def main():
    """Launch the MCP server."""
    mcp_server = find_mcp_server()
    
    if not mcp_server:
        print("Error: MCP server not found.", file=sys.stderr)
        print("Please ensure the MCP server is built: cd mcp-server && npm run build", file=sys.stderr)
        sys.exit(1)
    
    # Get backend URL from environment
    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000")
    
    # Set up environment
    env = os.environ.copy()
    env["BACKEND_URL"] = backend_url
    
    # Find node executable - check common locations and PATH
    import shutil
    node_cmd = shutil.which("node")
    
    if not node_cmd:
        # Try common installation paths
        common_paths = [
            "/usr/local/bin/node",
            "/opt/homebrew/bin/node",
            "/usr/bin/node",
        ]
        for path in common_paths:
            if os.path.exists(path):
                node_cmd = path
                break
    
    if not node_cmd:
        print("Error: Node.js not found. Please install Node.js 18+", file=sys.stderr)
        print("Node.js should be in your PATH or installed at a standard location.", file=sys.stderr)
        sys.exit(1)
    
    # Launch the MCP server
    try:
        os.execve(
            node_cmd,
            [node_cmd, str(mcp_server)],
            env
        )
    except FileNotFoundError:
        print(f"Error: Node.js not found at {node_cmd}. Please install Node.js 18+", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error launching MCP server: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

