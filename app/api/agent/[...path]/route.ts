import {sortDirectoryByName} from '../../../../lib/directory-sort';
import {profile as networkProfile} from '../../../../lib/network-service';
import {guardianCleared} from '../../../../lib/network-policy';
import { publicDestination, publicId } from '../../../../lib/directory-catalog.server';
import { getAuthUser } from '../../../../lib/auth';
import {createAgentCheckout,captureAgentPayPal,agentPaymentsReady} from '../../../../lib/agent-payments';
import {bodyBytes,rateLimit,RequestTooLarge} from '../../../../lib/security';
import {isAdministrator} from '../../../../lib/admin';

import { entries, runtime, db, json, owner, publicRecipient, profile, balance, validateProfile, sameOrigin, readJSON, now, Problem, contacts, unlock, sendProfile, requireProfile } from "../../../../lib/agent-server";

export const dynamic='force-dynamic';

type Context={params:Promise<{path:string[]}>};

async function handle(req:Request,ctx:Context){try{

  const path=(await ctx.params).path.join('/');const url=new URL(req.url);

  if(path==='directory'&&req.method==='GET'){
    if(!await rateLimit(req,'agent-directory-minute',90,60)||!await rateLimit(req,'agent-directory-hour',1500,3600))throw new Problem(429,'Please slow down and try again shortly.');

    const viewer=await getAuthUser();
    const rights=viewer&&await balance(viewer.userId)>=0 ? await db().prepare('SELECT recipient_id FROM agent_unlocks WHERE user_id=?').bind(viewer.userId).all<{recipient_id:string}>() : {results:[]};
    const unlockedKeys=new Set(rights.results.map(x=>x.recipient_id));
    const kind=url.searchParams.get('kind')==='agent'?'agent':'agency';const all=entries.filter(x=>x.kind===kind).map(x=>publicRecipient(x,unlockedKeys.has(x.destinationKey)));

    const countries=Array.from(new Set(all.map(x=>x.country))).sort((a,b)=>a==='Unknown'?1:b==='Unknown'?-1:a.localeCompare(b));

    const q=(url.searchParams.get('q')||'').toLowerCase().trim();const country=url.searchParams.get('country')||'';
    if(q.length>120||country.length>100)throw new Problem(400,'Search is too long.');

    const filtered=all.filter(x=>(!country||x.country===country)&&(!q||(x.name+' '+x.agency+' '+x.country).toLowerCase().includes(q)));

    const page=Math.max(1,Math.min(1000,Math.floor(Number(url.searchParams.get('page'))||1)));

    const ranked=sortDirectoryByName(filtered);
    return json({items:ranked.slice((page-1)*18,page*18),total:filtered.length,countries,page,pages:Math.ceil(filtered.length/18),agencyCount:entries.filter(x=>x.kind==='agency').length,agentCount:entries.filter(x=>x.kind==='agent').length});

  }

  if(!await rateLimit(req,'agent-api',180,60))throw new Problem(429,'Too many requests. Please try again shortly.');
  const u=await owner();

  if(req.method!=='GET')sameOrigin(req);
  const limits:Record<string,[number,number]>={'profile':[60,3600],'unlock':[160,3600],'contacts':[240,3600],'send':[120,3600],'checkout':[20,3600],'paypal/capture':[60,3600],'files':[20,3600]};
  const scope=path.startsWith('files/')?'files':path;const limit=limits[scope];
  if(limit&&!await rateLimit(req,'agent-user:'+scope,...limit,u.userId))throw new Problem(429,'This action has reached its request limit. Please try again later.');

  if(path==='account'&&req.method==='GET'){

    const [p,credits,introCredits,files,unlocked,activity,pendingOrders]=await Promise.all([profile(u.userId),balance(u.userId),balance(u.userId,'introduction'),db().prepare("SELECT id,name,bytes,created_at FROM agent_files WHERE user_id=? ORDER BY created_at").bind(u.userId).all(),db().prepare("SELECT recipient_id FROM agent_unlocks WHERE user_id=?").bind(u.userId).all<{recipient_id:string}>(),db().prepare("SELECT id,recipient_id,recipient_name,status,created_at,destination_key FROM agent_submissions WHERE user_id=? ORDER BY created_at DESC LIMIT 200").bind(u.userId).all(),db().prepare("SELECT session_id,purpose,bundle,amount FROM agent_orders WHERE user_id=? AND status='pending' AND session_id IS NOT NULL ORDER BY created_at DESC LIMIT 10").bind(u.userId).all()]);

    return json({user:{name:u.fullName,email:u.email},isAdmin:await isAdministrator(),networkProfile:await networkProfile(db(),u.userId),profile:p,credits,introCredits,pendingOrders:pendingOrders.results,files:files.results,unlocked:credits>=0?unlocked.results.map(x=>publicDestination(x.recipient_id)):[],activity:activity.results.map(row=>{const a=row as {recipient_id:string;destination_key:string;recipient_name:string};const r=entries.find(x=>x.id===a.recipient_id);return {...row,recipient_id:r?publicId(r.id):'',destination_key:publicDestination(a.destination_key),recipient_name:r?publicRecipient(r,credits>=0&&unlocked.results.some(x=>x.recipient_id===r.destinationKey)).name:'Directory recipient'};}),deliveryReady:!!(runtime.RESEND_API_KEY&&runtime.MAIL_FROM),paymentsReady:agentPaymentsReady()});

  }

  if(path==='profile'&&req.method==='PUT'){const p=validateProfile(await readJSON(req));await db().prepare("INSERT INTO agent_profiles (user_id,email,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,data=excluded.data,updated_at=excluded.updated_at").bind(u.userId,u.email,JSON.stringify(p),now()).run();return json({saved:true,profile:p});}

  if(path==='contacts'&&req.method==='GET')return json(await contacts(u.userId,url.searchParams.get('id')||''));

  if(['unlock','checkout','send'].includes(path)&&req.method==='POST'){const np=await networkProfile(db(),u.userId);if(!np)throw new Problem(409,'Complete your role and age details in Network & chat first.');if(!guardianCleared(np))throw new Problem(403,'Guardian consent must be approved before contacting representatives or purchasing credits.');if(path==='send'&&np.role!=='player')throw new Problem(403,'Player introductions are available to player accounts. Use Network & chat for professional connections.');}

  if(path==='unlock'&&req.method==='POST'){const b=await readJSON(req);return json(await unlock(u.userId,b.id,b.expectedCredits));}

  if(path==='checkout'&&req.method==='POST'){const b=await readJSON(req);return json(await createAgentCheckout(u.userId,Number(b.credits),b.purpose==='introduction'?'introduction':'unlock',url.origin,b.method==='card'?'card':'paypal'));}

  if(path==='paypal/capture'&&req.method==='POST'){const b=await readJSON(req);return json(await captureAgentPayPal(u.userId,b.orderId,b.checkOnly!==true));}

  if(path==='send'&&req.method==='POST'){const b=await readJSON(req);return json(await sendProfile(u.userId,u.email,b.id,b.message));}

  if(path==='files'&&req.method==='POST'){

    await requireProfile(u.userId);

    if(!runtime.BUCKET)throw new Problem(503,"Document storage is unavailable.");

    if(Number(req.headers.get('content-length'))>6*1024*1024)throw new Problem(413,"Each PDF must be 5 MB or smaller.");

    const existing=await db().prepare("SELECT COUNT(*) AS count,COALESCE(SUM(bytes),0) AS total FROM agent_files WHERE user_id=?").bind(u.userId).first<{count:number,total:number}>();if(existing!.count>=3)throw new Problem(400,"You can attach up to three PDFs.");

    const bytes=await bodyBytes(req,6*1024*1024);const form=await new Response(bytes,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();const file=form.get('file');if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.pdf')||file.size>5*1024*1024||file.size<5)throw new Problem(400,"Upload a PDF up to 5 MB.");

    if(existing!.total+file.size>8*1024*1024)throw new Problem(400,"Your PDFs can total up to 8 MB.");const buf=await file.arrayBuffer();if(new TextDecoder().decode(buf.slice(0,5))!=='%PDF-')throw new Problem(400,"This file is not a PDF document.");

    const id=crypto.randomUUID();const name=file.name.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,100);const key='players/'+u.userId+'/'+id;

    await runtime.BUCKET.put(key,buf,{httpMetadata:{contentType:'application/pdf'}});

    try{const inserted=await db().prepare("INSERT INTO agent_files (id,user_id,name,bytes,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM agent_files WHERE user_id=?)<3 AND (SELECT COALESCE(SUM(bytes),0) FROM agent_files WHERE user_id=?)+?<=?").bind(id,u.userId,name,file.size,now(),u.userId,u.userId,file.size,8*1024*1024).run();if(!inserted.meta.changes)throw new Problem(400,"Your document limit has been reached. Remove a PDF before adding another.");}catch(e){await runtime.BUCKET.delete(key);throw e;}

    return json({id,name,bytes:file.size});

  }

  if(path.startsWith('files/')&&(req.method==='GET'||req.method==='DELETE')){

    const id=path.slice(6);const file=await db().prepare("SELECT * FROM agent_files WHERE id=? AND user_id=?").bind(id,u.userId).first<any>();if(!file)throw new Problem(404,"Document not found.");const key='players/'+u.userId+'/'+id;

    if(req.method==='DELETE'){await runtime.BUCKET.delete(key);await db().prepare("DELETE FROM agent_files WHERE id=? AND user_id=?").bind(id,u.userId).run();return json({deleted:true});}

    const object=await runtime.BUCKET.get(key);if(!object)throw new Problem(404,"Document not found.");return new Response(object.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${file.name}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'X-Frame-Options':'DENY'}});

  }

  throw new Problem(404,"Page not found.");

}catch(e){if(e instanceof RequestTooLarge)return json({error:'Request too large.'},413);if(e instanceof Problem)return json({error:e.message},e.status);console.error('TOUCHLINE request failed',e instanceof Error?e.name:'unknown');return json({error:'This action could not be completed. Please try again.'},500)}}

export const GET=handle;export const POST=handle;export const PUT=handle;export const DELETE=handle;

