import {adminData,AdminAccessError} from '../../../lib/admin';
import {noStoreJson} from '../../../lib/store';
import {rateLimit} from '../../../lib/security';
export async function GET(req:Request){try{if(!await rateLimit(req,'admin-read',60,60))return noStoreJson({error:'Too many requests.'},429);const url=new URL(req.url);return noStoreJson(await adminData(url.searchParams.get('q')||'',Number(url.searchParams.get('page')||1)));}catch(e){if(e instanceof AdminAccessError)return noStoreJson({error:e.message},e.status);console.error('admin_directory_unavailable');return noStoreJson({error:'The admin dashboard is temporarily unavailable. Please try again.'},503);}}
