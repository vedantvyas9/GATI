/**
 * Configuration management for GATI MCP Server
 */

export interface GatiMCPConfig {
  databaseUrl: string;
  databasePoolSize: number;
  databasePoolTimeout: number;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): GatiMCPConfig {
  const databaseUrl = process.env.DATABASE_URL ||
    'postgresql://gati_user:gati_password@postgres:5432/gati_db';

  return {
    databaseUrl,
    databasePoolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    databasePoolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '30000', 10),
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: GatiMCPConfig): void {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  if (!config.databaseUrl.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string');
  }
}
