import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {ApplicationDatabase,migrate} from '../lib/node-storage.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('.')&&!path.extname(specifier)&&context.parentURL?.endsWith('.ts')){const candidate=new URL(specifier+'.ts',context.parentURL);if(existsSync(fileURLToPath(candidate)))return next(candidate.href,context);}return next(specifier,context)}});
const {ageAt,dobSchema,passwordSchema,overallRating,chatEligible}=await import('../lib/network-policy.ts');
const {saveNetworkProfile,writeReview,reviews,createThread,sendMessage,threadAccess}=await import('../lib/network-service.ts');
function fixture(){const connection=new DatabaseSync(':memory:');connection.exec('PRAGMA foreign_keys=ON');migrate(connection,path.resolve('drizzle'));return new ApplicationDatabase(connection)}
async function person(db,id,role='player',dob='1990-01-01'){await saveNetworkProfile(db,id,{role,name:'Test '+id,dob,country:'Georgia',bio:'',evidenceUrl:'',listed:true})}
test('age validates calendar dates and 16th birthday; passwords reject weak input',()=>{
 assert.equal(ageAt('2010-10-17',new Date('2026-10-16')),15);
 assert.equal(ageAt('2010-10-16',new Date('2026-10-16')),16);
 assert.ok(Number.isNaN(ageAt('2010-02-30')));
 assert.equal(dobSchema.safeParse('2020-01-01').success,false);
 assert.equal(passwordSchema.safeParse('aaaaaaaaaaaa').success,false);
 assert.equal(passwordSchema.safeParse('a long password 123!').success,true);
});
test('overall rejects missing, future, stale, inconsistent data; verified metrics produce bounded score',()=>{
 const now=Date.parse('2026-10-16T00:00:00Z'),p={players:100,topTierPlayers:50,marketValueEur:100000000,verified:true,sourceName:'Test fixture',sourceUrl:'https://example.org/source',checkedAt:'2026-10-15T00:00:00Z'};
 assert.equal(overallRating({},now),null);assert.equal(overallRating({...p,verified:false},now),null);
 assert.equal(overallRating({...p,topTierPlayers:101},now),null);
 assert.equal(overallRating({...p,checkedAt:'2025-01-01T00:00:00Z'},now),null);
 assert.equal(overallRating({...p,checkedAt:'2027-01-01T00:00:00Z'},now),null);
 const score=overallRating(p,now).score;assert.ok(score>=1&&score<=5);assert.equal(score*2,Math.round(score*2));
});
test('reviews require unlock, are unique/editable, exclude hidden reviews and reject self-reviews',async()=>{
 const db=fixture();try{await person(db,'player');const value={stars:4,comment:'Helpful professional communication.',experience:true};
 await assert.rejects(writeReview(db,'player','destination',value),/Unlock/);
 await db.prepare('INSERT INTO agent_unlocks VALUES (?,?,?,?)').bind('unlock','player','destination',new Date().toISOString()).run();
 await writeReview(db,'player','destination',value);await writeReview(db,'player','destination',{...value,stars:5});
 assert.equal((await reviews(db,'destination')).summary.count,1);assert.equal((await reviews(db,'destination')).summary.average,5);
 await db.prepare('UPDATE network_reviews SET hidden=1').run();await writeReview(db,'player','destination',value);assert.equal((await reviews(db,'destination')).summary.count,0);
 await db.prepare("UPDATE network_profiles SET directory_id='destination' WHERE user_id='player'").run();await assert.rejects(writeReview(db,'player','destination',value),/own listing/);
 }finally{db.connection.close()}
});
test('chat requires registered official peers and subscription, restricts reads and respects blocking/expiry',async()=>{
 const db=fixture();try{await person(db,'player');await person(db,'agent','agent');await person(db,'outsider');
 await assert.rejects(createThread(db,'player','agent'),/Official/);
 await db.prepare("UPDATE network_profiles SET official_status='approved' WHERE user_id='agent'").run();
 await assert.rejects(createThread(db,'player','agent'),/subscription/);
 await db.prepare('INSERT INTO network_entitlements VALUES (?,?)').bind('player','2099-01-01T00:00:00Z').run();
 const thread=await createThread(db,'player','agent');assert.equal((await createThread(db,'player','agent')).id,thread.id);
 await sendMessage(db,'player',thread.id,'Hello');await assert.rejects(threadAccess(db,'outsider',thread.id),/not found/);
 await assert.rejects(sendMessage(db,'agent',thread.id,'Hello'),/subscription/);
 await db.prepare("UPDATE network_entitlements SET expires_at='2000-01-01T00:00:00Z'").run();await assert.rejects(sendMessage(db,'player',thread.id,'Hello'),/subscription/);
 await db.prepare("INSERT INTO network_blocks VALUES ('agent','player')").run();await assert.rejects(threadAccess(db,'player',thread.id),/unavailable/);
 }finally{db.connection.close()}
});
test('minor profiles need guardian approval; users cannot self-verify or change age/role',async()=>{
 const db=fixture();try{const now=new Date(),dob=`${now.getUTCFullYear()-16}-01-01`;await person(db,'minor','player',dob);
 const row=await db.prepare("SELECT * FROM network_profiles WHERE user_id='minor'").first();assert.equal(chatEligible(row),false);
 await assert.rejects(saveNetworkProfile(db,'minor',{role:'agent',name:'Test minor',dob:'1990-01-01',country:'Georgia',bio:'',evidenceUrl:'',listed:true}),/support/);
 await saveNetworkProfile(db,'minor',{role:'player',name:'Test minor',dob,country:'Georgia',bio:'',evidenceUrl:'',listed:true,identity_status:'approved',guardian_status:'approved'});
 const unchanged=await db.prepare("SELECT * FROM network_profiles WHERE user_id='minor'").first();assert.equal(unchanged.identity_status,'unverified');assert.equal(unchanged.guardian_status,'pending');
 await db.prepare("UPDATE network_profiles SET guardian_status='approved' WHERE user_id='minor'").run();assert.equal(chatEligible(await db.prepare("SELECT * FROM network_profiles WHERE user_id='minor'").first()),true);
 }finally{db.connection.close()}
});

