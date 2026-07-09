# @visitor-analytics-sdk/uploader

Batch uploader for the visitor-analytics SDK — configurable batching, exponential backoff retry, request deduplication, and compression.

```bash
npm install @visitor-analytics-sdk/uploader
```

## Features

- **Batched uploads** — groups records into configurable batches
- **Exponential backoff** — retries with configurable base delay and max delay
- **Request deduplication** — prevents duplicate batch uploads
- **Gzip compression** — optional payload compression
- **sendBeacon fallback** — unload-safe delivery via `navigator.sendBeacon`

## Usage

```ts
import { Uploader } from "@visitor-analytics-sdk/uploader";
import { MemoryStorage } from "@visitor-analytics-sdk/storage";

const uploader = new Uploader(new MemoryStorage(), {
  endpoint: "/api/analytics",
  batchSize: 50,
  maxRetries: 5,
  retryBaseDelay: 1000,
  compressionEnabled: false,
});

uploader.start();
uploader.flush();
```

## License

MIT
