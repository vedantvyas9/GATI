/**
 * Telemetry client for anonymous usage statistics
 * Similar to SDK telemetry - collects usage data but NO sensitive information
 */

let queryCount = 0;
let telemetryEnabled = false;

/**
 * Initialize telemetry
 */
export async function initTelemetry(enabled: boolean): Promise<void> {
  telemetryEnabled = enabled;

  if (enabled) {
    console.error('[GATI MCP] Telemetry enabled (anonymous usage stats only)');
  } else {
    console.error('[GATI MCP] Telemetry disabled');
  }
}

/**
 * Track a query (increment counter)
 */
export async function trackQuery(): Promise<void> {
  if (!telemetryEnabled) {
    return;
  }

  queryCount++;
}

/**
 * Shutdown telemetry and send final stats
 */
export async function shutdownTelemetry(): Promise<void> {
  if (!telemetryEnabled || queryCount === 0) {
    return;
  }

  // In a full implementation, this would send stats to a telemetry endpoint
  // For now, just log locally
  console.error(`[GATI MCP] Total queries during session: ${queryCount}`);
}
