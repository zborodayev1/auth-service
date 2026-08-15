---
title: Phase 0.42 — Kubernetes & Helm Chart
date: 2026-08-15
status: planning
priority: medium — required for production orchestration; enables horizontal scaling, rolling deploys, health-based restarts
---

# Phase 0.42 — Kubernetes & Helm Chart

Packages the service into a Helm chart for deployment to any Kubernetes cluster. Covers Deployment, Service, Ingress, HPA, init container for migrations.

**Prerequisite:** Phase 0.34 (Dockerfile), Phase 0.40 (Redis), Phase 0.41 (migration strategy).

---

## 0.42.1 — Health check endpoints

Required before k8s — kubelet calls these to decide if pod is ready/live.

```ts
// src/presentation/http/routes/health.ts
router.get('/health/live', (_req, res) => res.json({ status: 'ok' }))

router.get('/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    await redis.ping()
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(503).json({ status: 'error', error: String(err) })
  }
})
```

- **Liveness** (`/health/live`): is the process running? Failing → restart pod.
- **Readiness** (`/health/ready`): can the pod accept traffic? Failing → remove from load balancer, keep running.

---

## 0.42.2 — Helm chart structure

```
helm/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml
    service.yaml
    ingress.yaml
    hpa.yaml
    secret.yaml
    configmap.yaml
```

**`values.yaml`:**
```yaml
replicaCount: 2

image:
  repository: ghcr.io/<user>/auth-service
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

ingress:
  enabled: true
  host: auth.example.com
  tls: true

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

env:
  HTTP_PORT: "8080"
  JWT_EXPIRES_IN: "1h"
  BCRYPT_ROUNDS: "12"
  REFRESH_TOKEN_TTL_MS: "2592000000"
```

**`templates/deployment.yaml`** (key sections):
```yaml
initContainers:
  - name: migrate
    image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
    command: ["npx", "prisma", "migrate", "deploy"]
    envFrom:
      - secretRef:
          name: {{ include "auth-service.fullname" . }}-secret

livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 0.42.3 — Secrets

```yaml
# templates/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "auth-service.fullname" . }}-secret
type: Opaque
stringData:
  DATABASE_URL: {{ .Values.secrets.databaseUrl | quote }}
  JWT_SECRET: {{ .Values.secrets.jwtSecret | quote }}
  REDIS_URL: {{ .Values.secrets.redisUrl | quote }}
```

In production: use External Secrets Operator or Vault Agent Injector instead of `values.yaml` secrets.

---

## 0.42.4 — Rolling deploy strategy

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

`maxUnavailable: 0` — always have full replica count during deploy. `maxSurge: 1` — one extra pod during transition.

**With `minReplicas: 2`:** at no point are both pods replaced simultaneously. Combine with readiness probe — new pod only receives traffic after DB + Redis are reachable.

---

## Priority Order

1. Health check endpoints (`/health/live`, `/health/ready`)
2. `Chart.yaml` + `values.yaml` skeleton
3. Deployment + Service + ConfigMap templates
4. Ingress + TLS
5. HPA
6. Init container for migrations
