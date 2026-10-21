// The Sites supervisor owns this process. Production credentials are not loaded.
process.env.VEYLENS_PREVIEW='1';
await import('./serve-test.mjs');
