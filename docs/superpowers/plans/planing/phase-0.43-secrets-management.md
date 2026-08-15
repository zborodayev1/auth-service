---
title: Phase 0.43 — Secrets Management
date: 2026-08-15
status: planning
priority: medium — .env files in production are a security risk; secrets must be rotatable without redeployment
---

# Phase 0.43 — Secrets Management

Moves secrets (`JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`) out of environment files and into a proper secrets store. Two approaches depending on infrastructure: Kubernetes Secrets with External Secrets Operator, or HashiCorp Vault.

**Prerequisite:** Phase 0.42 (Kubernetes).

---

## 0.43.1 — Kubernetes Secrets (baseline)

Kubernetes native secrets. Better than `.env` files — not checked into git, RBAC-controlled. Not encrypted at rest by default (need etcd encryption or KMS provider).

**Create secret:**
```bash
kubectl create secret generic auth-service-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=REDIS_URL='redis://...'
```

**Mount in deployment:**
```yaml
envFrom:
  - secretRef:
      name: auth-service-secrets
```

**Enable etcd encryption at rest** (GKE/EKS/AKS all support this via KMS).

---

## 0.43.2 — External Secrets Operator (recommended)

Syncs secrets from an external store (AWS Secrets Manager, GCP Secret Manager, Vault) into Kubernetes Secrets. Secrets live in the cloud provider's secret store — not in k8s YAML or `values.yaml`.

```yaml
# ExternalSecret resource
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: auth-service-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secrets-manager
  target:
    name: auth-service-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: auth-service/prod
        property: database_url
    - secretKey: JWT_SECRET
      remoteRef:
        key: auth-service/prod
        property: jwt_secret
```

**Rotation:** update secret in AWS Secrets Manager → ESO syncs within `refreshInterval` → pod picks up new env on restart.

---

## 0.43.3 — JWT secret rotation

Rotating `JWT_SECRET` invalidates all existing access tokens. Strategy:

**Option A — Accept invalidation:** rotate secret, all users re-authenticate. Simple. Acceptable for low-traffic periods.

**Option B — Key versioning:**
```ts
// Store multiple active secrets with version ID
// JWT header: { alg: "HS256", kid: "v3" }
// Verification: try key for kid, fallback to previous version
```

New env vars: `JWT_SECRET_V1`, `JWT_SECRET_V2` etc. `JWT_CURRENT_KID` = active signing key.

**Recommendation:** start with Option A. Implement Option B when JWT rotation becomes a regular operational task.

---

## 0.43.4 — What NOT to put in secrets

| Value | Where |
|-------|-------|
| `DATABASE_URL` | Secret store |
| `JWT_SECRET` | Secret store |
| `REDIS_URL` | Secret store (contains password) |
| `HTTP_PORT` | ConfigMap |
| `JWT_EXPIRES_IN` | ConfigMap |
| `BCRYPT_ROUNDS` | ConfigMap |
| `REFRESH_TOKEN_TTL_MS` | ConfigMap |

---

## Priority Order

1. Audit current `.env.example` — classify each var as secret vs config
2. Kubernetes Secrets for immediate improvement
3. External Secrets Operator (pick provider: AWS SM / GCP SM / Vault)
4. JWT secret rotation strategy (Option A first, document Option B)
