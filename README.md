# TOUCHLINE Radar — website source

Prepared for the owner on 16 October 2026. Source baseline: live Sites version 25, commit `3b5f2a155eba0a8339f6ad942387c1248dd449d5`. The cancelled FREE3 feature is not included.

TOUCHLINE Radar is a football-agent directory with email/Google accounts, private player profiles and PDF CV uploads, paid player introductions, separate paid contact reveals, PayPal payments and an owner dashboard.

## What you received

- **GITHUB_SAFE.zip**: application code, public assets, database schema/migrations, dependency lockfile, configuration templates and documentation. Paid directory contacts and the historical one-time customer grant are excluded. After setup it uses a contact-free directory example until you restore the private data.
- **FULL_SOURCE_PRIVATE.zip**: the source and real server-side directory, including agent emails and phone numbers and legacy trial seed files. Keep this archive private. It includes a historical one-time credit-grant migration with an account identifier; it is not a live customer database export.
- **DATA_MAP.md**: a detailed explanation of where information is stored, which services receive it and what has to move if you change hosting.

Neither ZIP contains production environment secrets, passwords, active sign-in cookies, a customer-database dump, uploaded customer PDFs, node_modules, build output or Git history. Public provider/project identifiers and the site's published support address are configuration information, not login credentials.

## Technology

TypeScript, React 19, Vinext/Next-compatible routes, Vite and Cloudflare Workers. Cloudflare D1 stores application records; R2 stores PDFs. Supabase handles authentication. PayPal Orders v2 processes one-time purchases. Resend sends introductions. Installed dependency versions are pinned in package.json/package-lock.json.

This is a server application. **GitHub Pages cannot run its account, payment, email and database features.** A GitHub repository stores the code; the running backend still needs its existing Sites hosting or a deliberately configured Cloudflare deployment.

## Local setup

Use Node.js 24 LTS and npm. From this folder:

```sh
npm ci
npm run setup:data
cp .dev.vars.example .dev.vars
npm run dev
```

On Windows, use `Copy-Item .dev.vars.example .dev.vars` instead of `cp`. Open the local address printed by the server. The original portable dev script normally uses port 5173. The setup step only copies examples when the actual data files do not exist. It never overwrites a restored private directory.

The examples are deliberately not production credentials. Account features require the real Supabase project configuration, and payments/email require their own server secrets. See CONFIGURATION.md. Configure runtime variables in the hosting dashboard for production; a local .dev.vars file is not a production secret store.

## Private directory

The live file is `lib/directory.server.json`. It contains 753 agencies and 1,023 agents with published email addresses in the current snapshot. It is imported by server code and included in server deployment artifacts; it must never be placed in `public/` or a public Git repository.

For a full local restoration, copy `lib/directory.server.json`, `lib/seed.ts` and `lib/additional-seeds.ts` from FULL_SOURCE_PRIVATE into the matching paths here. They are ignored by the export's .gitignore. The GitHub-safe export supplies corresponding `.example` files; its directory has public listing metadata and empty contact arrays. Introduction delivery/contact reveals need the real private data. Keep payments disabled until the data, secrets and backend are connected.

When building in CI, restore these files through a private artifact or another access-controlled build step before building. This handover does not set up such a CI connection. Do not upload FULL_SOURCE_PRIVATE through GitHub's browser interface; .gitignore does not protect files you manually drag into an upload.

## Checks and build

```sh
node --experimental-strip-types --test tests/paypal-validation.test.mjs
npx tsc --noEmit --incremental false
npm run build
```

The build emits Worker output under `dist/server` and browser assets under `dist/client`. It does not itself publish. The original Sites plugin/Cloudflare configuration is included; direct hosting needs real D1/R2 binding configuration instead of the local placeholder IDs in vite.config.ts.

## Existing deployment and migration

The production URL is https://touchlineradar.com/. Its managed Sites project is `appgprj_6ac63839257c8191836a7b8f2acc0fa3`. The current source provider is Sites-managed Cloudflare artifact storage, not an owner-created GitHub repository. Creating a GitHub copy does not disconnect or replace this deployment.

`drizzle/0000` through `0006` describe the existing D1 schema/history. Do not replay all migrations against the populated live database. The GitHub-safe copy turns the historical one-account promotional grant into a harmless no-op because it is not schema and must not run on a fresh installation. The private archive preserves that historical file for reference.

`supabase/exported-admin-schema.sql` is a schema-only snapshot of the deployed admin RPCs/private tables, without owner allowlist rows. Supabase's Auth schema is platform-managed. The older supabase SQL files are historical references, not a complete fresh-project installer; their date-based owner enrollment condition is specific to the original deployment. A target project needs a reviewed, explicit enrollment of the intended verified owner UUID.

No FREE3/promo-code tables, feature or live change were deployed. No provider accounts, domain records, payment setup, live customer data or hosting were changed by this export.

Start with GITHUB_UPLOAD.md and DATA_MAP.md before handing this to another developer.
