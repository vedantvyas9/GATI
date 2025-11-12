// Vercel Serverless Function for GATI Telemetry
// Deploy to: https://your-project.vercel.app/api/metrics

const { Pool } = require('pg');

// Create connection pool using Supabase connection string
// Parse and reconstruct to ensure proper SSL handling
const { URL } = require('url');
const dbUrl = new URL(process.env.POSTGRES_URL);

const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port),
  database: dbUrl.pathname.split('/')[1],
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async function handler(request, response) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent, X-API-Key');

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only accept POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Verify API token
  const apiToken = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');

  if (!apiToken) {
    return response.status(401).json({ error: 'Unauthorized - API token required' });
  }

  // Validate token against database
  let userEmail;
  try {
    const userResult = await pool.query(
      'SELECT email FROM gati_users WHERE api_token = $1',
      [apiToken]
    );

    if (userResult.rows.length === 0) {
      return response.status(401).json({ error: 'Unauthorized - Invalid API token' });
    }

    userEmail = userResult.rows[0].email;

    // Update last active time
    await pool.query(
      'UPDATE gati_users SET last_active = NOW() WHERE api_token = $1',
      [apiToken]
    );
  } catch (error) {
    console.error('Token validation error:', error);
    return response.status(500).json({ error: 'Authentication error' });
  }

  try {
    const {
      installation_id,
      sdk_version,
      agents_tracked,
      events_today,
      lifetime_events,
      mcp_queries,
      frameworks_detected,
      timestamp
    } = request.body;

    // Validate required fields
    if (!installation_id || !sdk_version || agents_tracked === undefined ||
        events_today === undefined || lifetime_events === undefined ||
        !frameworks_detected || !timestamp) {
      return response.status(400).json({
        error: 'Missing required fields',
        required: ['installation_id', 'sdk_version', 'agents_tracked',
                   'events_today', 'lifetime_events', 'frameworks_detected', 'timestamp']
      });
    }

    // Store in database with user email
    await pool.query(
      `INSERT INTO gati_metrics (
        installation_id,
        sdk_version,
        agents_tracked,
        events_today,
        lifetime_events,
        mcp_queries,
        frameworks_detected,
        timestamp,
        user_email,
        received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        installation_id,
        sdk_version,
        agents_tracked,
        events_today,
        lifetime_events,
        mcp_queries || 0,
        JSON.stringify(frameworks_detected),
        timestamp,
        userEmail
      ]
    );

    return response.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Error processing metrics:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
