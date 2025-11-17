const pool = require('../../api/analytics/db');
module.exports = async function handler(request, response) {
  try {
    const page = parseInt(request.query?.page || '1', 10);
    const pageSize = parseInt(request.query?.page_size || '50', 10);
    const search = request.query?.search || null;
    const sortBy = request.query?.sort_by || 'total_events';
    let baseQuery = `SELECT user_email, COUNT(DISTINCT installation_id) as installations, COALESCE(SUM(agents_tracked), 0) as total_agents, COALESCE(SUM(lifetime_events), 0) as total_events, COALESCE(SUM(mcp_queries), 0) as total_mcp_queries, MAX(last_updated) as last_active, MIN(first_seen) as first_seen FROM gati_metrics WHERE user_email IS NOT NULL`;
    const queryParams = [];
    if (search) { baseQuery += ` AND user_email ILIKE $${queryParams.length + 1}`; queryParams.push(`%${search}%`); }
    baseQuery += ' GROUP BY user_email';
    const countQuery = `SELECT COUNT(*) as count FROM (${baseQuery}) subq`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0]?.count || 0);
    const sortColumn = { 'total_events': 'total_events', 'total_agents': 'total_agents', 'installations': 'installations', 'last_active': 'last_active' }[sortBy] || 'total_events';
    baseQuery += ` ORDER BY ${sortColumn} DESC`;
    const offset = (page - 1) * pageSize;
    baseQuery += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(pageSize, offset);
    const usersResult = await pool.query(baseQuery, queryParams);
    const users = usersResult.rows.map(row => ({ email: row.user_email, installations: parseInt(row.installations || 0), total_agents: parseInt(row.total_agents || 0), total_events: parseInt(row.total_events || 0), total_mcp_queries: parseInt(row.total_mcp_queries || 0), last_active: row.last_active ? new Date(row.last_active).toISOString() : null, first_seen: row.first_seen ? new Date(row.first_seen).toISOString() : null }));
    const segmentResult = await pool.query(`SELECT CASE WHEN SUM(lifetime_events) < 100 THEN 'hobbyist' WHEN SUM(lifetime_events) < 1000 THEN 'professional' ELSE 'enterprise' END as segment, COUNT(DISTINCT user_email) as count FROM gati_metrics WHERE user_email IS NOT NULL GROUP BY user_email`);
    const segmentCounts = { hobbyist: 0, professional: 0, enterprise: 0 };
    segmentResult.rows.forEach(row => { segmentCounts[row.segment] = parseInt(row.count || 0); });
    const powerUsersResult = await pool.query(`SELECT user_email, COUNT(DISTINCT installation_id) as installations, COALESCE(SUM(agents_tracked), 0) as total_agents, COALESCE(SUM(lifetime_events), 0) as total_events, COALESCE(SUM(mcp_queries), 0) as total_mcp_queries, MAX(last_updated) as last_active, MIN(first_seen) as first_seen FROM gati_metrics WHERE user_email IS NOT NULL GROUP BY user_email ORDER BY SUM(lifetime_events) DESC LIMIT 10`);
    const topPowerUsers = powerUsersResult.rows.map(row => ({ email: row.user_email, installations: parseInt(row.installations || 0), total_agents: parseInt(row.total_agents || 0), total_events: parseInt(row.total_events || 0), total_mcp_queries: parseInt(row.total_mcp_queries || 0), last_active: row.last_active ? new Date(row.last_active).toISOString() : null, first_seen: row.first_seen ? new Date(row.first_seen).toISOString() : null }));
    const totalPages = Math.ceil(totalCount / pageSize);
    const generatedAt = new Date(); generatedAt.setMilliseconds(0);
    return response.status(200).json({ total_users: totalCount, segment_counts: segmentCounts, users: users, total_count: totalCount, page: page, page_size: pageSize, total_pages: totalPages, top_power_users: topPowerUsers, generated_at: generatedAt.toISOString().replace(/\.\d{3}/, '') + 'Z' });
  } catch (error) {
    console.error('Error in analytics users:', error);
    return response.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
