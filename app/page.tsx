import {redirect} from 'next/navigation';
import CommunityFeed from './community-feed';
import {seo} from '../lib/seo';
import {getAuthUser} from '../lib/auth';
import {authReady} from '../lib/product';
import Landing from './landing';
export const metadata=seo('Football community, news & introductions | TOUCHLINE Radar','Join the football conversation. Share news and opportunities, meet players, agents and agencies, and make private introductions.','/');
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;if(['payment','token','kind','country','q'].some(key=>key in params)){const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){if(typeof value==='string')query.set(key,value);}redirect('/directory?'+query.toString());}return await getAuthUser()?<CommunityFeed/>:<Landing ready={authReady()} notice={typeof params.notice==='string'&&['registered','confirmed','check-email'].includes(params.notice)?params.notice:undefined}/>;}
