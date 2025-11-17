// Serve dashboard HTML
const fs = require('fs');
const path = require('path');

module.exports = async function handler(request, response) {
  // Read the HTML file (one level up from api directory)
  const htmlPath = path.join(__dirname, '..', 'index.html');
  
  try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    response.setHeader('Content-Type', 'text/html');
    response.status(200).send(html);
  } catch (error) {
    response.status(500).send(`
      <html>
        <body>
          <h1>Error loading dashboard</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
};

