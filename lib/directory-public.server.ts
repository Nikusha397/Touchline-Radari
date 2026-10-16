import {sortByOverall} from './directory-sort';
import {withLivePortfolios} from './portfolio-feed.server';
import {withCommunitySummary} from './community-summary.server';
// Import only from server components. Never serialize the source contact records.
import directory from './directory.server.json';
import { projectRecipient } from './directory-catalog.server';
import type {Recipient} from './agent-product';

const publicEntries:Recipient[]=directory.map(record=>projectRecipient(record));
export const directoryCounts={agents:publicEntries.filter(r=>r.kind==='agent').length,agencies:publicEntries.filter(r=>r.kind==='agency').length};
export async function initialDirectory(kind:'agent'|'agency'='agency',country='',q=''){
 const all=directory.filter(r=>r.kind===kind).map(r=>projectRecipient(r));
 const countries=[...new Set(all.map(r=>r.country))].sort((a,b)=>a==='Unknown'?1:b==='Unknown'?-1:a.localeCompare(b));
 const query=q.toLowerCase();
 const filtered=all.filter(r=>(!country||r.country===country)&&(!query||(r.name+' '+r.agency+' '+r.country).toLowerCase().includes(query)));
 const ranked=sortByOverall(await withLivePortfolios(filtered));
 return {items:withCommunitySummary(ranked.slice(0,18)),total:filtered.length,countries,page:1,pages:Math.ceil(filtered.length/18),agencyCount:directoryCounts.agencies,agentCount:directoryCounts.agents};
}
const slug=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const countryDirectories=[...new Set(publicEntries.flatMap(r=>r.country.split(';').map(s=>s.trim())))].filter(name=>name!=='Unknown').map(name=>{
 const records=sortByOverall(publicEntries.filter(r=>r.country.split(';').map(s=>s.trim()).includes(name)));
 return {name,slug:slug(name),agents:records.filter(r=>r.kind==='agent').length,agencies:records.filter(r=>r.kind==='agency').length,records};
}).filter(c=>c.records.length>=5).sort((a,b)=>a.name.localeCompare(b.name));
export function countryDirectory(slug:string){return countryDirectories.find(c=>c.slug===slug);}
