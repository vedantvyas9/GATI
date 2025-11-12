"""
GATI - Local-first observability for AI agents

This setup.py packages the entire GATI stack including:
- Python SDK
- Backend API (FastAPI)
- Dashboard (React)
- Docker Compose configuration

When installed via pip, users get the SDK and can start the backend/dashboard
using the `gati` CLI command or docker-compose.
"""
from setuptools import setup, find_packages
from pathlib import Path
import shutil

# Read version from sdk/gati/version.py
import re

version_file = Path(__file__).parent / "sdk" / "gati" / "version.py"
version_content = version_file.read_text() if version_file.exists() else ""
version_match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', version_content)
__version__ = version_match.group(1) if version_match else "0.1.0"

# Read the root README
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text() if readme_file.exists() else ""

setup(
    name="gati",
    version=__version__,
    description="Local-first observability for AI agents. Track LLM calls, tool usage, and agent state.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="GATI Team",
    author_email="support@gati.dev",
    url="https://github.com/gati-ai/gati-sdk",
    project_urls={
        "Documentation": "https://docs.gati.dev",
        "Source": "https://github.com/gati-ai/gati-sdk",
        "Tracker": "https://github.com/gati-ai/gati-sdk/issues",
    },
    
    # Package discovery
    packages=find_packages(where="sdk"),
    package_dir={"": "sdk"},

    # Include package data (py.typed)
    include_package_data=True,
    
    # Python version requirement
    python_requires=">=3.9",
    
    # Core dependencies
    install_requires=[
        "requests>=2.31.0",
        "typing-extensions>=4.7.0",
    ],
    
    # Optional dependencies
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-cov>=4.1.0",
            "black>=23.7.0",
            "mypy>=1.5.0",
            "ruff>=0.0.280",
            "types-requests>=2.31.0",
        ],
        "langchain": [
            "langchain>=0.1.0",
            "langchain-core>=0.1.0",
        ],
        "langgraph": [
            "langgraph>=0.0.1",
        ],
        "backend": [
            "fastapi>=0.109.0",
            "uvicorn[standard]>=0.27.0",
            "psycopg2-binary>=2.9.9",
            "sqlalchemy>=2.0.25",
            "python-dotenv>=1.0.0",
        ],
    },
    
    # CLI entry point
    entry_points={
        "console_scripts": [
            "gati=gati.cli.main:main",
        ],
    },
    
    # PyPI classifiers
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Framework :: FastAPI",
        "Framework :: AsyncIO",
    ],
    
    keywords="ai agents llm observability tracing langchain langgraph monitoring dashboard",
    license="MIT",
    
    zip_safe=False,
)
