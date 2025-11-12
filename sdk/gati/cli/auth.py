"""GATI CLI Authentication - Email verification flow."""
import sys
import time
import requests
from pathlib import Path
from typing import Optional


class AuthManager:
    """Manages GATI authentication and API tokens."""

    def __init__(self):
        self.base_url = "https://gati-mvp-telemetry.vercel.app/api/auth"
        self.config_dir = Path.home() / ".gati"
        self.token_file = self.config_dir / ".auth_token"
        self.email_file = self.config_dir / ".auth_email"

    def is_authenticated(self) -> bool:
        """Check if user is already authenticated."""
        return self.token_file.exists() and self.email_file.exists()

    def get_token(self) -> Optional[str]:
        """Get stored API token."""
        if not self.token_file.exists():
            return None
        try:
            return self.token_file.read_text().strip()
        except Exception:
            return None

    def get_email(self) -> Optional[str]:
        """Get stored email."""
        if not self.email_file.exists():
            return None
        try:
            return self.email_file.read_text().strip()
        except Exception:
            return None

    def save_credentials(self, email: str, token: str) -> None:
        """Save email and token to disk."""
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.email_file.write_text(email)
        self.token_file.write_text(token)
        # Set restrictive permissions
        self.token_file.chmod(0o600)
        self.email_file.chmod(0o600)

    def request_verification_code(self, email: str) -> bool:
        """Request a verification code to be sent to email."""
        try:
            response = requests.post(
                f"{self.base_url}/request-code",
                json={"email": email},
                timeout=10
            )

            if response.status_code == 200:
                return True
            else:
                error = response.json().get('error', 'Unknown error')
                print(f"\n❌ Error: {error}")
                return False

        except requests.exceptions.Timeout:
            print("\n❌ Request timed out. Please check your internet connection.")
            return False
        except requests.exceptions.ConnectionError:
            print("\n❌ Could not connect to GATI servers. Please check your internet connection.")
            return False
        except Exception as e:
            print(f"\n❌ Error: {e}")
            return False

    def verify_code(self, email: str, code: str) -> Optional[str]:
        """Verify the code and get API token."""
        try:
            response = requests.post(
                f"{self.base_url}/verify-code",
                json={"email": email, "code": code},
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                return data.get('apiToken')
            else:
                error_data = response.json()
                error = error_data.get('error', 'Unknown error')
                attempts_remaining = error_data.get('attemptsRemaining')

                if attempts_remaining is not None:
                    print(f"\n❌ {error} ({attempts_remaining} attempts remaining)")
                else:
                    print(f"\n❌ {error}")
                return None

        except requests.exceptions.Timeout:
            print("\n❌ Request timed out. Please check your internet connection.")
            return None
        except requests.exceptions.ConnectionError:
            print("\n❌ Could not connect to GATI servers. Please check your internet connection.")
            return None
        except Exception as e:
            print(f"\n❌ Error: {e}")
            return None

    def interactive_auth(self) -> bool:
        """Run interactive authentication flow."""
        print("\n" + "=" * 60)
        print("🔐 GATI Authentication Required")
        print("=" * 60)
        print("\nTo use GATI, you need to verify your email address.")
        print("This helps us prevent spam and keep the service free for everyone.\n")

        # Get email
        while True:
            email = input("📧 Enter your email address: ").strip()

            if not email:
                print("❌ Email cannot be empty")
                continue

            # Basic email validation
            if '@' not in email or '.' not in email.split('@')[1]:
                print("❌ Please enter a valid email address")
                continue

            break

        # Request verification code
        print(f"\n📨 Sending verification code to {email}...")

        if not self.request_verification_code(email):
            return False

        print(f"✅ Verification code sent! Please check your email.")
        print(f"   (Check spam folder if you don't see it)\n")

        # Verify code with retry logic
        max_attempts = 5
        for attempt in range(max_attempts):
            print(f"\n📮 Enter the 6-digit code from your email")
            print(f"   Type 'resend' to request a new code")
            print(f"   Type 'quit' to cancel\n")

            user_input = input("Code: ").strip()

            if user_input.lower() == 'quit':
                print("\n❌ Authentication cancelled.")
                return False

            if user_input.lower() == 'resend':
                print(f"\n📨 Resending verification code to {email}...")
                if self.request_verification_code(email):
                    print("✅ New code sent! Please check your email.")
                continue

            # Verify the code
            if len(user_input) != 6 or not user_input.isdigit():
                print("❌ Code must be exactly 6 digits")
                continue

            token = self.verify_code(email, user_input)

            if token:
                # Success!
                self.save_credentials(email, token)
                print("\n" + "=" * 60)
                print("✅ Authentication successful!")
                print("=" * 60)
                print(f"\n🎉 Welcome to GATI, {email}!")
                print("    Your credentials have been saved securely.\n")
                return True

        print(f"\n❌ Too many failed attempts. Please run 'gati auth' to try again.")
        return False

    def logout(self) -> None:
        """Remove stored credentials."""
        if self.token_file.exists():
            self.token_file.unlink()
        if self.email_file.exists():
            self.email_file.unlink()
        print("✅ Logged out successfully")

    def show_status(self) -> None:
        """Show authentication status."""
        if self.is_authenticated():
            email = self.get_email()
            print(f"\n✅ Authenticated as: {email}")
            print(f"   Token stored at: {self.token_file}\n")
        else:
            print("\n❌ Not authenticated")
            print("   Run 'gati auth' to authenticate\n")
