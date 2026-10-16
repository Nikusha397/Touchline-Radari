import {portfolioSchema,overallRating} from './network-policy';
import {privateEntries,publicId} from './directory-catalog.server';
import type {Recipient} from './agent-product';
// The configured endpoint must be an authorised, curated provider adapter, not a scraped page.
let snapshot:Record<string,unknown>={},refreshAfter=0,pending:Promise<void>|undefined;
async function refresh(){
 const endpoint=process.env.PORTFOLIO_FEED_URL;if(!endpoint||Date.now()<refreshAfter)return;
 if(pending)return pending;
 pending=(async()=>{try{
 const url=new URL(endpoint);if(url.protocol!=='https:')throw Error('HTTPS required');
 const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),headers:process.env.PORTFOLIO_FEED_TOKEN?{Authorization:'Bearer '+process.env.PORTFOLIO_FEED_TOKEN}:{}});
 if(!response.ok||!response.body)throw Error('Feed unavailable');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();throw Error('Feed too large')}chunks.push(value)}}finally{reader.releaseLock()}
 const input=JSON.parse(Buffer.concat(chunks).toString('utf8')) as {records?:unknown[]};if(!Array.isArray(input.records)||input.records.length>5000)throw Error('Invalid feed');
 const known=new Set(privateEntries.map(r=>r.id)),next:Record<string,unknown>={};
 for(const row of input.records){if(!row||typeof row!=='object')throw Error('Invalid record');const id=(row as {entityId?:unknown}).entityId;const data=portfolioSchema.safeParse(row);if(typeof id!=='string'||!known.has(id)||!data.success||next[id])throw Error('Unmatched or invalid portfolio');next[id]=data.data}
 snapshot=next;refreshAfter=Date.now()+300000;
 }catch{refreshAfter=Date.now()+60000;/* Keep the previous checked snapshot; freshness rules still apply. */}finally{pending=undefined}})();
 return pending;
}
export async function withLivePortfolios(items:Recipient[]){await refresh();const mapped=new Map(privateEntries.map(r=>[publicId(r.id),r.id]));return items.map(r=>({...r,overall:overallRating(snapshot[mapped.get(r.id)||''])||r.overall||null}));}
