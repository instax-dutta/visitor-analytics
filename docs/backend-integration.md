# Backend Integration Guide

This guide explains how to stand up the reference backend that receives data from the
Visitor Analytics SDK, store it, query it, and operate it in production.

## 1. Architecture at a glance

```
Browser (SDK)  ──POST /collect──▶  Backend (Express)  ──▶  PostgreSQL
                                       │  ├─ validation (zod)
                                       │  ├─ auth (API key / HMAC)
                                       │  ├─ rate limit
                                       │  └─ metrics (/metrics)
                                       ▼
                                   Dashboard (Next.js)  ◀── GET /api/v1/*
```

- **Backend** (`server/`): ingestion, validation, authentication, querying, GDPR APIs,
  Prometheus metrics, health checks.
- **Dashboard** (`dashboard/`): reads the query API and renders KPIs, time series,
  breakdowns, and raw records. Exports CSV/JSON.
- **Storage**: PostgreSQL (production) or in-memory (local dev / tests).

## 2. Configure the SDK

Point the SDK at your backend's ingest endpoint and send an API key:

```ts
import { createAnalytics } from "@visitor-analytics-sdk/core";

const analytics = createAnalytics({
  endpoint: "https://analytics.example.com/collect",
  storage: "indexeddb",
  headers: {
    "X-API-Key": "va_prod_key_change_me",
  },
  // Optional: sign requests (set HMAC_SECRET on the server to enforce).
  // headers: { "X-Signature": sign(body, secret) },
});
analytics.start();
```

The SDK sends batches as:

```json
{
  "records": [ { "id": "...", "timestamp": 0, "sessionId": "...", "...": {} } ],
  "batchId": "abc123",
  "timestamp": 0,
  "sdkVersion": "1.0.1"
}
```

## 3. Run the backend locally

```bash
cd server
cp .env.example .env          # set API_KEYS, DATABASE_URL, etc.
npm install
npm run migrate               # if using postgres
npm run dev                   # http://localhost:3000
```

With no `DATABASE_URL`, the backend uses in-memory storage (great for a quick try).

## 4. Endpoints

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| POST | `/collect` | API key | Ingest a batch of records |
| GET | `/api/v1/summary` | API key | Headline KPIs for a window |
| GET | `/api/v1/timeseries?interval=day` | API key | Visits/sessions over time |
| GET | `/api/v1/breakdown?dimension=browser` | API key | Categorical breakdown |
| GET | `/api/v1/records` | API key | Paginated raw records |
| DELETE | `/api/v1/data` | API key | GDPR deletion |
| GET | `/api/v1/export` | API key | GDPR data portability export |
| GET | `/health` | none | Liveness/readiness |
| GET | `/metrics` | none | Prometheus metrics |

Query parameters for the `GET` endpoints: `since`, `until` (epoch ms), `pagePath`,
`sessionId`, `interval` (`hour|day|week|month`), `dimension`
(`browser|os|formFactor|network|utmSource|utmMedium|utmCampaign|pagePath|referrer`),
`limit`, `offset`.

## 5. Authentication

Two mechanisms, configured server-side:

1. **API key** — sent by clients as `X-API-Key` or `Authorization: Bearer <key>`.
   Compared in constant time against `API_KEYS`.
2. **HMAC request signing** — when `HMAC_SECRET` is set, clients must sign the raw
   request body with HMAC-SHA256 and send it in `X-Signature`. Requests without a
   valid signature are rejected.

Data is tenant-scoped by a stable hash of the API key (`project_id`), so keys never
leak into stored data and projects cannot read each other's records.

## 6. Rate limiting

`express-rate-limit` caps requests per IP (default 600 req / 60s, tunable via
`RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`). Exceeding it returns `429`.

## 7. Production deployment

See [deployment runbooks](./deployment-runbooks.md) and the `infra/` directory
(docker-compose, nginx, Terraform, Prometheus/Grafana).

## 8. Data retention

A daily job purges records older than `RETENTION_DAYS` (default 365). See
[GDPR compliance](./gdpr-compliance.md) for deletion/export APIs.
