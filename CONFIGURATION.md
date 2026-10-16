# Runtime configuration

The Next.js application reads process.env, including .env.local in development. Copy .env.example to .env.local and supply real service values privately. The existing hosted Sites environment is separate and its secrets were not exported.

| Variable | Purpose | Where to obtain/set it |
| --- | --- | --- |
| SITE_ORIGIN | Canonical site origin, currently https://touchlineradar.com | Hosting environment; coordinate callback/domain changes |
| SUPABASE_URL | Authentication project API URL | Supabase project settings |
| SUPABASE_PUBLISHABLE_KEY | Public client key used by server-side auth client | Supabase API keys; this is not a service-role key |
| GOOGLE_AUTH_ENABLED | Shows Google signup when true | Hosting environment, with provider already configured in Supabase |
| PAYMENTS_ENABLED | Enables the configured live payment flow when true | Hosting environment; keep false during incomplete setup |
| PAYPAL_MODE | Current application purchase gate expects live | Hosting environment; staging needs a deliberately reviewed sandbox setup |
| PAYPAL_CLIENT_ID | PayPal application identifier | PayPal developer application; saved as a secret on the current host |
| PAYPAL_CLIENT_SECRET | Server-only PayPal credential | PayPal developer application, server secret store |
| PAYPAL_MERCHANT_ID | Validates the expected payment recipient | PayPal merchant account, server secret store |
| PAYPAL_WEBHOOK_ID | Verifies incoming PayPal webhook signatures | PayPal app's webhook configuration, server secret store |
| RESEND_API_KEY | Sends introduction emails | Resend, server secret store |
| MAIL_FROM | Sender, currently TOUCHLINE Radar <introductions@mail.touchlineradar.com> | Hosting environment; authenticated sending domain in Resend |
| RADAR_SERVICE_TOKEN | Internal support access and rate-limit hashing secret | Existing hosting secret store; generate separately for a new environment |
| SELLER_NAME | Public seller name | Hosting environment |
| SUPPORT_EMAIL | Public support address, contact@touchlineradar.com | Hosting environment and mailbox provider |

No active Stripe configuration was listed. Old Stripe/trial code exists for historical compatibility, while retired routes return 410. Do not enable it by adding random credentials.

The Node.js runtime uses DATABASE_PATH (default .data/touchline.sqlite) and UPLOADS_PATH (default .data/uploads). Both need persistent storage in production. TRUSTED_CLIENT_IP_HEADER optionally names a single-IP header overwritten by your trusted reverse proxy. Existing D1/R2 data requires an explicit migration before switching production.

Google OAuth credentials are configured in Google Cloud project `touchline-radar` and in Supabase's Google provider settings. They are not supplied by GOOGLE_AUTH_ENABLED. The current Supabase callback is `https://sdudyygdolyrkvwqbczd.supabase.co/auth/v1/callback`; website return routes are under `/auth/callback`. Keep the allowed site origins and redirect URLs aligned when moving domains.

The existing PayPal webhook endpoint is `https://touchlineradar.com/api/paypal/webhook`. PayPal return-page verification uses `/api/agent/paypal/capture` through the site's API. Webhook messages verify completed payments; they do not initiate another collection. A new host/app needs its matching webhook and secrets before payments are enabled.

Custom domains `touchlineradar.com` and `www.touchlineradar.com` were both active with active TLS in Sites at inspection. The `www` and old hosted aliases redirect to the canonical root in proxy.ts. DNS, Resend SPF/DKIM/DMARC records and Google ownership records are external configuration; source upload alone does not recreate them.

Supabase email confirmation/provider settings, CAPTCHA or abuse settings, SMTP credentials, the Google consent screen, PayPal account eligibility and Resend DNS verification are dashboard settings, not automatically recreated by npm install. This export does not claim those dashboards were all re-audited.
