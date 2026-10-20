import Radar from '../agent-radar';
import {initialDirectory} from '../../lib/directory-public.server';
import {seo,SITE_URL} from '../../lib/seo';
import {StructuredData} from '../public-content';
export const dynamic='force-dynamic';
type Query=Promise<Record<string,string|string[]|undefined>>;
export async function generateMetadata({searchParams}:{searchParams:Query}){
 const params=await searchParams;
 const index=!Object.keys(params).some(key=>!key.startsWith('utm_'));
 return seo('Football Agents & Agencies by Country | TOUCHLINE Radar','Find football agents and agencies by country. Create a free player profile, send introductions for $0.50 each, or reveal published contacts.','/directory',index);
}
export default async function Page({searchParams}:{searchParams:Query}){
 const params=await searchParams;
 const kind=params.kind==='agent'?'agent':'agency';
 const country=typeof params.country==='string'?params.country.slice(0,100):'';
 const q=typeof params.q==='string'?params.q.slice(0,120):'';
 return <><StructuredData data={{'@context':'https://schema.org','@type':'CollectionPage','@id':SITE_URL+'/directory#page',url:SITE_URL+'/directory',name:'TOUCHLINE Radar',alternateName:'Touchline Radar',description:'Football agents and agencies by country, player profiles and introductions.',publisher:{'@id':SITE_URL+'/#organization'},inLanguage:'en'}}/><Radar initialListing={await initialDirectory(kind,country,q)} initialKind={kind} initialCountry={country} initialSearch={q}/></>;
}
