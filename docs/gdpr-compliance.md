# GDPR & Privacy Compliance Guide

The SDK is privacy-first (no PII such as names, emails, or IP addresses are collected).
This guide covers the backend-side obligations for regulations like GDPR (EU), CCPA
(California), LGPD (Brazil), and PIPEDA (Canada).

## 1. Data subject identification

Records are linked to a `sessionId` and may carry an opaque subject id in
`metadata.customData` (e.g. your internal `userId`). We recommend you set a non-PII
subject identifier via the SDK's `customData` so you can honor deletion/export requests
without storing personal data:

```ts
createAnalytics({
  customData: { userId: "u_42" }, // opaque id from your auth system
});
```

## 2. Right to erasure (Article 17 / CCPA delete)

Delete a subject's records scoped to the authenticated project:

```bash
# By session
curl -X DELETE "https://analytics.example.com/api/v1/data" \
  -H "X-API-Key: $KEY" \
  -d '{ "sessionId": "sess_abc123" }'

# By opaque subject id
curl -X DELETE "https://analytics.example.com/api/v1/data" \
  -H "X-API-Key: $KEY" \
  -d '{ "customDataKey": "userId", "customDataValue": "u_42" }'
```

Returns `{ "status": "deleted", "deleted": N }`. Deletion is tenant-scoped — it can
only touch records belonging to the project that owns the API key.

## 3. Right to data portability (Article 20)

Export a subject's raw records as JSON:

```bash
curl "https://analytics.example.com/api/v1/export?customDataKey=userId&customDataValue=u_42" \
  -H "X-API-Key: $KEY" -o export.json
```

## 4. Retention & minimization

- `RETENTION_DAYS` (default 365) automatically purges records older than the threshold
  via a daily job. Set a value aligned with your privacy policy.
- Only the fields emitted by the SDK are stored; no additional PII is captured.
- Data is encrypted in transit (HTTPS / TLS at the LB) and at rest (RDS storage
  encryption; see Terraform `storage_encrypted = true`).

## 5. Legal / operational checklist

- [ ] Publish a privacy policy describing analytics collection and legal basis.
- [ ] Provide a cookie/consent banner that suppresses the SDK until consent (set
      `autoStart: false` and call `analytics.start()` after consent).
- [ ] Document a retention period and surface it in the policy.
- [ ] Implement an internal runbook for fulfilling access/deletion requests.
- [ ] Keep an audit log of deletion/export actions (the backend emits structured logs
      and `va_gdpr_deletions_total` metrics).

## 6. Cookie consent example

```ts
function onConsentGranted() {
  analytics.start();
}
// Call onConsentGranted() only after the visitor accepts analytics cookies.
```
