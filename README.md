# TOUCHLINE Radar — Next.js

The application runs on **Next.js 16.3.8 App Router, React 19, TypeScript and Node.js 24**. Pages, API route handlers, server rendering and session proxy run in Next.js. Vite, Vinext and the Cloudflare Worker build pipeline have been removed.

## Local development

Use Node.js 24 or newer:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://127.0.0.1:5173. Next.js loads .env.local automatically. Existing .dev.vars files are not loaded; transfer required values privately. Postinstall prepares contact-free examples only when private data files are missing. Existing private directory files are preserved.

## Production

```sh
npm ci
npm test
npm run build
npm start
```

Run one Node.js application instance with a persistent local disk, behind an HTTPS reverse proxy. The application uses Node's SQLite driver with WAL, transactional batches and a busy timeout. DATABASE_PATH defaults to .data/touchline.sqlite and UPLOADS_PATH defaults to .data/uploads. Set both to absolute persistent paths on your production host. Back up the database and private uploads. Ephemeral/serverless storage and multiple hosts sharing a SQLite file are not supported by this storage configuration.

All SQL schema migrations are applied transactionally on first database use, recorded in _app_migrations and skipped on subsequent starts. The historical one-customer promotional grant is deliberately skipped. Keep drizzle/ beside the application at runtime. Files are served through authenticated API routes, never through public/.

Configure TRUSTED_CLIENT_IP_HEADER only when the reverse proxy strips client-supplied values and writes its own single client IP. Without it, anonymous requests share a conservative rate-limit bucket. Use cf-connecting-ip only behind a trusted Cloudflare proxy with direct origin access blocked.

## Services and existing data

Supabase authentication, PayPal and Resend integrations retain their existing application flows; supply the corresponding secrets from CONFIGURATION.md. They cannot be exercised end-to-end without credentials. Payments remain disabled until configured.

This checkout starts with a fresh local database. Existing Sites D1 records, R2 PDFs, production secrets, DNS and the hosted deployment have not been moved. Before switching production, export and import the D1 database into SQLite, reconcile migration history with the actual imported schema (do not replay CREATE TABLE migrations over existing tables), copy R2 keys under UPLOADS_PATH with their existing paths, restore the private directory, configure auth callbacks and payment webhooks, and verify accounts, balances and files. Do not direct paying users to an empty database.

The old DATA_MAP.md, GITHUB_UPLOAD.md, VALIDATION.md and HANDOVER_MANIFEST.json describe the historical Sites export. This README and CONFIGURATION.md describe the current Next.js runtime. The .openai metadata is retained only as a record of the previous hosted project; this source is no longer a Sites Worker deployment package.

## Verification

npm test runs payment validation plus SQLite migration, transactional rollback and private-file tests. npm run build checks TypeScript and builds every App Router route. The local preview includes directory filtering and protected API routes; real login, payments and email require configured providers.
