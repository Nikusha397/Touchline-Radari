import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ApplicationDatabase, migrate, PrivateBucket } from '../lib/node-storage.ts';

test('schema migrations are repeatable and do not award historical credits', () => {
  const connection = new DatabaseSync(':memory:');
  migrate(connection, path.resolve('drizzle'));
  migrate(connection, path.resolve('drizzle'));
  assert.equal(connection.prepare('SELECT COUNT(*) AS n FROM agent_ledger').get().n, 0);
  assert.ok(connection.prepare('PRAGMA table_info(agent_orders)').all().some(row => row.name === 'capture_attempted_at'));
  connection.close();
});
test('batches return SELECT rows and roll back all writes on failure', async () => {
  const connection = new DatabaseSync(':memory:');
  const db = new ApplicationDatabase(connection);
  connection.exec('CREATE TABLE credits(id TEXT PRIMARY KEY, balance INTEGER)');
  const results = await db.batch([db.prepare('INSERT INTO credits VALUES (?,?)').bind('a', 2), db.prepare('SELECT balance FROM credits')]);
  assert.equal(results[0].meta.changes, 1);
  assert.equal(results[1].results[0].balance, 2);
  await assert.rejects(db.batch([db.prepare('UPDATE credits SET balance=1'), db.prepare("INSERT INTO credits VALUES ('a', 5)")]));
  assert.equal((await db.prepare('SELECT balance FROM credits').first()).balance, 2);
  connection.close();
});
test('private files round trip, delete, and reject traversal', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'touchline-storage-'));
  try {
    const bucket = new PrivateBucket(root);
    const data = new TextEncoder().encode('%PDF-test');
    await bucket.put('players/user/file', data.buffer);
    assert.deepEqual(new Uint8Array(await (await bucket.get('players/user/file')).arrayBuffer()), data);
    await assert.rejects(bucket.get('../outside'));
    await assert.rejects(bucket.get('players\\outside'));
    await bucket.delete('players/user/file');
    assert.equal(await bucket.get('players/user/file'), null);
  } finally { await rm(root, { recursive: true, force: true }); }
});
