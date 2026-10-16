import {withLivePortfolios} from './portfolio-feed.server';
import { chargeContactUnlock } from './contact-unlock';
import { publicId, projectRecipient, quoteFor } from './directory-catalog.server';
import { nodeRuntime } from './node-storage';

import directory from "./directory.server.json";

import { getAuthUser } from "./auth";
import {bodyText,RequestTooLarge} from './security';
import { introductionEmail } from './introduction-email';

import { bundles, emptyPlayer, profileReady, type Player, type Recipient, type CreditPurpose } from "./agent-product";

type PrivateRecipient = Recipient & { email: string[]; phone: string[] };

export const entries = directory as PrivateRecipient[];

export const runtime = nodeRuntime;

export class Problem extends Error {constructor(public status:number, message:string){super(message)}}

export const now=()=>new Date().toISOString();

export async function owner() {const u=await getAuthUser();if(!u)throw new Problem(401,"Please sign in to continue.");return {...u,fullName:u.displayName};}

export function db() {if(!runtime.DB)throw new Problem(503,"Profile storage is unavailable. Please try again later.");return runtime.DB;}

export function json(v:unknown,status=200){return new Response(JSON.stringify(v),{status,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}})}

export function sameOrigin(req:Request){if(req.headers.get("origin")!==new URL(req.url).origin)throw new Problem(403,"Please use the website to complete this action.");}

export async function readJSON(req:Request){if(!req.headers.get("content-type")?.includes("application/json"))throw new Problem(415,"JSON required.");let raw:string;try{raw=await bodyText(req,30000);}catch(e){if(e instanceof RequestTooLarge)throw new Problem(413,'Request too large.');throw e;}try{return JSON.parse(raw)}catch{throw new Problem(400,"Invalid request.")}}

export function recipient(id:string){const r=entries.find(x=>publicId(x.id)===id);if(!r)throw new Problem(404,"This recipient is unavailable.");return r;}

export function publicRecipient(r:PrivateRecipient, unlocked=false){return projectRecipient(r,unlocked);}

export async function profile(userId:string){const row=await db().prepare("SELECT data FROM agent_profiles WHERE user_id=?").bind(userId).first<{data:string}>();if(!row)return null;const {dob:previousDateOfBirth,...player}=JSON.parse(row.data);return player as Player;}