test('private evidence is encrypted, strips source metadata, and rejects unsupported or tampered files',async()=>{
 const {mkdtemp,readFile,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {randomBytes}=await import('node:crypto');const sharp=(await import('sharp')).default;
 const root=await mkdtemp(path.join(tmpdir(),'touchline-verification-'));const oldPath=process.env.UPLOADS_PATH,oldKey=process.env.VERIFICATION_ENCRYPTION_KEY;
 process.env.UPLOADS_PATH=root;process.env.VERIFICATION_ENCRYPTION_KEY=randomBytes(32).toString('hex');
 try{const {storeEvidence,readEvidence}=await import('../lib/verification-storage.ts');const png=await sharp({create:{width:10,height:10,channels:3,background:'#123456'}}).png().toBuffer();
 await storeEvidence('verification/test/photo',png.toString('base64'));const encrypted=await readFile(path.join(root,'verification/test/photo'));assert.notDeepEqual(encrypted.subarray(0,8),png.subarray(0,8));
 const decrypted=await readEvidence('verification/test/photo');assert.equal((await sharp(decrypted).metadata()).format,'jpeg');
 await assert.rejects(storeEvidence('verification/test/svg',Buffer.from('<svg>invalid image</svg>').toString('base64')),/JPEG or PNG/);
 encrypted[20]^=1;await writeFile(path.join(root,'verification/test/photo'),encrypted);await assert.rejects(readEvidence('verification/test/photo'));
 }finally{if(oldPath===undefined)delete process.env.UPLOADS_PATH;else process.env.UPLOADS_PATH=oldPath;if(oldKey===undefined)delete process.env.VERIFICATION_ENCRYPTION_KEY;else process.env.VERIFICATION_ENCRYPTION_KEY=oldKey;await rm(root,{recursive:true,force:true})}
});

test('Overall value baseline with zero players uses half-star tiers and caps at five',()=>{
 const now=Date.parse('2026-10-16T00:00:00Z');
 const source={players:0,verified:true,sourceName:'Test fixture',sourceUrl:'https://example.org/source',checkedAt:'2026-10-15T00:00:00Z'};
 for(const [value,expected] of [[0,1],[16000000,1],[24000000,1.5],[32000000,2],[48000000,3],[64000000,4],[72000000,4.5],[79999999,4.5],[80000000,5],[2000000000,5]])assert.equal(overallRating({...source,marketValueEur:value},now)?.score,expected);
 assert.equal(overallRating(source,now),null);
 assert.equal(overallRating({...source,marketValueEur:-1},now),null);
});

test('Overall adds half a star per complete 15 players and requires both inputs',()=>{
 const now=Date.parse('2026-10-16T00:00:00Z');
 const source={verified:true,marketValueEur:32000000,sourceName:'Test fixture',sourceUrl:'https://example.org/source',checkedAt:'2026-10-15T00:00:00Z'};
 for(const [players,expected] of [[0,2],[14,2],[15,2.5],[29,2.5],[30,3],[60,4],[90,5],[150,5]])assert.equal(overallRating({...source,players},now)?.score,expected);
 assert.equal(overallRating({...source,marketValueEur:8000000,players:15},now)?.score,1.5);
 assert.equal(overallRating({...source,marketValueEur:80000000,players:15},now)?.score,5);
 assert.equal(overallRating(source,now),null);
 assert.equal(overallRating({...source,players:-1},now),null);
 assert.equal(overallRating({...source,players:15.5},now),null);
});
