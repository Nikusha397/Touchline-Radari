import {SITE_URL} from '../../lib/seo';
export function GET(){return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/\nDisallow: /admin\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600'}});}
