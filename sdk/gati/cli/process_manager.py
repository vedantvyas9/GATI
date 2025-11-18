"""Process manager for running GATI services without Docker."""
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, Dict, List


class ProcessManager:
    """Manages GATI service processes."""
    
    def __init__(self, data_dir: Optional[Path] = None):
        """Initialize process manager.
        
        Args:
            data_dir: Directory to store PID files and data. Defaults to ~/.gati
        """
        if data_dir is None:
            data_dir = Path.home() / ".gati"
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.pid_dir = self.data_dir / "pids"
        self.pid_dir.mkdir(exist_ok=True)
        
    def get_pid_file(self, service: str) -> Path:
        """Get PID file path for a service."""
        return self.pid_dir / f"{service}.pid"
    
    def is_running(self, service: str) -> bool:
        """Check if a service is running."""
        pid_file = self.get_pid_file(service)
        if not pid_file.exists():
            return False
        
        try:
            pid = int(pid_file.read_text().strip())
            # Check if process is still running
            os.kill(pid, 0)
            return True
        except (OSError, ValueError):
            # Process doesn't exist, remove stale PID file
            pid_file.unlink()
            return False
    
    def get_pid(self, service: str) -> Optional[int]:
        """Get PID of a running service."""
        if not self.is_running(service):
            return None
        try:
            return int(self.get_pid_file(service).read_text().strip())
        except (ValueError, FileNotFoundError):
            return None
    
    def start_process(
        self,
        service: str,
        cmd: List[str],
        cwd: Optional[Path] = None,
        env: Optional[Dict[str, str]] = None,
        stdout: Optional[Path] = None,
        stderr: Optional[Path] = None,
    ) -> int:
        """Start a service process.
        
        Args:
            service: Service name
            cmd: Command to run
            cwd: Working directory
            env: Environment variables
            stdout: Path to stdout log file
            stderr: Path to stderr log file
            
        Returns:
            Process PID
        """
        if self.is_running(service):
            pid = self.get_pid(service)
            raise RuntimeError(f"{service} is already running (PID: {pid})")
        
        # Prepare environment
        process_env = os.environ.copy()
        if env:
            process_env.update(env)
        
        # Prepare log files
        log_dir = self.data_dir / "logs"
        log_dir.mkdir(exist_ok=True)
        
        if stdout is None:
            stdout = log_dir / f"{service}.out.log"
        if stderr is None:
            stderr = log_dir / f"{service}.err.log"
        
        # Open log files
        stdout_file = open(stdout, "a")
        stderr_file = open(stderr, "a")
        
        # Start process
        try:
            process = subprocess.Popen(
                cmd,
                cwd=str(cwd) if cwd else None,
                env=process_env,
                stdout=stdout_file,
                stderr=stderr_file,
                start_new_session=True,  # Create new process group
            )
            
            # Write PID file
            self.get_pid_file(service).write_text(str(process.pid))
            
            return process.pid
        except Exception as e:
            stdout_file.close()
            stderr_file.close()
            raise RuntimeError(f"Failed to start {service}: {e}")
    
    def stop_process(self, service: str, timeout: int = 10) -> bool:
        """Stop a service process.
        
        Args:
            service: Service name
            timeout: Seconds to wait before force kill
            
        Returns:
            True if stopped successfully
        """
        pid = self.get_pid(service)
        if pid is None:
            return False
        
        pid_file = self.get_pid_file(service)
        
        try:
            # Try graceful shutdown
            os.kill(pid, signal.SIGTERM)
            
            # Wait for process to exit
            for _ in range(timeout):
                try:
                    os.kill(pid, 0)  # Check if still running
                    time.sleep(0.5)
                except OSError:
                    # Process exited
                    pid_file.unlink()
                    return True
            
            # Force kill if still running
            os.kill(pid, signal.SIGKILL)
            time.sleep(0.5)
            pid_file.unlink()
            return True
            
        except OSError:
            # Process already dead
            pid_file.unlink()
            return True
    
    def stop_all(self) -> List[str]:
        """Stop all running services.
        
        Returns:
            List of stopped service names
        """
        stopped = []
        for pid_file in self.pid_dir.glob("*.pid"):
            service = pid_file.stem
            if self.stop_process(service):
                stopped.append(service)
        return stopped
    
    def get_status(self) -> Dict[str, Dict[str, any]]:
        """Get status of all services.
        
        Returns:
            Dictionary mapping service names to status info
        """
        status = {}
        for pid_file in self.pid_dir.glob("*.pid"):
            service = pid_file.stem
            is_running = self.is_running(service)
            pid = self.get_pid(service) if is_running else None
            status[service] = {
                "running": is_running,
                "pid": pid,
            }
        return status

