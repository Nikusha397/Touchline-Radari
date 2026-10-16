-- One-time contact-credit bonus requested by the site owner.
-- The stable ledger key makes deployment retries harmless.
INSERT OR IGNORE INTO agent_ledger (id,user_id,delta,purpose,reason,created_at)
VALUES ('owner-bonus-9-59e68d11-20261015','59e68d11-0bd6-4bf3-909d-5dddb8f8216f',9,'unlock','Owner promotional contact credits',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
