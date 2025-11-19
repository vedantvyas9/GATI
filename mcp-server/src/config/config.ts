/**
 * Configuration management for GATI MCP Server
 */

export interface GatiMCPConfig {
  backendUrl: string;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): GatiMCPConfig {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

  return {
    backendUrl,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: GatiMCPConfig): void {
  if (!config.backendUrl) {
    throw new Error('BACKEND_URL is required');
  }
  
  // Validate URL format
  try {
    new URL(config.backendUrl);
  } catch {
    throw new Error(`Invalid BACKEND_URL format: ${config.backendUrl}`);
  }
}
