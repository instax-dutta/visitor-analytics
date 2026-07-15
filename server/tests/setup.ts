// Runs before the test module graph is evaluated, so env vars are set before
// src/config.ts reads process.env.
process.env.STORAGE = "memory";
process.env.API_KEYS = "test_key_ingest,test_key_admin";
process.env.NODE_ENV = "test";
