import {redirect,notFound} from 'next/navigation';
import {getAuthUser} from '../../lib/auth';
import {adminData,AdminAccessError} from '../../lib/admin';
import AdminDashboard from './owner-dashboard';
export const metadata={title:'Admin panel | TOUCHLINE Radar',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Admin({searchParams}:{searchParams:Promise<{q?:string;page?:string;tab?:string}>}){
 if(!await getAuthUser())redirect('/login?next=%2Fadmin');
 const query=await searchParams;
 try {const data=await adminData(query.q||'',Number(query.page||1));return <AdminDashboard data={data}/>;}
 catch(e){if(e instanceof AdminAccessError)notFound();console.error('admin_page_unavailable');return <div className="admin-main"><h1>Dashboard temporarily unavailable.</h1><p>Your account data could not be loaded. Please try again.</p><a href="/admin" className="button button-dark">Retry</a><p><a href="/account">Back to your account</a></p></div>;}
}
