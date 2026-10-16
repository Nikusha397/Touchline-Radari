import {getDatabase} from './node-storage';
import {privateEntries,publicId} from './directory-catalog.server';
import type {Recipient} from './agent-product';
export function withCommunitySummary(items:Recipient[]){
 const rows=getDatabase().connection.prepare('SELECT destination,COUNT(*) AS count,AVG(stars) AS average FROM network_reviews WHERE hidden=0 GROUP BY destination').all() as {destination:string;count:number;average:number}[];
 const summaries=new Map(rows.map(r=>[r.destination,{count:r.count,average:r.average}]));
 const ids=new Map(privateEntries.map(r=>[publicId(r.id),r.destinationKey]));
 return items.map(r=>({...r,community:summaries.get(ids.get(r.id)||'')||{count:0,average:null}}));
}
