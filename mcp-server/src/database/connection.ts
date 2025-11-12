/**
 * Database connection pool for PostgreSQL
 */
import pg from 'pg';
import { GatiMCPConfig } from '../config/config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initializeDatabase(config: GatiMCPConfig): pg.Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolSize,
    idleTimeoutMillis: config.databasePoolTimeout,
    connectionTimeoutMillis: 5000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  return pool;
}

/**
 * Get database pool instance
 */
export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase first.');
  }
  return pool;
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
