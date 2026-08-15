---
title: Phase 0.48 — Observability Stack (Grafana + Prometheus + Loki + Tempo)
date: 2026-08-15
status: planning
priority: medium — cannot debug production latency or error spikes without dashboards; blind ops is unsustainable
---

# Phase 0.48 — Observability Stack

Wires up the instrumentation from Phase 0.36 (metrics + OTel traces + Pino logs) into a full Grafana observability stack. Single pane of glass: metrics → Prometheus, logs → Loki, traces → Tempo.

**Prerequisite:** Phase 0.36 (prom-client, OTel SDK, structured Pino logs).

---

## 0.48.1 — Docker Compose (local dev stack)

```yaml
# docker-compose.observability.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./observability/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./observability/promtail.yml:/etc/promtail/config.yml
      - /var/log:/var/log

  tempo:
    image: grafana/tempo:latest
    volumes:
      - ./observability/tempo.yml:/etc/tempo.yml
    ports:
      - "3200:3200"
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - ./observability/grafana/datasources:/etc/grafana/provisioning/datasources
      - ./observability/grafana/dashboards:/etc/grafana/provisioning/dashboards
```

Run: `docker compose -f docker-compose.yml -f docker-compose.observability.yml up`

---

## 0.48.2 — Prometheus scrape config

```yaml
# observability/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: auth-service
    static_configs:
      - targets: ['app:8080']
    metrics_path: /metrics
```

In production (Kubernetes): use `ServiceMonitor` CRD if Prometheus Operator is installed.

---

## 0.48.3 — Grafana datasources

```yaml
# observability/grafana/datasources/datasources.yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    url: http://loki:3100

  - name: Tempo
    type: tempo
    url: http://tempo:3200
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
        filterByTraceID: true
```

Tempo → Loki correlation: click on a trace in Tempo → jump to Loki logs for the same `traceId`. Requires `traceId` in Pino logs (Phase 0.36.3).

---

## 0.48.4 — Grafana dashboards

**Dashboard 1 — HTTP Overview:**
- Request rate by route + status code
- p50/p95/p99 latency by route
- In-flight requests
- Error rate (5xx) over time

**Dashboard 2 — Auth Business Metrics:**
- Login success / failure rate
- Registration rate
- Active sessions count
- Token refresh rate
- Password reset requests

**Dashboard 3 — Infrastructure:**
- DB connection pool utilization (pg metrics)
- Redis memory usage + hit rate
- Node.js heap usage
- GC pause duration

Dashboards provisioned as JSON files in `observability/grafana/dashboards/` — version controlled, auto-loaded on Grafana startup.

---

## 0.48.5 — Alerting

```yaml
# Prometheus alerting rules
groups:
  - name: auth-service
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 5%"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p99 latency above 1s"

      - alert: LoginFailureSpike
        expr: rate(auth_login_failures_total[5m]) > 10
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Possible credential stuffing attack"
```

Alertmanager routes to Slack/PagerDuty/email.

---

## Priority Order

1. `docker-compose.observability.yml` + `prometheus.yml` — wires up prom-client metrics from 0.36
2. Grafana datasources provisioning
3. HTTP Overview dashboard (most immediate value)
4. Loki log shipping via Promtail (or use Pino transport directly)
5. Tempo trace collection (update OTel exporter URL from 0.36)
6. Auth business metrics dashboard
7. Alerting rules
