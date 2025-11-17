const pool = require('../../api/analytics/db');
function normalizeDate(v) { if (!v) return null; if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate()); if (typeof v === 'string') { const d = new Date(v); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); } return v; }
function formatDate(d) { return d.toISOString().split('T')[0]; }
module.exports = async function handler(request, response) {
  try {
    const mcpTotalResult = await pool.query('SELECT COALESCE(SUM(mcp_queries), 0) as total FROM gati_metrics');
    const totalMcpQueries = parseInt(mcpTotalResult.rows[0]?.total || 0);
    const mcpAdoptionResult = await pool.query(`SELECT COUNT(*) FILTER (WHERE mcp_queries > 0) as with_mcp, COUNT(*) as total FROM gati_metrics`);
    const total = parseInt(mcpAdoptionResult.rows[0]?.total || 0);
    const withMcp = parseInt(mcpAdoptionResult.rows[0]?.with_mcp || 0);
    const mcpAdoptionRate = total > 0 ? (withMcp / total) * 100 : 0;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const mcpTrendResult = await pool.query(`SELECT DATE(timestamp) as date, COUNT(DISTINCT installation_id) FILTER (WHERE mcp_queries > 0) as with_mcp, COUNT(DISTINCT installation_id) as total FROM gati_metrics_snapshots WHERE timestamp >= $1 GROUP BY DATE(timestamp) ORDER BY DATE(timestamp)`, [thirtyDaysAgo]);
    const mcpAdoptionTrend = mcpTrendResult.rows.map(row => ({ date: formatDate(normalizeDate(row.date)), adoption_rate: row.total > 0 ? (parseInt(row.with_mcp || 0) / parseInt(row.total || 1)) * 100 : 0 }));
    const avgMcpResult = await pool.query(`SELECT CASE WHEN COUNT(DISTINCT user_email) > 0 THEN SUM(mcp_queries)::FLOAT / COUNT(DISTINCT user_email) ELSE 0 END as avg_mcp FROM gati_metrics WHERE user_email IS NOT NULL`);
    const averageMcpQueriesPerUser = parseFloat(avgMcpResult.rows[0]?.avg_mcp || 0);
    const mcpDistResult = await pool.query(`SELECT CASE WHEN mcp_queries = 0 THEN '0' WHEN mcp_queries BETWEEN 1 AND 10 THEN '1-10' WHEN mcp_queries BETWEEN 11 AND 50 THEN '11-50' WHEN mcp_queries BETWEEN 51 AND 100 THEN '51-100' ELSE '100+' END as bucket, COUNT(*) as count FROM gati_metrics GROUP BY bucket ORDER BY MIN(mcp_queries)`);
    const mcpUsageDistribution = mcpDistResult.rows.map(row => ({ label: row.bucket, count: parseInt(row.count || 0) }));
    const frameworkResult = await pool.query(`SELECT frameworks_detected, COUNT(DISTINCT installation_id) as installations_count, SUM(lifetime_events) as total_events FROM gati_metrics GROUP BY frameworks_detected ORDER BY installations_count DESC`);
    const frameworkDistribution = [];
    frameworkResult.rows.forEach(row => { try { const frameworks = JSON.parse(row.frameworks_detected); frameworks.forEach(fw => { const existing = frameworkDistribution.find(f => f.name === fw); if (existing) { existing.installations_count += parseInt(row.installations_count || 0); existing.total_events += parseInt(row.total_events || 0); } else { frameworkDistribution.push({ name: fw, installations_count: parseInt(row.installations_count || 0), total_events: parseInt(row.total_events || 0) }); } }); } catch (e) {} });
    frameworkDistribution.sort((a, b) => b.installations_count - a.installations_count);
    const frameworkTrendResult = await pool.query(`SELECT DATE(timestamp) as date, frameworks_detected FROM gati_metrics_snapshots WHERE timestamp >= $1 ORDER BY DATE(timestamp)`, [thirtyDaysAgo]);
    const frameworkCountsByDate = {};
    frameworkTrendResult.rows.forEach(row => { const date = formatDate(normalizeDate(row.date)); if (!frameworkCountsByDate[date]) frameworkCountsByDate[date] = {}; try { const frameworks = JSON.parse(row.frameworks_detected); frameworks.forEach(fw => { frameworkCountsByDate[date][fw] = (frameworkCountsByDate[date][fw] || 0) + 1; }); } catch (e) {} });
    const frameworkAdoptionTrend = Object.keys(frameworkCountsByDate).sort().map(date => ({ date: date, framework_counts: frameworkCountsByDate[date] }));
    const versionResult = await pool.query(`SELECT sdk_version, COUNT(DISTINCT installation_id) as count FROM gati_metrics GROUP BY sdk_version ORDER BY count DESC`);
    const versionDistribution = versionResult.rows.map(row => ({ version: row.sdk_version, count: parseInt(row.count || 0) }));
    const versionTimelineResult = await pool.query(`SELECT DATE(first_seen) as date, sdk_version, COUNT(DISTINCT installation_id) as installations FROM gati_metrics WHERE first_seen >= $1 GROUP BY DATE(first_seen), sdk_version ORDER BY DATE(first_seen), sdk_version`, [thirtyDaysAgo]);
    const versionAdoptionTimeline = versionTimelineResult.rows.map(row => ({ date: formatDate(normalizeDate(row.date)), version: row.sdk_version, installations: parseInt(row.installations || 0) }));
    const latestVersion = versionDistribution[0]?.version;
    let latestVersionAdoptionRate = 0;
    if (latestVersion) {
      const latestVersionResult = await pool.query(`SELECT COUNT(*) FILTER (WHERE sdk_version = $1) as with_latest, COUNT(*) as total FROM gati_metrics`, [latestVersion]);
      const total = parseInt(latestVersionResult.rows[0]?.total || 0);
      const withLatest = parseInt(latestVersionResult.rows[0]?.with_latest || 0);
      latestVersionAdoptionRate = total > 0 ? (withLatest / total) * 100 : 0;
    }
    const generatedAt = new Date(); generatedAt.setMilliseconds(0);
    return response.status(200).json({ total_mcp_queries: totalMcpQueries, mcp_adoption_rate: mcpAdoptionRate, mcp_adoption_trend: mcpAdoptionTrend, average_mcp_queries_per_user: averageMcpQueriesPerUser, mcp_usage_distribution: mcpUsageDistribution, framework_distribution: frameworkDistribution, framework_adoption_trend: frameworkAdoptionTrend, version_distribution: versionDistribution, version_adoption_timeline: versionAdoptionTimeline, latest_version_adoption_rate: latestVersionAdoptionRate, generated_at: generatedAt.toISOString().replace(/\.\d{3}/, '') + 'Z' });
  } catch (error) {
    console.error('Error in analytics features:', error);
    return response.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
