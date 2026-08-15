---
title: Phase 0.36 — Observability (Metrics & Tracing)
date: 2026-08-15
status: planning
priority: medium — not blocking launch, but required before sustained production traffic; impossible to debug latency or error rate without it
---

# Phase 0.36 — Observability

Pino structured logging + correlation IDs are in place (Phase 0.31). Missing: **metrics** (can't answer "what's the p99 latency?") and **distributed tracing** (can't follow a request across async hops). Both are added via OpenTelemetry — the standard, vendor-neutral instrumentation layer.

---

## 0.36.1 — HTTP Metrics (Prometheus)

**What to expose:**

| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | `method`, `route`, `status_code` |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` |
| `http_requests_in_flight` | Gauge | — |

**Library:** `prom-client` — the standard Node.js Prometheus client. Zero transitive deps.

```bash
pnpm add prom-client
```

**Middleware:**
```ts
// src/presentation/http/middleware/metrics.ts
import { Counter, Histogram, Gauge, register } from 'prom-client'

const requestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
})

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
})

const inFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'In-flight HTTP requests',
})

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = requestDuration.startTimer()
  inFlight.inc()

  res.on('finish', () => {
    const route = req.route?.path ?? 'unknown'
    const labels = { method: req.method, route, status_code: res.statusCode.toString() }
    requestsTotal.inc(labels)
    end(labels)
    inFlight.dec()
  })

  next()
}
```

**Metrics endpoint:**
```ts
// src/presentation/http/routes/metrics.ts
router.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})
```

Mount before auth middleware — metrics endpoint is internal, not part of public API. Consider restricting to internal network only (check `req.ip` vs allowed CIDR, or mount on a separate port).

**Business metrics to add later:**
- `auth_logins_total` with `{ result: success|failure, type: client|user }`
- `auth_token_refresh_total`
- `auth_sessions_active` (gauge, updated by cleanup job)

---

## 0.36.2 — Distributed Tracing (OpenTelemetry)

**What this enables:** each request gets a trace with spans for HTTP handler → command handler → repository → DB query. Latency spikes are immediately attributable to the correct layer.

**Library:** `@opentelemetry/sdk-node` with auto-instrumentation for Express + pg.

```bash
pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```

**Setup file** (must be imported before anything else):
```ts
// src/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  serviceName: 'auth-service',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
    }),
  ],
})

sdk.start()
```

**Import order in `main.ts`:**
```ts
import './telemetry.js' // must be first
import { bootstrap } from './bootstrap.js'
// ...
```

**Auto-instrumented:** Express routes, `pg` queries, `ioredis` commands, `http` client calls. Zero manual span creation needed for the happy path.

**Manual spans** (add for business operations):
```ts
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('auth-service')

// In a handler:
const span = tracer.startSpan('RegisterClient')
try {
  // ...
  span.setStatus({ code: SpanStatusCode.OK })
} catch (err) {
  span.recordException(err as Error)
  span.setStatus({ code: SpanStatusCode.ERROR })
  throw err
} finally {
  span.end()
}
```

**Collector options:**

| Option | Dev | Prod |
|--------|-----|------|
| Jaeger (docker) | `docker run -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one` | Self-hosted |
| Grafana Tempo | — | Good with Grafana stack |
| Honeycomb | — | Generous free tier, excellent UX |

For local dev, Jaeger all-in-one docker image is zero-config.

---

## 0.36.3 — Structured Log Correlation

**Problem:** Pino logs have `requestId` (added in Phase 0.31) but no `traceId`. Logs and traces are disconnected — can't jump from a log line to the trace.

**Fix:** inject OpenTelemetry trace context into Pino log lines:

```ts
// src/infrastructure/logger/PinoLogger.ts
import { trace } from '@opentelemetry/api'

// In request middleware, after OTel auto-instrumentation sets the span:
const span = trace.getActiveSpan()
const { traceId, spanId } = span?.spanContext() ?? {}

logger.child({ requestId: req.requestId, traceId, spanId })
```

Now every log line has `traceId` → paste into Jaeger/Tempo → see the full trace.

---

## Priority Order

1. `prom-client` metrics middleware + `/metrics` endpoint — 2h, immediate value
2. OTel SDK setup + auto-instrumentation — 1h setup, massive visibility gain
3. Log correlation (traceId in Pino) — 30min, glues logs to traces
4. Business metrics (`auth_logins_total` etc.) — add incrementally as needed
