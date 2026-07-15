# Troubleshooting

## The SDK can't reach the backend (no data arriving)

- Verify the SDK `endpoint` exactly matches the ingest URL (e.g. `https://.../collect`).
- Check the API key matches a value in `API_KEYS`. A `401` means rejected auth.
- Ensure the `Content-Type: application/json` header is sent (the SDK does this).
- Inspect the backend log for `validation_failed` — a contract mismatch returns `422`.

## 401 Unauthorized

- Missing key: add `X-API-Key` (or `Authorization: Bearer`).
- Invalid key: it must be in the server's `API_KEYS` list.
- `HMAC_SECRET` is set but the request has no valid `X-Signature` header: either sign
  the raw body with HMAC-SHA256, or unset `HMAC_SECRET` to disable signing.

## 422 validation_failed

The body didn't match the schema. Common causes:
- A required nested field is missing or the wrong type (logs show the exact `path`).
- `records` is empty or exceeds 1000 items.
- `timestamp` is not a positive integer (epoch ms).

The SDK is the source of truth for the schema; confirm the backend `src/schema.ts`
version matches your SDK version. See [schema versioning](./schema-versioning.md).

## Dashboard shows "Failed to load" / 502

- The dashboard proxies to `BACKEND_URL` server-side. Confirm the backend is reachable
  from the dashboard container/host and `BACKEND_API_KEY` is valid.
- Check the backend is up: `curl https://.../health`.

## High invalid-payload rate alert

Usually a SDK/backend version mismatch or a client sending malformed data. Compare the
SDK `sdkVersion` in logs against `src/schema.ts`. Additive SDK fields are tolerated;
removed/renamed required fields are not.

## Database connection errors

- `STORAGE=postgres` requires a reachable `DATABASE_URL`.
- Run migrations: `npm run migrate`.
- For local dev without Postgres, unset `DATABASE_URL` to use in-memory storage.

## Metrics missing in Grafana

- Confirm Prometheus targets include `backend:3000/metrics` and the `up` metric is `1`.
- Scrape interval is 15s; allow a minute after startup for series to appear.

## Records not being deleted (GDPR)

- Deletion is tenant-scoped: use the same API key that ingested the data.
- Identify the subject by `sessionId` or by `metadata.customData` key/value. The
  `customDataKey`/`customDataValue` must exactly match the stored value.
