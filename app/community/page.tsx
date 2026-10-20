export const dynamic='force-dynamic';
import {getAuthUser} from '../../lib/auth';
import {redirect} from 'next/navigation';
import CommunityFeed from '../community-feed';
import {seo} from '../../lib/seo';

export const metadata=seo('Community | TOUCHLINE Radar','Football news, discussion and opportunities from players, agents and agencies.','/community');
export default async function CommunityPage(){if(!await getAuthUser())redirect('/');return <CommunityFeed/>;}
