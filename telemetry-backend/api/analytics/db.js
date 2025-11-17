// Shared database connection pool for analytics endpoints
const { Pool } = require('pg');
const { URL } = require('url');

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not configured');
}

const dbUrl = new URL(process.env.POSTGRES_URL);

const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port, 10),
  database: dbUrl.pathname.split('/')[1],
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

