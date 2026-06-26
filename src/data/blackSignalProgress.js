export const BLACK_SIGNAL_UNLOCK_KEY = 'black_signal_unlocked';
export const BLACK_SIGNAL_SESSION_KEY = 'black_signal_session_v1';
export const BLACK_SIGNAL_ENDING_KEY = 'black_signal_ending';
export const AEGIS_HOME_VIEW_KEY = 'aegis_home_view';

export function isBlackSignalUnlocked() {
  try {
    return localStorage.getItem(BLACK_SIGNAL_UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function unlockBlackSignal() {
  try {
    localStorage.setItem(BLACK_SIGNAL_UNLOCK_KEY, '1');
    localStorage.setItem(AEGIS_HOME_VIEW_KEY, 'signal');
  } catch { /* no-op */ }
}

export function lockBlackSignal() {
  try {
    localStorage.removeItem(BLACK_SIGNAL_UNLOCK_KEY);
    localStorage.setItem(AEGIS_HOME_VIEW_KEY, 'vault');
  } catch { /* no-op */ }
}

export function getHomeView() {
  try {
    return localStorage.getItem(AEGIS_HOME_VIEW_KEY) === 'vault' ? 'vault' : 'signal';
  } catch {
    return 'signal';
  }
}

export function setHomeView(view) {
  try {
    localStorage.setItem(AEGIS_HOME_VIEW_KEY, view);
  } catch { /* no-op */ }
}

export function saveBlackSignalEnding(endingId) {
  try {
    localStorage.setItem(BLACK_SIGNAL_ENDING_KEY, endingId);
  } catch { /* no-op */ }
}

export function getBlackSignalEnding() {
  try {
    return localStorage.getItem(BLACK_SIGNAL_ENDING_KEY);
  } catch {
    return null;
  }
}

/** SOC Analyst tier counts as "successful" at C (70+) or any contained outcome. */
export function qualifiesForBlackSignalUnlock(reportResult, act2Outcome) {
  if (!reportResult) return false;
  const contained = typeof act2Outcome === 'string' && act2Outcome.startsWith('contained');
  return contained || reportResult.overallScore >= 70;
}
