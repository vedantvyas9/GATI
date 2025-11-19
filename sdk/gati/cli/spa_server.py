"""Simple SPA-aware HTTP server for serving the dashboard."""
import http.server
import socketserver
from pathlib import Path
from typing import Optional


class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler that serves index.html for SPA routes."""

    def __init__(self, *args, directory: Optional[str] = None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self):
        """Handle GET request with SPA fallback."""
        # Store original path for logging
        original_path = self.path

        # Get the path without query parameters
        path = self.path.split('?')[0]

        # Skip API routes (shouldn't happen, but just in case)
        if path.startswith('/api'):
            return super().do_GET()

        # Check if it's a request for a static file (has extension)
        if '.' in Path(path).name:
            # Let the parent class handle it normally
            return super().do_GET()

        # For all other routes (SPA routes), serve index.html
        if path != '/':
            # Rewrite the path to index.html for SPA routing
            self.path = '/index.html'
            # Log what we're doing
            self.log_message('"%s" -> /index.html (SPA route)', original_path)

        return super().do_GET()

    def end_headers(self):
        """Add headers before ending headers."""
        # Add CORS headers if needed
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()


def run_spa_server(port: int, directory: Path):
    """Run a simple SPA-aware HTTP server.

    Args:
        port: Port to run on
        directory: Directory to serve files from
    """
    import functools

    # Create handler with directory specified
    handler = functools.partial(
        SPAHTTPRequestHandler,
        directory=str(directory)
    )

    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Serving SPA at http://localhost:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    directory = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.cwd()
    run_spa_server(port, directory)
