import winston from 'winston';
import TransportStream from 'winston-transport';
import { Client } from '@elastic/elasticsearch';
import { config } from '../config/env';
import { getCorrelationId } from './correlationId';
import { getTelemetryClient } from '../config/appInsights';

// ─── App Insights custom transport ──────────────────────────────────────────

class AppInsightsTransport extends TransportStream {
  log(info: winston.Logform.TransformableInfo, callback: () => void): void {
    const client = getTelemetryClient();
    if (!client) { callback(); return; }

    const { level, message, ...meta } = info;

    if (level === 'error') {
      const err = meta.error instanceof Error ? meta.error : new Error(String(message));
      client.trackException({ exception: err, properties: meta as Record<string, string> });
    } else {
      client.trackTrace({
        message: String(message),
        severity: (severityMap[level] ?? 1) as any,
        properties: { ...meta, correlationId: getCorrelationId() } as Record<string, string>,
      });
    }

    callback();
  }
}

const severityMap: Record<string, number> = {
  debug: 0, verbose: 0, info: 1, warn: 2, error: 3,
};

// ─── Correlation ID format ───────────────────────────────────────────────────

const addCorrelationId = winston.format((info) => {
  info['correlationId'] = getCorrelationId();
  return info;
});

// ─── Transports ─────────────────────────────────────────────────────────────

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, correlationId, ...meta }) => {
        // Filter out winston internal symbols from meta output
        const cleanMeta = Object.fromEntries(
          Object.entries(meta).filter(([k]) => !k.startsWith('Symbol('))
        );
        const metaStr = Object.keys(cleanMeta).length ? ` ${JSON.stringify(cleanMeta)}` : '';
        return `[${level}] [${correlationId}] ${message}${metaStr}`;
      })
    ),
    silent: config.nodeEnv === 'test',
  }),
];

// App Insights — only when connection string present
if (config.azure.appInsightsConnectionString) {
  transports.push(new AppInsightsTransport());
}

// ─── Elasticsearch transport ─────────────────────────────────────────────────
//
// We build this transport ourselves rather than using winston-elasticsearch.
// Reason: winston-elasticsearch sends `wait_for_active_shards` in its bulk request,
// which Elastic Cloud serverless explicitly forbids (returns 400).
// Our custom transport uses client.index() — one document per log call, no bulk params.
//
// Index pattern: tickish-logs-YYYY.MM.DD
// Daily indices make retention easy — an ILM policy can delete indices older than N days
// without touching newer data.
//
// Documents follow ECS (Elastic Common Schema) so Kibana dashboards and alerting
// understand the field names without custom mappings.

class ElasticsearchCustomTransport extends TransportStream {
  private client: Client;

  constructor(client: Client, opts?: TransportStream.TransportStreamOptions) {
    super({ ...opts, level: 'info' });
    this.client = client;
  }

  log(info: winston.Logform.TransformableInfo, callback: () => void): void {
    const { level, message, timestamp, correlationId, ...rest } = info as any;

    // Daily index name e.g. tickish-logs-2026.03.31
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const index = `tickish-logs-${date}`;

    // Remove the 'service' string injected by Winston defaultMeta — it clashes
    // with ECS 'service.name' if the index already has a service object mapping.
    const { service: _service, ...cleanRest } = rest;

    const doc = {
      '@timestamp': timestamp || new Date().toISOString(),
      level,
      message: String(message),
      service_name: 'tickish-api',
      correlation_id: correlationId || 'no-context',
      environment: config.nodeEnv,
      ...cleanRest,
    };

    // Fire-and-forget — we don't await so log calls never block the request
    this.client.index({ index, document: doc }).catch((err: Error) => {
      // Warn to console only — never throw from a transport or the app crashes
      console.warn('[elasticsearch] Failed to ship log:', err.message);
    });

    callback();
  }
}

if (config.elasticsearch.node && config.elasticsearch.apiKey) {
  const esClient = new Client({
    node: config.elasticsearch.node,
    auth: { apiKey: config.elasticsearch.apiKey },
  });

  transports.push(new ElasticsearchCustomTransport(esClient));
}

// ─── Logger ──────────────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    addCorrelationId(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tickish-api' },
  transports,
});
