# Deployment Runbooks

## A. Docker Compose (fastest path)

```bash
export API_KEYS="va_prod_key_change_me"
export HMAC_SECRET="$(openssl rand -hex 32)"   # optional but recommended
docker compose -f infra/docker-compose.yml up --build
```

This starts PostgreSQL, the backend, the dashboard, nginx (port 80), and
Prometheus/Grafana. The backend runs migrations automatically on first connect? No —
run migrations once:

```bash
docker compose -f infra/docker-compose.yml run --rm backend npm run migrate
```

## B. Kubernetes (outline)

- Build and push the `server` and `dashboard` images to your registry.
- Deploy the backend as a `Deployment` + `Service` (port 3000) with a
  `Postgres` instance (managed, e.g. RDS, or the Bitnami Helm chart).
- Front with an Ingress (nginx) routing `/collect`, `/api`, `/metrics`, `/health`
  to the backend and `/` to the dashboard.
- Configure `livenessProbe`/`readinessProbe` against `/health`.

## C. AWS ECS + RDS (Terraform)

```bash
cd infra/terraform
terraform init
terraform apply \
  -var="db_password=$(openssl rand -hex 24)" \
  -var="api_keys=[\"va_prod_key_change_me\"]" \
  -var="backend_image=your-registry/visitor-analytics-backend:1.0.0"
```

Outputs the ALB DNS name and DB endpoint. See `main.tf` for the full topology
(ECS Fargate service, RDS PostgreSQL, ALB, CloudWatch logs, IAM).

## D. Scaling & SLA

- **Stateless backend**: scale horizontally behind the LB (2+ tasks in Terraform).
- **Database**: start `db.t3.micro`, scale up and enable read replicas for heavy
  dashboards. Indexes on `(project_id, timestamp)` keep queries fast at scale.
- **Ingest throughput**: the rate limiter protects the API; tune per your traffic.
- **Suggested SLA**: 99.9% ingest availability, < 500ms p95 ingest latency.

## E. Backup & disaster recovery

- RDS: automated snapshots (7-day retention in Terraform) + PITR.
- Store DB credentials in a secret manager (AWS Secrets Manager / SSM), not in env.
- DR runbook: restore latest snapshot → point backend `DATABASE_URL` → redploy.

## F. Monitoring & alerting

- Prometheus scrapes `/metrics`; Grafana dashboard in
  `infra/monitoring/grafana-dashboard.json`.
- Alert rules in `infra/monitoring/alerts.yml` (backend down, ingest failures, auth
  spikes). Wire Alertmanager to your on-call (PagerDuty/Opsgenie/Slack).

## G. Incident response

1. Check `/health` and the `up` metric in Prometheus.
2. Inspect backend logs for `storage_error` / `validation_failed`.
3. For ingestion spikes, raise `RATE_LIMIT_MAX` or scale tasks.
4. For DB issues, verify connectivity and snapshot health.
