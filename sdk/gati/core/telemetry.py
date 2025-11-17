"""Anonymous telemetry system for GATI SDK.

This module collects anonymous usage statistics to help improve the SDK.
No sensitive data (prompts, completions, API keys, or PII) is ever collected.

Telemetry is OPT-IN by default and can be disabled by setting:
    observe.init(name="my_agent", telemetry=False)

Data collected:
- SDK version
- Installation ID (anonymous UUID generated on first run)
- Frameworks detected (langchain, langgraph, custom)
- Total number of agents tracked (counter)
- Total number of events per day (counter)
- Lifetime total number of events tracked (counter)
"""
import json
import logging
import os
import threading
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, Set
import requests


class TelemetryClient:
    """Client for sending anonymous telemetry data."""

    # Default telemetry endpoint
    # Can be overridden with GATI_TELEMETRY_URL environment variable
    # Protected by rate limiting on the server side
    DEFAULT_ENDPOINT = os.getenv(
        "GATI_TELEMETRY_URL",
        "https://gati-mvp-telemetry.vercel.app/api/metrics"
    )

    def __init__(
        self,
        enabled: bool = True,
        endpoint: Optional[str] = None,
        sdk_version: str = "0.1.0"
    ):
        """Initialize telemetry client.

        Args:
            enabled: Whether telemetry is enabled (default: True, opt-in)
            endpoint: Custom telemetry endpoint URL
            sdk_version: SDK version string
        """
        self.enabled = enabled
        self.endpoint = endpoint or self.DEFAULT_ENDPOINT
        self.sdk_version = sdk_version
        self.logger = logging.getLogger("gati.telemetry")

        # Get or create installation ID
        self.installation_id = self._get_or_create_installation_id()

        # Metrics storage
        self._lock = threading.Lock()
        self._metrics: Dict[str, Any] = {
            "agents_tracked": 0,
            "events_today": 0,
            "lifetime_events": 0,
            "mcp_queries": 0,
            "frameworks_detected": set(),
            "last_reset_date": datetime.now().date().isoformat()
        }

        # Load persisted metrics
        self._load_metrics()

        # Background sender thread
        self._stop_event = threading.Event()
        self._sender_thread: Optional[threading.Thread] = None

        # Send interval (1 hour)
        self.send_interval = 1 * 60 * 60  # 1 hour in seconds

        if self.enabled:
            self._start_sender()

    def _get_or_create_installation_id(self) -> str:
        """Get or create a unique installation ID.

        This ID is stored locally and persists across sessions.
        It's a random UUID and contains no user-identifiable information.
        """
        config_dir = self._get_config_dir()
        id_file = config_dir / ".gati_id"

        if id_file.exists():
            try:
                return id_file.read_text().strip()
            except Exception as e:
                self.logger.debug(f"Failed to read installation ID: {e}")

        # Create new ID
        installation_id = str(uuid.uuid4())

        try:
            config_dir.mkdir(parents=True, exist_ok=True)
            id_file.write_text(installation_id)
        except Exception as e:
            self.logger.debug(f"Failed to save installation ID: {e}")

        return installation_id

    def _get_config_dir(self) -> Path:
        """Get configuration directory for storing telemetry data."""
        # Use user's home directory
        home = Path.home()
        return home / ".gati"

    def _get_metrics_file(self) -> Path:
        """Get path to metrics file."""
        return self._get_config_dir() / "metrics.json"

    def _load_metrics(self) -> None:
        """Load persisted metrics from disk."""
        metrics_file = self._get_metrics_file()

        if not metrics_file.exists():
            return

        try:
            with open(metrics_file, 'r') as f:
                data = json.load(f)

            with self._lock:
                self._metrics["lifetime_events"] = data.get("lifetime_events", 0)
                self._metrics["agents_tracked"] = data.get("agents_tracked", 0)
                self._metrics["mcp_queries"] = data.get("mcp_queries", 0)
                self._metrics["last_reset_date"] = data.get("last_reset_date", datetime.now().date().isoformat())

                # Convert frameworks list back to set
                frameworks = data.get("frameworks_detected", [])
                self._metrics["frameworks_detected"] = set(frameworks)

                # Check if we need to reset daily counter
                last_reset = datetime.fromisoformat(self._metrics["last_reset_date"]).date()
                today = datetime.now().date()

                if last_reset < today:
                    # New day - reset daily counter
                    self._metrics["events_today"] = 0
                    self._metrics["last_reset_date"] = today.isoformat()
                else:
                    # Same day - load previous counter
                    self._metrics["events_today"] = data.get("events_today", 0)

        except Exception as e:
            self.logger.debug(f"Failed to load metrics: {e}")

    def _save_metrics(self) -> None:
        """Persist metrics to disk."""
        metrics_file = self._get_metrics_file()

        try:
            config_dir = self._get_config_dir()
            config_dir.mkdir(parents=True, exist_ok=True)

            with self._lock:
                data = {
                    "lifetime_events": self._metrics["lifetime_events"],
                    "agents_tracked": self._metrics["agents_tracked"],
                    "events_today": self._metrics["events_today"],
                    "mcp_queries": self._metrics["mcp_queries"],
                    "frameworks_detected": list(self._metrics["frameworks_detected"]),
                    "last_reset_date": self._metrics["last_reset_date"]
                }

            with open(metrics_file, 'w') as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            self.logger.debug(f"Failed to save metrics: {e}")

    def track_agent(self) -> None:
        """Increment agent tracked counter."""
        if not self.enabled:
            return

        with self._lock:
            self._metrics["agents_tracked"] += 1

        # Save immediately
        self._save_metrics()

    def track_event(self) -> None:
        """Increment event counters."""
        if not self.enabled:
            return

        with self._lock:
            # Check if we need to reset daily counter
            last_reset = datetime.fromisoformat(self._metrics["last_reset_date"]).date()
            today = datetime.now().date()

            if last_reset < today:
                # New day - reset daily counter
                self._metrics["events_today"] = 0
                self._metrics["last_reset_date"] = today.isoformat()

            self._metrics["events_today"] += 1
            self._metrics["lifetime_events"] += 1

        # Save periodically (every 100 events to reduce I/O)
        if self._metrics["lifetime_events"] % 100 == 0:
            self._save_metrics()

    def track_framework(self, framework: str) -> None:
        """Track a detected framework.

        Args:
            framework: Framework name (e.g., "langchain", "langgraph", "custom")
        """
        if not self.enabled:
            return

        with self._lock:
            self._metrics["frameworks_detected"].add(framework)

        # Save immediately
        self._save_metrics()

    def track_mcp_query(self) -> None:
        """Increment MCP query counter."""
        if not self.enabled:
            return

        with self._lock:
            self._metrics["mcp_queries"] += 1

        # Save periodically (every 100 queries to reduce I/O)
        if self._metrics["mcp_queries"] % 100 == 0:
            self._save_metrics()

    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics snapshot.

        Returns:
            Dictionary with current metrics
        """
        with self._lock:
            return {
                "installation_id": self.installation_id,
                "sdk_version": self.sdk_version,
                "agents_tracked": self._metrics["agents_tracked"],
                "events_today": self._metrics["events_today"],
                "lifetime_events": self._metrics["lifetime_events"],
                "mcp_queries": self._metrics["mcp_queries"],
                "frameworks_detected": list(self._metrics["frameworks_detected"]),
                "timestamp": datetime.now().isoformat()
            }

    def _get_api_token(self) -> Optional[str]:
        """Get API token from ~/.gati/.auth_token."""
        token_file = Path.home() / ".gati" / ".auth_token"
        if token_file.exists():
            try:
                return token_file.read_text().strip()
            except Exception as e:
                self.logger.debug(f"Failed to read API token: {e}")
        return None

    def _send_metrics(self) -> None:
        """Send metrics to telemetry endpoint."""
        if not self.enabled:
            return

        # Get API token
        api_token = self._get_api_token()
        if not api_token:
            self.logger.debug("No API token found. Please authenticate with 'gati auth'")
            return

        try:
            metrics = self.get_metrics()

            # Send to telemetry endpoint with auth token
            response = requests.post(
                self.endpoint,
                json=metrics,
                timeout=5.0,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": f"gati-sdk/{self.sdk_version}",
                    "X-API-Key": api_token
                }
            )

            if response.status_code in (200, 201, 204):
                self.logger.debug(f"Telemetry sent successfully")
            else:
                self.logger.debug(f"Telemetry endpoint returned {response.status_code}")

        except requests.exceptions.Timeout:
            self.logger.debug("Telemetry request timed out")
        except requests.exceptions.ConnectionError:
            self.logger.debug("Failed to connect to telemetry endpoint")
        except Exception as e:
            self.logger.debug(f"Failed to send telemetry: {e}")

    def _sender_worker(self) -> None:
        """Background worker that sends metrics every 1 hour."""
        while not self._stop_event.is_set():
            # Wait for 1 hour or until stop signal
            self._stop_event.wait(timeout=self.send_interval)

            if not self._stop_event.is_set():
                self._send_metrics()

    def _start_sender(self) -> None:
        """Start background sender thread."""
        if self._sender_thread is not None:
            return

        self._sender_thread = threading.Thread(
            target=self._sender_worker,
            daemon=True,
            name="gati-telemetry-sender"
        )
        self._sender_thread.start()

        # Also send immediately on first start (or after 1 minute to not delay startup)
        def delayed_send():
            time.sleep(60)  # Wait 1 minute
            if not self._stop_event.is_set():
                self._send_metrics()

        initial_sender = threading.Thread(target=delayed_send, daemon=True)
        initial_sender.start()

    def stop(self) -> None:
        """Stop telemetry client and flush metrics."""
        if not self.enabled:
            return

        # Signal stop
        self._stop_event.set()

        # Wait for sender thread to stop (max 5 seconds)
        if self._sender_thread is not None:
            self._sender_thread.join(timeout=5.0)

        # Save final metrics
        self._save_metrics()

        # Send final metrics
        self._send_metrics()

    def disable(self) -> None:
        """Disable telemetry and clear all stored data."""
        self.enabled = False

        # Clear metrics file
        metrics_file = self._get_metrics_file()
        if metrics_file.exists():
            try:
                metrics_file.unlink()
            except Exception as e:
                self.logger.debug(f"Failed to remove metrics file: {e}")

        # Stop sender
        self.stop()
