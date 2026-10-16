import {z} from 'zod';
export const roleSchema=z.enum(['player','agent','agency']);
export function ageAt(dob:string,now=new Date()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dob))return NaN;
 const date=new Date(dob+'T00:00:00Z');
 if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==dob)return NaN;
 return now.getUTCFullYear()-date.getUTCFullYear()-(now.toISOString().slice(5,10)<dob.slice(5,10)?1:0);
}
export const dobSchema=z.string().refine(v=>{const age=ageAt(v);return age>=16&&age<=110},'Registration is available from age 16. Enter a valid date of birth.');
export const passwordSchema=z.string().min(12,'Use at least 12 characters.').max(128).refine(v=>/[a-zA-Z]/.test(v)&&/[^a-zA-Z]/.test(v),'Include letters and a number or symbol.');
export const profileSchema=z.object({role:roleSchema,name:z.string().trim().min(2).max(80),dob:dobSchema,country:z.string().trim().min(2).max(80),bio:z.string().trim().max(1200),evidenceUrl:z.union([z.literal(''),z.string().url().max(500).refine(v=>v.startsWith('https://'),'Use an HTTPS link.')]),listed:z.boolean()}).refine(v=>v.role==='player'||ageAt(v.dob)>=18,'Agent and agency representatives must be 18 or older.');
export type NetworkProfile={user_id:string;role:'player'|'agent'|'agency';name:string;dob:string;country:string;bio:string;evidence_url:string;official_status:string;identity_status:string;guardian_status:string;listed:number;directory_id:string|null};
export function guardianCleared(p:NetworkProfile,now=new Date()){return ageAt(p.dob,now)>=18||p.guardian_status==='approved';}
export function chatEligible(p:NetworkProfile,now=new Date()){return guardianCleared(p,now)&&(p.role==='player'||p.official_status==='approved');}
export function peerRoles(role:NetworkProfile['role']){return (['player','agent','agency'] as const).filter(r=>r!==role);}

export const portfolioSchema=z.object({players:z.number().int().min(0).max(100000),topTierPlayers:z.number().int().min(0).optional(),marketValueEur:z.number().finite().min(0).max(1e12),sourceName:z.string().min(2).max(100),sourceUrl:z.string().url().refine(v=>v.startsWith('https://')),checkedAt:z.string().datetime(),verified:z.literal(true),sourceMode:z.enum(['direct','indexed_snapshot']).default('direct'),sourceNote:z.string().max(500).optional()}).refine(v=>v.sourceMode!=='indexed_snapshot'||!!v.sourceNote,'Indexed snapshots must disclose source uncertainty.').refine(v=>v.topTierPlayers===undefined||v.players===undefined||v.topTierPlayers<=v.players);
// Portfolio strength, not satisfaction, fame, or a guarantee of success. Version 3.
export function overallRating(input:unknown,now=Date.now()) {
 const result=portfolioSchema.safeParse(input);if(!result.success)return null;
 const p=result.data,age=now-Date.parse(p.checkedAt);if(age<0||age>90*86400000)return null;
 // Keep the value-based baseline, then add half a star per complete 15 players.
 // Both verified total value and player count are required; cap the combined score at 5.
 const valueScore=Math.max(1,Math.min(5,Math.floor(p.marketValueEur/8000000)/2));
 const playerBonus=Math.floor(p.players/15)*0.5;
 const score=Math.min(5,valueScore+playerBonus);
 return {...p,score,methodology:'portfolio-value-players-v3'};
}
