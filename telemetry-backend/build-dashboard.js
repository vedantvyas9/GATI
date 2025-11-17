// Build script to build dashboard from dashboard-src for Vercel
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_DIR = __dirname;
const DASHBOARD_SRC_DIR = path.join(SCRIPT_DIR, 'dashboard-src');
const DASHBOARD_DIST_DIR = path.join(SCRIPT_DIR, 'dashboard-dist');

console.log('📦 Building GATI Analytics Dashboard from dashboard-src...\n');

try {
  // Step 1: Clean up previous build
  console.log('🧹 Cleaning up previous build...');
  if (fs.existsSync(DASHBOARD_DIST_DIR)) {
    fs.removeSync(DASHBOARD_DIST_DIR);
  }
  fs.mkdirpSync(DASHBOARD_DIST_DIR);

  // Step 2: Install dependencies
  console.log('📦 Installing dependencies...');
  process.chdir(DASHBOARD_SRC_DIR);
  execSync('npm install', { stdio: 'inherit' });

  // Step 3: Build the dashboard
  console.log('\n🏗️  Building React dashboard...');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 4: Copy built files to dashboard-dist
  console.log('\n📦 Copying built files to dashboard-dist...');
  const distDir = path.join(DASHBOARD_SRC_DIR, 'dist');
  if (fs.existsSync(distDir)) {
    fs.copySync(distDir, DASHBOARD_DIST_DIR, { overwrite: true });
    console.log('  ✓ Files copied to dashboard-dist');
  } else {
    throw new Error('dist directory not found after build');
  }

  console.log('\n✅ Dashboard build complete!');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
