import AuthForm from '../auth-form';
import {requireAuthUser} from '../../lib/auth';
export const dynamic='force-dynamic';
export const metadata={title:'New password | TOUCHLINE Radar',robots:{index:false,follow:false}};
export default async function Page(){await requireAuthUser('/reset-password');return <AuthForm mode="reset" ready={true}/>;}
