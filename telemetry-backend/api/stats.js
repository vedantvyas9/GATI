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
  // Read-only endpoint - no authentication required
  // Get time period from query parameter (hour, day, week, month, all)
  const timePeriod = request.query?.period || '30 days';
  
  // Calculate interval based on period
  let interval;
  let groupBy;
  switch (timePeriod) {
    case 'hour':
      interval = '24 hours';
      groupBy = "DATE_TRUNC('hour', received_at)";
      break;
    case 'day':
      interval = '30 days';
      groupBy = "DATE(received_at)";
      break;
    case 'week':
      interval = '12 weeks';
      groupBy = "DATE_TRUNC('week', received_at)";
      break;
    case 'month':
      interval = '12 months';
      groupBy = "DATE_TRUNC('month', received_at)";
      break;
    default:
      interval = '30 days';
      groupBy = "DATE(received_at)";
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

    // Get time series data based on selected period
    const timeSeries = await pool.query(`
      SELECT 
        ${groupBy} as date,
        COUNT(DISTINCT installation_id) as unique_users,
        COUNT(DISTINCT installation_id) as unique_installations,
        SUM(events_today) as events
      FROM gati_metrics
      WHERE received_at >= NOW() - INTERVAL '${interval}'
      GROUP BY ${groupBy}
      ORDER BY date ASC
    `);

    // Get unique users count (may not exist if auth tables weren't created)
    let uniqueUsersCount = 0;
    try {
      const uniqueUsers = await pool.query(
        'SELECT COUNT(DISTINCT user_email) as count FROM gati_users'
      );
      uniqueUsersCount = uniqueUsers.rows[0].count;
    } catch (error) {
      // gati_users table may not exist, use installations as fallback
      uniqueUsersCount = installations.rows[0].count;
    }

    return response.status(200).json({
      unique_installations: installations.rows[0].count,
      unique_users: uniqueUsersCount,
      total_events_tracked: totalEvents.rows[0].total || 0,
      total_mcp_queries: mcpQueries.rows[0].total || 0,
      sdk_versions: versions.rows.reduce((acc, row) => {
        acc[row.sdk_version] = row.installs;
        return acc;
      }, {}),
      frameworks_used: frameworkUsage,
      time_series: timeSeries.rows.map(row => {
        // Handle different date formats from PostgreSQL
        let dateStr;
        if (row.date instanceof Date) {
          dateStr = row.date.toISOString();
        } else if (typeof row.date === 'string') {
          dateStr = row.date;
        } else {
          // Handle timestamp without timezone
          dateStr = new Date(row.date).toISOString();
        }
        return {
          date: dateStr,
          users: parseInt(row.unique_users) || 0,
          installations: parseInt(row.unique_installations) || 0,
          events: parseInt(row.events) || 0
        };
      }),
      time_period: timePeriod
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
