import Link from 'next/link';
import type {ReactNode} from 'react';
const sections=[['home','/community','Home'],['directory','/directory','Agents & agencies'],['inbox','/inbox','Inbox'],['profile','/network','My profile'],['subscription','/subscriptions','Membership']] as const;
export function CommunityShell({active,children,tools}:{active:'home'|'directory'|'inbox'|'subscription'|'profile';children:ReactNode;tools?:ReactNode}){
 return <div className="app-shell agent-platform editorial-platform unified-platform"><a className="tl-skip" href="#site-main">Skip to content</a>
  <aside className="sidebar site-sidebar"><Link className="brand" href="/" aria-label="Touchline Radar home"><span className="radar-mark" aria-hidden="true"><span/><i/></span><div><strong>TOUCHLINE</strong><span>Radar<span className="brand-dot">.</span></span></div></Link>
   <nav aria-label="Main navigation">{sections.map(([key,href,label])=><Link key={key} href={href} aria-current={active===key?'page':undefined}>{label}</Link>)}</nav>
   <div className="site-sidebar-bottom"><Link href="/how-to-find-a-football-agent">Player guide</Link><Link href="/contact">Help & contact</Link></div>
  </aside>
  <div className="workspace"><header className="site-topbar"><span>TOUCHLINE RADAR</span><span>{sections.find(([key])=>key===active)?.[2]}</span><Link href="/network">Account</Link></header>
   <main id="site-main" className={active==='directory'?'site-content site-directory':'site-content tl-community'} tabIndex={-1}>{tools&&<div className="site-page-tools">{tools}</div>}{children}</main>
   <footer className="site-footer"><span>Touchline Radar</span><nav aria-label="Policies">{[['terms','Terms'],['privacy','Privacy'],['refunds','Refunds'],['cookies','Cookies'],['data-request','Your data'],['accessibility','Accessibility'],['contact','Contact']].map(([path,label])=><Link key={path} href={'/'+path}>{label}</Link>)}</nav></footer>
  </div>
 </div>;
}
