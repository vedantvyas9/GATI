/**
 * Telemetry client for MCP server
 *
 * Tracks anonymous usage metrics for the MCP server.
 * No sensitive data (queries, results, or PII) is collected.
 */

import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface TelemetryMetrics {
  installation_id: string;
  sdk_version: string;
  mcp_queries: number;
  agents_tracked: number;
  events_today: number;
  lifetime_events: number;
  frameworks_detected: string[];
  timestamp: string;
}

interface LocalMetrics {
  mcp_queries: number;
  last_reset_date: string;
}

export class TelemetryClient {
  private enabled: boolean;
  private endpoint: string;
  private sdkVersion: string;
  private installationId: string = '';
  private metrics: LocalMetrics = {
    mcp_queries: 0,
    last_reset_date: new Date().toISOString().split('T')[0],
  };

  private configDir: string;
  private metricsFile: string;
  private idFile: string;

  constructor(
    enabled: boolean = true,
    endpoint: string = process.env.GATI_TELEMETRY_URL || 'https://gati-mvp-telemetry.vercel.app/api/metrics',
    sdkVersion: string = '1.0.0'
  ) {
    this.enabled = enabled;
    this.endpoint = endpoint;
    this.sdkVersion = sdkVersion;

    // Set up paths
    this.configDir = join(homedir(), '.gati');
    this.metricsFile = join(this.configDir, 'mcp-metrics.json');
    this.idFile = join(this.configDir, '.gati_id');
  }

  /**
   * Initialize telemetry client
   */
  async init(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });

      // Load or create installation ID
      this.installationId = await this.getOrCreateInstallationId();

      // Load metrics from disk
      await this.loadMetrics();

      console.error('[GATI Telemetry] Initialized');
    } catch (error) {
      console.error('[GATI Telemetry] Failed to initialize:', error);
    }
  }

  /**
   * Get or create installation ID
   */
  private async getOrCreateInstallationId(): Promise<string> {
    try {
      // Try to read existing ID
      const id = await fs.readFile(this.idFile, 'utf-8');
      return id.trim();
    } catch {
      // Create new ID
      const id = randomUUID();
      try {
        await fs.writeFile(this.idFile, id);
      } catch (error) {
        console.error('[GATI Telemetry] Failed to save installation ID:', error);
      }
      return id;
    }
  }

  /**
   * Load metrics from disk
   */
  private async loadMetrics(): Promise<void> {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf-8');
      const loaded = JSON.parse(data) as LocalMetrics;

      this.metrics.mcp_queries = loaded.mcp_queries || 0;
      this.metrics.last_reset_date =
        loaded.last_reset_date || new Date().toISOString().split('T')[0];
    } catch {
      // File doesn't exist or is invalid, use defaults
      this.metrics = {
        mcp_queries: 0,
        last_reset_date: new Date().toISOString().split('T')[0],
      };
    }
  }

  /**
   * Save metrics to disk
   */
  private async saveMetrics(): Promise<void> {
    try {
      await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('[GATI Telemetry] Failed to save metrics:', error);
    }
  }

  /**
   * Track an MCP query
   */
  async trackQuery(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.metrics.mcp_queries++;

    // Save every 100 queries to reduce I/O
    if (this.metrics.mcp_queries % 100 === 0) {
      await this.saveMetrics();
    }
  }

  /**
   * Get current metrics
   */
  private async getMetrics(): Promise<TelemetryMetrics> {
    return {
      installation_id: this.installationId,
      sdk_version: this.sdkVersion,
      mcp_queries: this.metrics.mcp_queries,
      agents_tracked: 0, // MCP server doesn't track agents
      events_today: 0, // MCP server doesn't track events
      lifetime_events: 0, // MCP server doesn't track events
      frameworks_detected: ['mcp'], // Always mark as MCP usage
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send metrics to telemetry endpoint
   */
  async sendMetrics(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const metrics = await this.getMetrics();

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `gati-mcp-server/${this.sdkVersion}`,
        },
        body: JSON.stringify(metrics),
      });

      if (response.ok) {
        console.error('[GATI Telemetry] Metrics sent successfully');
      } else {
        console.error(
          `[GATI Telemetry] Failed to send metrics: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error('[GATI Telemetry] Failed to send metrics:', error);
    }
  }

  /**
   * Shutdown telemetry client
   */
  async shutdown(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Save final metrics
    await this.saveMetrics();

    // Send final telemetry
    await this.sendMetrics();

    console.error('[GATI Telemetry] Shutdown complete');
  }
}

// Global singleton instance
let telemetryClient: TelemetryClient | null = null;

/**
 * Initialize global telemetry client
 */
export async function initTelemetry(
  enabled: boolean = true,
  endpoint?: string
): Promise<void> {
  telemetryClient = new TelemetryClient(enabled, endpoint);
  await telemetryClient.init();

  // Send metrics every 24 hours
  setInterval(async () => {
    await telemetryClient?.sendMetrics();
  }, 24 * 60 * 60 * 1000); // 24 hours
}

/**
 * Track an MCP query
 */
export async function trackQuery(): Promise<void> {
  await telemetryClient?.trackQuery();
}

/**
 * Shutdown telemetry
 */
export async function shutdownTelemetry(): Promise<void> {
  await telemetryClient?.shutdown();
}
