import type {Recipient} from './agent-product';

/** Keep directory ordering stable across filters and pagination. */
export function sortDirectoryByName<T extends Pick<Recipient,'id'|'name'>>(items:T[]):T[]{
 return [...items].sort((a,b)=>a.name.localeCompare(b.name,'en')||a.id.localeCompare(b.id,'en'));
}
