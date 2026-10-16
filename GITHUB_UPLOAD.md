# Put the code on GitHub

## Recommended: private repository

1. Create a new **private** repository in your own GitHub account.
2. Unzip **TOUCHLINE_Radar_GITHUB_SAFE.zip** into a fresh folder.
3. Upload that folder's contents, including the hidden `.openai` folder, `.gitignore`, package.json and package-lock.json. Do not upload the ZIP itself as the only repository file.
4. Keep FULL_SOURCE_PRIVATE.zip and any restored private data outside public repository uploads.

For a command-line upload, initialize the extracted folder, commit it and add the exact remote URL GitHub provides. This export has no existing .git directory, saved Git token or remote configuration. Nothing has been pushed to GitHub on your behalf.

## If you choose a public repository

Use only GITHUB_SAFE. Its paid directory contacts, legacy trial contact seeds and account-specific grant contents have been removed. The code still contains your public branding, support address, public Google ownership/analytics identifiers and provider/project configuration identifiers. These are not passwords, but a public repository makes them visible.

Do not publish `.env*`, `.dev.vars*`, `.wrangler`, production database exports, CVs, PayPal/Resend secrets, Supabase secret/service-role keys, OAuth client secrets, FULL_SOURCE_PRIVATE.zip or a build artifact. Check every file in GitHub's upload screen: browser uploads do not honor .gitignore automatically.

The ignore rules protect private data generated/restored locally when using normal Git commands. If somebody later force-adds an ignored file or uploads it manually, it can still be exposed. Removing an already committed secret is not enough; revoke it and clean repository history.

## Running from GitHub

GitHub does not move your live D1 database, R2 files or Supabase accounts. GitHub Pages is a static host and cannot run this site's backend. Keep the current Sites deployment or ask a developer to configure Cloudflare Workers, D1, R2, secrets, private directory restoration and reviewed deployment migrations.

Do not create a new empty database and point the live website to it: existing purchases and player profiles are in the current D1 database. A proper move needs a separate database/file backup, preserved Supabase user IDs, tested callbacks/webhooks, DNS planning and a cutover. This handover exports code and schema; it performs no migration.
