export const dynamic='force-dynamic';
import {getAuthUser} from '../../../lib/auth';
import {redirect} from 'next/navigation';
import {notFound} from 'next/navigation';
import {countryDirectory} from '../../../lib/directory-public.server';
import {seo,breadcrumb} from '../../../lib/seo';
import {PublicContent,StructuredData} from '../../public-content';
type Props={params:Promise<{country:string}>;searchParams:Promise<{page?:string}>};
function pageNumber(value?:string){return value===undefined?1:/^[1-9]\d{0,2}$/.test(value)?Number(value):0;}
export async function generateMetadata({params,searchParams}:Props){
 const c=countryDirectory((await params).country);if(!c)return {title:'Country not found | TOUCHLINE Radar',robots:{index:false}};
 const page=pageNumber((await searchParams).page);if(!page||page>Math.ceil(c.records.length/24))return {title:'Page not found | TOUCHLINE Radar',robots:{index:false}};
 return seo(`Football Agents & Agencies in ${c.name}${page>1?' — Page '+page:''} | TOUCHLINE Radar`,`Browse ${c.agents} agent registration records and ${c.agencies} football agency listings connected to ${c.name}. Compare listings and share your player profile.`,`/football-agents/${c.slug}${page>1?'?page='+page:''}`);
}
export default async function CountryAgents({params,searchParams}:Props){
 if(!await getAuthUser())redirect('/');
 const c=countryDirectory((await params).country);if(!c)notFound();
 const page=pageNumber((await searchParams).page),pages=Math.ceil(c.records.length/24);if(!page||page>pages)notFound();
 const path='/football-agents/'+c.slug;
 return <PublicContent title={`Football agents & agencies in ${c.name}.`} intro={`Explore ${c.agents} individual agent registration records and ${c.agencies} agency office listings connected to ${c.name}. Build a shortlist around your playing level, position and career plans.`} crumbs={[{name:'Football agents',path:'/football-agents'},{name:c.name,path}]}>
 <StructuredData data={breadcrumb([{name:'Home',path:'/'},{name:'Football agents',path:'/football-agents'},{name:c.name,path}])}/>
 <section className="country-context"><h2>What these {c.name} listings mean</h2><p>For individual agents, {c.name} is a registration location recorded in our source material; a person can have records in more than one country. For agencies, it is the listed office country. It does not establish nationality, current recruitment activity or a player's eligibility to work in that country.</p><p>Select a listing below to find the record in the interactive directory. Names are visually blurred until contact unlock; published contact details require a separate contact-credit purchase. You can also send your saved player profile and PDFs through TOUCHLINE Radar for $0.50 USD per introduction.</p></section>
 <section><div className="country-results-heading"><h2>Representation directory</h2><span>{(page-1)*24+1}–{Math.min(page*24,c.records.length)} of {c.records.length} records</span></div><div className="public-agent-records">{c.records.slice((page-1)*24,page*24).map(r=><article key={r.id}><span className="eyebrow">{r.kind==='agent'?'INDIVIDUAL AGENT':'FOOTBALL AGENCY'}</span><h3><a href={'/?'+new URLSearchParams({kind:r.kind,q:r.name})}><span className="name-blurred">{r.name}</span></a></h3><p>{r.kind==='agent'?'Registration location: ':'Office country: '}{r.country}</p>{r.kind==='agent'&&r.agency&&<p>Listed affiliation: {r.agency}</p>}<small>{r.kind==='agency'?'Agency listing':r.status}</small></article>)}</div>{pages>1&&<nav className="directory-page-links" aria-label="Directory pages">{page>1&&<a rel="prev" href={path+(page===2?'':'?page='+(page-1))}>← Previous</a>}<span>Page {page} of {pages}</span>{page<pages&&<a rel="next" href={path+'?page='+(page+1)}>Next →</a>}</nav>}</section>
 <section className="seo-notice"><h2>Make a considered introduction</h2><p>Our source snapshots and technical email checks from 14 October 2026 do not guarantee a current licence, an active inbox or a response. Confirm current licensing through official sources and research each representative before sharing documents or entering an agreement.</p><p><a href="/how-to-find-a-football-agent">Prepare your approach</a> · <a href="/pricing">View transparent pricing</a> · <a href="/football-agents">Explore other countries</a></p><a className="button button-lime" href="/signup?next=/">Create your free player profile</a></section>
 </PublicContent>;
}
