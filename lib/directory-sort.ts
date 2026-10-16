import type {Recipient} from './agent-product';

/** Rank the entire filtered result before pagination. Unknown scores come last. */
export function sortByOverall<T extends Pick<Recipient,'id'|'name'|'overall'>>(items:T[]):T[]{
 return [...items].sort((a,b)=>(b.overall?.score??-1)-(a.overall?.score??-1)||a.name.localeCompare(b.name,'en')||a.id.localeCompare(b.id,'en'));
}
