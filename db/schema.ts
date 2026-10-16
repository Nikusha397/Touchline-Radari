export * from './network-schema';
import { sqliteTable, text, integer, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export * from './agent-schema';

export const trials = sqliteTable('trials', {
  id: text('id').primaryKey(), publicJson: text('public_json').notNull(), detailJson: text('detail_json').notNull(),
  sourceUrl: text('source_url').notNull(), checkedAt: text('checked_at').notNull(),
  state: text('state').notNull().default('listed'), evidence: text('evidence').notNull(),
});
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(), email: text('email').notNull(), name: text('name').notNull(), createdAt: text('created_at').notNull(),
});
export const entitlements = sqliteTable('entitlements', {
  userId: text('user_id').notNull(), trialId: text('trial_id').notNull(), orderId: text('order_id').notNull(), purchasedAt: text('purchased_at').notNull(),
}, t => [primaryKey({ columns: [t.userId, t.trialId] })]);
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), trialId: text('trial_id').notNull(),
  sessionId: text('session_id'), sessionUrl: text('session_url'), paymentIntent: text('payment_intent'),
  status: text('status').notNull(), createdAt: text('created_at').notNull(),
  provider: text('provider').notNull().default('stripe'), amount: integer('amount').notNull().default(10000),
  currency: text('currency').notNull().default('USD'), consentVersion: text('consent_version'), consentAt: text('consent_at'),
}, t => [uniqueIndex('orders_session').on(t.sessionId), uniqueIndex('orders_pending_user_trial').on(t.userId, t.trialId).where(sql`${t.status} = 'pending'`), index('orders_user').on(t.userId)]);
export const refreshRuns = sqliteTable('refresh_runs', {
  id: text('id').primaryKey(), startedAt: text('started_at').notNull(), completedAt: text('completed_at'), resultJson: text('result_json'),
});
export const supportTickets = sqliteTable('support_tickets', {
  id: text('id').primaryKey(), userId: text('user_id'), email: text('email').notNull(),
  subject: text('subject').notNull(), message: text('message').notNull(), orderId: text('order_id'),
  status: text('status').notNull().default('open'), createdAt: text('created_at').notNull(),
});
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(), count: integer('count').notNull(), resetAt: integer('reset_at').notNull(),
});
export const agreements = sqliteTable('agreements', {
  userId: text('user_id').notNull(), kind: text('kind').notNull(), version: text('version').notNull(),
  agreedAt: text('agreed_at').notNull(),
}, t => [primaryKey({columns:[t.userId,t.kind,t.version]})]);
export const paymentEvents = sqliteTable('payment_events', {
  id: text('id').primaryKey(), type: text('type').notNull(), processedAt: text('processed_at').notNull(),
});
