import {adminContext} from '../../../lib/admin';
import {requireAuthUser} from '../../../lib/auth';
import ReviewDesk from './review-desk';
export const dynamic='force-dynamic';
export default async function Page(){await requireAuthUser('/admin/network');await adminContext();return <ReviewDesk/>}
