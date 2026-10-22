'use client';
import { useEffect, useState } from 'react';

// One floating card at a time (owner, 2026-10-23: pop-ups were covering the
// page and each other). The home offer card and the Rewards card both ask for
// the slot; the first to ask gets it, the other waits until it is closed.
// The cart bar and the chat bubble are not cards and are not part of this.
let owner = null;
const subscribers = new Set();
const emit = () => subscribers.forEach((fn) => fn());

export function useFloatingSlot(name, want) {
  const [mine, setMine] = useState(false);
  useEffect(() => {
    const sync = () => {
      if (want && owner === null) {
        owner = name;
        setMine(true);
        emit();
        return;
      }
      setMine(owner === name);
    };
    subscribers.add(sync);
    sync();
    return () => {
      subscribers.delete(sync);
      if (owner === name) { owner = null; emit(); }
    };
  }, [name, want]);
  useEffect(() => {
    if (!want && owner === name) { owner = null; emit(); }
  }, [want, name]);
  return mine && want;
}

// True once the visitor has been on the site a little while AND scrolled at
// least one screen: nothing floats over a page someone has only just opened.
export function useEngaged(delayMs = 15000) {
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    let timeUp = false;
    let scrolled = false;
    const check = () => { if (timeUp && scrolled) setEngaged(true); };
    const t = setTimeout(() => { timeUp = true; check(); }, delayMs);
    const onScroll = () => {
      if (window.scrollY > (window.innerHeight || 700) * 0.9) { scrolled = true; check(); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, [delayMs]);
  return engaged;
}
