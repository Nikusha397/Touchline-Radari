# Touchline: community, introductions and private inbox

## Confirmed product requirements

- `/` becomes the news and community feed. The existing paid contact directory moves to `/directory`.
- Players, agents and agencies can publish posts and comments.
- Public authors use anonymous identifiers and role labels. Real names, emails, profile photos and private account identifiers must not be serialized into public API responses or HTML.
- An introduction opens a private conversation with a registered member, subject to sender/recipient role rules.
- Without an active subscription, professional recipients see only incoming request counts and sender roles. Players read and reply free, but must spend one introduction credit to reveal identities.
- With an active subscription, recipients can see the sender identity, read the introduction and reply. Subscription access never reveals identities on public posts or comments.
- Add agent and agency subscriptions and a polished inbox with pending introductions, active conversations and unread counts.
- Modernize the visual design and motion. A more detailed user-provided Markdown brief is expected.

## Existing implementation findings

- Directory name blurring is cosmetic: real names are currently sent to the browser. This must be replaced with server-side identity projection for the new community product.
- Registered network members and imported directory entries are different entities. Only a registered member can receive an in-app introduction. An imported email listing must not imply an active inbox.
- Network messages and role profiles already exist in SQLite; authentication uses Supabase.
- Existing chat permissions require a chat entitlement for sending; they do not implement the requested locked-inbox model.
- Entitlements can be granted by an administrator, but a paid subscription checkout and recurring billing lifecycle do not yet exist.
- Existing directory email introductions and contact unlock credits are separate purchase purposes.

## Proposed experience

Navigation: Home, Directory, Inbox, Profile. Subscription controls belong in Inbox and account settings.

Home: editorial news alongside community posts, with distinct source labels; filters for news, opportunities and discussion. Role labels and stable anonymous handles build continuity without publishing identities. Do not invent news or engagement metrics.

Composer: a clear post purpose, text, optional football context, and a preview of the anonymous identity. Comments use the same anonymity rules. Warn users when they voluntarily type contact information into public text.

Inbox: incoming request count and role breakdown for unsubscribed recipients; no name, avatar, body preview or revealing notification. Active subscribers can open and reply to individual introductions. Explain the access rules before the sender spends a credit.

Design direction: restrained dark green, ivory surfaces, strong typography, generous spacing, subtle 150–220 ms transitions, readable mobile cards and reduced-motion support. Avoid excessive blur, perpetual animation and ornamental dashboards.

## Decisions still needed

- Confirmed: agents/agencies pay $20 USD per month; players read/reply free and reveal identities for one introduction credit.
- Role matrix: whether agents may introduce themselves to agents and agencies to agencies; current discovery permits different roles only.
- Whether an introduction credit grants the sender ongoing replies in that conversation once the recipient accepts.
- On subscription expiry: lock all previously opened conversations or only new requests? Recommended: preserve previously unlocked message history; require active subscription for new replies if that remains the chosen product rule.
- News source/editorial workflow and initial language.
- Identity fields revealed after subscribing: professional display name and approved profile, without automatically disclosing email, phone, documents or date of birth.

## Delivery sequence and acceptance checks

1. Separate directory routing and update internal entry links, SEO and payment-return routes when the new home ships.
2. Build persisted posts/comments and server-side anonymous projections, ownership checks, report/block and moderation.
3. Implement credit-backed introductions transactionally; duplicate requests and retries must never double-charge.
4. Implement server-side inbox redaction and recipient subscription gates, including expired/revoked entitlement cases.
5. Integrate paid subscriptions with verified provider events, renewal, cancellation and expiry; never activate based on a browser success URL alone.
6. Finish feed/inbox design and responsive motion; validate keyboard and reduced-motion behavior.
7. Test with separate player, agent and agency accounts, including locked and unlocked recipients, blocking and existing guardian restrictions.

## Current delivery status

Home feed, separate directory, anonymous posts/comments, transactional introductions, player identity unlocks, role-aware inbox and professional subscription integration are implemented. Remote PayPal plan provisioning and authenticated sandbox payment/browser verification remain release prerequisites. See docs/COMMUNITY-REVIEW.md.
