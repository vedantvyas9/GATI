# Docker Image Maintenance Guide

## Overview

With **Option 2**, you maintain Docker images on Docker Hub. Users pull pre-built images instead of building from source.

## Maintenance Approaches

### Approach A: Manual (Simple)

**When to rebuild:**
- After changing backend/dashboard/mcp-server code
- Before publishing new PyPI version
- When you want to update the "latest" tag

**How to rebuild:**

1. **Edit the build script first:**
   ```bash
   # Edit build_and_push.sh
   # Change DOCKER_USERNAME="yourusername" to your actual Docker Hub username
   ```

2. **Run the script:**
   ```bash
   # Build and push with version tag
   ./build_and_push.sh 0.1.0

   # Or just update latest
   ./build_and_push.sh latest
   ```

3. **That's it!** Images are now on Docker Hub.

**Frequency:** As needed (weekly, monthly, or per release)

---

### Approach B: Automated via GitHub Actions (Recommended)

**Setup (one-time):**

1. **Create Docker Hub account** at https://hub.docker.com

2. **Add GitHub secrets:**
   - Go to: GitHub repo → Settings → Secrets → Actions
   - Add secrets:
     - `DOCKER_USERNAME`: Your Docker Hub username
     - `DOCKER_PASSWORD`: Docker Hub access token (create at https://hub.docker.com/settings/security)

3. **Done!** The GitHub Action (`.github/workflows/docker-build.yml`) will:
   - Build images on every push to `main`
   - Tag with version on git tags (e.g., `v0.1.0` → `0.1.0`)
   - Always update `latest` tag

**Usage:**
```bash
# Images auto-build when you push
git add .
git commit -m "Update backend"
git push

# Or create a versioned release
git tag v0.1.1
git push --tags
```

**Frequency:** Automatic on every commit!

---

## Docker Hub Repository Setup

### 1. Create Repositories

Go to https://hub.docker.com and create 3 repositories:
- `yourusername/gati-backend`
- `yourusername/gati-dashboard`
- `yourusername/gati-mcp-server`

Make them **public** (or private if you want access control).

### 2. Update docker-compose.yml

Edit `sdk/gati/docker-compose.yml`:

```yaml
services:
  backend:
    image: yourusername/gati-backend:latest  # Change this!
    # Remove the 'build:' section

  dashboard:
    image: yourusername/gati-dashboard:latest  # Change this!
    # Remove the 'build:' section

  mcp-server:
    image: yourusername/gati-mcp-server:latest  # Change this!
    # Remove the 'build:' section
```

---

## Versioning Strategy

### Semantic Versioning

Use semantic versioning: `MAJOR.MINOR.PATCH`

```bash
# Bug fix in backend
./build_and_push.sh 0.1.1

# New feature
./build_and_push.sh 0.2.0

# Breaking change
./build_and_push.sh 1.0.0
```

### Tag Strategy

**Always maintain two tags:**
1. **`latest`** - Most recent stable version
2. **`x.y.z`** - Specific version

Example:
```bash
# This creates both tags:
docker build -t yourusername/gati-backend:0.1.0 \
             -t yourusername/gati-backend:latest \
             ./backend

docker push yourusername/gati-backend:0.1.0
docker push yourusername/gati-backend:latest
```

---

## Update Workflow

### When you make changes:

**1. Modify code**
```bash
# Edit backend, dashboard, or mcp-server code
vim backend/main.py
```

**2. Test locally**
```bash
# Build and test locally
docker-compose up --build
```

**3. Rebuild and push images**
```bash
# Manual
./build_and_push.sh 0.1.1

# Or commit and let GitHub Actions handle it
git add .
git commit -m "Fix: backend auth issue"
git push
```

**4. Update Python package version**
```bash
# Edit version
vim sdk/gati/version.py
# Change __version__ = "0.1.0" to "0.1.1"

# Rebuild package
python -m build
```

**5. Publish to PyPI**
```bash
twine upload dist/*
```

**Users get the update:**
```bash
pip install --upgrade gati
gati start  # Pulls new Docker images automatically
```

---

## Storage & Costs

### Docker Hub Limits (Free Tier)
- **Unlimited public repositories**
- **1 private repository**
- **Unlimited pulls** (with rate limits)
- **Image storage**: Unlimited for public repos

### Image Sizes
Typical sizes:
- Backend: ~200-500 MB
- Dashboard: ~50-100 MB (nginx + static files)
- MCP Server: ~100-200 MB

**Total:** ~500 MB - 1 GB per version

### Cost
- **Free** if repos are public
- **$7/month** for Pro (unlimited private repos, no rate limits)

---

## Automation Details

### GitHub Actions Workflow

The `.github/workflows/docker-build.yml` file:

**Triggers:**
- Push to `main` → builds and tags as `latest`
- Git tag `v*` → builds and tags with version
- Manual dispatch → custom version

**What it does:**
1. Checks out code
2. Logs in to Docker Hub
3. Builds all 3 images in parallel
4. Pushes to Docker Hub
5. Uses layer caching for faster builds

**Viewing builds:**
- GitHub repo → Actions tab
- See build logs and status

---

## Troubleshooting

### Build fails
```bash
# Check Dockerfiles exist
ls backend/Dockerfile dashboard/Dockerfile mcp-server/Dockerfile

# Test local build
docker build ./backend
```

### Push fails (authentication)
```bash
# Re-login
docker login

# Check credentials
cat ~/.docker/config.json
```

### Images too large
```bash
# Check size
docker images | grep gati

# Use multi-stage builds in Dockerfile
# Add .dockerignore files
```

### GitHub Action fails
- Check secrets are set: `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- Check Docker Hub token is valid
- View logs in Actions tab

---

## Comparison: Manual vs Automated

| Aspect | Manual | GitHub Actions |
|--------|--------|----------------|
| Setup time | 5 minutes | 15 minutes |
| Maintenance | Run script per update | Zero (automatic) |
| Consistency | Depends on you | Always consistent |
| Testing | Local only | Can add tests |
| Versioning | Manual tagging | Automatic from git tags |
| Best for | Small projects, infrequent updates | Production, frequent updates |

---

## Recommended Setup

**For getting started:**
1. Use manual approach with `build_and_push.sh`
2. Update images when releasing new PyPI versions
3. Maintain `latest` tag

**For production:**
1. Set up GitHub Actions
2. Auto-build on every commit to `main`
3. Version with git tags
4. Monitor builds in GitHub Actions tab

---

## Quick Reference

```bash
# Manual build & push
./build_and_push.sh 0.1.0

# Auto build (GitHub Actions)
git tag v0.1.0
git push --tags

# Update docker-compose.yml
# Change: image: yourusername/gati-backend:latest

# Rebuild Python package
python -m build

# Publish to PyPI
twine upload dist/*

# Users update
pip install --upgrade gati
```

---

## Need Help?

- **Docker Hub docs**: https://docs.docker.com/docker-hub/
- **GitHub Actions docs**: https://docs.github.com/en/actions
- **Docker build docs**: https://docs.docker.com/engine/reference/commandline/build/
