import { database, setting } from './store';
export class RequestTooLarge extends Error {constructor(){super('Request too large.')}}
export async function bodyBytes(request:Request,limit:number):Promise<Uint8Array<ArrayBuffer>> {
  if(Number(request.headers.get('content-length'))>limit)throw new RequestTooLarge();
  const reader=request.body?.getReader();if(!reader)return new Uint8Array(0);
  const chunks:Uint8Array[]=[];let size=0;
  try {while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new RequestTooLarge();}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
export async function bodyText(request:Request,limit:number){return new TextDecoder().decode(await bodyBytes(request,limit));}
export function constantEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
export async function rateLimit(request:Request,scope:string,limit:number,seconds=3600,identity?:string) {
  // Only trust a header that the deployment's reverse proxy overwrites.
  const ipHeader=setting('TRUSTED_CLIENT_IP_HEADER');
  const ip=(ipHeader ? request.headers.get(ipHeader)?.trim() : undefined) || 'unavailable';
  const raw=scope+':'+(identity||ip)+':'+setting('RADAR_SERVICE_TOKEN');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
  const key=Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const now=Math.floor(Date.now()/1000),reset=now+seconds,db=database();
  const results=await db.batch([
    db.prepare('DELETE FROM rate_limits WHERE reset_at<?').bind(now-86400),
    db.prepare('INSERT INTO rate_limits(key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END').bind(key,reset,now,now,reset),
    db.prepare('SELECT count FROM rate_limits WHERE key=?').bind(key),
  ]);
  return Number((results[2].results[0] as {count:number})?.count||limit+1)<=limit;
}
