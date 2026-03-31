import appInsights from 'applicationinsights';
import { config } from './env';

// Application Insights must be initialised BEFORE any other imports that you want instrumented.
// The SDK monkey-patches http, https, mongodb drivers etc. at startup.
// Call initAppInsights() as the very first thing in server.ts.

let initialised = false;

export function initAppInsights(): void {
  if (!config.azure.appInsightsConnectionString || initialised) return;

  appInsights
    .setup(config.azure.appInsightsConnectionString)
    .setAutoCollectRequests(true)       // tracks every HTTP request automatically
    .setAutoCollectDependencies(true)   // tracks MongoDB calls, outbound HTTP etc.
    .setAutoCollectExceptions(true)     // captures unhandled exceptions
    .setAutoCollectPerformance(true, true)
    .setAutoCollectConsole(false)       // we handle console via Winston — avoid duplication
    .setSendLiveMetrics(false)
    .start();

  initialised = true;
}

// Expose the telemetry client for the Winston transport to push logs
export function getTelemetryClient(): appInsights.TelemetryClient | null {
  return initialised ? appInsights.defaultClient : null;
}
