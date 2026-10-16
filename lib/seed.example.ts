import type {TrialPreview,TrialDetails} from './radar-types';
export const sourceHosts:string[]=[];
export const seeds:{preview:Omit<TrialPreview,'checkedAt'|'state'|'unlocked'>;details:TrialDetails;evidence:string[];checkedAt?:string}[]=[];
