"""GATI CLI - Command-line interface for managing GATI services."""
import argparse
import subprocess
import sys
from pathlib import Path
from .auth import AuthManager


def get_gati_root() -> Path:
    """Get the root directory of GATI installation."""
    # When installed via pip, docker-compose.yml is in the gati package directory
    import gati
    gati_pkg = Path(gati.__file__).parent
    return gati_pkg


def check_authentication():
    """Check if user is authenticated, prompt if not."""
    auth = AuthManager()
    if not auth.is_authenticated():
        print("\n⚠️  You are not authenticated yet.")
        print("   GATI requires authentication to prevent spam and keep the service free.\n")
        response = input("Would you like to authenticate now? (y/n): ").strip().lower()
        if response == 'y':
            if auth.interactive_auth():
                return True
            else:
                return False
        else:
            print("\n❌ Authentication is required to use GATI.")
            print("   Run 'gati auth' when you're ready to authenticate.\n")
            return False
    return True


def start_services(args):
    """Guide users to start GATI backend and dashboard."""
    print("\n" + "=" * 70)
    print("🚀 GATI - Local-first observability for AI agents")
    print("=" * 70)
    print("\n✅ GATI SDK is installed and ready to use!")
    print("\nTo view traces in the dashboard, clone the GATI repository:\n")
    print("  git clone https://github.com/gati-ai/gati-sdk.git")
    print("  cd gati-sdk")
    print("  docker-compose up")
    print("\nThis will start:")
    print("  • Backend: http://localhost:8000")
    print("  • Dashboard: http://localhost:3000")
    print("\n" + "=" * 70)
    print("\nSDK Usage (no dashboard needed):")
    print("=" * 70)
    print("\n  from gati import observe")
    print("")
    print("  @observe()")
    print("  def my_agent(query):")
    print("      # Your agent code")
    print("      return result")
    print("\n  # Traces are logged to stdout automatically")
    print("  # Run docker-compose (above) to view in dashboard")
    print("\n" + "=" * 70 + "\n")


def stop_services(args):
    """Stop GATI backend and dashboard."""
    gati_root = get_gati_root()
    compose_file = gati_root / "docker-compose.yml"
    
    cmd = ["docker-compose", "-f", str(compose_file), "down"]
    
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error stopping services: {e}")
        sys.exit(1)


def show_status(args):
    """Show status of GATI services."""
    gati_root = get_gati_root()
    compose_file = gati_root / "docker-compose.yml"
    
    cmd = ["docker-compose", "-f", str(compose_file), "ps"]
    
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error getting status: {e}")
        sys.exit(1)


def show_logs(args):
    """Show logs from GATI services."""
    gati_root = get_gati_root()
    compose_file = gati_root / "docker-compose.yml"
    
    cmd = ["docker-compose", "-f", str(compose_file), "logs"]
    if args.follow:
        cmd.append("-f")
    if args.service:
        cmd.append(args.service)
    
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error showing logs: {e}")
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="GATI - Local-first observability for AI agents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  gati start              Start backend and dashboard
  gati start -d           Start in detached mode
  gati stop               Stop all services
  gati status             Show service status
  gati logs               Show logs
  gati logs -f backend    Follow backend logs
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start GATI services")
    start_parser.add_argument(
        "-d", "--detach",
        action="store_true",
        help="Run in detached mode"
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
        choices=["backend", "dashboard", "postgres"],
        help="Specific service to show logs for"
    )
    logs_parser.set_defaults(func=show_logs)

    # Auth command
    def handle_auth(args):
        """Handle auth command - check if already authenticated first."""
        auth = AuthManager()
        if auth.is_authenticated():
            email = auth.get_email()
            print(f"\n✅ You are already authenticated as: {email}\n")
            response = input("Would you like to re-authenticate? (y/n): ").strip().lower()
            if response == 'y':
                # Logout first, then re-authenticate
                auth.logout()
                return auth.interactive_auth()
            else:
                print("\n✅ Keeping existing authentication.\n")
                return True
        else:
            return auth.interactive_auth()
    
    auth_parser = subparsers.add_parser("auth", help="Authenticate with GATI")
    auth_parser.set_defaults(func=handle_auth)

    # Logout command
    logout_parser = subparsers.add_parser("logout", help="Remove saved credentials")
    logout_parser.set_defaults(func=lambda args: AuthManager().logout())

    # Auth status command
    whoami_parser = subparsers.add_parser("whoami", help="Show authentication status")
    whoami_parser.set_defaults(func=lambda args: AuthManager().show_status())

    args = parser.parse_args()
    
    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(1)
    
    args.func(args)


if __name__ == "__main__":
    main()
