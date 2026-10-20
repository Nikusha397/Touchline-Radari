CREATE TABLE network_aliases (
 user_id TEXT PRIMARY KEY REFERENCES network_profiles(user_id),
 public_id TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16))))
);
INSERT INTO network_aliases(user_id) SELECT user_id FROM network_profiles;
CREATE TABLE community_posts (
 id TEXT PRIMARY KEY, author TEXT NOT NULL REFERENCES network_profiles(user_id),
 kind TEXT NOT NULL CHECK(kind IN ('discussion','opportunity','news')),
 body TEXT NOT NULL, source_url TEXT NOT NULL DEFAULT '', hidden INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
CREATE INDEX community_posts_latest ON community_posts(hidden,created_at DESC,id);
CREATE TABLE community_comments (
 id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES community_posts(id),
 author TEXT NOT NULL REFERENCES network_profiles(user_id), body TEXT NOT NULL,
 hidden INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX community_comments_post ON community_comments(post_id,hidden,created_at,id);
CREATE TABLE network_introductions (
 thread_id TEXT PRIMARY KEY REFERENCES network_threads(id),
 sender TEXT NOT NULL REFERENCES network_profiles(user_id),
 recipient TEXT NOT NULL REFERENCES network_profiles(user_id),
 charge_id TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
 UNIQUE(sender,recipient), CHECK(sender<>recipient)
);
CREATE TABLE network_reads (
 thread_id TEXT NOT NULL REFERENCES network_threads(id), user_id TEXT NOT NULL,
 last_message INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(thread_id,user_id)
);

