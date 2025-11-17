const pool = require('../../api/analytics/db');
function normalizeDate(v) { if (!v) return null; if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate()); if (typeof v === 'string') { const d = new Date(v); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); } return v; }
function formatDate(d) { return d.toISOString().split('T')[0]; }
module.exports = async function handler(request, response) {
  try {
    const avgEventsResult = await pool.query('SELECT AVG(lifetime_events) as avg_events FROM gati_metrics');
    const averageEventsPerInstallation = parseFloat(avgEventsResult.rows[0]?.avg_events || 0);
    const eventsDistResult = await pool.query(`SELECT CASE WHEN lifetime_events = 0 THEN '0' WHEN lifetime_events BETWEEN 1 AND 10 THEN '1-10' WHEN lifetime_events BETWEEN 11 AND 50 THEN '11-50' WHEN lifetime_events BETWEEN 51 AND 100 THEN '51-100' WHEN lifetime_events BETWEEN 101 AND 500 THEN '101-500' ELSE '500+' END as bucket, COUNT(*) as count FROM gati_metrics GROUP BY bucket ORDER BY MIN(lifetime_events)`);
    const eventsPerInstallationDistribution = eventsDistResult.rows.map(row => ({ label: row.bucket, count: parseInt(row.count || 0) }));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const eventsTodayDistResult = await pool.query(`SELECT CASE WHEN events_today = 0 THEN '0' WHEN events_today BETWEEN 1 AND 10 THEN '1-10' WHEN events_today BETWEEN 11 AND 50 THEN '11-50' WHEN events_today BETWEEN 51 AND 100 THEN '51-100' ELSE '100+' END as bucket, COUNT(*) as count FROM gati_metrics WHERE last_updated >= $1 GROUP BY bucket ORDER BY MIN(events_today)`, [today]);
    const eventsTodayDistribution = eventsTodayDistResult.rows.map(row => ({ label: row.bucket, count: parseInt(row.count || 0) }));
    const agentsDistResult = await pool.query(`SELECT CASE WHEN agents_tracked = 0 THEN '0' WHEN agents_tracked = 1 THEN '1' WHEN agents_tracked BETWEEN 2 AND 5 THEN '2-5' WHEN agents_tracked BETWEEN 6 AND 10 THEN '6-10' ELSE '10+' END as bucket, COUNT(*) as count FROM gati_metrics GROUP BY bucket ORDER BY MIN(agents_tracked)`);
    const agentsTrackedDistribution = agentsDistResult.rows.map(row => ({ label: row.bucket, count: parseInt(row.count || 0) }));
    const avgEventsPerAgentResult = await pool.query(`SELECT CASE WHEN SUM(agents_tracked) > 0 THEN SUM(lifetime_events)::FLOAT / SUM(agents_tracked) ELSE 0 END as avg_events_per_agent FROM gati_metrics`);
    const averageEventsPerAgent = parseFloat(avgEventsPerAgentResult.rows[0]?.avg_events_per_agent || 0);
    const mcpAdoptionResult = await pool.query(`SELECT COUNT(*) FILTER (WHERE mcp_queries > 0) as with_mcp, COUNT(*) as total FROM gati_metrics`);
    const total = parseInt(mcpAdoptionResult.rows[0]?.total || 0);
    const withMcp = parseInt(mcpAdoptionResult.rows[0]?.with_mcp || 0);
    const mcpAdoptionRate = total > 0 ? (withMcp / total) * 100 : 0;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const mcpTrendResult = await pool.query(`SELECT DATE(timestamp) as date, COUNT(DISTINCT installation_id) FILTER (WHERE mcp_queries > 0) as with_mcp, COUNT(DISTINCT installation_id) as total FROM gati_metrics_snapshots WHERE timestamp >= $1 GROUP BY DATE(timestamp) ORDER BY DATE(timestamp)`, [thirtyDaysAgo]);
    const mcpAdoptionTrend = mcpTrendResult.rows.map(row => ({ date: formatDate(normalizeDate(row.date)), adoption_rate: row.total > 0 ? (parseInt(row.with_mcp || 0) / parseInt(row.total || 1)) * 100 : 0 }));
    const topInstallationsResult = await pool.query(`SELECT installation_id, user_email, lifetime_events, agents_tracked, sdk_version, last_updated as last_active FROM gati_metrics ORDER BY lifetime_events DESC LIMIT 10`);
    const topInstallations = topInstallationsResult.rows.map(row => ({ installation_id: row.installation_id, user_email: row.user_email, lifetime_events: parseInt(row.lifetime_events || 0), agents_tracked: parseInt(row.agents_tracked || 0), sdk_version: row.sdk_version, last_active: row.last_active ? new Date(row.last_active).toISOString() : null }));
    const generatedAt = new Date(); generatedAt.setMilliseconds(0);
    return response.status(200).json({ average_events_per_installation: averageEventsPerInstallation, events_per_installation_distribution: eventsPerInstallationDistribution, events_today_distribution: eventsTodayDistribution, agents_tracked_distribution: agentsTrackedDistribution, average_events_per_agent: averageEventsPerAgent, mcp_adoption_rate: mcpAdoptionRate, mcp_adoption_trend: mcpAdoptionTrend, top_installations: topInstallations, generated_at: generatedAt.toISOString().replace(/\.\d{3}/, '') + 'Z' });
  } catch (error) {
    console.error('Error in analytics engagement:', error);
    return response.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
