import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {ApplicationDatabase,migrate} from '../lib/node-storage.ts';
import {chargeContactUnlock} from '../lib/contact-unlock.ts';

test('priced contact unlock charges once, keeps legacy access, and isolates balances',async()=>{
  const connection=new DatabaseSync(':memory:');migrate(connection,path.resolve('drizzle'));const db=new ApplicationDatabase(connection);
  const now='2026-10-16T00:00:00Z';
  connection.prepare("INSERT INTO agent_ledger(id,user_id,delta,purpose,reason,created_at) VALUES ('seed','owner',5,'unlock','test',?)").run(now);
  connection.prepare("INSERT INTO agent_ledger(id,user_id,delta,purpose,reason,created_at) VALUES ('intro','other',20,'introduction','test',?)").run(now);
  assert.equal(await chargeContactUnlock(db,'owner','agency',3,now),true);
  assert.equal(await chargeContactUnlock(db,'owner','agency',4,now),true);
  assert.equal((await db.prepare("SELECT SUM(delta) AS n FROM agent_ledger WHERE user_id='owner'").first()).n,2);
  assert.equal(await chargeContactUnlock(db,'owner','second',3,now),false);
  assert.equal(await chargeContactUnlock(db,'other','agency',1,now),false);
  connection.prepare('INSERT INTO agent_unlocks(id,user_id,recipient_id,created_at) VALUES (?,?,?,?)').run('owner:legacy','owner','legacy',now);
  assert.equal(await chargeContactUnlock(db,'owner','legacy',4,now),true);
  assert.equal((await db.prepare("SELECT SUM(delta) AS n FROM agent_ledger WHERE user_id='owner'").first()).n,2);
  connection.close();
});
