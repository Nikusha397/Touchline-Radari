import type {Metadata} from 'next';
export const SITE_URL='https://touchlineradar.com';
export function seo(title:string,description:string,path:string,index=true):Metadata{
 const url=SITE_URL+path;
 const images=[{url:SITE_URL+'/press/brand-square.png',width:512,height:512,alt:'TOUCHLINE Radar — football agents and agencies'}];
 return {title,description,alternates:{canonical:url},robots:{index,follow:true,...(index?{googleBot:{index:true,follow:true,'max-image-preview':'large' as const,'max-snippet':-1,'max-video-preview':-1}}:{})},openGraph:{type:'website',locale:'en_GB',siteName:'TOUCHLINE Radar',title,description,url,images},twitter:{card:'summary',title,description,images:images.map(image=>image.url)}};
}
export const noIndex={robots:{index:false,follow:false}};
export function breadcrumb(items:{name:string;path:string}[]){return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:SITE_URL+item.path}))};}
