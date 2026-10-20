# Third-party services and design references

Community implementation reviewed 2026-10-19. No new runtime packages were installed.

| Service/reference | Use and data | Status |
| --- | --- | --- |
| Supabase Auth | Existing email authentication and session cookies; identity remains server-side | Existing dependency; no new external integration |
| PayPal REST | Checkout and subscription identifiers, configured merchant plan, payment verification; customer payment details entered on PayPal | Existing provider extended; disabled without configuration |
| Resend | Existing player email introductions, player profile/CV sent only through the existing explicit send flow | Existing service; no new automatic messages |
| Google Fonts CDN | Previously requested from root layout | Removed; local fonts used |
| Cloudflare Web Analytics beacon | Previously requested on selected public pages | Disabled; no optional tracking script loaded |
| News source links | User-selected HTTPS outbound links, opened with noreferrer | No embed, server-side fetch or scraper |
| Radix Primitives design guidance | Reviewed accessibility-first behavior and keyboard/focus guidance; no source copied and no package installed | MIT reference: https://github.com/radix-ui/primitives/blob/main/philosophy.md and https://github.com/radix-ui/primitives/blob/main/LICENSE |

The new community layout uses original CSS, the existing self-hosted Manrope font, semantic native controls and native dialog focus management. It adds no image/CDN dependency.

Provider docs consulted: https://developer.paypal.com/api/subscriptions/v1 and https://developer.paypal.com/subscriptions/integrate .

Landing update (20 October 2026): reused local Manrope and original CSS illustrations. Reviewed Radix Primitives MIT guidance and Supabase SSR documentation; no source copied or package installed. Existing axe-core 4.11.4 (MPL-2.0) was used in a temporary local audit route, removed after testing; it is not shipped in the landing bundle.
