'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, ShoppingBag, Trash2, X, Send, Wallet } from 'lucide-react';
import type { Recipient } from '../lib/agent-product';

type Props = {
  items: Recipient[];
  credits: number;
  signedIn: boolean;
  close: () => void;
  remove: (destinationKey: string) => void;
  clear: () => void;
  review: () => void;
};

export default function ShortlistCart({ items, credits, signedIn, close, remove, clear, review }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close(); previous?.focus(); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [close]);
  const shortfall = Math.max(0, items.length - credits);
  return <>
    <button className="cart-scrim" aria-label="Close shortlist" onClick={close} tabIndex={-1}/>
    <aside className="shortlist-cart" aria-labelledby="shortlist-heading" ref={ref} tabIndex={-1}>
      <header className="cart-heading">
        <div><span className="cart-eyebrow">YOUR NEXT CONNECTIONS</span><h2 id="shortlist-heading">Your shortlist <span>{items.length}</span></h2></div>
        <button className="cart-icon" aria-label="Close shortlist" onClick={close}><X size={20}/></button>
      </header>
      <p className="cart-intro">One introduction per destination. Each recipient receives a separate email.</p>
      <div className="cart-list">
        {items.length ? <ul>{items.map(item => <li key={item.destinationKey}>
          <span className="cart-thumbnail" aria-hidden="true"><img src="/favicon.svg" alt=""/></span>
          <div className="cart-recipient"><strong className={item.identityUnlocked?'':'name-blurred'}>{item.name}</strong><span>{item.kind === 'agency' ? 'Agency' : 'Agent'} · {item.country === 'Unknown' ? 'Country not recorded' : item.country}</span><small>1 introduction · $0.50</small></div>
          <button className="cart-icon" aria-label={'Remove '+item.name} onClick={() => remove(item.destinationKey)}><Trash2 size={16}/></button>
        </li>)}</ul> : <div className="cart-empty"><ShoppingBag size={32}/><h3>Your shortlist is empty</h3><p>Add agents or agencies using the + button on their card.</p></div>}
      </div>
      <footer className="cart-summary">
        {!!items.length && <button className="cart-clear" onClick={clear}>Clear shortlist</button>}
        <dl aria-live="polite">
          <div><dt><Send size={15}/> Required credits</dt><dd>{items.length}</dd></div>
          <div><dt><Wallet size={15}/> Your introduction credits</dt><dd>{signedIn ? credits : 'Sign in'}</dd></div>
          <div className="cart-total"><dt>Introduction value</dt><dd>${(items.length * 0.5).toFixed(2)} <small>USD</small></dd></div>
        </dl>
        {signedIn && shortfall > 0 && <p className="cart-shortfall">{shortfall} more introduction credit{shortfall === 1 ? '' : 's'} needed · ${(shortfall * 0.5).toFixed(2)}</p>}
        <button className="lime-button cart-review" disabled={!items.length} onClick={review}>Review introduction <ArrowRight size={18}/></button>
        <p className="cart-note">Review your message before sending. Contact unlocks are a separate purchase.</p>
      </footer>
    </aside>
  </>;
}
