const pool = require('../../api/analytics/db');
function normalizeDate(v) { if (!v) return null; if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate()); if (typeof v === 'string') { const d = new Date(v); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); } return v; }
function formatDate(d) { return d.toISOString().split('T')[0]; }
module.exports = async function handler(request, response) {
  try {
    const days = parseInt(request.query?.days || '30', 10);
    const endDate = new Date(); endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate); startDate.setDate(startDate.getDate() - (days - 1));
    const dailyVolumeResult = await pool.query(`SELECT DATE(timestamp) as date, COUNT(DISTINCT installation_id) as daily_active_installations, COUNT(DISTINCT installation_id) as cumulative_installations, COALESCE(SUM(events_today), 0) as total_events_per_day, COUNT(DISTINCT user_email) FILTER (WHERE user_email IS NOT NULL) as active_users, COALESCE(SUM(agents_tracked), 0) as agents_tracked, COALESCE(SUM(mcp_queries), 0) as mcp_queries FROM gati_metrics_snapshots WHERE timestamp >= $1 GROUP BY DATE(timestamp) ORDER BY DATE(timestamp)`, [startDate]);
    const dailyEventVolume = dailyVolumeResult.rows.map(row => ({ date: formatDate(normalizeDate(row.date)), daily_active_installations: parseInt(row.daily_active_installations || 0), cumulative_installations: parseInt(row.cumulative_installations || 0), total_events_per_day: parseInt(row.total_events_per_day || 0), active_users: parseInt(row.active_users || 0), agents_tracked: parseInt(row.agents_tracked || 0), mcp_queries: parseInt(row.mcp_queries || 0) }));
    const peakEvents = Math.max(...dailyEventVolume.map(d => d.total_events_per_day), 0);
    const avgEventsResult = await pool.query(`SELECT AVG(events_today) as avg_events FROM gati_metrics_snapshots WHERE timestamp >= $1`, [startDate]);
    const averageEventsPerInstallationPerDay = parseFloat(avgEventsResult.rows[0]?.avg_events || 0);
    let projectedGrowth = [];
    const last7Days = dailyEventVolume.slice(-7);
    if (last7Days.length >= 2) {
      const avgDailyGrowth = (last7Days[last7Days.length - 1].total_events_per_day - last7Days[0].total_events_per_day) / last7Days.length;
      const lastDate = new Date(dailyEventVolume[dailyEventVolume.length - 1].date);
      for (let i = 1; i <= 7; i++) {
        const projectedDate = new Date(lastDate);
        projectedDate.setDate(projectedDate.getDate() + i);
        const projectedEvents = Math.max(0, last7Days[last7Days.length - 1].total_events_per_day + (avgDailyGrowth * i));
        projectedGrowth.push({ projected_date: formatDate(projectedDate), projected_events: Math.round(projectedEvents) });
      }
    }
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const hourlyResult = await pool.query(`SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count FROM gati_metrics_snapshots WHERE timestamp >= $1 GROUP BY EXTRACT(HOUR FROM timestamp) ORDER BY EXTRACT(HOUR FROM timestamp)`, [sevenDaysAgo]);
    const eventsByHour = [];
    for (let h = 0; h < 24; h++) {
      const hourData = hourlyResult.rows.find(r => parseInt(r.hour) === h);
      eventsByHour.push({ hour: h, count: hourData ? parseInt(hourData.count || 0) : 0 });
    }
    const generatedAt = new Date(); generatedAt.setMilliseconds(0);
    return response.status(200).json({ daily_event_volume: dailyEventVolume, peak_events_per_day: peakEvents, average_events_per_installation_per_day: averageEventsPerInstallationPerDay, projected_growth: projectedGrowth, events_by_hour: eventsByHour, generated_at: generatedAt.toISOString().replace(/\.\d{3}/, '') + 'Z' });
  } catch (error) {
    console.error('Error in analytics infrastructure:', error);
    return response.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
