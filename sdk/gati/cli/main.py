"""GATI CLI - Command-line interface for managing GATI services."""
import argparse
import os
import socket
import sys
import time
from pathlib import Path

from .process_manager import ProcessManager
from .services import (
    start_backend,
    start_dashboard,
    start_mcp_server,
    check_dependencies,
    find_backend_dir,
    find_dashboard_dir,
    find_mcp_server_path,
)


def start_services(args):
    """Start GATI backend and dashboard as local processes."""
    print("\n" + "=" * 70)
    print("🚀 GATI - Starting services...")
    print("=" * 70 + "\n")
    
    # Get ports from args or environment variables
    backend_port = args.backend_port or int(os.environ.get("GATI_BACKEND_PORT", "8000"))
    dashboard_port = args.dashboard_port or int(os.environ.get("GATI_DASHBOARD_PORT", "3000"))
    
    # Check dependencies
    deps = check_dependencies()
    if not deps["python"]:
        print("❌ Error: Python not found. Please install Python 3.9+")
        sys.exit(1)
    
    if not deps["uvicorn"]:
        print("⚠️  Warning: uvicorn not found. Installing...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "uvicorn"], check=True)
    
    # Initialize process manager
    data_dir = Path.home() / ".gati" / "data"
    manager = ProcessManager(data_dir=data_dir)
    
    # Check if services are already running
    if manager.is_running("backend") or manager.is_running("dashboard"):
        print("⚠️  Some services are already running.")
        print("   Run 'gati stop' first, or use 'gati status' to check.\n")
        sys.exit(1)
    
    # Check port availability
    def is_port_available(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) != 0
    
    if not is_port_available(backend_port):
        print(f"❌ Error: Port {backend_port} is already in use.")
        print(f"   Please stop the service using port {backend_port} or use a different port.\n")
        sys.exit(1)
    
    if not is_port_available(dashboard_port):
        print(f"❌ Error: Port {dashboard_port} is already in use.")
        print(f"   Please stop the service using port {dashboard_port} or use a different port.\n")
        sys.exit(1)
    
    try:
        # Start backend
        print(f"Starting backend on port {backend_port}...")
        backend_cmd, backend_env, backend_cwd = start_backend(data_dir, port=backend_port)
        backend_pid = manager.start_process(
            "backend",
            backend_cmd,
            cwd=backend_cwd,
            env=backend_env,
        )
        print(f"✅ Backend started (PID: {backend_pid})")
        
        # Wait a moment for backend to start
        time.sleep(2)
        
        # Start dashboard
        print(f"Starting dashboard on port {dashboard_port}...")
        dashboard_cmd, dashboard_env, dashboard_cwd = start_dashboard(port=dashboard_port)
        dashboard_pid = manager.start_process(
            "dashboard",
            dashboard_cmd,
            cwd=dashboard_cwd,
            env=dashboard_env,
        )
        print(f"✅ Dashboard started (PID: {dashboard_pid})")
        
        # Optionally start MCP server (uses backend port for API URL)
        mcp_result = start_mcp_server(data_dir, backend_url=f"http://localhost:{backend_port}")
        if mcp_result:
            mcp_cmd, mcp_env, mcp_cwd = mcp_result
            try:
                mcp_pid = manager.start_process(
                    "mcp-server",
                    mcp_cmd,
                    cwd=mcp_cwd,
                    env=mcp_env,
                )
                print(f"✅ MCP server started (PID: {mcp_pid})")
            except Exception as e:
                print(f"⚠️  MCP server not started: {e}")
        
        if args.foreground:
            print("\n" + "=" * 70)
            print("Services running in foreground. Press Ctrl+C to stop.")
            print("=" * 70 + "\n")
            try:
                # Keep running until interrupted
                while True:
                    time.sleep(1)
                    # Check if processes are still running
                    if not manager.is_running("backend") and not manager.is_running("dashboard"):
                        print("\n⚠️  Services stopped unexpectedly.")
                        break
            except KeyboardInterrupt:
                print("\n\nStopping services...")
                stop_services(args)
        else:
            print("\n" + "=" * 70)
            print("✅ GATI services started successfully!")
            print("=" * 70)
            print("\nServices running at:")
            print(f"  • Backend:   http://localhost:{backend_port}")
            print(f"  • Dashboard: http://localhost:{dashboard_port}")
            print("\nTo stop services: gati stop")
            print("To view status:   gati status")
            print("To view logs:     gati logs")
            print("=" * 70 + "\n")
    
    except Exception as e:
        print(f"\n❌ Error starting services: {e}")
        print("\nTroubleshooting:")
        print("  • Make sure backend and dashboard directories are available")
        print("  • Check if the configured ports are available")
        print("  • Ensure Python dependencies are installed")
        print("  • Run 'gati logs' for details\n")
        
        # Clean up any started services
        manager.stop_all()
        sys.exit(1)


def stop_services(args):
    """Stop GATI backend and dashboard."""
    print("\n🛑 Stopping GATI services...")
    
    data_dir = Path.home() / ".gati" / "data"
    manager = ProcessManager(data_dir=data_dir)
    
    stopped = manager.stop_all()
    
    if stopped:
        print(f"✅ Stopped {len(stopped)} service(s): {', '.join(stopped)}\n")
    else:
        print("ℹ️  No services were running.\n")


def show_status(args):
    """Show status of GATI services."""
    data_dir = Path.home() / ".gati" / "data"
    manager = ProcessManager(data_dir=data_dir)
    
    status = manager.get_status()
    
    if not status:
        print("No services running.\n")
        return
    
    print("\nGATI Services Status:")
    print("=" * 70)
    for service, info in status.items():
        status_icon = "✅" if info["running"] else "❌"
        pid_info = f" (PID: {info['pid']})" if info["pid"] else ""
        print(f"{status_icon} {service:15} {'Running' if info['running'] else 'Stopped'}{pid_info}")
    print("=" * 70 + "\n")


def show_logs(args):
    """Show logs from GATI services."""
    data_dir = Path.home() / ".gati" / "data"
    log_dir = data_dir / "logs"
    
    if args.service:
        log_file = log_dir / f"{args.service}.out.log"
        err_file = log_dir / f"{args.service}.err.log"
        
        if not log_file.exists() and not err_file.exists():
            print(f"❌ No logs found for {args.service}")
            return
        
        if args.follow:
            import subprocess
            # Use tail -f to follow logs
            try:
                if log_file.exists():
                    subprocess.run(["tail", "-f", str(log_file)])
                elif err_file.exists():
                    subprocess.run(["tail", "-f", str(err_file)])
            except KeyboardInterrupt:
                pass
        else:
            if log_file.exists():
                print(f"\n=== {args.service} stdout ===")
                print(log_file.read_text())
            if err_file.exists():
                print(f"\n=== {args.service} stderr ===")
                print(err_file.read_text())
    else:
        # Show all logs
        if not log_dir.exists():
            print("No logs found.")
            return
        
        for log_file in sorted(log_dir.glob("*.out.log")):
            service = log_file.stem.replace(".out", "")
            print(f"\n=== {service} ===")
            print(log_file.read_text()[-2000:])  # Last 2000 chars


def setup_mcp(args):
    """Set up MCP server configuration for VS Code."""
    import json

    print("\n" + "=" * 70)
    print("🔧 GATI MCP Server Setup for VS Code")
    print("=" * 70 + "\n")

    # Find MCP server path
    mcp_path = find_mcp_server_path()
    if not mcp_path:
        print("❌ MCP server not found.")
        print("\nPlease ensure:")
        print("  1. You're in the GATI SDK repository, or")
        print("  2. The MCP server is built: cd mcp-server && npm run build")
        print("\nTrying to build MCP server now...")

        # Try to build it
        package_dir = Path(__file__).parent.parent.parent.parent
        mcp_dir = package_dir / "mcp-server"
        if mcp_dir.exists() and (mcp_dir / "package.json").exists():
            import subprocess
            print("Building MCP server...")
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=mcp_dir,
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                mcp_path = find_mcp_server_path()
                if mcp_path:
                    print("✅ MCP server built successfully!\n")
                else:
                    print("❌ Build completed but MCP server still not found.")
                    sys.exit(1)
            else:
                print(f"❌ Build failed: {result.stderr}")
                sys.exit(1)
        else:
            sys.exit(1)

    mcp_path = mcp_path.resolve()  # Get absolute path
    backend_url = os.environ.get("GATI_BACKEND_URL", "http://localhost:8000")

    print(f"✅ Found MCP server at: {mcp_path}")
    print(f"✅ Backend URL: {backend_url}\n")

    # Use python -m gati.cli.mcp_launcher which works both locally and after pip install
    # Find the Python executable that has gati installed
    try:
        import gati
        import sys
        python_exe = sys.executable
    except:
        # Fallback to python3
        python_exe = "python3"

    server_config = {
        "type": "stdio",
        "command": python_exe,
        "args": [
            "-m", "gati.cli.mcp_launcher"
        ],
        "env": {
            "BACKEND_URL": backend_url
        }
    }

    mcp_json = {
        "servers": {
            "gati": server_config
        }
    }

    # Try to find workspace root (look for .vscode, .git, or common project files)
    workspace_root = Path.cwd()
    for marker in [".vscode", ".git", "package.json", "pyproject.toml", "setup.py"]:
        current = Path.cwd()
        while current != current.parent:
            if (current / marker).exists():
                workspace_root = current
                break
            current = current.parent

    # Ensure .vscode directory exists
    vscode_dir = workspace_root / ".vscode"
    vscode_dir.mkdir(exist_ok=True)

    output_file = vscode_dir / "mcp.json"
    if output_file.exists() and not args.force:
        print(f"⚠️  {output_file} already exists. Use --force to overwrite.")
        sys.exit(0)

    output_file.write_text(json.dumps(mcp_json, indent=2))
    print(f"✅ Created {output_file}")
    print(f"\n📝 VS Code MCP Configuration:")
    print(f"   Location: {output_file}")
    print(f"   Backend: {backend_url}\n")
    print("Next steps:")
    print("  1. Ensure GATI backend is running: gati start")
    print("  2. Reload VS Code window (Cmd+Shift+P → 'Developer: Reload Window')")
    print("  3. Open GitHub Copilot Chat")
    print("  4. The GATI MCP server should now be available with tools like:")
    print("     - list_agents, get_agent_stats, list_runs, etc.")
    print("  5. You can verify in VS Code Output panel (View → Output → 'MCP')\n")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="GATI - Local-first observability for AI agents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  gati start                          Start backend and dashboard (detached mode)
  gati start -f                       Start in foreground with logs visible
  gati start --backend-port 8080      Start with custom backend port
  gati start --dashboard-port 3001    Start with custom dashboard port
  gati mcp                            Set up MCP server for VS Code (creates .vscode/mcp.json)
  gati mcp --force                    Overwrite existing MCP configuration
  gati stop                           Stop all services
  gati status                         Show service status
  gati logs                           Show logs
  gati logs -f backend                Follow backend logs

Environment Variables:
  GATI_BACKEND_PORT                   Default backend port (default: 8000)
  GATI_DASHBOARD_PORT                 Default dashboard port (default: 3000)
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start GATI services")
    start_parser.add_argument(
        "-f", "--foreground",
        action="store_true",
        help="Run in foreground (logs visible)"
    )
    start_parser.add_argument(
        "--backend-port",
        type=int,
        default=None,
        help="Port for backend API (default: 8000, or GATI_BACKEND_PORT env var)"
    )
    start_parser.add_argument(
        "--dashboard-port",
        type=int,
        default=None,
        help="Port for dashboard (default: 3000, or GATI_DASHBOARD_PORT env var)"
    )
    start_parser.set_defaults(func=start_services)
    
    # Stop command
    stop_parser = subparsers.add_parser("stop", help="Stop GATI services")
    stop_parser.set_defaults(func=stop_services)
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Show service status")
    status_parser.set_defaults(func=show_status)
    
    # Logs command
    logs_parser = subparsers.add_parser("logs", help="Show service logs")
    logs_parser.add_argument(
        "-f", "--follow",
        action="store_true",
        help="Follow log output"
    )
    logs_parser.add_argument(
        "service",
        nargs="?",
        choices=["backend", "dashboard", "mcp-server"],
        help="Specific service to show logs for"
    )
    logs_parser.set_defaults(func=show_logs)
    
    # MCP Setup command
    mcp_parser = subparsers.add_parser("mcp", help="Set up MCP server for VS Code")
    mcp_parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing .vscode/mcp.json file"
    )
    mcp_parser.set_defaults(func=setup_mcp)

    args = parser.parse_args()
    
    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(1)
    
    args.func(args)


if __name__ == "__main__":
    main()
