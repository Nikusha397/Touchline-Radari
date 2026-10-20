# Community implementation review

Review date: 20 October 2026. This is a local implementation review, not a production readiness certificate.

## Delivered

- Community/news home, separate directory, anonymous posts/comments, source links, moderation/reporting and blocks.
- Paid introductions with atomic credit consumption and duplicate protection.
- Professional $20/month membership and locked incoming count/role projection.
- Free player reads/replies, one-credit identity reveal, persistent conversations with polling.
- Server-side anonymous directory projections; public stars and reviews retired.
- Unified restrained visual system, native dialogs, keyboard focus, reduced motion and responsive CSS.
- Policies, provider/license registers, local fonts and optional analytics disabled.

## Verification

- Full test suite: 39 passed, 0 failed. Includes authorization/IDOR, public anonymity, membership expiry, outgoing professional reply protection, player identity charging, transactional rollback, block/guardian/verification restrictions and provider price/payment validation.
- TypeScript: `npx tsc --noEmit` passed.
- Production build: `npm run build` passed (36 static pages generated, dynamic routes compiled).
- Focused ESLint on the new community, inbox, membership, subscription and shared UI/service modules passed.
- Full repository lint still reports 51 errors and 11 warnings in legacy admin, authentication, directory, content and payment/helper code. These include explicit `any`, state updates in effects and internal anchor usage. Rules were not disabled. This remains an unmet repository release requirement.
- `npm audit --omit=dev`: zero reported production vulnerabilities. Development dependencies were not included in that audit.
- Local HTTP checks: home, directory, inbox, subscriptions and new policy pages return 200; unauthenticated private APIs return 401; old review API returns 410; old directory query URLs redirect with 307.
- Desktop browser: feed filter, guest composer, Escape/focus restoration, inbox sign-in state and membership prices/conditions checked. DOM check found one main heading, a main landmark, skip link, no unnamed buttons/links and no horizontal overflow at 1280px.
- Screenshot: `.data/previews/community-home.png` (ignored local artifact).
- No Lighthouse/axe score, mobile viewport or screen-reader audit is claimed. Responsive rules exist, but those independent validations remain outstanding.

## Security report

New community routes validate payloads, require authenticated access for private data, check same-origin mutations and use rate limits. SQL is parameterized. Credit writes use SQLite transactions. Public authors use a separate random alias. Private message and identity access is checked server-side, including blocked/expired/guardian cases. Professional outgoing threads do not expose player replies without membership. The client discards stale thread responses and reloads history after an access-scope change.

React text rendering escapes user content; news source links are restricted to HTTPS and are not fetched by the server. No HTML rendering or arbitrary URL fetch was introduced. Existing verification encryption and auth controls are retained. Subscription grants require provider-verified plan, currency, amount, account mapping and payment dates, with revocation handling. No credentials or external packages were added. Optional analytics and external font requests were removed.

Remaining operational limits: authentication and live provider integration were not exercised; no penetration test or whole-repository secret scan is claimed. Chat is not end-to-end encrypted. Verification evidence retention and data requests require staffed operations. Persist SQLite on a compatible single application database deployment; inbox lists currently cap at 200 threads.

## Activation and business facts needed

Locally absent: Supabase URL/publishable key, enabled PayPal payments, PayPal client ID/secret/webhook ID and the network plan ID. No real subscription was created or charged. Configure secrets outside source control, enable confirmed email at the auth provider, and test two real sandbox accounts through creation, renewal, cancellation, expiry, refund and reversal.

Legal placeholders: `[BUSINESS LEGAL NAME]` and `[REGISTERED BUSINESS ADDRESS]`. Supply actual seller identity/address and support contact; determine required business registration/tax details, retention/transfer arrangements and applicable consumer terms with qualified counsel. Existing legal drafts are not a legal compliance certification. Optional tracking stays disabled; if reintroduced it requires disclosure and an appropriate consent implementation before loading.

## Suggested next product improvements

1. Structured opportunity posts (position, age range, country and deadline) with saved filters.
2. Clear verification status and reporting response targets without revealing identity.
3. Introduction previews and explicit disclosure before sending, plus recipient controls to reduce spam.
4. Member notification preferences and unread indicators, followed by realtime transport only when usage warrants it.

These are proposals, not implemented features.

## Unified UI correction (20 October)

Home, directory, inbox, profile and membership now render the same shared application shell. The second branding/header/sidebar system was replaced with one navigation, brand mark, type scale, colors and footer. Large marketing headings, duplicate navigation, the directory hero, promotional blocks and decorative feed pitch illustration were removed. Directory-only CV, email introductions, credits and shortlist controls remain available in its local toolbar.

Verified home-to-directory navigation and the inbox guest state in the browser; corrected directory heading semantics and brand contrast. Build/type-check and all 39 tests pass. Full lint remains at 51 existing errors and 11 warnings; modified community/shell modules have no findings. Production dependency audit remains clear. No permissions, data projections, payment logic, external assets or dependencies changed in this UI correction. Mobile CSS was reviewed but a mobile viewport was not rendered. Existing business-name/address placeholders and live-auth/payment validation requirements remain open.

Updated screenshots: `.data/previews/unified-home.png` and `.data/previews/unified-directory.png`.

## Signed-out landing and responsive pass (20 October)

Added a two-column introduction/sign-in landing with Touchline branding, stacked mobile layout, labelled email/password inputs, password visibility control, request timeout and honest unconfigured-auth state. `/` uses the existing server-verified user check; signed-in users retain the feed. Public browsing is available at `/community`. Added the route to the sitemap. Shared navigation, long-text wrapping, chat/membership columns, dialogs and directory controls now reflow at narrow widths. Legacy global CSS is explicitly excluded from the landing to prevent typography overrides.

Browser viewport checks: `/`, `/community`, `/directory`, `/inbox`, `/subscriptions`, `/network` at 320, 390, 768 and 1280 pixels: no horizontal page overflow, exactly one H1 and one main per page. Guest states only. Password visibility toggle, keyboard tab to recovery, input labels and accessible control names checked. Desktop and mobile landing visually inspected. This is not a claim of complete authenticated or screen-reader coverage.

All 39 tests and production build/type-check pass. Full lint retains 51 legacy errors; new landing, root route, community route and shell have zero findings. Production dependency audit: zero vulnerabilities. Attempted an axe scan using the installed package in an isolated development route, but the scan did not complete; no passing axe/Lighthouse score is claimed. The temporary route was removed. No new external scripts, tracking, assets, dependencies, credentials or permissions were added. Login posts to the existing same-origin validated/rate-limited handler; no passwords are persisted in browser storage. Live login still needs Supabase configuration. Existing legal placeholders remain `[BUSINESS LEGAL NAME]` and `[REGISTERED BUSINESS ADDRESS]`.
