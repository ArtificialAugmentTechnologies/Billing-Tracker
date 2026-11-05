// Loaded here rather than with `node --env-file`, because that flag makes `node --watch` watch the
// whole server folder, and every stored PDF would then restart the dev server.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: production sets real environment variables instead.
}
