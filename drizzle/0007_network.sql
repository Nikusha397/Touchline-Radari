CREATE TABLE network_profiles (
 user_id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('player','agent','agency')),
 name TEXT NOT NULL, dob TEXT NOT NULL, country TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '',
 evidence_url TEXT NOT NULL DEFAULT '', official_status TEXT NOT NULL DEFAULT 'unverified',
 identity_status TEXT NOT NULL DEFAULT 'unverified', guardian_status TEXT NOT NULL DEFAULT 'not_required',
 listed INTEGER NOT NULL DEFAULT 0, directory_id TEXT UNIQUE, created_at TEXT NOT NULL
);
CREATE TABLE network_reviews (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, destination TEXT NOT NULL,
 stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5), comment TEXT NOT NULL,
 hidden INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(user_id,destination)
);
CREATE INDEX network_reviews_destination ON network_reviews(destination,hidden);
CREATE TABLE network_entitlements (user_id TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
CREATE TABLE network_threads (
 id TEXT PRIMARY KEY, member_a TEXT NOT NULL REFERENCES network_profiles(user_id),
 member_b TEXT NOT NULL REFERENCES network_profiles(user_id), created_at TEXT NOT NULL,
 UNIQUE(member_a,member_b), CHECK(member_a < member_b)
);
CREATE TABLE network_messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT, thread_id TEXT NOT NULL REFERENCES network_threads(id),
 sender TEXT NOT NULL REFERENCES network_profiles(user_id), body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX network_messages_thread ON network_messages(thread_id,id);
CREATE TABLE network_blocks (owner TEXT NOT NULL, target TEXT NOT NULL, PRIMARY KEY(owner,target));
CREATE TABLE network_reports (id TEXT PRIMARY KEY, reporter TEXT NOT NULL, kind TEXT NOT NULL, target TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE network_verifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES network_profiles(user_id),
 kind TEXT NOT NULL CHECK(kind IN ('identity','official','guardian')), status TEXT NOT NULL DEFAULT 'pending',
 evidence TEXT NOT NULL, photo_key TEXT, id_key TEXT, created_at TEXT NOT NULL,
 reviewed_by TEXT, reviewed_at TEXT, reason TEXT
);
CREATE UNIQUE INDEX network_pending_verification ON network_verifications(user_id,kind) WHERE status='pending';
CREATE TABLE network_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL);
