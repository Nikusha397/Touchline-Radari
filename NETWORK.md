# Network implementation and activation

## Pages and anonymity

The home page is the community/news feed. The contact directory is at `/directory`; legacy home checkout/filter URLs redirect there. `/network` manages profiles and verification, `/inbox` handles private conversations, and `/subscriptions` manages professional membership.

Public posts and comments expose only a random public identifier, role and anonymous label. Names, emails, auth identifiers, dates of birth and verification documents are not returned in public projections. Directory names are also withheld server-side until contact access is granted. Star ratings and review creation are retired in the public product; historical tables and isolated legacy tests remain for data compatibility.

## Introductions and access

A private introduction costs one existing introduction credit and creates the conversation and first message atomically. Duplicate requests do not charge twice. New conversations require complementary roles, eligible profiles and a listed recipient. Blocking prevents reads and writes. Professional claims and guardian approval remain server-controlled.

Agents and agencies pay $20 USD per month to read incoming introductions, see private sender identity and reply. Without membership, the incoming inbox exposes counts and roles only. An outgoing introduction remains readable to its sender, but incoming replies do not. Every read and write checks current access; expiry relocks content.

Players read and reply free. The peer stays anonymous until the player spends one introduction credit to reveal their name and available account email. That unlock is permanent for that viewer/peer pair and cannot charge twice. Public posts/comments remain anonymous after any private unlock. Authored message text can disclose personal details, so the product warns users against publishing such details.

Messages persist in SQLite. The client polls messages every three seconds and inbox counts every ten seconds while visible. There are no chat email notifications, attachments or WebSocket service. Directory email introductions remain a separate feature.

## Recurring billing

Configure `PAYPAL_NETWORK_PLAN_ID` for a $20 USD monthly indefinite plan, with no trial, setup fee or additional tax. The server validates this plan before checkout. Provider-confirmed payments, rather than browser return URLs, activate access. Signed webhook handling re-fetches provider state; refunds and reversals revoke access. Cancellation ends renewal while keeping a confirmed paid period unless revoked. Admin-issued expiring trials continue to work.

Supabase authentication and PayPal credentials are absent locally. Real sign-in and subscription purchase/cancellation need a configured sandbox rehearsal before release. See README and `docs/COMMUNITY-REVIEW.md` for activation and verification limits.

## Private documents and review operations

Set VERIFICATION_ENCRYPTION_KEY to a securely generated 32-byte key encoded as 64 hexadecimal characters. Keep it out of source control and back it up securely. With no key, photo/ID uploads fail closed. JPEG/PNG inputs are bounded to 5 MB each, decoded and re-encoded with metadata removed, then encrypted using AES-256-GCM with storage-key authenticated data. Never use public storage for verification files.

Owner and admin download endpoints enforce authorization and no-store responses. `/admin/network` requires the existing trusted `touchline_is_admin` RPC. Admin document reads, decisions, moderation and entitlement changes are audited. Reviewers must independently confirm professional records/representation, or the guardian's identity, relationship and specific consent. This is manual review, not automated KYC or biometric verification. A badge is evidence of a completed check, not a guarantee.

Images are deleted when reviewed or withdrawn. Minimise review notes: never transcribe ID numbers. Pending evidence needs an operational review/retention schedule before production; no background cleanup scheduler is provisioned in this change. Support handles account corrections/deletion, including retained message/community records and backups. Encryption does not replace operational access controls.

SQLite migrations 0007–0009 is applied by the existing Node storage runner. Production needs persistent storage and a single compatible application database deployment. Authenticated multi-account UI testing requires configured Supabase credentials; unauthenticated builds and in-memory service tests do not establish production readiness.