export async function balance(userId:string,purpose:CreditPurpose='unlock'){const r=await db().prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM agent_ledger WHERE user_id=? AND purpose=?").bind(userId,purpose).first<{balance:number}>();return r?.balance||0;}

export function validateProfile(value:any):Player {

  const p={...emptyPlayer};

  for(const k of Object.keys(p) as (keyof Player)[]){if(typeof value[k]!=="string")throw new Problem(400,"Please complete the player profile.");p[k]=value[k].trim();if(p[k].length>(k==='bio'?1800:300))throw new Problem(400,"A profile field is too long.");}





  if(!profileReady(p))throw new Problem(400,"Complete your name, nationality and position.");

  const positions=['Goalkeeper','Centre-back','Full-back','Wing-back','Defensive midfielder','Central midfielder','Attacking midfielder','Winger','Striker'];

  if(!positions.includes(p.position))throw new Problem(400,"Choose a playing position.");

  for(const k of ['transfermarkt','video'] as const){if(p[k]){let u:URL;try{u=new URL(p[k]);}catch{throw new Problem(400,"Add a valid link starting with https://.");}if(!['http:','https:'].includes(u.protocol))throw new Problem(400,"Add a valid website link.");}}

  if(p.height&&(!/^\d{2,3}$/.test(p.height)||Number(p.height)<100||Number(p.height)>250))throw new Problem(400,"Enter your height in centimetres.");

  return p;

}

export async function requireProfile(userId:string){const p=await profile(userId);if(!p||!profileReady(p))throw new Problem(400,"Save your player profile before continuing.");return p;}

export async function contacts(userId:string,id:string){if(await balance(userId)<0)throw new Problem(403,"Resolve the refunded credit balance before accessing contacts.");const r=recipient(id);const unlocked=await db().prepare("SELECT id FROM agent_unlocks WHERE user_id=? AND recipient_id=?").bind(userId,r.destinationKey).first();if(!unlocked)throw new Problem(403,"Unlock this contact first.");return {email:r.email,phone:r.phone,recipient:(await withLivePortfolios([publicRecipient(r,true)]))[0]};}

export async function unlock(userId:string,id:string,expectedCredits:unknown){

  const r=recipient(id);const key=userId+":"+r.destinationKey;
  const existing=await db().prepare("SELECT id FROM agent_unlocks WHERE id=?").bind(key).first();
  if(existing)return {contacts:await contacts(userId,id),credits:await balance(userId)};
  const cost=quoteFor(r).credits;
  if(expectedCredits!==cost)throw new Problem(409,"The unlock price has changed. Refresh the directory and review the current price.");

  if(!await chargeContactUnlock(db(),userId,r.destinationKey,cost,now()))throw new Problem(402,`You need ${cost} contact credits. Choose a credit bundle to continue.`);

  return {contacts:await contacts(userId,id),credits:await balance(userId)};

}

export async function sendProfile(userId:string,email:string,id:string,message:string){

  await requireProfile(userId);const r=recipient(id);

  if(!runtime.RESEND_API_KEY||!runtime.MAIL_FROM)throw new Problem(503,"Email delivery is not connected in this private preview. Your message has not been sent.");

  if(typeof message!=='string'||message.trim().length<40||message.length>8000)throw new Problem(400,"Write a message between 40 and 8,000 characters.");

  const existing=await db().prepare("SELECT * FROM agent_submissions WHERE user_id=? AND destination_key=?").bind(userId,r.destinationKey).first<any>();

  if(existing?.status==='sent')throw new Problem(409,"You have already sent your profile to this agency.");

  if(existing?.status==='pending')throw new Problem(409,"This submission is already being processed. Check your activity before trying again.");

  const fs=await db().prepare("SELECT * FROM agent_files WHERE user_id=? ORDER BY created_at").bind(userId).all<any>();

  const attachments=[];

  for(const f of fs.results){const object=await runtime.BUCKET.get('players/'+userId+'/'+f.id);if(!object)throw new Problem(503,"A player document is unavailable. Re-upload it before sending.");const bytes=new Uint8Array(await object.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.slice(i,i+8192));attachments.push({filename:f.name,content:btoa(binary)});}

  const subId=existing?.id||crypto.randomUUID();const attempt=crypto.randomUUID();const chargeId='introduction:'+attempt;const created=now();

  await db().batch([

    db().prepare("INSERT OR IGNORE INTO agent_ledger (id,user_id,delta,purpose,reason,created_at) SELECT ?,?,-1,'introduction','player introduction',? WHERE (SELECT COALESCE(SUM(delta),0) FROM agent_ledger WHERE user_id=? AND purpose='introduction')>=1 AND NOT EXISTS (SELECT 1 FROM agent_submissions WHERE user_id=? AND destination_key=? AND status IN ('sent','pending'))").bind(chargeId,userId,created,userId,userId,r.destinationKey),

    db().prepare("INSERT OR IGNORE INTO agent_submissions (id,user_id,destination_key,recipient_id,recipient_name,status,created_at,charge_id) SELECT ?,?,?,?,?,'pending',?,? WHERE EXISTS (SELECT 1 FROM agent_ledger WHERE id=?)").bind(subId,userId,r.destinationKey,r.id,r.name,created,chargeId,chargeId),

    db().prepare("UPDATE agent_submissions SET status='pending',created_at=?,charge_id=? WHERE id=? AND status='failed' AND EXISTS (SELECT 1 FROM agent_ledger WHERE id=?)").bind(created,chargeId,subId,chargeId),

  ]);

  const reserved=await db().prepare('SELECT charge_id,status FROM agent_submissions WHERE id=?').bind(subId).first<{charge_id:string;status:string}>();

  if(reserved?.charge_id!==chargeId){if(reserved&&['sent','pending'].includes(reserved.status))throw new Problem(409,'This agency introduction is already being processed or was sent.');throw new Problem(402,'You need one introduction credit. Introductions cost $0.50 each.');}

  const p=await profile(userId);

  const content=introductionEmail(p!,message,subId);
  let response:Response;try{response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+runtime.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':attempt},body:JSON.stringify({from:runtime.MAIL_FROM,to:[r.email[0]],reply_to:email,...content,attachments})});}catch{throw new Problem(503,"Delivery is being checked. Check your activity before trying again.");}

  if(!response.ok){

    if(response.status>=400&&response.status<500&&![408,409].includes(response.status)){

      await db().batch([

        db().prepare("INSERT OR IGNORE INTO agent_ledger (id,user_id,delta,purpose,reason,created_at) SELECT ?,?,1,'introduction','delivery rejected',? WHERE EXISTS (SELECT 1 FROM agent_ledger WHERE id=? AND delta=-1)").bind('refund:'+chargeId,userId,now(),chargeId),

        db().prepare("UPDATE agent_submissions SET status='failed' WHERE id=? AND charge_id=?").bind(subId,chargeId),

      ]);

      throw new Problem(502,'The provider rejected this email. Your introduction credit was returned.');

    }

    throw new Problem(503,'Delivery is being checked. Your credit is reserved; this message will not be sent twice.');

  }

  const result=await response.json() as {id:string};await db().prepare("UPDATE agent_submissions SET status='sent',provider_id=? WHERE id=?").bind(result.id,subId).run();return {accepted:true};

}

