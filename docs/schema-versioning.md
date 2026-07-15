# Schema Versioning Strategy

The data contract between the SDK and the backend evolves over time. This document
defines how to evolve it without breaking existing clients.

## Versions

- Each upload payload MAY carry `schemaVersion`. When absent, the backend assumes
  `CURRENT_SCHEMA_VERSION` (see `server/src/schema.ts`).
- The version is persisted on every record (`schema_version` column), so historical
  data stays interpretable even after the contract changes.

## Two kinds of changes

### Non-breaking (additive) — no version bump required

Adding new optional fields anywhere in the record. The backend validation uses
`.passthrough()` and only enforces structurally required fields, so new optional
metrics from a newer SDK are accepted and ignored by older dashboards.

Examples:
- Adding a new boolean to `features`.
- Adding a new number to `performance`.

Action: ship the SDK change. No migration needed.

### Breaking — bump `CURRENT_SCHEMA_VERSION`

Changing types, removing a required field, or renaming. These require a major bump.

Action:
1. Increment `CURRENT_SCHEMA_VERSION` in `server/src/schema.ts`.
2. Add a migration note here describing the change and how to map old → new.
3. Keep `MIN_SUPPORTED_SCHEMA_VERSION` at the oldest version you still accept; reject
   older payloads with a clear error (the SDK should surface this and prompt an upgrade).
4. Update the OpenAPI spec (`docs/api/backend-openapi.yaml`) and this doc.

## Backward compatibility guarantees

- The backend accepts any payload with `schemaVersion >= MIN_SUPPORTED_SCHEMA_VERSION`.
- Stored records keep their original `schema_version`, so queries/exports remain valid.
- Dashboards read known fields defensively (null-safe) so older records don't crash
  newer UI code.

## Migration guide (example)

| From → To | Change | Mapping |
| --------- | ------ | ------- |
| 1 → 2 | `device.formFactor` split into `formFactor` + `deviceClass` | Old `formFactor` values map 1:1 to `formFactor`; set `deviceClass` = `formFactor === "desktop" ? "pc" : "mobile"` |

When a breaking change ships, add its row above and bump the version constant.
