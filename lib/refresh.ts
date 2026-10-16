import { database, ensureSeeds } from './store';
import { sourceHosts } from './seed';
function normalize(s:string){return s.replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#8217;|&rsquo;/g,"'").replace(/\s+/g,' ').trim().toLowerCase()}
export async function refreshSources(){
 await ensureSeeds();const db=database();const now=new Date().toISOString();
 const latest=await db.prepare('SELECT started_at FROM refresh_runs ORDER BY started_at DESC LIMIT 1').first<{started_at:string}>();if(latest&&Date.now()-Date.parse(latest.started_at)<300000)return {skipped:true,reason:'A recent refresh already ran.'};
 const id=crypto.randomUUID();await db.prepare('INSERT INTO refresh_runs(id,started_at) VALUES (?,?)').bind(id,now).run();
 const {results:rows}=await db.prepare('SELECT * FROM trials').all<any>();const urls=[...new Set<string>(rows.map(r=>r.source_url))];const result:any[]=[];
 for(const url of urls){try{
  const parsed=new URL(url);if(parsed.protocol!=='https:'||!sourceHosts.includes(parsed.hostname))throw Error('Source is outside the monitored registry.');
  const response=await fetch(url,{headers:{'User-Agent':'TouchlineTrialRadar/1.0','Accept':'text/html'},redirect:'manual',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Source returned '+response.status);
  const html=await response.text();if(html.length>2500000)throw Error('Source exceeds the collection limit.');
  const text=normalize(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '));
  for(const row of rows.filter(r=>r.source_url===url)){const evidence=JSON.parse(row.evidence) as string[],matches=evidence.every(e=>text.includes(normalize(e)));await db.prepare('UPDATE trials SET checked_at=?,state=? WHERE id=?').bind(now,matches?'listed':'review',row.id).run();result.push({id:row.id,state:matches?'listed':'review'})}
 }catch(e){for(const row of rows.filter(r=>r.source_url===url))result.push({id:row.id,state:'check_failed'});console.error('source_check_failed',new URL(url).hostname,e instanceof Error?e.message:'unknown')}}
 await db.prepare('UPDATE refresh_runs SET completed_at=?,result_json=? WHERE id=?').bind(new Date().toISOString(),JSON.stringify(result),id).run();return {id,checked:result.length,results:result};
}
