import type {TrialPreview,TrialDetails} from './radar-types';
export const additionalSeeds:{preview:Omit<TrialPreview,'checkedAt'|'state'|'unlocked'>;details:TrialDetails;evidence:string[];checkedAt?:string}[]=[];
