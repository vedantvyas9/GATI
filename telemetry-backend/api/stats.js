// Get aggregated stats
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
  // Optional: Add authentication here
  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get unique installations
    const installations = await pool.query(
      'SELECT COUNT(DISTINCT installation_id) as count FROM gati_metrics'
    );

    // Get total events tracked
    const totalEvents = await pool.query(`
      SELECT SUM(lifetime_events) as total
      FROM (
        SELECT installation_id, MAX(lifetime_events) as lifetime_events
        FROM gati_metrics
        GROUP BY installation_id
      ) as subquery
    `);

    // Get total MCP queries
    const mcpQueries = await pool.query(`
      SELECT SUM(mcp_queries) as total
      FROM (
        SELECT installation_id, MAX(mcp_queries) as mcp_queries
        FROM gati_metrics
        GROUP BY installation_id
      ) as subquery
    `);

    // Get version distribution
    const versions = await pool.query(`
      SELECT sdk_version, COUNT(DISTINCT installation_id) as installs
      FROM gati_metrics
      GROUP BY sdk_version
      ORDER BY installs DESC
    `);

    // Get framework usage
    const frameworks = await pool.query(`
      SELECT frameworks_detected, COUNT(*) as count
      FROM gati_metrics
      GROUP BY frameworks_detected
      ORDER BY count DESC
    `);

    // Parse framework data
    const frameworkUsage = {};
    frameworks.rows.forEach(row => {
      try {
        const fws = JSON.parse(row.frameworks_detected);
        fws.forEach(fw => {
          frameworkUsage[fw] = (frameworkUsage[fw] || 0) + 1;
        });
      } catch (e) {
        // Skip invalid JSON
      }
    });

    return response.status(200).json({
      unique_installations: installations.rows[0].count,
      total_events_tracked: totalEvents.rows[0].total || 0,
      total_mcp_queries: mcpQueries.rows[0].total || 0,
      sdk_versions: versions.rows.reduce((acc, row) => {
        acc[row.sdk_version] = row.installs;
        return acc;
      }, {}),
      frameworks_used: frameworkUsage
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
