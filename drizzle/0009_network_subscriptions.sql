CREATE TABLE network_identity_unlocks (
 viewer TEXT NOT NULL REFERENCES network_profiles(user_id),
 target TEXT NOT NULL REFERENCES network_profiles(user_id),
 charge_id TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
 PRIMARY KEY(viewer,target)
);
CREATE TABLE network_subscriptions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES network_profiles(user_id),
 provider_id TEXT UNIQUE, plan_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 paid_until TEXT, revoked_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX network_subscriptions_user ON network_subscriptions(user_id,created_at DESC);
