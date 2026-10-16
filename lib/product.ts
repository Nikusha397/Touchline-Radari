import { setting } from './store';

export const PRICE = { minor: 2000, value: '20.00', currency: 'EUR', label: '€20' } as const;

export const POLICY_VERSION = '2026-10-15';

export const PROVIDED_PAYPAL_LINK = 'https://www.paypal.com/ncp/payment/N856YQZQJNXHQ';

export function authReady() { return !!setting('SUPABASE_URL') && !!setting('SUPABASE_PUBLISHABLE_KEY'); }

export function purchasesReady() {

  return authReady() && setting('PAYMENTS_ENABLED') === 'true' && setting('PAYPAL_MODE')==='live'

    && !!setting('PAYPAL_CLIENT_ID') && !!setting('PAYPAL_CLIENT_SECRET')

    && !!setting('PAYPAL_WEBHOOK_ID') && !!setting('PAYPAL_MERCHANT_ID');

}

export function safeNext(value:unknown) {

  return typeof value==='string' && value.startsWith('/') && !value.startsWith('//')

    && !/[\\\r\n]/.test(value) && value.length<500 ? value : '/';

}

export function siteOrigin() {

  const origin=setting('SITE_ORIGIN');

  if (!origin || new URL(origin).protocol!=='https:') throw Error('Site origin is not configured.');

  return new URL(origin).origin;

}
