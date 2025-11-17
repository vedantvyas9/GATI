// Serve React Dashboard built files
const fs = require('fs');
const path = require('path');

module.exports = async function handler(request, response) {
  const dashboardPath = path.join(__dirname, '..', 'dashboard-dist');
  
  // If dashboard-dist doesn't exist, serve a message
  if (!fs.existsSync(dashboardPath)) {
    return response.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GATI Dashboard</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #0f172a;
              color: #e2e8f0;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 { margin-bottom: 1rem; }
            p { color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Dashboard Not Built</h1>
            <p>Please build the dashboard first by running: npm run build</p>
            <p style="margin-top: 1rem; font-size: 0.875rem;">The dashboard will be available after the build completes.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Get the requested path
  let filePath = request.url === '/' ? '/index.html' : request.url;
  
  // Remove query string
  filePath = filePath.split('?')[0];
  
  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    return response.status(403).send('Forbidden');
  }

  // Map to dashboard-dist directory
  const fullPath = path.join(dashboardPath, filePath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    // For SPA routing, serve index.html for all non-API routes
    if (!filePath.startsWith('/api/')) {
      const indexPath = path.join(dashboardPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, 'utf8');
        response.setHeader('Content-Type', 'text/html');
        return response.status(200).send(html);
      }
    }
    return response.status(404).send('Not Found');
  }

  // Determine content type
  const ext = path.extname(fullPath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';
  
  try {
    const fileContent = fs.readFileSync(fullPath);
    response.setHeader('Content-Type', contentType);
    
    // Add cache headers for static assets
    if (ext !== '.html') {
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    
    return response.status(200).send(fileContent);
  } catch (error) {
    console.error('Error serving file:', error);
    return response.status(500).send('Internal Server Error');
  }
};

