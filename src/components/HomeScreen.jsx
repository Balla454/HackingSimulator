import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  isBlackSignalUnlocked,
  getHomeView,
  setHomeView,
  unlockBlackSignal,
  lockBlackSignal
} from '../data/blackSignalProgress';
import VaultHome from './VaultHome';
import BlackSignalHome from './BlackSignalHome';

/** Type on the home screen (no input focused) — not shown anywhere in the UI. */
const DEV_UNLOCK_SEQUENCE = 'ghost';
const DEV_LOCK_SEQUENCE = 'lockvault';
const SIGIL_CLICKS_REQUIRED = 7;
const SIGIL_CLICK_WINDOW_MS = 2500;

const HomeScreen = ({ onSelect }) => {
  const [blackUnlocked, setBlackUnlocked] = useState(() => isBlackSignalUnlocked());
  const [view, setView] = useState(() => (
    blackUnlocked && getHomeView() === 'signal' ? 'signal' : 'vault'
  ));

  const sequenceRef = useRef('');
  const sequenceTimerRef = useRef(null);
  const sigilClicksRef = useRef(0);
  const sigilTimerRef = useRef(null);

  const devUnlock = useCallback(() => {
    unlockBlackSignal();
    setBlackUnlocked(true);
    setView('signal');
  }, []);

  const devLock = useCallback(() => {
    lockBlackSignal();
    setBlackUnlocked(false);
    setView('vault');
  }, []);

  const openVault = useCallback(() => {
    setHomeView('vault');
    setView('vault');
  }, []);

  const openSignal = useCallback(() => {
    setHomeView('signal');
    setView('signal');
  }, []);

  const onSigilSecretClick = useCallback(() => {
    if (sigilTimerRef.current) clearTimeout(sigilTimerRef.current);
    sigilClicksRef.current += 1;
    if (sigilClicksRef.current >= SIGIL_CLICKS_REQUIRED) {
      sigilClicksRef.current = 0;
      devUnlock();
      return;
    }
    sigilTimerRef.current = setTimeout(() => {
      sigilClicksRef.current = 0;
    }, SIGIL_CLICK_WINDOW_MS);
  }, [devUnlock]);

  useEffect(() => {
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const resetSequence = () => {
      sequenceRef.current = '';
      if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
    };

    const pushSequence = (char, onMatch) => {
      if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
      sequenceRef.current = (sequenceRef.current + char).slice(-onMatch.length);
      if (sequenceRef.current === onMatch) {
        resetSequence();
        return true;
      }
      sequenceTimerRef.current = setTimeout(resetSequence, 1800);
      return false;
    };

    const onKeyDown = (e) => {
      if (isTypingTarget(e.target)) return;

      if (e.shiftKey && e.ctrlKey && e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        devLock();
        return;
      }
      if (e.shiftKey && e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        devUnlock();
        return;
      }

      if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
      const ch = e.key.toLowerCase();
      if (pushSequence(ch, DEV_UNLOCK_SEQUENCE)) devUnlock();
      else if (pushSequence(ch, DEV_LOCK_SEQUENCE)) devLock();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      resetSequence();
      if (sigilTimerRef.current) clearTimeout(sigilTimerRef.current);
    };
  }, [devUnlock, devLock]);

  if (blackUnlocked && view === 'signal') {
    return (
      <BlackSignalHome
        onEnter={() => onSelect('black-signal')}
        onVault={openVault}
      />
    );
  }

  return (
    <VaultHome
      onSelect={onSelect}
      blackUnlocked={blackUnlocked}
      onBlackSignal={blackUnlocked ? openSignal : undefined}
      onSigilSecretClick={onSigilSecretClick}
    />
  );
};

export default HomeScreen;
