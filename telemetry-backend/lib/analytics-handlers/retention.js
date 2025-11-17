const pool = require('../../api/analytics/db');
function normalizeDate(v) { if (!v) return null; if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate()); if (typeof v === 'string') { const d = new Date(v); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); } return v; }
function formatDate(d) { return d.toISOString().split('T')[0]; }
module.exports = async function handler(request, response) {
  try {
    const now = new Date();
    const week1Ago = new Date(now); week1Ago.setDate(week1Ago.getDate() - 7);
    const week4Ago = new Date(now); week4Ago.setDate(week4Ago.getDate() - 28);
    const week12Ago = new Date(now); week12Ago.setDate(week12Ago.getDate() - 84);
    const retentionResult = await pool.query(`SELECT COUNT(DISTINCT installation_id) FILTER (WHERE last_updated >= $1) as week_1, COUNT(DISTINCT installation_id) FILTER (WHERE last_updated >= $2) as week_4, COUNT(DISTINCT installation_id) FILTER (WHERE last_updated >= $3) as week_12, COUNT(DISTINCT installation_id) as total FROM gati_metrics`, [week1Ago, week4Ago, week12Ago]);
    const total = parseInt(retentionResult.rows[0]?.total || 0);
    const week1 = parseInt(retentionResult.rows[0]?.week_1 || 0);
    const week4 = parseInt(retentionResult.rows[0]?.week_4 || 0);
    const week12 = parseInt(retentionResult.rows[0]?.week_12 || 0);
    const retentionRates = { week_1: total > 0 ? (week1 / total) * 100 : 0, week_4: total > 0 ? (week4 / total) * 100 : 0, week_12: total > 0 ? (week12 / total) * 100 : 0 };
    const cohortResult = await pool.query(`SELECT DATE_TRUNC('week', first_seen) as signup_week, COUNT(DISTINCT installation_id) as total_installations, COUNT(DISTINCT installation_id) FILTER (WHERE last_updated >= first_seen + INTERVAL '7 days') as week_1_active, COUNT(DISTINCT installation_id) FILTER (WHERE last_updated >= first_seen + INTERVAL '28 days') as week_4_active, COUNT(DISTINCT installation_id) FILTER (WHERE last_updated >= first_seen + INTERVAL '84 days') as week_12_active FROM gati_metrics WHERE first_seen >= NOW() - INTERVAL '12 weeks' GROUP BY DATE_TRUNC('week', first_seen) ORDER BY DATE_TRUNC('week', first_seen) DESC`);
    const cohortAnalysis = cohortResult.rows.map(row => ({ signup_week: formatDate(normalizeDate(row.signup_week)), week_1_retention: row.total_installations > 0 ? (parseInt(row.week_1_active || 0) / parseInt(row.total_installations || 1)) * 100 : 0, week_4_retention: row.total_installations > 0 ? (parseInt(row.week_4_active || 0) / parseInt(row.total_installations || 1)) * 100 : 0, week_12_retention: row.total_installations > 0 ? (parseInt(row.week_12_active || 0) / parseInt(row.total_installations || 1)) * 100 : 0 }));
    const churnResult = await pool.query(`SELECT COUNT(DISTINCT installation_id) FILTER (WHERE last_updated < NOW() - INTERVAL '7 days') as inactive_7, COUNT(DISTINCT installation_id) FILTER (WHERE last_updated < NOW() - INTERVAL '14 days') as inactive_14, COUNT(DISTINCT installation_id) FILTER (WHERE last_updated < NOW() - INTERVAL '30 days') as inactive_30 FROM gati_metrics`);
    const churnIndicators = { inactive_7_days: parseInt(churnResult.rows[0]?.inactive_7 || 0), inactive_14_days: parseInt(churnResult.rows[0]?.inactive_14 || 0), inactive_30_days: parseInt(churnResult.rows[0]?.inactive_30 || 0) };
    const growthResult = await pool.query(`SELECT DATE_TRUNC('month', first_seen) as month, COUNT(DISTINCT installation_id) as new_installations, COUNT(DISTINCT user_email) FILTER (WHERE user_email IS NOT NULL) as new_users FROM gati_metrics WHERE first_seen >= NOW() - INTERVAL '6 months' GROUP BY DATE_TRUNC('month', first_seen) ORDER BY DATE_TRUNC('month', first_seen)`);
    const growthRates = [];
    for (let i = 1; i < growthResult.rows.length; i++) {
      const current = growthResult.rows[i];
      const previous = growthResult.rows[i - 1];
      const period = formatDate(normalizeDate(current.month));
      const installationGrowth = previous.new_installations > 0 ? ((current.new_installations - previous.new_installations) / previous.new_installations) * 100 : 0;
      const userGrowth = previous.new_users > 0 ? ((current.new_users - previous.new_users) / previous.new_users) * 100 : 0;
      growthRates.push({ period: period, installation_growth_rate: installationGrowth, user_growth_rate: userGrowth });
    }
    const conversionResult = await pool.query(`SELECT DATE(timestamp) as date, COUNT(DISTINCT installation_id) FILTER (WHERE user_email IS NOT NULL) as authenticated, COUNT(DISTINCT installation_id) as total FROM gati_metrics_snapshots WHERE timestamp >= NOW() - INTERVAL '30 days' GROUP BY DATE(timestamp) ORDER BY DATE(timestamp)`);
    const conversionRateTrend = conversionResult.rows.map(row => ({ date: formatDate(normalizeDate(row.date)), conversion_rate: row.total > 0 ? (parseInt(row.authenticated || 0) / parseInt(row.total || 1)) * 100 : 0 }));
    const newVsReturningResult = await pool.query(`SELECT DATE(timestamp) as date, COUNT(DISTINCT installation_id) FILTER (WHERE timestamp = (SELECT MIN(timestamp) FROM gati_metrics_snapshots s2 WHERE s2.installation_id = gati_metrics_snapshots.installation_id)) as new_installations, COUNT(DISTINCT installation_id) FILTER (WHERE timestamp > (SELECT MIN(timestamp) FROM gati_metrics_snapshots s2 WHERE s2.installation_id = gati_metrics_snapshots.installation_id)) as returning_installations FROM gati_metrics_snapshots WHERE timestamp >= NOW() - INTERVAL '30 days' GROUP BY DATE(timestamp) ORDER BY DATE(timestamp)`);
    const newVsReturning = newVsReturningResult.rows.map(row => ({ date: formatDate(normalizeDate(row.date)), new_installations: parseInt(row.new_installations || 0), returning_installations: parseInt(row.returning_installations || 0) }));
    const generatedAt = new Date(); generatedAt.setMilliseconds(0);
    return response.status(200).json({ retention_rates: retentionRates, cohort_analysis: cohortAnalysis, churn_indicators: churnIndicators, growth_rates: growthRates, conversion_rate_trend: conversionRateTrend, new_vs_returning: newVsReturning, generated_at: generatedAt.toISOString().replace(/\.\d{3}/, '') + 'Z' });
  } catch (error) {
    console.error('Error in analytics retention:', error);
    return response.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
