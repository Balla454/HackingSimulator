import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  AEGIS_SOC_CLIENT,
  SOC_PIXEL_LINES,
  SOC_PIXEL_HINTS,
  PIXEL,
  getTierMeta
} from '../data/aegisUniverse';
import { unlockBlackSignal, qualifiesForBlackSignalUnlock, isBlackSignalUnlocked } from '../data/blackSignalProgress';
import {
  HOSTS,
  TOPOLOGY_EDGES,
  THREAT_INTEL,
  ACT1_SOURCE_IP,
  ACT1_HOST,
  ACT1_USER,
  ACT1_LOGS,
  ACT1_ALERTS,
  ACT1_TASKS,
  ACT2_STAGE_ORDER,
  ACT2_STAGE_INTERVAL_MS,
  ACT2_SNEAKY_DELAY_MIN_MS,
  ACT2_SNEAKY_DELAY_MAX_MS,
  ACT2_AMBIENT_OPENING_LOGS,
  randomAmbientFillerLog,
  ACT2_PETTY_TICKET_POOL,
  ACT2_PETTY_TICKET_SLA_MS,
  ACT2_PETTY_TICKET_MAX_CONCURRENT,
  ACT2_URGENT_TICKET_POOL,
  ACT2_URGENT_TICKET_SLA_MS,
  ACT2_CHURN_POOL,
  pickAct2Variant,
  buildAct2Scenario,
  ACT2_GUIDANCE
} from '../data/socScenario';

// ---------------------------------------------------------------------------
// Tiny SIEM query language: free-text substring on `raw`, field:value pairs
// (host, source, user, ip, level — level supports >=, <=, >, < prefixes and
// ip/host support trailing * wildcards), '-' prefix negates a term, and a
// single top-level OR splits the expression into alternative AND-groups.
// Real syntax to learn, small enough to teach in one sitting.
// ---------------------------------------------------------------------------
function tokenize(expr) {
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(expr)) !== null) {
    tokens.push(m[1] !== undefined ? m[1] : m[2]);
  }
  return tokens;
}

function matchToken(row, token) {
  let negate = false;
  let t = token;
  if (t.startsWith('-') && t.length > 1) {
    negate = true;
    t = t.slice(1);
  }
  let result;
  const colonIdx = t.indexOf(':');
  if (colonIdx > 0) {
    const field = t.slice(0, colonIdx).toLowerCase();
    const value = t.slice(colonIdx + 1);
    result = matchField(row, field, value);
  } else {
    result = (row.raw || '').toLowerCase().includes(t.toLowerCase());
  }
  return negate ? !result : result;
}

function matchField(row, field, value) {
  const lowerVal = value.toLowerCase();
  switch (field) {
    case 'host':
      return wildcardMatch((row.host || '').toLowerCase(), lowerVal);
    case 'source':
      return (row.source || '').toLowerCase() === lowerVal;
    case 'user':
      return (row.user || '').toLowerCase().includes(lowerVal);
    case 'ip':
      return wildcardMatch(row.ip || '', value);
    case 'level': {
      const num = row.level ?? -Infinity;
      const opMatch = value.match(/^(>=|<=|>|<)?(\d+)$/);
      if (!opMatch) return false;
      const [, op, numStr] = opMatch;
      const cmp = parseInt(numStr, 10);
      if (op === '>=') return num >= cmp;
      if (op === '<=') return num <= cmp;
      if (op === '>') return num > cmp;
      if (op === '<') return num < cmp;
      return num === cmp;
    }
    default:
      return (row.raw || '').toLowerCase().includes(lowerVal);
  }
}

function wildcardMatch(haystack, pattern) {
  if (!pattern.includes('*')) return haystack.toLowerCase().includes(pattern.toLowerCase());
  const escaped = pattern
    .split('*')
    .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`, 'i').test(haystack);
}

function runQueryFilter(rows, expr) {
  if (!expr || !expr.trim()) return rows;
  const orGroups = expr.split(/\sOR\s/i).map(g => tokenize(g.trim()));
  return rows.filter(row => orGroups.some(group => group.every(tok => matchToken(row, tok))));
}

function resolveHost(token) {
  if (!token) return null;
  const t = token.toLowerCase();
  return HOSTS.find(h => h.id.toLowerCase() === t || h.name.toLowerCase() === t) || null;
}

const ACT2_OUTCOME_LABEL = {
  contained_early: 'Contained at Initial Access',
  contained_at_privesc: 'Contained at Privilege Escalation',
  contained_at_lateral: 'Contained at Lateral Movement',
  breach_completed: 'Full Breach — Data Exfiltrated',
  overrun: 'Network Overrun — Lost Containment'
};
const ACT2_OUTCOME_SCORE = {
  contained_early: 100,
  contained_at_privesc: 80,
  contained_at_lateral: 60,
  breach_completed: 30,
  overrun: 10
};

// How long an unresolved kill-chain ticket's countdown bar gives before the
// stage auto-advances *and* the infection gets a free lateral hop onto a
// fresh machine. Once a host is infected this way, it keeps spreading again
// every ACT2_SPREAD_INTERVAL_MS until it's isolated — a second, parallel
// clock layered on top of the scripted kill chain so missing tickets has a
// compounding, visible cost instead of just quietly losing points.
const ACT2_SPREAD_INTERVAL_MS = 28000;
// Host types eligible to be hit by lateral spread / counted toward the
// "everything is compromised" loss — excludes the firewall (can't be
// infected, it's the perimeter) and the undefendable internet/client-pool
// nodes (not real endpoints).
const ACT2_SPREADABLE_TYPES = ['workstation', 'mobile', 'server'];

// --- Teacher-facing class roster --------------------------------------------
// Every completed case is appended to a small roster kept in localStorage on
// this machine — built for the common classroom setup of one shared
// computer that several students play on in turn. A teacher can open the
// "Class results" view from the briefing screen at any time to see every
// student's score breakdown and export it as a CSV for gradebooks.
const SOCLAB_ROSTER_KEY = 'soclab_class_roster';

function loadRoster() {
  try {
    const raw = window.localStorage.getItem(SOCLAB_ROSTER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRosterEntry(entry) {
  try {
    const roster = loadRoster();
    roster.push(entry);
    window.localStorage.setItem(SOCLAB_ROSTER_KEY, JSON.stringify(roster));
    return roster;
  } catch {
    return loadRoster();
  }
}

function clearRoster() {
  try {
    window.localStorage.removeItem(SOCLAB_ROSTER_KEY);
  } catch {
    /* no-op — storage unavailable */
  }
}

const ROSTER_COLUMNS = [
  { key: 'name', label: 'Student' },
  { key: 'completedAt', label: 'Completed' },
  { key: 'grade', label: 'Grade' },
  { key: 'overallScore', label: 'Overall' },
  { key: 'containmentScore', label: 'Containment' },
  { key: 'reportScore', label: 'Report' },
  { key: 'disciplineScore', label: 'Discipline' },
  { key: 'hintScore', label: 'Hints' },
  { key: 'speedScore', label: 'Speed' },
  { key: 'unnecessaryActions', label: 'Unnecessary Actions' },
  { key: 'hintsRevealed', label: 'Hints Used' },
  { key: 'outcome', label: 'Outcome' }
];

function rosterToCsv(roster) {
  const header = ROSTER_COLUMNS.map(c => c.label).join(',');
  const rows = roster.map(entry => ROSTER_COLUMNS.map(c => {
    const v = entry[c.key] ?? '';
    const s = String(v).replace(/"/g, '""');
    return /[,"\n]/.test(s) ? `"${s}"` : s;
  }).join(','));
  return [header, ...rows].join('\n');
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const HELP_TEXT = `AVAILABLE COMMANDS
  help                          show this list
  status                        current act, stage, and progress
  hosts | topology              list every host and its current status
  alerts [query]                list Security Events, optionally filtered (rule.level / rule.id)
  query <expr>                  Threat Hunting search over raw logs, e.g. query host:wkstn-07 source:auth
  lookup-ip <ip>                check an IP against threat intel
  isolate <host>                Wazuh Active Response: agent isolation — cuts the host off the network
  remediate <host>              clean up an isolated host (AV sweep/removal) so it's safe to restore
  restore <host>                reverse an agent-isolation Active Response — best done after remediation
  block-ip <ip>                 Wazuh Active Response: firewall-drop — blocks an IP at the perimeter
  unblock-ip <ip>                remove a firewall-drop block
  disable-user <user>           Wazuh Active Response: disable-account — locks an account
  enable-user <user>            re-enable an account disabled by disable-account
  kill-process <host> <name>    terminate a process on a host (logged for the record)
  notes <text>                  add a case note (or just type one directly in the Case Notes tab)
  report                        open the incident report (once Act 2 has concluded)
  clear                         clear this terminal's scrollback

QUERY SYNTAX
  field:value pairs: host, source, user, ip, level (level supports >=, <=, >, <)
  wildcards with *, quote phrases with "...", prefix - to negate, OR to combine groups
  example: query source:auth level:>=10 OR ip:203.0.113.*`;

const TERMINAL_COMMANDS = [
  'help', 'status', 'hosts', 'topology', 'alerts', 'query', 'lookup-ip',
  'isolate', 'remediate', 'restore', 'block-ip', 'unblock-ip',
  'disable-user', 'enable-user', 'kill-process', 'notes', 'report', 'clear'
];
const HOST_ARG_COMMANDS = new Set(['isolate', 'remediate', 'restore', 'kill-process']);
const IP_ARG_COMMANDS = new Set(['lookup-ip', 'block-ip', 'unblock-ip']);
const USER_ARG_COMMANDS = new Set(['disable-user', 'enable-user']);
const COMPLETABLE_HOST_IDS = HOSTS
  .filter(h => !h.undefendable && h.id !== 'fw-edge' && h.id !== 'web-01')
  .map(h => h.id);

function resolveHostId(token) {
  if (!token) return null;
  const lower = token.toLowerCase();
  const byId = HOSTS.find(h => h.id === lower);
  if (byId) return byId.id;
  const byName = HOSTS.find(h => h.name.toLowerCase() === lower);
  return byName?.id ?? null;
}

function longestCommonPrefix(strings) {
  if (!strings.length) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}

const SOCLAB_RETURNING_KEY = 'soclab_returning';
const SOCLAB_TOUR_DONE_KEY = 'soclab_desk_tour_done';
const SOCLAB_SESSION_KEY = 'soclab_session_v1';
const SOCLAB_RESUME_PENDING_KEY = 'soclab_resume_pending';
const RESUMABLE_PHASES = new Set(['act1', 'act2', 'act2-intro', 'report']);

function peekSavedSession() {
  try {
    const raw = localStorage.getItem(SOCLAB_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return (parsed && RESUMABLE_PHASES.has(parsed.phase)) ? parsed : null;
  } catch {
    return null;
  }
}

// Only hydrate from localStorage when the player explicitly chose Resume
// (flag set right before reload). A normal visit always starts clean.
function consumeBootSnapshot() {
  try {
    if (sessionStorage.getItem(SOCLAB_RESUME_PENDING_KEY) === '1') {
      sessionStorage.removeItem(SOCLAB_RESUME_PENDING_KEY);
      return peekSavedSession();
    }
  } catch { /* no-op */ }
  return null;
}

const INITIAL_BOOT = consumeBootSnapshot();

function bootField(key, fallback) {
  return INITIAL_BOOT && INITIAL_BOOT[key] !== undefined ? INITIAL_BOOT[key] : fallback;
}

function clearSession() {
  try { localStorage.removeItem(SOCLAB_SESSION_KEY); } catch { /* no-op */ }
  try { sessionStorage.removeItem(SOCLAB_RESUME_PENDING_KEY); } catch { /* no-op */ }
}

function resumeSavedSession() {
  if (!peekSavedSession()) return;
  try { sessionStorage.setItem(SOCLAB_RESUME_PENDING_KEY, '1'); } catch { /* no-op */ }
  window.location.reload();
}

function startFreshSession() {
  clearSession();
  window.location.reload();
}

function inferQuerySourceFromAlert(alert) {
  const rule = (alert.rule || '').toLowerCase();
  if (/auth|logon|admin|credential/.test(rule)) return 'auth';
  if (/macro|process|lsass|shell/.test(rule)) return 'process';
  if (/beacon|exfil|firewall|port-scan|lateral|mass/.test(rule)) return 'firewall';
  if (/web|http/.test(rule)) return 'web';
  if (/dns/.test(rule)) return 'dns';
  return null;
}

function alertToQueryExpr(alert) {
  const parts = [];
  if (alert.host) parts.push(`host:${alert.host}`);
  const src = inferQuerySourceFromAlert(alert);
  if (src) parts.push(`source:${src}`);
  return parts.join(' ');
}

function buildReportPrefill(prev, discoveredHosts, discoveredIPs, confirmedIPs, discoveredAccounts) {
  const hostIds = Object.keys(discoveredHosts).filter(id => {
    const h = HOSTS.find(x => x.id === id);
    return h && !h.undefendable && id !== 'fw-edge' && id !== 'web-01';
  });
  const mergedHosts = [...new Set([...prev.hosts, ...hostIds])];
  const existingIps = prev.ips.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  const intelIps = Object.keys(confirmedIPs).length ? Object.keys(confirmedIPs) : Object.keys(discoveredIPs);
  const mergedIps = [...new Set([...existingIps, ...intelIps])].join(', ');
  const accounts = Object.keys(discoveredAccounts);
  const mergedAccount = prev.account || (accounts.length === 1 ? accounts[0] : '');
  return { ...prev, hosts: mergedHosts, ips: mergedIps, account: mergedAccount };
}

const ACT1_TAB_LABELS = {
  alerts: 'Security Events',
  logs: 'Threat Hunting',
  agents: 'Agents',
  notes: 'Case Notes'
};

// Act 1: each task unlocks ONLY what that step needs — nothing cumulative.
function getAct1StepCaps(activeTaskId, act1Complete) {
  const base = ['help', 'status', 'clear'];
  const full = {
    tabs: new Set(['alerts', 'logs', 'notes']),
    cmds: new Set([...base, 'alerts', 'query', 'lookup-ip', 'isolate', 'hosts', 'topology', 'remediate', 'restore', 'block-ip', 'unblock-ip', 'disable-user', 'enable-user', 'notes']),
    showInvestigate: true,
    showEvidenceTray: true,
    showAlertToolbar: false,
    logActions: 'all',
    showPlaybook: true,
    showIntelBanner: true,
    showTopology: true,
    alertRowsInteractive: true,
    playbookFilter: null,
  };
  if (act1Complete) return full;

  switch (activeTaskId) {
    case 'a1-read-alert':
      return {
        tabs: new Set(['alerts']),
        cmds: new Set(base),
        showInvestigate: false,
        showEvidenceTray: false,
        showAlertToolbar: false,
        logActions: 'none',
        showPlaybook: false,
        showIntelBanner: false,
        showTopology: false,
        alertRowsInteractive: false,
        playbookFilter: null,
      };
    case 'a1-query-auth':
      return {
        tabs: new Set(['logs']),
        cmds: new Set([...base, 'query']),
        showInvestigate: false,
        showEvidenceTray: false,
        showAlertToolbar: false,
        logActions: 'none',
        showPlaybook: true,
        showIntelBanner: false,
        showTopology: false,
        alertRowsInteractive: false,
        playbookFilter: (cmd) => cmd.startsWith('query'),
      };
    case 'a1-lookup-ip':
      return {
        tabs: new Set(['logs']),
        cmds: new Set([...base, 'lookup-ip']),
        showInvestigate: false,
        showEvidenceTray: true,
        showAlertToolbar: false,
        logActions: 'lookup-only',
        showPlaybook: true,
        showIntelBanner: false,
        showTopology: false,
        alertRowsInteractive: false,
        playbookFilter: (cmd) => cmd.startsWith('lookup-ip'),
      };
    case 'a1-isolate':
      return {
        tabs: new Set(['logs']),
        cmds: new Set([...base, 'isolate', 'hosts', 'topology']),
        showInvestigate: false,
        showEvidenceTray: true,
        showAlertToolbar: false,
        logActions: 'isolate-only',
        showPlaybook: true,
        showIntelBanner: true,
        showTopology: true,
        alertRowsInteractive: false,
        playbookFilter: (cmd) => cmd.startsWith('isolate'),
      };
    case 'a1-block-ip':
      return {
        tabs: new Set(['logs']),
        cmds: new Set([...base, 'block-ip']),
        showInvestigate: false,
        showEvidenceTray: true,
        showAlertToolbar: false,
        logActions: 'none',
        showPlaybook: true,
        showIntelBanner: true,
        showTopology: true,
        alertRowsInteractive: false,
        playbookFilter: (cmd) => cmd.startsWith('block-ip'),
      };
    case 'a1-disable-user':
      return {
        tabs: new Set(['logs', 'notes']),
        cmds: new Set([...base, 'disable-user', 'notes']),
        showInvestigate: false,
        showEvidenceTray: true,
        showAlertToolbar: false,
        logActions: 'none',
        showPlaybook: true,
        showIntelBanner: true,
        showTopology: true,
        alertRowsInteractive: false,
        playbookFilter: (cmd) => cmd.startsWith('disable-user'),
      };
    default:
      return {
        tabs: new Set(['alerts']),
        cmds: new Set(base),
        showInvestigate: false,
        showEvidenceTray: false,
        showAlertToolbar: false,
        logActions: 'none',
        showPlaybook: false,
        showIntelBanner: false,
        showTopology: false,
        alertRowsInteractive: false,
        playbookFilter: null,
      };
  }
}

function act1LogActionAllowed(caps, action) {
  if (!caps) return true;
  const mode = caps.logActions;
  if (mode === 'all') return true;
  if (mode === 'none') return false;
  if (mode === 'lookup-only') return action === 'lookup';
  if (mode === 'isolate-only') return action === 'isolate';
  return false;
}

function diffStepCmds(beforeCaps, afterCaps) {
  return [...afterCaps.cmds].filter(c => !beforeCaps.cmds.has(c));
}

function diffStepTabs(beforeCaps, afterCaps) {
  return [...afterCaps.tabs].filter(t => !beforeCaps.tabs.has(t));
}

const DESK_TOUR_STEPS = [
  {
    target: 'siem',
    title: 'Security Events',
    body: 'New alerts land in the Security Events tab — the first tab in the center panel. Each row has a severity badge on the left (Level 7, Level 12, etc.). Read those before you react.'
  },
  {
    target: 'logs-tab',
    title: 'Threat Hunting',
    body: 'Switch to this tab to browse raw logs. The query command in the terminal searches this same data with field filters.'
  },
  {
    target: 'terminal',
    title: 'Command terminal',
    body: 'Every action runs through here: alerts, query, lookup-ip, isolate, block-ip, and more. Type help for the full list.'
  },
  {
    target: 'playbook',
    title: 'Analyst playbook',
    body: 'Keep this sidebar open for command syntax and query examples — faster than scrolling through help every time.'
  }
];

const PLAYBOOK_SECTIONS = [
  {
    title: 'Investigate',
    items: [
      { cmd: 'alerts', desc: 'View the security event queue' },
      { cmd: 'query host:wkstn-07', desc: 'Search logs on one host' },
      { cmd: 'query source:auth level:>=8', desc: 'High-severity auth events' },
      { cmd: 'lookup-ip <ip>', desc: 'Check threat intelligence' }
    ]
  },
  {
    title: 'Contain',
    items: [
      { cmd: 'isolate <host>', desc: 'Cut a host off the network' },
      { cmd: 'block-ip <ip>', desc: 'Block an IP at the firewall' },
      { cmd: 'disable-user <user>', desc: 'Lock a compromised account' },
      { cmd: 'remediate <host>', desc: 'Clean an isolated host before restore' },
      { cmd: 'restore <host>', desc: 'Bring a remediated host back online' }
    ]
  },
  {
    title: 'Query syntax',
    items: [
      { cmd: 'host:wkstn-07', desc: 'Filter by hostname' },
      { cmd: 'ip:203.0.113.*', desc: 'Wildcard IP match' },
      { cmd: '-user:admin', desc: 'Negate a term' },
      { cmd: 'a OR b', desc: 'Either condition' }
    ]
  }
];

const SOCLab = () => {
  // Replayability/anti-cheat: each session gets its own randomized Act 2
  // entry host, stolen account, and C2 IP pair so memorized answers can't
  // be shared between students. Computed once per mount via lazy useState
  // initializer so it never changes across re-renders.
  const [act2Scenario] = useState(() => buildAct2Scenario(bootField('act2Variant', null) ?? pickAct2Variant()));
  const {
    ACT2_STAGES,
    ACT2_ENTRY_HOST,
    ACT2_ENTRY_HOST_NAME,
    ACT2_ENTRY_USER,
    ACT2_STOLEN_ACCOUNT,
    ACT2_C2_IP_PRIMARY,
    ACT2_C2_IP_BACKUP,
    ACT2_C2_REROUTE_LOGS,
    ACT2_C2_REROUTE_ALERT,
    ACT2_REROUTE_TICKET,
    REPORT_RUBRIC
  } = act2Scenario;
  const [phase, setPhase] = useState(() => bootField('phase', 'intro')); // intro -> briefing -> act1 -> act2 -> report -> debrief
  const [logs, setLogs] = useState(() => bootField('logs', []));
  const [alerts, setAlerts] = useState(() => bootField('alerts', []));
  const [hostStatus, setHostStatus] = useState(() => {
    if (INITIAL_BOOT?.hostStatus) return INITIAL_BOOT.hostStatus;
    const s = {};
    HOSTS.forEach(h => { s[h.id] = 'normal'; });
    return s;
  });
  const [blockedIPs, setBlockedIPs] = useState(() => bootField('blockedIPs', []));
  const [disabledUsers, setDisabledUsers] = useState(() => bootField('disabledUsers', []));
  const [act1Objectives, setAct1Objectives] = useState(() => {
    if (INITIAL_BOOT?.act1Objectives) return INITIAL_BOOT.act1Objectives;
    const o = {};
    ACT1_TASKS.forEach(obj => { o[obj.id] = false; });
    return o;
  });
  const [act1Complete, setAct1Complete] = useState(() => bootField('act1Complete', false));
  const [answerDrafts, setAnswerDrafts] = useState(() => bootField('answerDrafts', {}));
  const [answerFeedback, setAnswerFeedback] = useState(() => bootField('answerFeedback', {}));
  const [revealedHints, setRevealedHints] = useState(() => bootField('revealedHints', {}));
  const [revealedAct2Hints, setRevealedAct2Hints] = useState(() => bootField('revealedAct2Hints', {}));
  const [act2Stage, setAct2Stage] = useState(() => bootField('act2Stage', null));
  const [act2Outcome, setAct2Outcome] = useState(() => bootField('act2Outcome', null));
  const [act2Rerouted, setAct2Rerouted] = useState(() => bootField('act2Rerouted', false));
  // Counts every isolate/block-ip/disable-user aimed at something that
  // turns out not to be part of the breach (per REPORT_RUBRIC ground
  // truth) — this is the "business disruption" cost for locking down
  // hosts/accounts with no real justification. Never reset by restoring
  // the action; the disruption already happened.
  const [unnecessaryActions, setUnnecessaryActions] = useState(() => bootField('unnecessaryActions', 0));
  // How quickly (as a 0-1 fraction of the stage's time budget) the player
  // landed the correct containment action within the stage it succeeded at
  // — 1 means instant, 0 means right at the buzzer. Rewards fast-but-correct
  // play within a stage, not just which stage containment landed at.
  const [act2ResponseSpeed, setAct2ResponseSpeed] = useState(() => bootField('act2ResponseSpeed', 1));
  // Optional name so a teacher running this on a shared classroom computer
  // can tell students' results apart in the class roster export.
  const [studentName, setStudentName] = useState(() => bootField('studentName', ''));
  const [showTeacherView, setShowTeacherView] = useState(false);
  const [sessionRestored] = useState(() => INITIAL_BOOT !== null);
  const [hasSavedSession] = useState(() => peekSavedSession() !== null);
  const [isReturning] = useState(() => {
    try { return localStorage.getItem(SOCLAB_RETURNING_KEY) === '1'; } catch { return false; }
  });
  const [panelsUnlocked, setPanelsUnlocked] = useState(() => bootField('panelsUnlocked', { casefile: false, topology: false }));
  const [panelUnlockToast, setPanelUnlockToast] = useState(null);
  const [tourStep, setTourStep] = useState(null);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [stageSecondsLeft, setStageSecondsLeft] = useState(null);
  const [intrusionBannerVisible, setIntrusionBannerVisible] = useState(() => bootField('intrusionBannerVisible', false));
  const [pettyRailExpanded, setPettyRailExpanded] = useState(() => bootField('pettyRailExpanded', true));
  const [incidentTimeline, setIncidentTimeline] = useState(() => bootField('incidentTimeline', []));
  const [seenAlertIds, setSeenAlertIds] = useState(() => bootField('seenAlertIds', []));
  const [alertSort, setAlertSort] = useState('severity');
  const [alertFilter, setAlertFilter] = useState('all');
  const [intelPolicyDismissed, setIntelPolicyDismissed] = useState(false);

  // Act 2 ticket response form: the dropdown target lists are gated to
  // entities the student has actually surfaced through query/lookup-ip (or,
  // for hosts, that have already shown up on an alert — no point gating a
  // fact that's already printed on screen). discoveredHosts is keyed by
  // host id, discoveredIPs/discoveredAccounts by the raw value.
  const [discoveredHosts, setDiscoveredHosts] = useState(() => bootField('discoveredHosts', {}));
  const [discoveredIPs, setDiscoveredIPs] = useState(() => bootField('discoveredIPs', {}));
  const [confirmedIPs, setConfirmedIPs] = useState(() => bootField('confirmedIPs', {}));
  const [discoveredAccounts, setDiscoveredAccounts] = useState(() => bootField('discoveredAccounts', {}));
  const [ticketDrafts, setTicketDrafts] = useState(() => bootField('ticketDrafts', {}));
  const [ticketFeedback, setTicketFeedback] = useState(() => bootField('ticketFeedback', {}));
  const [resolvedAct2Tickets, setResolvedAct2Tickets] = useState(() => bootField('resolvedAct2Tickets', {}));
  const [selectedHost, setSelectedHost] = useState(() => bootField('selectedHost', null));
  const [notes, setNotes] = useState(() => bootField('notes', []));
  const [termHistory, setTermHistory] = useState(() => bootField('termHistory', []));
  const [termInput, setTermInput] = useState(() => bootField('termInput', ''));
  const [activeTab, setActiveTab] = useState(() => bootField('activeTab', 'alerts'));
  const [logQuery, setLogQuery] = useState(() => bootField('logQuery', ''));
  const [noteDraft, setNoteDraft] = useState(() => bootField('noteDraft', ''));
  const [reportAnswers, setReportAnswers] = useState(() => bootField('reportAnswers', {
    summary: '', rootCause: '', hosts: [], ips: '', account: '', remediation: []
  }));
  const [reportPrefillNotice, setReportPrefillNotice] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  const [act2InfectedHosts, setAct2InfectedHosts] = useState(() => bootField('act2InfectedHosts', {}));

  // Live-feedback state: which row ids just arrived (for a brief flash-in),
  // and which SIEM tabs have unseen activity (for a glowing tab badge).
  const [recentIds, setRecentIds] = useState({});
  const [tabPulse, setTabPulse] = useState({ alerts: false, logs: false });

  // Desktop-style resizable panels: drag the dividers between the topology,
  // SIEM, and case file panels, and the one above the terminal, like
  // resizing windows/panes on a real desktop.
  const [leftWidth, setLeftWidth] = useState(() => bootField('leftWidth', 260));
  const [rightWidth, setRightWidth] = useState(() => bootField('rightWidth', 340));
  const [terminalHeight, setTerminalHeight] = useState(() => bootField('terminalHeight', 190));
  const [dragging, setDragging] = useState(null); // 'left' | 'right' | 'terminal' | null
  const [terminalReady, setTerminalReady] = useState(false);

  const stageTimerRef = useRef(null);
  const act2StartTimerRef = useRef(null);
  const escalationTimerRef = useRef(null);
  const spreadTimerRef = useRef(null);
  const act2InfectedHostsRef = useRef(bootField('act2InfectedHosts', {}));
  const everInfectedRef = useRef(bootField('everInfected', {}));
  const act2RealStartRef = useRef(bootField('act2RealStart', null));
  const act2UrgencyLevelRef = useRef(bootField('act2UrgencyLevel', 0));
  const termInputRef = useRef(null);
  const termCmdHistoryRef = useRef([]);
  const termCmdHistoryPosRef = useRef(null);
  const flashHostTimeoutRef = useRef(null);
  const timelineSeqRef = useRef(
    (bootField('incidentTimeline', []) || []).length
  );
  const termScrollRef = useRef(null);
  const act2StageRef = useRef(bootField('act2Stage', null));
  const act2OutcomeRef = useRef(bootField('act2Outcome', null));
  // Timestamp the current stage became active, so we can reward how fast a
  // correct containment action landed within the stage — not just which
  // stage it landed at. Reset every time the stage changes.
  const stageEnteredAtRef = useRef(bootField('stageEnteredAt', null));
  const reconFireAtRef = useRef(bootField('reconFireAt', null));
  const dragStateRef = useRef(null);
  const seenIdsRef = useRef(new Set([
    ...(bootField('logs', [])).map(l => l.id),
    ...(bootField('alerts', [])).map(a => a.id)
  ]));
  const activeTabRef = useRef(activeTab);
  const activeTaskRef = useRef(null);
  const lastGuidedStepRef = useRef(null);

  useEffect(() => {
    if (phase !== 'act1' && phase !== 'act2') {
      setTerminalReady(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setTerminalReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, [phase]);

  useEffect(() => {
    if (!terminalReady || !termInputRef.current) return;
    termInputRef.current.focus({ preventScroll: true });
  }, [terminalReady]);

  const onDrag = useCallback((e) => {
    const d = dragStateRef.current;
    if (!d) return;
    if (d.type === 'left') {
      setLeftWidth(Math.min(460, Math.max(170, d.startVal + (e.clientX - d.startPos))));
    } else if (d.type === 'right') {
      setRightWidth(Math.min(560, Math.max(220, d.startVal - (e.clientX - d.startPos))));
    } else if (d.type === 'terminal') {
      setTerminalHeight(Math.min(460, Math.max(120, d.startVal - (e.clientY - d.startPos))));
    }
  }, []);

  const endDrag = useCallback(() => {
    dragStateRef.current = null;
    setDragging(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', endDrag);
  }, [onDrag]);

  const startDrag = (type) => (e) => {
    e.preventDefault();
    const startVal = type === 'left' ? leftWidth : type === 'right' ? rightWidth : terminalHeight;
    const startPos = type === 'terminal' ? e.clientY : e.clientX;
    dragStateRef.current = { type, startVal, startPos };
    setDragging(type);
    document.body.style.cursor = type === 'terminal' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
  };

  useEffect(() => () => {
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', endDrag);
  }, [onDrag, endDrag]);

  useEffect(() => { act2StageRef.current = act2Stage; }, [act2Stage]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // The "current step" in Act 1 is the first task that isn't done yet —
  // everything before it is finished, everything after is preview. Used to
  // spotlight one task at a time and auto-scroll it into view.
  const act1ActiveTaskId = useMemo(
    () => (phase === 'act1' ? (ACT1_TASKS.find(t => !act1Objectives[t.id])?.id ?? null) : null),
    [phase, act1Objectives]
  );

  const act1StepCaps = useMemo(
    () => (phase === 'act1' ? getAct1StepCaps(act1ActiveTaskId, act1Complete) : null),
    [phase, act1ActiveTaskId, act1Complete]
  );

  const act1Unlocks = useMemo(() => {
    if (phase !== 'act1') {
      return {
        cmds: new Set(TERMINAL_COMMANDS),
        tabs: new Set(['alerts', 'logs', 'agents', 'notes'])
      };
    }
    const caps = act1StepCaps ?? getAct1StepCaps('a1-read-alert', false);
    const tabs = new Set(caps.tabs);
    if (act1Complete) tabs.add('agents');
    return { cmds: caps.cmds, tabs };
  }, [phase, act1StepCaps, act1Complete]);

  const act1UnlockIndex = useMemo(() => {
    if (phase !== 'act1') return ACT1_TASKS.length;
    const idx = ACT1_TASKS.findIndex(t => !act1Objectives[t.id]);
    return idx === -1 ? ACT1_TASKS.length : idx;
  }, [phase, act1Objectives]);

  useEffect(() => {
    if (act1ActiveTaskId && activeTaskRef.current) {
      activeTaskRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [act1ActiveTaskId]);

  // Live visual feedback: when new alert/log rows land, flash them briefly
  // and — if the player isn't already looking at that tab — glow the tab so
  // they notice something arrived. The flash clears itself after the
  // animation; the tab glow clears when they open the tab.
  useEffect(() => {
    const newAlertIds = alerts.filter(a => !seenIdsRef.current.has(a.id)).map(a => a.id);
    const newLogIds = logs.filter(l => !seenIdsRef.current.has(l.id)).map(l => l.id);
    const all = [...newAlertIds, ...newLogIds];
    if (all.length === 0) return;
    all.forEach(id => seenIdsRef.current.add(id));
    setRecentIds(prev => { const n = { ...prev }; all.forEach(id => { n[id] = true; }); return n; });
    setTabPulse(prev => ({
      alerts: prev.alerts || (newAlertIds.length > 0 && activeTabRef.current !== 'alerts'),
      logs: prev.logs || (newLogIds.length > 0 && activeTabRef.current !== 'logs')
    }));
    const t = setTimeout(() => {
      setRecentIds(prev => { const n = { ...prev }; all.forEach(id => { delete n[id]; }); return n; });
    }, 1600);
    return () => clearTimeout(t);
  }, [alerts, logs]);

  useEffect(() => {
    if (termScrollRef.current) termScrollRef.current.scrollTop = termScrollRef.current.scrollHeight;
  }, [termHistory]);

  useEffect(() => () => {
    if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    if (act2StartTimerRef.current) clearTimeout(act2StartTimerRef.current);
    if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
    if (spreadTimerRef.current) clearInterval(spreadTimerRef.current);
  }, []);

  const printLine = useCallback((text, type = 'output') => {
    setTermHistory(prev => [...prev, { text, type }]);
  }, []);

  const appendTimeline = useCallback((entry) => {
    const id = `tl-${timelineSeqRef.current++}`;
    const clock = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setIncidentTimeline(prev => [...prev, { id, clock, ...entry }]);
  }, []);

  const markAlertSeen = useCallback((alertId) => {
    if (!alertId) return;
    setSeenAlertIds(prev => (prev.includes(alertId) ? prev : [...prev, alertId]));
  }, []);

  const markAllAlertsSeen = useCallback(() => {
    setSeenAlertIds(alerts.map(a => a.id));
  }, [alerts]);

  const unreadAlertCount = useMemo(
    () => alerts.filter(a => !seenAlertIds.includes(a.id)).length,
    [alerts, seenAlertIds]
  );

  const displayedAlerts = useMemo(() => {
    let list = [...alerts];
    if (alertFilter === 'unread') list = list.filter(a => !seenAlertIds.includes(a.id));
    else if (alertFilter === 'high') list = list.filter(a => a.level >= 10);
    if (alertSort === 'severity') {
      list.sort((a, b) => b.level - a.level || String(b.ts || '').localeCompare(String(a.ts || '')));
    } else {
      list.reverse();
    }
    return list;
  }, [alerts, alertFilter, alertSort, seenAlertIds]);

  // Switching tabs also clears that tab's "unseen activity" glow.
  const selectTab = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'alerts' || tab === 'logs') {
      setTabPulse(prev => (prev[tab] ? { ...prev, [tab]: false } : prev));
    }
  }, []);

  const trySelectTab = useCallback((tab) => {
    if (phase === 'act1' && !act1Unlocks.tabs.has(tab)) {
      const nextTask = ACT1_TASKS[act1UnlockIndex];
      printLine(`The "${ACT1_TAB_LABELS[tab]}" tab unlocks when you reach "${nextTask?.title || 'the next step'}".`, 'mentor');
      return;
    }
    selectTab(tab);
  }, [phase, act1Unlocks.tabs, act1UnlockIndex, selectTab, printLine]);

  useEffect(() => {
    if (phase !== 'act1' || act1Complete) return;
    if (!act1Unlocks.tabs.has(activeTab)) {
      const first = [...act1Unlocks.tabs][0];
      if (first) selectTab(first);
    }
  }, [phase, act1Complete, act1Unlocks.tabs, activeTab, selectTab]);

  // --- Act 1 setup: reveal the whole tutorial incident immediately; the
  // player investigates at their own pace. ---
  const startAct1 = () => {
    clearSession();
    lastGuidedStepRef.current = null;
    const newLogs = ACT1_LOGS.map((l, i) => ({ ...l, id: `a1-${i}`, act: 1 }));
    const newAlerts = ACT1_ALERTS.map((a, i) => ({ ...a, id: `a1-alert-${i}`, act: 1 }));
    newLogs.forEach(l => seenIdsRef.current.add(l.id));
    newAlerts.forEach(a => seenIdsRef.current.add(a.id));
    setLogs(newLogs);
    setAlerts(newAlerts);
    setHostStatus(prev => ({ ...prev, [ACT1_HOST]: 'suspicious' }));
    setPanelsUnlocked({ casefile: true, topology: false });
    setPanelUnlockToast(null);
    setPlaybookOpen(false);
    setTabPulse({ alerts: false, logs: false });
    setRecentIds({});
    try {
      localStorage.setItem(SOCLAB_RETURNING_KEY, '1');
      if (localStorage.getItem(SOCLAB_TOUR_DONE_KEY) !== '1') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setTourStep(0));
        });
      }
    } catch { /* storage unavailable */ }
    setPhase('act1');
    printLine('=== INCIDENT TICKET #4471 OPENED ===', 'system');
    printLine(PIXEL.soc(SOC_PIXEL_HINTS.act1_start), 'mentor');
    printLine(`A high-severity alert just fired on WKSTN-07. Read it in Security Events, then answer the checklist question in the Training Room panel.`, 'mentor');
    printLine('Work through each step yourself — type commands in the terminal, switch tabs as needed, and submit answers when asked.', 'mentor');
  };

  const pinAct1TutorialEvidence = (taskId) => {
    if (phase !== 'act1') return;
    switch (taskId) {
      case 'a1-read-alert':
        setDiscoveredHosts(prev => ({ ...prev, [ACT1_HOST]: true }));
        break;
      case 'a1-query-auth':
        setDiscoveredHosts(prev => ({ ...prev, [ACT1_HOST]: true }));
        setDiscoveredIPs(prev => ({ ...prev, [ACT1_SOURCE_IP]: true }));
        setDiscoveredAccounts(prev => ({ ...prev, [ACT1_USER]: true }));
        break;
      case 'a1-lookup-ip':
        setDiscoveredHosts(prev => ({ ...prev, [ACT1_HOST]: true }));
        setDiscoveredIPs(prev => ({ ...prev, [ACT1_SOURCE_IP]: true }));
        setConfirmedIPs(prev => ({ ...prev, [ACT1_SOURCE_IP]: true }));
        break;
      default:
        break;
    }
  };

  const markAct1Objective = (id) => {
    if (act1Objectives[id]) return;
    const prevActiveId = ACT1_TASKS.find(t => !act1Objectives[t.id])?.id ?? null;
    const prevCaps = getAct1StepCaps(prevActiveId, false);
    const next = { ...act1Objectives, [id]: true };
    setAct1Objectives(next);
    const allDone = ACT1_TASKS.every(t => next[t.id]);
    const newActiveId = allDone ? null : ACT1_TASKS.find(t => !next[t.id])?.id ?? null;
    const newCaps = getAct1StepCaps(newActiveId, allDone);
    const newCmds = diffStepCmds(prevCaps, newCaps);
    const newTabs = diffStepTabs(prevCaps, newCaps);
    if (allDone) {
      setAct1Complete(true);
      printLine('=== TICKET #4471 RESOLVED ===', 'success');
      printLine('Nice work — you found the source, confirmed it was malicious, and locked it down in the right order. When you\'re ready, begin Act 2.', 'mentor');
    } else {
      printLine(`✔ Task complete: ${ACT1_TASKS.find(t => t.id === id)?.title}`, 'success');
      if (newCmds.length) printLine(`Unlocked commands: ${newCmds.join(', ')}`, 'mentor');
      if (newTabs.length) printLine(`Unlocked: ${newTabs.map(t => ACT1_TAB_LABELS[t]).join(', ')}`, 'mentor');
      if (newCmds.includes('isolate')) {
        printLine('SOC policy — investigate before you contain: isolate only hosts that appear in your evidence tray (from alerts, queries, or logs).', 'mentor');
        setIntelPolicyDismissed(false);
      }
      if (newCmds.includes('block-ip')) {
        printLine('SOC policy — confirm before you block: run lookup-ip on an address before block-ip. Logs show "observed"; intel confirms "malicious".', 'mentor');
      }
      if (newCmds.includes('disable-user')) {
        printLine('SOC policy — tie accounts to evidence: disable-user only works for usernames you surfaced in auth logs.', 'mentor');
      }
    }
  };

  // Answer-box check for the investigative tasks (Find the Source / Check
  // Threat Intel) — TryHackMe-style: type the fact you found, get checked
  // against accepted answers, and on a correct answer the task itself
  // completes (in addition to completing it the "command" way, which still
  // works too — whichever order a player gets there in is fine).
  const submitAnswer = (taskId) => {
    const task = ACT1_TASKS.find(t => t.id === taskId);
    if (!task || !task.answer) return;
    const raw = (answerDrafts[taskId] || '').trim().toLowerCase();
    if (!raw) return;
    const correct = task.answer.accept.some(a => a.toLowerCase() === raw);
    setAnswerFeedback(prev => ({ ...prev, [taskId]: correct ? 'correct' : 'incorrect' }));
    if (correct) {
      pinAct1TutorialEvidence(taskId);
      markAct1Objective(taskId);
    }
  };

  const revealHint = (taskId) => {
    setRevealedHints(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
  };

  // Same reveal-one-at-a-time pattern as Act 1, but keyed by Act 2 ticket
  // (stage id, or 'reroute' for the backup-C2 ticket) instead of task id.
  const revealAct2Hint = (key) => {
    setRevealedAct2Hints(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  };

  // Act 1: unlock the network map when containment tasks begin.
  useEffect(() => {
    if (phase !== 'act1' || panelsUnlocked.topology) return;
    const topoTasks = ['a1-isolate', 'a1-block-ip', 'a1-disable-user'];
    if (act1ActiveTaskId && topoTasks.includes(act1ActiveTaskId)) {
      setPanelsUnlocked(prev => ({ ...prev, topology: true }));
      setPanelUnlockToast('topology');
    }
  }, [phase, act1ActiveTaskId, panelsUnlocked.topology]);

  useEffect(() => {
    if (!panelUnlockToast) return;
    const t = setTimeout(() => setPanelUnlockToast(null), 4500);
    return () => clearTimeout(t);
  }, [panelUnlockToast]);

  const showTopology = phase === 'act2' || (phase === 'act1' && act1StepCaps?.showTopology && panelsUnlocked.topology);
  const showCasefile = phase === 'act1' || phase === 'act2';

  const act2HintsUsed = useMemo(
    () => Object.values(revealedAct2Hints).reduce((sum, n) => sum + n, 0),
    [revealedAct2Hints]
  );

  const evidenceHosts = useMemo(
    () => Object.keys(discoveredHosts).map(id => HOSTS.find(h => h.id === id)).filter(Boolean),
    [discoveredHosts]
  );
  const evidenceIPs = useMemo(() => Object.keys(discoveredIPs), [discoveredIPs]);
  const confirmedIPList = useMemo(() => Object.keys(confirmedIPs), [confirmedIPs]);
  const observedOnlyIPs = useMemo(
    () => evidenceIPs.filter(ip => !confirmedIPs[ip]),
    [evidenceIPs, confirmedIPs]
  );
  const evidenceAccounts = useMemo(() => Object.keys(discoveredAccounts), [discoveredAccounts]);
  const hasEvidence = evidenceHosts.length + evidenceIPs.length + evidenceAccounts.length > 0;
  const intelGatingActive = phase === 'act1' || phase === 'act2';

  const hasHostIntel = useCallback((hostId) => {
    if (phase === 'act1' && !act1Objectives['a1-query-auth']) return false;
    if (discoveredHosts[hostId]) return true;
    // Act 1: threat-intel on the attack IP ties back to the alerted host.
    if (phase === 'act1' && hostId === ACT1_HOST && act1Objectives['a1-lookup-ip']) return true;
    return false;
  }, [phase, act1Objectives, discoveredHosts]);
  const hasConfirmedIp = useCallback((ip) => !!confirmedIPs[ip], [confirmedIPs]);
  const hasAccountIntel = useCallback((user) => {
    if (phase === 'act1' && !act1Objectives['a1-query-auth']) return false;
    return !!discoveredAccounts[user];
  }, [phase, act1Objectives, discoveredAccounts]);

  useEffect(() => {
    if (phase !== 'act2' || !act2Stage || act2Outcome) {
      setStageSecondsLeft(null);
      return;
    }
    const tick = () => {
      if (!stageEnteredAtRef.current) return;
      const elapsed = Date.now() - stageEnteredAtRef.current;
      setStageSecondsLeft(Math.max(0, Math.ceil((ACT2_STAGE_INTERVAL_MS - elapsed) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, act2Stage, act2Outcome]);

  useEffect(() => {
    if (!intrusionBannerVisible) return;
    const t = setTimeout(() => setIntrusionBannerVisible(false), 9000);
    return () => clearTimeout(t);
  }, [intrusionBannerVisible]);

  useEffect(() => {
    if (intrusionBannerVisible && activeTab === 'alerts') setIntrusionBannerVisible(false);
  }, [intrusionBannerVisible, activeTab]);

  const registerEvidenceFromRow = useCallback((row) => {
    if (!row) return;
    if (row.host) setDiscoveredHosts(prev => ({ ...prev, [row.host]: true }));
    if (row.ip) setDiscoveredIPs(prev => ({ ...prev, [row.ip]: true }));
    if (row.user) setDiscoveredAccounts(prev => ({ ...prev, [row.user]: true }));
  }, []);

  const registerEvidenceFromAlert = useCallback((alert) => {
    if (!alert?.host) return;
    if (phase === 'act1' && !act1Objectives['a1-query-auth']) return;
    setDiscoveredHosts(prev => ({ ...prev, [alert.host]: true }));
  }, [phase, act1Objectives]);

  const finishDeskTour = useCallback(() => {
    setTourStep(null);
    try { localStorage.setItem(SOCLAB_TOUR_DONE_KEY, '1'); } catch { /* no-op */ }
  }, []);

  useEffect(() => {
    if (phase !== 'act1' || act1Complete || !act1ActiveTaskId) return;
    if (sessionRestored && lastGuidedStepRef.current === null) {
      lastGuidedStepRef.current = act1ActiveTaskId;
      return;
    }
    if (lastGuidedStepRef.current === act1ActiveTaskId) return;
    lastGuidedStepRef.current = act1ActiveTaskId;

    switch (act1ActiveTaskId) {
      case 'a1-read-alert':
        printLine('══ Step 1: Read the Alert ══', 'system');
        printLine('Read the WKSTN-07 row in Security Events, then submit the severity level in the Training Room checklist.', 'mentor');
        break;
      case 'a1-query-auth':
        printLine('══ Step 2: Find the Source ══', 'system');
        printLine('Switch to Threat Hunting and run: query host:wkstn-07 source:auth — or type the IP in the checklist if you spot it first.', 'mentor');
        break;
      case 'a1-lookup-ip':
        printLine('══ Step 3: Check Threat Intel ══', 'system');
        printLine('Run lookup-ip on the attacker IP from your query results. Read the intel output before you move on.', 'mentor');
        break;
      case 'a1-isolate':
        printLine('══ Step 4: Contain the Host ══', 'system');
        printLine('Run: isolate wkstn-07 — or use the network map quick action once it unlocks.', 'mentor');
        break;
      case 'a1-block-ip':
        printLine('══ Step 5: Block at the Firewall ══', 'system');
        printLine('Run: block-ip with the IP you confirmed in threat intel.', 'mentor');
        break;
      case 'a1-disable-user':
        printLine('══ Step 6: Lock the Account ══', 'system');
        printLine('Run: disable-user with the account name from your auth log query.', 'mentor');
        break;
      default:
        break;
    }
  }, [phase, act1Complete, act1ActiveTaskId, printLine, sessionRestored]);

  useEffect(() => {
    if (phase === 'act1' && act1ActiveTaskId && act1ActiveTaskId !== 'a1-read-alert' && tourStep !== null) {
      finishDeskTour();
    }
  }, [phase, act1ActiveTaskId, tourStep, finishDeskTour]);

  useEffect(() => {
    if (phase === 'act1' && !act1StepCaps?.showPlaybook && playbookOpen) setPlaybookOpen(false);
  }, [phase, act1StepCaps?.showPlaybook, playbookOpen]);

  const advanceDeskTour = useCallback(() => {
    setTourStep(prev => {
      if (prev === null) return null;
      if (prev >= DESK_TOUR_STEPS.length - 1) {
        finishDeskTour();
        return null;
      }
      return prev + 1;
    });
  }, [finishDeskTour]);

  const tourHighlight = tourStep !== null ? DESK_TOUR_STEPS[tourStep]?.target : null;

  useEffect(() => {
    if (tourStep !== null && DESK_TOUR_STEPS[tourStep]?.target === 'logs-tab') {
      if (phase !== 'act1' || act1Unlocks.tabs.has('logs')) selectTab('logs');
    }
    if (tourStep !== null && DESK_TOUR_STEPS[tourStep]?.target === 'playbook') {
      if (phase !== 'act1' || act1StepCaps?.showPlaybook) setPlaybookOpen(true);
    }
  }, [tourStep, selectTab, phase, act1Unlocks.tabs, act1StepCaps?.showPlaybook]);

  // --- Act 2 ambient churn: employees/phones joining and leaving the
  // network while the scenario runs, purely cosmetic on the topology.
  // The actual foothold's reconnect gets folded into this same churn at
  // the moment it happens (see revealStage's initial_access branch below)
  // so it doesn't visually stick out — the hostStatus halo is the real
  // tell, not the connect animation.
  const [act2Churn, setAct2Churn] = useState(() => bootField('act2Churn', []));
  const [flashHostId, setFlashHostId] = useState(null);

  const focusHostOnMap = useCallback((hostToken) => {
    const id = resolveHostId(hostToken);
    if (!id) return;
    const host = HOSTS.find(h => h.id === id);
    if (!host || host.undefendable) return;
    if (phase !== 'act2' && !panelsUnlocked.topology) return;
    setSelectedHost(id);
    if (flashHostTimeoutRef.current) clearTimeout(flashHostTimeoutRef.current);
    setFlashHostId(id);
    flashHostTimeoutRef.current = setTimeout(() => setFlashHostId(null), 2200);
  }, [phase, panelsUnlocked.topology]);

  // Each connected device gets a fixed slot (0..CHURN_SLOTS-1) for its
  // entire lifetime, freed only when it fully disconnects. Positioning by
  // slot (not by index-in-array) means one device leaving never reshuffles
  // — and therefore never overlaps — the ones still connected.
  const settleChurnJoins = useCallback(() => {
    setAct2Churn(prev => prev.map(d => (d.status === 'joining' ? { ...d, status: 'connected' } : d)));
  }, []);

  const pruneLeftChurn = useCallback(() => {
    setAct2Churn(prev => prev.filter(d => d.status !== 'leaving'));
  }, []);

  const churnBurstConnect = useCallback((count) => {
    setAct2Churn(prev => {
      const connectedIds = new Set(prev.map(d => d.id));
      const occupied = new Set(prev.map(d => d.slot));
      const pool = ACT2_CHURN_POOL.filter(d => !connectedIds.has(d.id));
      const picks = [];
      for (let i = 0; i < count && pool.length; i++) {
        const slot = nextFreeChurnSlot(occupied);
        if (slot === null) break;
        occupied.add(slot);
        const device = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        picks.push({ ...device, status: 'joining', slot });
      }
      if (!picks.length) return prev;
      setTimeout(settleChurnJoins, 1300);
      return [...prev, ...picks];
    });
  }, [settleChurnJoins]);

  const act2ChurnTick = useCallback(() => {
    setAct2Churn(prev => {
      if (prev.some(d => d.status === 'joining' || d.status === 'leaving')) return prev;
      const connectedIds = new Set(prev.map(d => d.id));
      const occupied = new Set(prev.map(d => d.slot));
      const pool = ACT2_CHURN_POOL.filter(d => !connectedIds.has(d.id));
      const freeSlot = nextFreeChurnSlot(occupied);
      const shouldConnect = pool.length > 0 && freeSlot !== null && (prev.length === 0 || Math.random() < 0.6);
      if (shouldConnect) {
        const device = pool[Math.floor(Math.random() * pool.length)];
        setTimeout(settleChurnJoins, 1300);
        return [...prev, { ...device, status: 'joining', slot: freeSlot }];
      }
      if (prev.length) {
        const idx = Math.floor(Math.random() * prev.length);
        setTimeout(pruneLeftChurn, 950);
        return prev.map((d, i) => (i === idx ? { ...d, status: 'leaving' } : d));
      }
      return prev;
    });
  }, [settleChurnJoins, pruneLeftChurn]);

  useEffect(() => {
    if (phase !== 'act2') { setAct2Churn([]); return; }
    let timer;
    const loop = () => {
      act2ChurnTick();
      timer = setTimeout(loop, 4000 + Math.random() * 5000);
    };
    timer = setTimeout(loop, 2500);
    return () => clearTimeout(timer);
  }, [phase, act2ChurnTick]);

  // Churn devices aren't in HOSTS, so they get their own small lane —
  // positioned strictly by their assigned slot, never by current array
  // index, so connected nodes hold still while others join/leave around them.
  const churnPos = useMemo(() => {
    const pos = {};
    act2Churn.forEach(d => {
      pos[d.id] = { x: ((d.slot + 1) / (CHURN_SLOTS + 1)) * TOPOLOGY_VIEW.width, y: ACT2_CHURN_LANE_Y };
    });
    return pos;
  }, [act2Churn]);

  // --- Act 2 petty tickets: mundane helpdesk noise that keeps arriving
  // while the real incident is in progress, so the player has to juggle
  // both — like a real SOC. Flavor/realism only: tracked for the debrief
  // but never folded into the scored axes, and never touches hostStatus,
  // discoveredHosts, or the kill-chain timers.
  const [act2PettyTickets, setAct2PettyTickets] = useState(() => bootField('act2PettyTickets', []));
  const [pettyStats, setPettyStats] = useState(() => bootField('pettyStats', { resolved: 0, missed: 0, correct: 0, incorrect: 0 }));
  const pettyUidRef = useRef(bootField('pettyUidNext', 0));

  const expirePettyTicket = useCallback((uid) => {
    setAct2PettyTickets(prev => {
      if (!prev.some(t => t.uid === uid)) return prev;
      setPettyStats(s => ({ ...s, missed: s.missed + 1 }));
      printLine('Helpdesk ticket auto-escalated to L2 — no response in time.', 'output');
      return prev.filter(t => t.uid !== uid);
    });
  }, [printLine]);

  // actionKey is one of the ticket's response keys (accept/deny/dispatch/
  // email) — exactly one per ticket is the sound call, the rest are
  // plausible-but-suboptimal, same as a real triage decision.
  const respondPettyTicket = useCallback((uid, actionKey) => {
    setAct2PettyTickets(prev => {
      const ticket = prev.find(t => t.uid === uid);
      if (!ticket) return prev;
      const resp = ticket.responses[actionKey];
      setPettyStats(s => ({
        ...s,
        resolved: s.resolved + 1,
        correct: s.correct + (resp.correct ? 1 : 0),
        incorrect: s.incorrect + (resp.correct ? 0 : 1)
      }));
      printLine(resp.feedback, resp.correct ? 'output' : 'mentor');
      return prev.filter(t => t.uid !== uid);
    });
  }, [printLine]);

  const spawnPettyTicket = useCallback(() => {
    setAct2PettyTickets(prev => {
      if (prev.length >= ACT2_PETTY_TICKET_MAX_CONCURRENT) return prev;
      const activeIds = new Set(prev.map(t => t.id));
      const pool = ACT2_PETTY_TICKET_POOL.filter(t => !activeIds.has(t.id));
      if (!pool.length) return prev;
      const def = pool[Math.floor(Math.random() * pool.length)];
      const uid = `petty-${pettyUidRef.current++}`;
      setTimeout(() => expirePettyTicket(uid), ACT2_PETTY_TICKET_SLA_MS);
      printLine(`Helpdesk ticket opened: ${def.label}`, 'output');
      return [...prev, { ...def, uid }];
    });
  }, [expirePettyTicket, printLine]);

  // Runs the whole time Act 2 is live and unresolved — including the quiet
  // pre-recon window. That's the point: the player should be heads-down on
  // routine helpdesk tickets, the same way a real SOC shift starts, while
  // the real attack works in the background underneath it. The interval
  // tightens as act2UrgencyLevel climbs, so the queue itself gets busier
  // the longer the real incident goes unnoticed.
  useEffect(() => {
    if (phase !== 'act2' || act2Outcome) return;
    let timer;
    const loop = () => {
      spawnPettyTicket();
      const level = act2UrgencyLevelRef.current;
      const base = level >= 2 ? 9000 : level >= 1 ? 14000 : 20000;
      const jitter = level >= 2 ? 7000 : level >= 1 ? 10000 : 14000;
      timer = setTimeout(loop, base + Math.random() * jitter);
    };
    timer = setTimeout(loop, 6000 + Math.random() * 5000);
    return () => clearTimeout(timer);
  }, [phase, act2Outcome, spawnPettyTicket]);

  useEffect(() => {
    if (phase !== 'act2') { setAct2PettyTickets([]); setPettyStats({ resolved: 0, missed: 0, correct: 0, incorrect: 0 }); }
  }, [phase]);

  // --- Act 2 "urgent" nudge tickets: if the player hasn't actually engaged
  // the real incident a while after it quietly starts, the noise itself
  // starts tilting toward it — vaguer, second-hand reports that escalate in
  // tone without ever naming the compromised host. Pure nudge, never scored,
  // and stops the moment the player engages (closes a kill-chain ticket or
  // takes a real containment action).
  const [act2UrgentTickets, setAct2UrgentTickets] = useState(() => bootField('act2UrgentTickets', []));
  const [act2UrgencyLevel, setAct2UrgencyLevel] = useState(() => bootField('act2UrgencyLevel', 0));
  const urgentUidRef = useRef(bootField('urgentUidNext', 0));
  const act2UrgentTicketsRef = useRef([]);
  useEffect(() => { act2UrgentTicketsRef.current = act2UrgentTickets; }, [act2UrgentTickets]);

  const hasEngagedIncident = useMemo(() => (
    Object.values(resolvedAct2Tickets).some(Boolean) ||
    Object.values(hostStatus).some(s => s === 'isolated') ||
    disabledUsers.length > 0 ||
    blockedIPs.length > 0
  ), [resolvedAct2Tickets, hostStatus, disabledUsers, blockedIPs]);

  const acknowledgeUrgentTicket = useCallback((uid) => {
    setAct2UrgentTickets(prev => prev.filter(t => t.uid !== uid));
    setActiveTab('alerts');
    printLine('Acknowledged — switching over to Security Events.', 'mentor');
  }, [printLine]);

  const spawnUrgentTicket = useCallback((level) => {
    setAct2UrgentTickets(prev => {
      const pool = ACT2_URGENT_TICKET_POOL.filter(t => t.level === level);
      if (!pool.length) return prev;
      const def = pool[Math.floor(Math.random() * pool.length)];
      const uid = `urgent-${urgentUidRef.current++}`;
      setTimeout(() => {
        setAct2UrgentTickets(p => p.filter(t => t.uid !== uid));
      }, ACT2_URGENT_TICKET_SLA_MS);
      printLine(`Incoming: ${def.label} — "${def.desc}"`, 'alert');
      // One urgent ticket on screen at a time — a fresh, more pointed one
      // replaces the last rather than piling up.
      return [{ ...def, uid }];
    });
  }, [printLine]);

  // Checked every few seconds while the real attack is live. Three tiers,
  // roughly tracking "about a stage went by", "two stages", "three stages"
  // of the player not having touched the real incident at all — escalating
  // urgency to nudge without ever telling them exactly what's wrong or where.
  useEffect(() => {
    if (phase !== 'act2' || !act2Stage || act2Outcome) {
      if (escalationTimerRef.current) { clearInterval(escalationTimerRef.current); escalationTimerRef.current = null; }
      return;
    }
    escalationTimerRef.current = setInterval(() => {
      if (hasEngagedIncident) {
        if (act2UrgencyLevelRef.current > 0) {
          act2UrgencyLevelRef.current = 0;
          setAct2UrgencyLevel(0);
          setAct2UrgentTickets([]);
        }
        return;
      }
      const startedAt = act2RealStartRef.current;
      if (!startedAt) return;
      const elapsed = Date.now() - startedAt;
      const targetLevel = elapsed > ACT2_STAGE_INTERVAL_MS * 3 ? 3
        : elapsed > ACT2_STAGE_INTERVAL_MS * 2 ? 2
        : elapsed > ACT2_STAGE_INTERVAL_MS ? 1
        : 0;
      if (targetLevel > act2UrgencyLevelRef.current) {
        act2UrgencyLevelRef.current = targetLevel;
        setAct2UrgencyLevel(targetLevel);
        spawnUrgentTicket(targetLevel);
        if (targetLevel === 2) {
          printLine('The helpdesk queue is getting noisier than usual — might be worth checking Security Events.', 'mentor');
        } else if (targetLevel === 3) {
          printLine('Multiple reports are stacking up at once now. That pattern usually means something real is happening — check Security Events.', 'mentor');
        }
      } else if (targetLevel > 0 && act2UrgentTicketsRef.current.length === 0) {
        // Still ignoring it and the last nudge already expired unanswered —
        // keep nagging at the current tier rather than going quiet.
        spawnUrgentTicket(targetLevel);
      }
    }, 8000);
    return () => { if (escalationTimerRef.current) { clearInterval(escalationTimerRef.current); escalationTimerRef.current = null; } };
  }, [phase, act2Stage, act2Outcome, hasEngagedIncident, spawnUrgentTicket, printLine]);

  useEffect(() => {
    if (phase !== 'act2') {
      setAct2UrgentTickets([]);
      setAct2UrgencyLevel(0);
      act2UrgencyLevelRef.current = 0;
      act2RealStartRef.current = null;
    }
  }, [phase]);

  // --- Lateral spread chain reaction --------------------------------------
  // Keep a ref mirror of act2InfectedHosts so the polling interval below
  // always reads the latest map without having to tear down/rebuild itself
  // every time a host gets added or removed.
  useEffect(() => { act2InfectedHostsRef.current = act2InfectedHosts; }, [act2InfectedHosts]);

  useEffect(() => {
    if (phase !== 'act2') setAct2InfectedHosts({});
  }, [phase]);

  // --- Isolation complaint tickets: isolating a workstation takes a real
  // employee offline. The clean way to close that out is contain -> remediate
  // -> restore; restoring without remediating, or just leaving someone cut
  // off indefinitely, are both modeled as a real cost rather than a free
  // action. Flavor/realism only (same as petty/urgent tickets) — never folded
  // into the scored axes.
  const ISOLATION_COMPLAINT_GRACE_MS = 32000;
  const [remediatedHosts, setRemediatedHosts] = useState(() => bootField('remediatedHosts', {}));
  const [act2ComplaintTickets, setAct2ComplaintTickets] = useState(() => bootField('act2ComplaintTickets', []));
  const isolatedSinceRef = useRef(bootField('isolatedSince', {}));
  const complaintLevelRef = useRef(bootField('complaintLevels', {}));
  const complaintUidRef = useRef(bootField('complaintUidNext', 0));

  // Auto-save playable progress so a refresh mid-class doesn't wipe the case.
  useEffect(() => {
    if (!RESUMABLE_PHASES.has(phase)) return;
    const timer = setTimeout(() => {
      try {
        const c2Intel = act2Scenario.intel?.[ACT2_C2_IP_PRIMARY];
        localStorage.setItem(SOCLAB_SESSION_KEY, JSON.stringify({
          v: 1,
          savedAt: Date.now(),
          act2Variant: {
            entryHostId: ACT2_ENTRY_HOST,
            entryHostName: ACT2_ENTRY_HOST_NAME,
            entryUser: ACT2_ENTRY_USER,
            stolenAccount: ACT2_STOLEN_ACCOUNT,
            c2Primary: ACT2_C2_IP_PRIMARY,
            c2Backup: ACT2_C2_IP_BACKUP,
            c2Asn: c2Intel?.asn ?? '',
            c2Geo: c2Intel?.geo ?? ''
          },
          phase,
          logs,
          alerts,
          hostStatus,
          blockedIPs,
          disabledUsers,
          act1Objectives,
          act1Complete,
          answerDrafts,
          answerFeedback,
          revealedHints,
          revealedAct2Hints,
          act2Stage,
          act2Outcome,
          act2Rerouted,
          unnecessaryActions,
          act2ResponseSpeed,
          studentName,
          panelsUnlocked,
          discoveredHosts,
          discoveredIPs,
          confirmedIPs,
          discoveredAccounts,
          ticketDrafts,
          ticketFeedback,
          resolvedAct2Tickets,
          selectedHost,
          notes,
          termHistory,
          termInput,
          activeTab,
          logQuery,
          noteDraft,
          reportAnswers,
          act2InfectedHosts,
          leftWidth,
          rightWidth,
          terminalHeight,
          act2Churn,
          act2PettyTickets,
          pettyStats,
          act2UrgentTickets,
          act2UrgencyLevel,
          remediatedHosts,
          act2ComplaintTickets,
          pettyRailExpanded,
          intrusionBannerVisible,
          incidentTimeline,
          seenAlertIds,
          reconFireAt: reconFireAtRef.current,
          stageEnteredAt: stageEnteredAtRef.current,
          act2RealStart: act2RealStartRef.current,
          everInfected: everInfectedRef.current,
          isolatedSince: isolatedSinceRef.current,
          complaintLevels: complaintLevelRef.current,
          pettyUidNext: pettyUidRef.current,
          urgentUidNext: urgentUidRef.current,
          complaintUidNext: complaintUidRef.current
        }));
      } catch { /* storage unavailable */ }
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    phase, logs, alerts, hostStatus, blockedIPs, disabledUsers, act1Objectives, act1Complete,
    answerDrafts, answerFeedback, revealedHints, revealedAct2Hints, act2Stage, act2Outcome,
    act2Rerouted, unnecessaryActions, act2ResponseSpeed, studentName, panelsUnlocked,
    discoveredHosts, discoveredIPs, confirmedIPs, discoveredAccounts, ticketDrafts, ticketFeedback,
    resolvedAct2Tickets, selectedHost, notes, termHistory, termInput, activeTab, logQuery,
    noteDraft, reportAnswers, act2InfectedHosts, leftWidth, rightWidth, terminalHeight,
    act2Churn, act2PettyTickets, pettyStats, act2UrgentTickets, act2UrgencyLevel,
    remediatedHosts, act2ComplaintTickets, pettyRailExpanded, intrusionBannerVisible,
    incidentTimeline, seenAlertIds,
    ACT2_ENTRY_HOST, ACT2_ENTRY_HOST_NAME, ACT2_ENTRY_USER, ACT2_STOLEN_ACCOUNT,
    ACT2_C2_IP_PRIMARY, ACT2_C2_IP_BACKUP, act2Scenario
  ]);

  const clearHostComplaint = useCallback((hostId) => {
    delete isolatedSinceRef.current[hostId];
    delete complaintLevelRef.current[hostId];
    setAct2ComplaintTickets(prev => prev.filter(t => t.hostId !== hostId));
  }, []);

  const respondComplaintTicket = useCallback((uid, actionKey) => {
    setAct2ComplaintTickets(prev => {
      const ticket = prev.find(t => t.uid === uid);
      if (!ticket) return prev;
      const resp = ticket.responses[actionKey];
      printLine(resp.feedback, resp.correct ? 'output' : 'mentor');
      if (actionKey === 'prioritize') setTermInput(`remediate ${ticket.hostId}`);
      return prev.filter(t => t.uid !== uid);
    });
  }, [printLine]);

  const spawnComplaintTicket = useCallback((host, level) => {
    setAct2ComplaintTickets(prev => {
      const existing = prev.find(t => t.hostId === host.id);
      if (existing && existing.level >= level) return prev;
      prev = prev.filter(t => t.hostId !== host.id);
      const uid = `complaint-${complaintUidRef.current++}`;
      const mild = {
        label: `${host.sub} — Locked Out`,
        desc: `"My computer (${host.name}) got disconnected and nobody's told me why. I've got work due — any idea when I'll get it back?"`
      };
      const sharp = {
        label: `${host.sub} — Still Waiting`,
        desc: `"It's been a while now and ${host.name} is still cut off. This is really starting to hold me up — can someone please clean this up and give it back?"`
      };
      const def = level >= 2 ? sharp : mild;
      printLine(`Complaint ticket opened: ${def.label}`, 'output');
      return [...prev, {
        uid,
        hostId: host.id,
        level,
        label: def.label,
        desc: def.desc,
        responses: {
          prioritize: { label: 'Apologize — Prioritize Remediation', correct: true, feedback: `Acknowledged — terminal pre-filled with "remediate ${host.id}". Clean it up, then restore.` },
          deny: { label: 'Dismiss — Security Takes Priority', correct: false, feedback: `Containment is the right call, but ignoring the employee outright just makes the next complaint sharper.` },
          email: { label: 'Email — Working On It', correct: false, feedback: `Buys a little goodwill, but doesn't actually move ${host.name} any closer to being clean and back online.` }
        }
      }];
    });
  }, [printLine]);

  // Polls every isolated host that hasn't been remediated yet; the longer it
  // sits isolated, the sharper the complaint gets (mirrors the urgent-ticket
  // escalation pattern, scoped per host instead of globally).
  useEffect(() => {
    if (phase !== 'act2' || act2Outcome) return;
    const timer = setInterval(() => {
      HOSTS.forEach(h => {
        // Only workstations/mobile have a named employee who'd actually
        // file a personal complaint — isolating a server is an IT-wide
        // event, not "my computer's offline" for one person.
        if (h.type !== 'workstation' && h.type !== 'mobile') return;
        if (hostStatus[h.id] !== 'isolated' || remediatedHosts[h.id]) return;
        const since = isolatedSinceRef.current[h.id];
        if (!since) return;
        const elapsed = Date.now() - since;
        const targetLevel = elapsed > ISOLATION_COMPLAINT_GRACE_MS * 2 ? 2 : elapsed > ISOLATION_COMPLAINT_GRACE_MS ? 1 : 0;
        if (targetLevel > 0 && targetLevel >= (complaintLevelRef.current[h.id] || 0)) {
          complaintLevelRef.current[h.id] = targetLevel;
          spawnComplaintTicket(h, targetLevel);
        }
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [phase, act2Outcome, hostStatus, remediatedHosts, spawnComplaintTicket]);

  useEffect(() => {
    if (phase !== 'act2') {
      setAct2ComplaintTickets([]);
      setRemediatedHosts({});
      isolatedSinceRef.current = {};
      complaintLevelRef.current = {};
    }
  }, [phase]);

  // Ambient log trickle for the quiet pre-recon window only — stops the
  // instant the real recon stage begins (act2Stage flips truthy), since
  // revealStage takes over the log feed from there.
  const ambientFillerIdRef = useRef(0);
  useEffect(() => {
    if (phase !== 'act2' || act2Stage || act2Outcome) return;
    let timer;
    const loop = () => {
      setLogs(prev => [...prev, { ...randomAmbientFillerLog(), id: `ambient-filler-${ambientFillerIdRef.current++}`, act: 2 }]);
      timer = setTimeout(loop, 9000 + Math.random() * 9000);
    };
    timer = setTimeout(loop, 6000 + Math.random() * 6000);
    return () => clearTimeout(timer);
  }, [phase, act2Stage, act2Outcome]);

  // --- Act 2: the adaptive intrusion ---
  const revealStage = useCallback((stageId) => {
    const stage = ACT2_STAGES[stageId];
    if (!stage) return;
    stageEnteredAtRef.current = Date.now();
    appendTimeline({
      side: 'adversary',
      title: stage.label,
      detail: stage.ticket
    });
    setLogs(prev => [...prev, ...stage.logs.map((l, i) => ({ ...l, id: `${stageId}-${i}`, act: 2 }))]);
    setAlerts(prev => [...prev, ...stage.alerts.map((a, i) => ({ ...a, id: `${stageId}-alert-${i}`, act: 2 }))]);
    // Alerts always name the host they fired on, so a host is "discovered"
    // for ticket-form purposes the moment its alert lands — no extra
    // digging required for that part. IPs/accounts stay gated to explicit
    // query/lookup-ip use (see cmdQuery/cmdLookupIp below).
    setDiscoveredHosts(prev => {
      const next = { ...prev };
      stage.alerts.forEach(a => { if (a.host) next[a.host] = true; });
      return next;
    });
    if (stageId === 'recon') {
      setHostStatus(prev => ({ ...prev, 'web-01': 'suspicious' }));
    } else if (stageId === 'initial_access') {
      setHostStatus(prev => ({ ...prev, [ACT2_ENTRY_HOST]: 'compromised' }));
      // The real foothold reconnects at the exact moment a couple of
      // ordinary devices do too — on the topology it just looks like more
      // shift-change churn. Spotting it has to come from the logs/alerts,
      // not from "the one node that popped up looking different."
      churnBurstConnect(2);
      setFlashHostId(ACT2_ENTRY_HOST);
      setTimeout(() => setFlashHostId(null), 2200);
    } else if (stageId === 'privesc_credtheft') {
      setHostStatus(prev => ({ ...prev, 'dc-01': 'suspicious' }));
    } else if (stageId === 'lateral_movement') {
      setHostStatus(prev => ({ ...prev, 'fs-01': 'compromised' }));
    }
    printLine(`>>> New activity detected: ${stage.label}`, 'alert');
  }, [printLine, churnBurstConnect, appendTimeline]);

  const concludeAct2 = useCallback((outcome) => {
    act2OutcomeRef.current = outcome;
    setAct2Outcome(outcome);
    // Reward how fast the correct action landed within the stage it
    // succeeded at, not just which stage that was. 1.0 = instant response,
    // 0 = used the entire stage window. breach_completed means containment
    // never landed at all, so it gets no speed credit.
    if (outcome !== 'breach_completed' && stageEnteredAtRef.current) {
      const elapsed = Date.now() - stageEnteredAtRef.current;
      const fraction = Math.max(0, Math.min(1, 1 - elapsed / ACT2_STAGE_INTERVAL_MS));
      setAct2ResponseSpeed(fraction);
    } else if (outcome === 'breach_completed') {
      setAct2ResponseSpeed(0);
    }
    if (stageTimerRef.current) { clearInterval(stageTimerRef.current); stageTimerRef.current = null; }
    if (spreadTimerRef.current) { clearInterval(spreadTimerRef.current); spreadTimerRef.current = null; }
    appendTimeline({
      side: 'system',
      title: ACT2_OUTCOME_LABEL[outcome],
      detail: act2Scenario.outcomeNarrative[outcome]
    });
    printLine(`=== INTRUSION CONCLUDED: ${ACT2_OUTCOME_LABEL[outcome]} ===`, (outcome === 'breach_completed' || outcome === 'overrun') ? 'error' : 'success');
    printLine('Type "report" to write up the incident.', 'mentor');
  }, [printLine, appendTimeline, act2Scenario]);

  // Lateral spread: infects one more eligible host (and, if this was
  // triggered by an already-infected host's own clock running out, resets
  // that host's clock too so it keeps spreading on its own schedule until
  // it's isolated). sourceHostId is null for the first "seed" infection,
  // which fires off an unresolved main kill-chain ticket timing out.
  const spreadFrom = useCallback((sourceHostId) => {
    let spreadTarget = null;
    setHostStatus(prevStatus => {
      const eligible = HOSTS.filter(h =>
        ACT2_SPREADABLE_TYPES.includes(h.type) &&
        prevStatus[h.id] !== 'compromised' &&
        prevStatus[h.id] !== 'isolated'
      );
      if (!eligible.length) return prevStatus;
      spreadTarget = eligible[Math.floor(Math.random() * eligible.length)];
      return { ...prevStatus, [spreadTarget.id]: 'compromised' };
    });
    if (!spreadTarget) return;
    appendTimeline({
      side: 'adversary',
      title: 'Lateral spread',
      detail: `${spreadTarget.name} (${spreadTarget.sub}) is now compromised`
    });
    printLine(`>>> Lateral spread detected: ${spreadTarget.name} (${spreadTarget.sub}) is now showing the same indicators as the rest of this intrusion.`, 'alert');
    everInfectedRef.current[spreadTarget.id] = true;
    setAct2InfectedHosts(prev => {
      const next = { ...prev, [spreadTarget.id]: Date.now() };
      if (sourceHostId) next[sourceHostId] = Date.now();
      return next;
    });
  }, [printLine, appendTimeline]);

  useEffect(() => {
    if (phase !== 'act2') {
      if (spreadTimerRef.current) { clearInterval(spreadTimerRef.current); spreadTimerRef.current = null; }
      return;
    }
    spreadTimerRef.current = setInterval(() => {
      if (act2OutcomeRef.current) return;
      const now = Date.now();
      Object.entries(act2InfectedHostsRef.current).forEach(([hostId, since]) => {
        if (now - since >= ACT2_SPREAD_INTERVAL_MS) spreadFrom(hostId);
      });
    }, 4000);
    return () => { if (spreadTimerRef.current) { clearInterval(spreadTimerRef.current); spreadTimerRef.current = null; } };
  }, [phase, spreadFrom]);

  // If literally every endpoint ends up compromised at once — the player
  // never contained a single machine while this was loose — that's a clean
  // loss state, distinct from (and worse than) letting the scripted breach
  // run its course. Checked passively off hostStatus, same pattern as the
  // rest of Act 2's win/lose evaluation.
  useEffect(() => {
    if (phase !== 'act2' || act2Outcome) return;
    const targets = HOSTS.filter(h => ACT2_SPREADABLE_TYPES.includes(h.type));
    if (targets.length > 0 && targets.every(h => hostStatus[h.id] === 'compromised')) {
      concludeAct2('overrun');
    }
  }, [phase, act2Outcome, hostStatus, concludeAct2]);

  // Checked only at the moment of a containment action (isolate/disable-user),
  // never retroactively by the stage clock. That distinction is what keeps
  // "isolate every host in the first five seconds" from being a free win:
  // evaluated against whatever stage is current *right now*, an isolation
  // made before the relevant alert has even fired matches no case below and
  // is never re-checked later once the stage (and its evidence) catches up.
  const evaluateContainment = useCallback((stageOverride, statusOverride, usersOverride, ipsOverride) => {
    const stage = stageOverride ?? act2Stage;
    const statuses = statusOverride ?? hostStatus;
    const users = usersOverride ?? disabledUsers;
    const ips = ipsOverride ?? blockedIPs;
    if (!stage || act2Outcome) return null;

    if (stage === 'initial_access' && statuses[ACT2_ENTRY_HOST] === 'isolated') {
      return 'contained_early';
    }
    if (stage === 'privesc_credtheft' && (statuses[ACT2_ENTRY_HOST] === 'isolated' || users.includes(ACT2_STOLEN_ACCOUNT))) {
      return 'contained_at_privesc';
    }
    if (stage === 'lateral_movement' && (
      statuses['fs-01'] === 'isolated' ||
      statuses['dc-01'] === 'isolated' ||
      statuses[ACT2_ENTRY_HOST] === 'isolated' ||
      users.includes(ACT2_STOLEN_ACCOUNT)
    )) {
      return 'contained_at_lateral';
    }
    return null;
  }, [act2Stage, hostStatus, disabledUsers, blockedIPs, act2Outcome]);

  const checkReroute = useCallback((statusOverride, ipsOverride) => {
    const statuses = statusOverride ?? hostStatus;
    const ips = ipsOverride ?? blockedIPs;
    if (act2Rerouted || act2Outcome || !act2Stage) return;
    if (act2Stage === 'recon') return;
    if (ips.includes(ACT2_C2_IP_PRIMARY) && statuses[ACT2_ENTRY_HOST] !== 'isolated') {
      setAct2Rerouted(true);
      setLogs(prev => [...prev, ...ACT2_C2_REROUTE_LOGS.map((l, i) => ({ ...l, id: `reroute-${i}`, act: 2 }))]);
      setAlerts(prev => [...prev, { ...ACT2_C2_REROUTE_ALERT, id: 'reroute-alert', act: 2 }]);
      if (ACT2_C2_REROUTE_ALERT.host) {
        setDiscoveredHosts(prev => ({ ...prev, [ACT2_C2_REROUTE_ALERT.host]: true }));
      }
      appendTimeline({
        side: 'adversary',
        title: 'Backup C2 channel',
        detail: 'Attacker rerouted command traffic after primary IP was blocked'
      });
      printLine('>>> New activity detected: Backup C2 channel established', 'alert');
    }
  }, [act2Rerouted, act2Outcome, act2Stage, hostStatus, blockedIPs, printLine, appendTimeline]);

  // Reads/writes the stage via a ref (not the setState-updater form) so the
  // side effects below (revealStage/concludeAct2 each call setState) never
  // run twice from React StrictMode's double-invocation of updater
  // functions in dev.
  // fromTimeout is true when this fires because the ticket's countdown bar
  // ran out on its own (the setInterval case), false when the player closed
  // the ticket early and we're just fast-forwarding to the next one. Only a
  // real timeout seeds a new lateral-spread infection — closing a ticket in
  // time never costs you a machine.
  const advanceTick = useCallback((fromTimeout = true) => {
    const currentStage = act2StageRef.current;
    if (!currentStage || act2Outcome) return;
    const idx = ACT2_STAGE_ORDER.indexOf(currentStage);
    if (idx === ACT2_STAGE_ORDER.length - 1) {
      concludeAct2('breach_completed');
      return;
    }
    const nextStage = ACT2_STAGE_ORDER[idx + 1];
    act2StageRef.current = nextStage;
    setAct2Stage(nextStage);
    revealStage(nextStage);
    if (fromTimeout) {
      appendTimeline({
        side: 'adversary',
        title: 'Stage window missed',
        detail: `Kill chain advanced to ${ACT2_STAGES[nextStage]?.label || nextStage}`
      });
      printLine('No response landed before that window closed — whatever this is, it just used the time to move onto another machine.', 'mentor');
      spreadFrom(null);
    }
  }, [act2Outcome, concludeAct2, revealStage, printLine, spreadFrom, appendTimeline]);

  // Closing a ticket early (rather than waiting out its countdown) restarts
  // the stage clock fresh, the same way Overcooked moves you on to the next
  // order as soon as you've served the current one rather than padding out
  // the wait.
  const resetStageTimer = useCallback(() => {
    if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    stageTimerRef.current = setInterval(advanceTick, ACT2_STAGE_INTERVAL_MS);
  }, [advanceTick]);

  const fireReconStage = useCallback(() => {
    act2StageRef.current = 'recon';
    setAct2Stage('recon');
    revealStage('recon');
    act2RealStartRef.current = Date.now();
    act2UrgencyLevelRef.current = 0;
    stageEnteredAtRef.current = Date.now();
    stageTimerRef.current = setInterval(advanceTick, ACT2_STAGE_INTERVAL_MS);
    setIntrusionBannerVisible(true);
    setPettyRailExpanded(false);
    setTabPulse(prev => ({ ...prev, alerts: true }));
    selectTab('alerts');
    printLine('>>> First intrusion alert — check Security Events and the P1 ticket rail above.', 'alert');
  }, [advanceTick, revealStage, selectTab, printLine]);

  // After a page refresh mid-Act-2, restart the recon delay or stage clock
  // from the timestamps we saved — so resume doesn't freeze or fast-forward
  // the live incident.
  const timersRestoredRef = useRef(false);
  useEffect(() => {
    if (timersRestoredRef.current || !sessionRestored) return;
    timersRestoredRef.current = true;
    const boot = INITIAL_BOOT;
    if (!boot || boot.phase !== 'act2' || boot.act2Outcome) return;

    if (!boot.act2Stage && boot.reconFireAt) {
      const remaining = boot.reconFireAt - Date.now();
      if (remaining <= 0) fireReconStage();
      else {
        act2StartTimerRef.current = setTimeout(() => {
          reconFireAtRef.current = null;
          fireReconStage();
        }, remaining);
      }
    } else if (boot.act2Stage) {
      stageEnteredAtRef.current = boot.stageEnteredAt ?? Date.now();
      const remaining = ACT2_STAGE_INTERVAL_MS - (Date.now() - stageEnteredAtRef.current);
      const startInterval = () => {
        stageTimerRef.current = setInterval(advanceTick, ACT2_STAGE_INTERVAL_MS);
      };
      if (remaining <= 0) {
        advanceTick(true);
        startInterval();
      } else {
        stageTimerRef.current = setTimeout(() => {
          startInterval();
        }, remaining);
      }
    }
  }, [sessionRestored, fireReconStage, advanceTick]);

  // Clicking "Begin Act 2" doesn't drop the student straight into the live
  // clock — it goes to a one-time orientation card first (phase
  // 'act2-intro') explaining what's different about Act 2, with no
  // case-specific info. The clock only starts once they click through that.
  const startAct2 = () => {
    setPhase('act2-intro');
  };

  const beginAct2Monitoring = () => {
    setPanelsUnlocked({ casefile: true, topology: true });
    setPhase('act2');
    setActiveTab('alerts');
    // Whatever was isolated/blocked/disabled during Act 1 doesn't carry into
    // Act 2 — every workstation starts the shift back online and clean, so
    // the player isn't punished (or accidentally helped) by leftover Act 1
    // state before the real incident has even started.
    setHostStatus(() => { const s = {}; HOSTS.forEach(h => { s[h.id] = 'normal'; }); return s; });
    setBlockedIPs([]);
    setDisabledUsers([]);
    setRemediatedHosts({});
    isolatedSinceRef.current = {};
    complaintLevelRef.current = {};
    setAct2ComplaintTickets([]);
    setAct2InfectedHosts({});
    act2InfectedHostsRef.current = {};
    everInfectedRef.current = {};
    printLine('=== ACT 2: LIVE MONITORING ===', 'system');
    printLine('Network looks quiet right now — that won\'t last. Work the helpdesk queue and keep an eye on the feed; you will need to notice when something real shows up.', 'mentor');
    // Nothing is wrong yet on purpose: the intrusion doesn't open with an
    // alarm. Several real-time minutes of ordinary traffic (and a queue of
    // petty helpdesk tickets to work) play first so the real first alert
    // (recon) actually has to be noticed rather than just being the thing
    // waiting on screen when the act starts — a normal SOC shift, then the
    // attack sneaks in underneath it.
    act2StageRef.current = null;
    setAct2Stage(null);
    setIncidentTimeline([]);
    timelineSeqRef.current = 0;
    setIntelPolicyDismissed(false);
    setLogs(prev => [...prev, ...ACT2_AMBIENT_OPENING_LOGS.map((l, i) => ({ ...l, id: `ambient-open-${i}`, act: 2 }))]);
    if (act2StartTimerRef.current) clearTimeout(act2StartTimerRef.current);
    const delay = ACT2_SNEAKY_DELAY_MIN_MS + Math.random() * (ACT2_SNEAKY_DELAY_MAX_MS - ACT2_SNEAKY_DELAY_MIN_MS);
    reconFireAtRef.current = Date.now() + delay;
    act2StartTimerRef.current = setTimeout(() => {
      reconFireAtRef.current = null;
      fireReconStage();
    }, delay);
    appendTimeline({
      side: 'system',
      title: 'Monitoring shift started',
      detail: 'Routine helpdesk traffic — watch for the first intrusion alert'
    });
    setIntrusionBannerVisible(false);
    setPettyRailExpanded(true);
  };

  // --- Command handlers -----------------------------------------------
  const cmdAlerts = (argStr) => {
    const filtered = runQueryFilter(alerts, argStr).map(a => `[L${a.level}] ${a.ts} ${a.host} — ${a.rule}: ${a.description}`);
    if (filtered.length === 0) {
      printLine('No alerts match.', 'output');
    } else {
      filtered.forEach(line => printLine(line, 'output'));
    }
  };

  const cmdQuery = (argStr) => {
    if (!argStr.trim()) { printLine('Usage: query <expr>  (try: query host:wkstn-07 source:auth)', 'error'); return; }
    const matched = runQueryFilter(logs, argStr);
    if (matched.length === 0) {
      printLine('No log lines match that query.', 'output');
    } else {
      matched.forEach(row => printLine(`${row.ts} [${row.source}] ${row.host} ${row.ip ? `(${row.ip}) ` : ''}— ${row.raw}`, 'output'));
    }
    if (phase === 'act1' && !act1Objectives['a1-query-auth'] && matched.some(r => r.ip === ACT1_SOURCE_IP)) {
      markAct1Objective('a1-query-auth');
    }
    if (matched.length > 0) {
      setDiscoveredHosts(prev => {
        const next = { ...prev };
        matched.forEach(r => { if (r.host) next[r.host] = true; });
        return next;
      });
      setDiscoveredIPs(prev => {
        const next = { ...prev };
        matched.forEach(r => { if (r.ip) next[r.ip] = true; });
        return next;
      });
      setDiscoveredAccounts(prev => {
        const next = { ...prev };
        matched.forEach(r => { if (r.user) next[r.user] = true; });
        return next;
      });
    }
  };

  const cmdLookupIp = (ip) => {
    if (!ip) { printLine('Usage: lookup-ip <ip>', 'error'); return; }
    const intel = act2Scenario.intel[ip] || THREAT_INTEL[ip];
    if (!intel) {
      printLine(`No threat intel on file for ${ip}.`, 'output');
    } else {
      printLine(`THREAT INTEL — ${ip}`, 'system');
      printLine(`  ASN: ${intel.asn}`, 'output');
      printLine(`  Geo: ${intel.geo}`, 'output');
      printLine(`  Reputation: ${intel.reputation}`, 'output');
      printLine(`  First seen: ${intel.firstSeen}`, 'output');
    }
    if (phase === 'act1' && ip === ACT1_SOURCE_IP) {
      markAct1Objective('a1-lookup-ip');
      setDiscoveredHosts(prev => ({ ...prev, [ACT1_HOST]: true }));
    }
    setDiscoveredIPs(prev => ({ ...prev, [ip]: true }));
    setConfirmedIPs(prev => ({ ...prev, [ip]: true }));
  };

  const cmdIsolate = (token) => {
    const host = resolveHost(token);
    if (!host) { printLine(`Unknown host: ${token}`, 'error'); return; }
    if (host.undefendable) { printLine(`${host.name} cannot be isolated from here.`, 'error'); return; }
    if (intelGatingActive && !hasHostIntel(host.id)) {
      if (phase === 'act1' && act1Objectives['a1-lookup-ip'] && host.id === ACT1_HOST) {
        printLine(`${host.name} should be isolatable after threat-intel — run query host:wkstn-07 source:auth if the evidence tray is empty.`, 'mentor');
      } else if (phase === 'act1' && !act1Objectives['a1-query-auth']) {
        printLine(`${host.name} is not in your evidence yet — complete the log query step before isolating.`, 'mentor');
      } else {
        printLine(`${host.name} is not in your evidence yet — review Security Events, run query, or pivot from logs before isolating.`, 'mentor');
      }
      return;
    }
    const nextStatus = { ...hostStatus, [host.id]: 'isolated' };
    setHostStatus(nextStatus);
    printLine(`Active Response "agent isolation" triggered on ${host.name} (agent ${host.agentId || '—'}) — disconnected from the network.`, 'success');
    if (phase === 'act2') {
      isolatedSinceRef.current[host.id] = Date.now();
      setRemediatedHosts(prev => { if (!prev[host.id]) return prev; const next = { ...prev }; delete next[host.id]; return next; });
      printLine(`${host.sub} is offline until this is cleaned up — run "remediate ${host.id}" before restoring it, or expect a complaint ticket if it sits isolated too long.`, 'output');
      appendTimeline({
        side: 'analyst',
        title: `Isolated ${host.name}`,
        detail: `${host.sub} cut off from the network`
      });
      if (act2InfectedHosts[host.id]) {
        setAct2InfectedHosts(prev => { const next = { ...prev }; delete next[host.id]; return next; });
        printLine(`${host.name} contained before the infection could jump anywhere else.`, 'success');
      }
    }
    if (phase === 'act2' && hostStatus[host.id] !== 'isolated' && !REPORT_RUBRIC.correctHosts.includes(host.id) && !everInfectedRef.current[host.id]) {
      setUnnecessaryActions(prev => prev + 1);
      printLine(`${host.name} shows no indicators of compromise — isolating it disrupts business operations for no investigative reason. You'll need to restore it before you can close out the case.`, 'error');
    }
    if (phase === 'act1' && host.id === ACT1_HOST) markAct1Objective('a1-isolate');
    const blocked = evaluateContainment(undefined, nextStatus);
    if (blocked) concludeAct2(blocked);
    else checkReroute(nextStatus, undefined);
  };

  const cmdRemediate = (token) => {
    const host = resolveHost(token);
    if (!host) { printLine(`Unknown host: ${token}`, 'error'); return; }
    if (hostStatus[host.id] !== 'isolated') { printLine(`${host.name} isn't isolated — nothing to remediate.`, 'error'); return; }
    setRemediatedHosts(prev => ({ ...prev, [host.id]: true }));
    clearHostComplaint(host.id);
    printLine(`Remediation run on ${host.name} — AV sweep + cleanup complete. Safe to restore.`, 'success');
  };

  const cmdRestore = (token) => {
    const host = resolveHost(token);
    if (!host) { printLine(`Unknown host: ${token}`, 'error'); return; }
    if (phase === 'act2' && hostStatus[host.id] === 'isolated' && REPORT_RUBRIC.correctHosts.includes(host.id) && !remediatedHosts[host.id]) {
      printLine(`${host.name} was actually part of the breach and hasn't been remediated yet — reconnecting it now risks letting the infection back online. Run "remediate ${host.id}" first, or proceed anyway if you're sure.`, 'error');
    }
    if (phase === 'act2') clearHostComplaint(host.id);
    setHostStatus(prev => ({ ...prev, [host.id]: 'normal' }));
    printLine(`Active Response reversed on ${host.name} — agent reconnected to the network.`, 'output');
  };

  const cmdBlockIp = (ip) => {
    if (!ip) { printLine('Usage: block-ip <ip>', 'error'); return; }
    if (intelGatingActive && !hasConfirmedIp(ip)) {
      if (discoveredIPs[ip]) {
        printLine(`${ip} is observed in logs but not intel-confirmed — run lookup-ip ${ip} before block-ip.`, 'mentor');
      } else {
        printLine(`Unknown IP ${ip} — find it with query, then confirm with lookup-ip before blocking.`, 'mentor');
      }
      return;
    }
    if (blockedIPs.includes(ip)) { printLine(`${ip} is already blocked.`, 'output'); return; }
    const nextIPs = [...blockedIPs, ip];
    setBlockedIPs(nextIPs);
    printLine(`Active Response "firewall-drop" triggered — ${ip} blocked at EDGE-FW01.`, 'success');
    if (phase === 'act2') {
      appendTimeline({
        side: 'analyst',
        title: `Blocked ${ip}`,
        detail: 'Perimeter firewall-drop active response'
      });
    }
    if (phase === 'act2' && !REPORT_RUBRIC.correctIPs.includes(ip)) {
      setUnnecessaryActions(prev => prev + 1);
      printLine(`${ip} has no ties to this incident — blocking it is wasted effort and you'll need to unblock it before closing the case.`, 'error');
    }
    if (phase === 'act1' && ip === ACT1_SOURCE_IP) markAct1Objective('a1-block-ip');
    checkReroute(undefined, nextIPs);
  };

  const cmdUnblockIp = (ip) => {
    setBlockedIPs(prev => prev.filter(i => i !== ip));
    printLine(`firewall-drop reversed — ${ip} unblocked.`, 'output');
  };

  const cmdDisableUser = (user) => {
    if (!user) { printLine('Usage: disable-user <user>', 'error'); return; }
    if (intelGatingActive && !hasAccountIntel(user)) {
      printLine(`No auth logs tie "${user}" to this incident yet — query source:auth before disable-user.`, 'mentor');
      return;
    }
    if (disabledUsers.includes(user)) { printLine(`"${user}" is already disabled.`, 'output'); return; }
    const nextUsers = [...disabledUsers, user];
    setDisabledUsers(nextUsers);
    printLine(`Active Response "disable-account" triggered — account "${user}" disabled.`, 'success');
    if (phase === 'act2') {
      appendTimeline({
        side: 'analyst',
        title: `Disabled account ${user}`,
        detail: 'Active Response account lockout'
      });
    }
    if (phase === 'act2' && !REPORT_RUBRIC.correctAccounts.includes(user)) {
      setUnnecessaryActions(prev => prev + 1);
      printLine(`"${user}" was never tied to this incident — disabling it locks out a real employee for no reason. Re-enable it before closing the case.`, 'error');
    }
    if (phase === 'act1' && user === ACT1_USER) markAct1Objective('a1-disable-user');
    const blocked = evaluateContainment(undefined, undefined, nextUsers);
    if (blocked) concludeAct2(blocked);
  };

  const cmdEnableUser = (user) => {
    setDisabledUsers(prev => prev.filter(u => u !== user));
    printLine(`disable-account reversed — account "${user}" re-enabled.`, 'output');
  };

  // --- Act 2 ticket response form ---------------------------------------
  // Changing the action resets the target — the two dropdowns are
  // dependent (target options differ per action), so a stale target from a
  // previous action choice should never silently carry over.
  const updateTicketDraft = (key, field, value) => {
    setTicketDrafts(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value, ...(field === 'action' ? { target: '' } : {}) }
    }));
    setTicketFeedback(prev => ({ ...prev, [key]: null }));
  };

  // The form IS the action: closing a ticket with a valid combo calls the
  // exact same cmd* functions a typed terminal command would, so there is
  // no separate "logging" step and no way for the form to drift out of
  // sync with what isolate/block-ip/disable-user actually do.
  const closeTicket = (key, stageDef) => {
    const draft = ticketDrafts[key] || {};
    if (!draft.action || !draft.target) {
      setTicketFeedback(prev => ({ ...prev, [key]: 'Pick an action and a target before closing the ticket.' }));
      return;
    }
    const valid = (stageDef.validResponses || []).some(r => r.action === draft.action && r.target === draft.target);
    if (!valid) {
      setTicketFeedback(prev => ({ ...prev, [key]: "That combination doesn't match what the evidence points to — keep digging before you close it." }));
      return;
    }
    if (draft.action === 'isolate') cmdIsolate(draft.target);
    else if (draft.action === 'block-ip') cmdBlockIp(draft.target);
    else if (draft.action === 'disable-account') cmdDisableUser(draft.target);

    setTicketFeedback(prev => ({ ...prev, [key]: null }));
    setTicketDrafts(prev => ({ ...prev, [key]: {} }));

    if (key === 'reroute') {
      if (!act2OutcomeRef.current) setResolvedAct2Tickets(prev => ({ ...prev, reroute: true }));
      return;
    }
    const isFinalStage = key === ACT2_STAGE_ORDER[ACT2_STAGE_ORDER.length - 1];
    if (isFinalStage) {
      // Exfiltration is the point of no return by design (evaluateContainment
      // has no winning case for it) — closing it still logs the action for
      // the report, but doesn't fast-forward past the breach conclusion.
      if (!act2OutcomeRef.current) setResolvedAct2Tickets(prev => ({ ...prev, [key]: true }));
      return;
    }
    // Closed before the clock ran out — like clearing a plate in Overcooked,
    // move straight to the next ticket instead of idling out the rest of
    // the countdown. Skip this if the action already concluded Act 2.
    if (!act2OutcomeRef.current && act2StageRef.current === key) {
      advanceTick(false);
      resetStageTimer();
    }
  };

  const cmdStatus = () => {
    if (phase === 'act1') {
      printLine(`ACT 1 — Ticket #4471 (${ACT1_TASKS.filter(t => act1Objectives[t.id]).length}/${ACT1_TASKS.length} tasks complete)`, 'system');
      ACT1_TASKS.forEach(t => printLine(`  [${act1Objectives[t.id] ? 'x' : ' '}] ${t.title}`, 'output'));
    } else if (phase === 'act2') {
      const stage = ACT2_STAGES[act2Stage];
      printLine(`ACT 2 — current observed stage: ${stage ? stage.label : 'monitoring'}`, 'system');
      printLine(act2Outcome ? `Outcome: ${ACT2_OUTCOME_LABEL[act2Outcome]}` : 'Investigation ongoing.', 'output');
    } else {
      printLine(`Phase: ${phase}`, 'system');
    }
  };

  const cmdHosts = () => {
    HOSTS.filter(h => !h.undefendable).forEach(h => {
      printLine(`${h.name.padEnd(10)} ${h.sub || ''} — ${hostStatus[h.id].toUpperCase()}`, 'output');
    });
  };

  const cmdKillProcess = (host, proc) => {
    if (!host || !proc) { printLine('Usage: kill-process <host> <process-name>', 'error'); return; }
    printLine(`Termination request sent for "${proc}" on ${host}. Logged for the incident record.`, 'success');
  };

  const runLogQuerySimilar = useCallback((row) => {
    if (phase === 'act1' && !act1LogActionAllowed(act1StepCaps, 'query')) return;
    const parts = [];
    if (row.host) parts.push(`host:${row.host}`);
    if (row.source) parts.push(`source:${row.source}`);
    if (row.ip) parts.push(`ip:${row.ip}`);
    const expr = parts.join(' ');
    if (!expr) return;
    selectTab('logs');
    setLogQuery(expr);
    registerEvidenceFromRow(row);
    cmdQuery(expr);
  }, [registerEvidenceFromRow, selectTab, cmdQuery, phase, act1StepCaps]);

  const runInvestigateAlert = useCallback((alert) => {
    markAlertSeen(alert.id);
    if (phase === 'act1' && !act1StepCaps?.showInvestigate) return;

    registerEvidenceFromAlert(alert);
    if (alert.host) focusHostOnMap(alert.host);
    const expr = alertToQueryExpr(alert);
    if (!expr) return;
    selectTab('logs');
    setLogQuery(expr);
    cmdQuery(expr);
    printLine(`> query ${expr}  (via Security Events)`, 'gui-echo');
    printLine(`Pivoting from alert → query ${expr}`, 'mentor');
  }, [markAlertSeen, registerEvidenceFromAlert, focusHostOnMap, selectTab, cmdQuery, printLine, phase, act1StepCaps]);

  const investigateCurrentStage = useCallback(() => {
    if (!act2Stage) {
      selectTab('alerts');
      return;
    }
    const stageAlert = alerts.find(a => typeof a.id === 'string' && a.id.startsWith(`${act2Stage}-alert`));
    if (stageAlert) runInvestigateAlert(stageAlert);
    else {
      selectTab('alerts');
      printLine('Check Security Events for the newest high-severity alerts.', 'mentor');
    }
  }, [act2Stage, alerts, runInvestigateAlert, selectTab, printLine]);

  const runLogLookupIp = useCallback((ip, guiSource = 'Threat Hunting') => {
    if (!ip) return;
    setDiscoveredIPs(prev => ({ ...prev, [ip]: true }));
    printLine(`> lookup-ip ${ip}  (via ${guiSource})`, 'gui-echo');
    cmdLookupIp(ip);
  }, [cmdLookupIp, printLine]);

  const runLogIsolateHost = useCallback((hostId, guiSource = 'Threat Hunting') => {
    if (!hostId) return;
    const host = HOSTS.find(h => h.id === hostId);
    if (!host || host.undefendable) return;
    registerEvidenceFromRow({ host: hostId });
    printLine(`> isolate ${hostId}  (via ${guiSource})`, 'gui-echo');
    cmdIsolate(hostId);
  }, [cmdIsolate, registerEvidenceFromRow, printLine]);

  // Shared by the terminal "notes" command and the direct input field in
  // the Case Notes tab — a real analyst jots notes straight into the
  // ticket's notes box, not through a CLI, so that's the primary path.
  const addNote = (text) => {
    if (!text || !text.trim()) return;
    setNotes(prev => [...prev, text.trim()]);
  };

  const cmdNotes = (text) => {
    if (!text) { printLine('Usage: notes <text>', 'error'); return; }
    addNote(text);
    printLine('Note added to case file.', 'output');
  };

  const cmdReport = () => {
    if (phase !== 'act2' || !act2Outcome) {
      printLine('Nothing to report yet — Act 2 is still ongoing.', 'error');
      return;
    }
    const leftoverHosts = Object.keys(hostStatus).filter(id => hostStatus[id] === 'isolated' && !REPORT_RUBRIC.correctHosts.includes(id) && !everInfectedRef.current[id]);
    const leftoverIPs = blockedIPs.filter(ip => !REPORT_RUBRIC.correctIPs.includes(ip));
    const leftoverAccounts = disabledUsers.filter(u => !REPORT_RUBRIC.correctAccounts.includes(u));
    if (leftoverHosts.length || leftoverIPs.length || leftoverAccounts.length) {
      printLine('Before you can write up the incident, restore normal business operations for anything locked down that was never actually part of the breach:', 'error');
      leftoverHosts.forEach(id => {
        const h = HOSTS.find(x => x.id === id);
        printLine(`  isolated, no evidence: ${h ? h.name : id} — try: restore ${id}`, 'error');
      });
      leftoverIPs.forEach(ip => printLine(`  blocked, no evidence: ${ip} — try: unblock-ip ${ip}`, 'error'));
      leftoverAccounts.forEach(u => printLine(`  disabled, no evidence: "${u}" — try: enable-user ${u}`, 'error'));
      return;
    }
    setReportAnswers(prev => {
      const next = buildReportPrefill(prev, discoveredHosts, discoveredIPs, confirmedIPs, discoveredAccounts);
      const prefilled = next.hosts.length > prev.hosts.length
        || (next.ips && next.ips !== prev.ips)
        || (!prev.account && next.account);
      if (prefilled) setReportPrefillNotice(true);
      return next;
    });
    setPhase('report');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const raw = termInput;
    if (!raw.trim()) return;
    const trimmed = raw.trim();
    const hist = termCmdHistoryRef.current;
    if (hist[hist.length - 1] !== trimmed) hist.push(trimmed);
    termCmdHistoryPosRef.current = null;
    executeTerminalCommand(trimmed);
    setTermInput('');
  };

  const executeTerminalCommand = (raw, guiSource = null) => {
    const displayLine = guiSource ? `> ${raw}  (via ${guiSource})` : raw;
    setTermHistory(prev => [...prev, { text: displayLine, type: 'input' }]);
    const [cmdRaw, ...rest] = raw.trim().split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const argStr = rest.join(' ');
    if (phase === 'act1' && !isCommandUnlocked(cmd)) {
      printLine(`"${cmd}" unlocks later in the tutorial — finish "${ACT1_TASKS[act1UnlockIndex]?.title}" first. Type "help" to see what's available now.`, 'mentor');
      return;
    }
    switch (cmd) {
      case 'help': cmdHelp(); break;
      case 'status': cmdStatus(); break;
      case 'hosts': case 'topology': cmdHosts(); break;
      case 'alerts': cmdAlerts(argStr); break;
      case 'query': cmdQuery(argStr); break;
      case 'lookup-ip': cmdLookupIp(rest[0]); break;
      case 'isolate': cmdIsolate(rest[0]); break;
      case 'remediate': cmdRemediate(rest[0]); break;
      case 'restore': cmdRestore(rest[0]); break;
      case 'block-ip': cmdBlockIp(rest[0]); break;
      case 'unblock-ip': cmdUnblockIp(rest[0]); break;
      case 'disable-user': cmdDisableUser(rest[0]); break;
      case 'enable-user': cmdEnableUser(rest[0]); break;
      case 'kill-process': cmdKillProcess(rest[0], rest[1]); break;
      case 'notes': cmdNotes(argStr); break;
      case 'report': cmdReport(); break;
      case 'clear': setTermHistory([]); break;
      default: printLine(`Unknown command: ${cmd}. Type "help" for a list.`, 'error');
    }
  };

  const getAvailableCommands = useCallback(() => {
    if (phase !== 'act1') return TERMINAL_COMMANDS;
    return TERMINAL_COMMANDS.filter(c => act1Unlocks.cmds.has(c));
  }, [phase, act1Unlocks.cmds]);

  const completeTerminalInput = useCallback((input) => {
    const trimmed = input;
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/);
    const hasTrailingSpace = trimmed.endsWith(' ');
    const cmdPart = parts[0].toLowerCase();

    if (parts.length === 1 && !hasTrailingSpace) {
      const matches = getAvailableCommands().filter(c => c.startsWith(cmdPart));
      if (matches.length === 1) return `${matches[0]} `;
      if (matches.length > 1) {
        const common = longestCommonPrefix(matches);
        if (common.length > cmdPart.length) return common;
        printLine(`Commands: ${matches.join('  ')}`, 'output');
      }
      return null;
    }

    const cmd = cmdPart;
    const argPrefix = (hasTrailingSpace ? '' : parts[parts.length - 1]).toLowerCase();
    const replaceLast = (completed) => {
      if (hasTrailingSpace) return `${trimmed}${completed}`;
      return [...parts.slice(0, -1), completed].join(' ');
    };

    if (HOST_ARG_COMMANDS.has(cmd)) {
      const matches = COMPLETABLE_HOST_IDS.filter(id => id.startsWith(argPrefix));
      if (matches.length === 1) return replaceLast(matches[0]);
      if (matches.length > 1) {
        const common = longestCommonPrefix(matches);
        if (common.length > argPrefix.length) return replaceLast(common);
        printLine(`Hosts: ${matches.join('  ')}`, 'output');
      }
    } else if (IP_ARG_COMMANDS.has(cmd)) {
      const known = [...new Set([...Object.keys(confirmedIPs), ...Object.keys(discoveredIPs), ...blockedIPs])];
      const matches = known.filter(ip => ip.startsWith(argPrefix));
      if (matches.length === 1) return replaceLast(matches[0]);
    } else if (USER_ARG_COMMANDS.has(cmd)) {
      const known = [...new Set([...Object.keys(discoveredAccounts), ...disabledUsers])];
      const matches = known.filter(u => u.toLowerCase().startsWith(argPrefix));
      if (matches.length === 1) return replaceLast(matches[0]);
    }
    return null;
  }, [getAvailableCommands, confirmedIPs, discoveredIPs, blockedIPs, discoveredAccounts, disabledUsers, printLine]);

  const handleTermKeyDown = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const hist = termCmdHistoryRef.current;
      if (!hist.length) return;
      if (termCmdHistoryPosRef.current === null) termCmdHistoryPosRef.current = hist.length;
      if (termCmdHistoryPosRef.current > 0) {
        termCmdHistoryPosRef.current -= 1;
        setTermInput(hist[termCmdHistoryPosRef.current]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const hist = termCmdHistoryRef.current;
      if (termCmdHistoryPosRef.current === null) return;
      if (termCmdHistoryPosRef.current < hist.length - 1) {
        termCmdHistoryPosRef.current += 1;
        setTermInput(hist[termCmdHistoryPosRef.current]);
      } else {
        termCmdHistoryPosRef.current = null;
        setTermInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const completed = completeTerminalInput(termInput);
      if (completed !== null) setTermInput(completed);
    }
  }, [completeTerminalInput, termInput]);

  const cmdHelp = useCallback(() => {
    if (phase !== 'act1') {
      printLine(HELP_TEXT, 'output');
      return;
    }
    const { cmds } = act1Unlocks;
    printLine('AVAILABLE COMMANDS (tutorial — more unlock as you progress)', 'system');
    const blurbs = {
      help: 'show this list',
      status: 'current act, stage, and progress',
      clear: 'clear terminal scrollback',
      alerts: 'list Security Events from the terminal',
      query: 'Threat Hunting search, e.g. query host:wkstn-07 source:auth',
      'lookup-ip': 'check an IP against threat intel',
      isolate: 'Wazuh agent isolation — cut a host off the network',
      remediate: 'clean an isolated host before restore',
      restore: 'bring a remediated host back online',
      'block-ip': 'block an IP at the perimeter firewall',
      'unblock-ip': 'remove a firewall block',
      'disable-user': 'lock a compromised account',
      'enable-user': 're-enable a disabled account',
      notes: 'add a case note',
      hosts: 'list every host and its status',
      topology: 'same as hosts'
    };
    [...cmds].sort().forEach(c => printLine(`  ${c.padEnd(14)} ${blurbs[c] || ''}`, 'output'));
    if (act1UnlockIndex < ACT1_TASKS.length) {
      printLine(`Next unlock after: "${ACT1_TASKS[act1UnlockIndex]?.title}"`, 'mentor');
    }
  }, [phase, act1Unlocks, act1UnlockIndex, printLine]);

  const isCommandUnlocked = useCallback((cmd) => {
    if (phase !== 'act1') return true;
    if (cmd === 'report') return false;
    return act1Unlocks.cmds.has(cmd);
  }, [phase, act1Unlocks.cmds]);

  const visibleLogs = useMemo(() => runQueryFilter(logs, logQuery), [logs, logQuery]);

  // --- Report scoring ----------------------------------------------------
  const stageReachedRank = useMemo(() => {
    if (!act2Outcome) return 0;
    return { contained_early: 1, contained_at_privesc: 2, contained_at_lateral: 3, breach_completed: 4 }[act2Outcome] || 0;
  }, [act2Outcome]);

  const dynamicCorrectHosts = useMemo(() => {
    if (stageReachedRank >= 3) return REPORT_RUBRIC.correctHosts;
    if (stageReachedRank === 2) return REPORT_RUBRIC.correctHosts.slice(0, 2);
    if (stageReachedRank === 1) return REPORT_RUBRIC.correctHosts.slice(0, 1);
    return [];
  }, [stageReachedRank]);

  const dynamicCorrectIPs = useMemo(() => {
    const ips = [];
    if (stageReachedRank >= 1) ips.push(ACT2_C2_IP_PRIMARY);
    if (act2Rerouted) ips.push(ACT2_C2_IP_BACKUP);
    return ips;
  }, [stageReachedRank, act2Rerouted]);

  const dynamicCorrectAccount = stageReachedRank >= 2 ? ACT2_STOLEN_ACCOUNT : null;

  const submitReport = () => {
    const rootCauseScore = REPORT_RUBRIC.rootCauseKeywords.some(k => reportAnswers.rootCause.toLowerCase().includes(k)) ? 100 : 0;

    const selectedHosts = reportAnswers.hosts;
    const correctHostHits = selectedHosts.filter(h => dynamicCorrectHosts.includes(h)).length;
    const falseHostHits = selectedHosts.filter(h => !dynamicCorrectHosts.includes(h)).length;
    const hostsScore = dynamicCorrectHosts.length === 0
      ? (selectedHosts.length === 0 ? 100 : 60)
      : Math.max(0, Math.round((correctHostHits / dynamicCorrectHosts.length) * 100) - falseHostHits * 15);

    const typedIPs = reportAnswers.ips.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    const ipHits = typedIPs.filter(ip => dynamicCorrectIPs.includes(ip)).length;
    const ipFalse = typedIPs.filter(ip => !dynamicCorrectIPs.includes(ip)).length;
    const ipsScore = dynamicCorrectIPs.length === 0
      ? 100
      : Math.max(0, Math.round((ipHits / dynamicCorrectIPs.length) * 100) - ipFalse * 15);

    const accountScore = dynamicCorrectAccount === null
      ? 100
      : (reportAnswers.account.trim().toLowerCase() === dynamicCorrectAccount.toLowerCase() ? 100 : 0);

    const correctRemOptions = REPORT_RUBRIC.remediationOptions.filter(o => o.correct).map(o => o.id);
    const selectedRem = reportAnswers.remediation;
    const remHits = selectedRem.filter(id => correctRemOptions.includes(id)).length;
    const remFalse = selectedRem.filter(id => !correctRemOptions.includes(id)).length;
    const remediationScore = Math.max(0, Math.round((remHits / correctRemOptions.length) * 100) - remFalse * 15);

    const reportScore = Math.round((rootCauseScore + hostsScore + ipsScore + accountScore + remediationScore) / 5);
    const containmentScore = ACT2_OUTCOME_SCORE[act2Outcome] ?? 0;
    // Every isolate/block-ip/disable-account aimed at something that turned
    // out not to be part of the breach costs real business disruption —
    // this is what keeps "lock down the entire network just in case" from
    // being a free, costless strategy.
    const disciplineScore = Math.max(0, 100 - unnecessaryActions * 25);
    // Hints are a safety net, not a free lookup — every hint revealed during
    // Act 2 (across every ticket) shaves points off, so guessing your way to
    // "Stuck?" on every stage isn't the same as working the evidence.
    const hintsRevealed = Object.values(revealedAct2Hints).reduce((sum, n) => sum + n, 0);
    const hintScore = Math.max(0, 100 - hintsRevealed * 15);
    const speedScore = Math.round(act2ResponseSpeed * 100);
    const overallScore = Math.round(
      containmentScore * 0.3 + reportScore * 0.3 + disciplineScore * 0.15 + hintScore * 0.1 + speedScore * 0.15
    );
    const grade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F';

    setReportResult({
      overallScore, grade, containmentScore, reportScore, disciplineScore, unnecessaryActions, hintScore, hintsRevealed, speedScore,
      breakdown: { rootCauseScore, hostsScore, ipsScore, accountScore, remediationScore },
      // Flavor stat only — handled outside the kill chain, so it's shown for
      // realism/context but never factored into overallScore.
      pettyStats
    });
    saveRosterEntry({
      name: studentName.trim() || 'Unnamed student',
      completedAt: new Date().toLocaleString(),
      grade,
      overallScore,
      containmentScore,
      reportScore,
      disciplineScore,
      hintScore,
      speedScore,
      unnecessaryActions,
      hintsRevealed,
      pettyTicketsResolved: pettyStats.resolved,
      pettyTicketsMissed: pettyStats.missed,
      pettyTicketsCorrect: pettyStats.correct,
      pettyTicketsIncorrect: pettyStats.incorrect,
      outcome: ACT2_OUTCOME_LABEL[act2Outcome] || act2Outcome
    });
    setPhase('debrief');
    clearSession();
    if (qualifiesForBlackSignalUnlock(
      { overallScore, grade, containmentScore, reportScore, disciplineScore, unnecessaryActions, hintScore, hintsRevealed, speedScore, breakdown: { rootCauseScore, hostsScore, ipsScore, accountScore, remediationScore }, pettyStats },
      act2Outcome
    )) {
      unlockBlackSignal();
    }
  };

  const resetAll = () => {
    clearSession();
    lastGuidedStepRef.current = null;
    if (stageTimerRef.current) clearInterval(stageTimerRef.current);
    if (act2StartTimerRef.current) clearTimeout(act2StartTimerRef.current);
    if (spreadTimerRef.current) { clearInterval(spreadTimerRef.current); spreadTimerRef.current = null; }
    setAct2InfectedHosts({}); act2InfectedHostsRef.current = {}; everInfectedRef.current = {};
    act2OutcomeRef.current = null;
    setPhase('briefing');
    setLogs([]); setAlerts([]);
    setHostStatus(() => { const s = {}; HOSTS.forEach(h => { s[h.id] = 'normal'; }); return s; });
    setBlockedIPs([]); setDisabledUsers([]);
    setAct1Objectives(() => { const o = {}; ACT1_TASKS.forEach(ob => { o[ob.id] = false; }); return o; });
    setAct1Complete(false); setAct2Stage(null); setAct2Outcome(null); setAct2Rerouted(false);
    setUnnecessaryActions(0);
    setAct2ResponseSpeed(1); stageEnteredAtRef.current = null;
    setAct2Churn([]); setFlashHostId(null);
    setAct2PettyTickets([]); setPettyStats({ resolved: 0, missed: 0, correct: 0, incorrect: 0 });
    setAct2UrgentTickets([]); setAct2UrgencyLevel(0); act2UrgencyLevelRef.current = 0; act2RealStartRef.current = null;
    if (escalationTimerRef.current) { clearInterval(escalationTimerRef.current); escalationTimerRef.current = null; }
    setAct2ComplaintTickets([]); setRemediatedHosts({});
    isolatedSinceRef.current = {}; complaintLevelRef.current = {};
    setAnswerDrafts({}); setAnswerFeedback({}); setRevealedHints({}); setRevealedAct2Hints({});
    setDiscoveredHosts({}); setDiscoveredIPs({}); setConfirmedIPs({}); setDiscoveredAccounts({});
    setIntelPolicyDismissed(false);
    setTicketDrafts({}); setTicketFeedback({}); setResolvedAct2Tickets({});
    setSelectedHost(null); setNotes([]); setTermHistory([]); setTermInput('');
    setReportAnswers({ summary: '', rootCause: '', hosts: [], ips: '', account: '', remediation: [] });
    setReportResult(null);
    setRecentIds({}); setTabPulse({ alerts: false, logs: false });
    seenIdsRef.current = new Set();
    setPanelsUnlocked({ casefile: false, topology: false });
    setPanelUnlockToast(null);
    setTourStep(null);
    setPlaybookOpen(false);
    setIntrusionBannerVisible(false);
    setPettyRailExpanded(true);
    setIncidentTimeline([]);
    timelineSeqRef.current = 0;
    setSeenAlertIds([]);
  };

  // Renders the dropdown response form for one ticket (a stage, or the
  // 'reroute' backup-C2 ticket). Target options are gated to whatever the
  // student has actually surfaced via query/lookup-ip/alerts so far —
  // closing a ticket is a real SOC analyst move (act on confirmed
  // evidence), not a quiz with the full host list handed to you.
  const renderTicketForm = (key, stageDef) => {
    const draft = ticketDrafts[key] || {};
    const feedback = ticketFeedback[key];
    const targetOptions = draft.action === 'isolate'
      ? HOSTS.filter(h => discoveredHosts[h.id] && !h.undefendable).map(h => ({ value: h.id, label: h.name }))
      : draft.action === 'block-ip'
        ? Object.keys(confirmedIPs).map(ip => ({ value: ip, label: ip }))
        : draft.action === 'disable-account'
          ? Object.keys(discoveredAccounts).map(u => ({ value: u, label: u }))
          : [];
    return (
      <div className="soclab-order-ticket-form">
        <div className="soclab-order-ticket-form-row">
          <select
            className="soclab-order-ticket-select"
            value={draft.action || ''}
            onChange={(e) => updateTicketDraft(key, 'action', e.target.value)}
          >
            <option value="">Action…</option>
            <option value="isolate">Isolate host</option>
            <option value="block-ip">Block IP</option>
            <option value="disable-account">Disable account</option>
          </select>
          <select
            className="soclab-order-ticket-select"
            value={draft.target || ''}
            onChange={(e) => updateTicketDraft(key, 'target', e.target.value)}
            disabled={!draft.action}
          >
            <option value="">{draft.action ? 'Target…' : 'Pick an action first'}</option>
            {targetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            {draft.action && targetOptions.length === 0 && (
              <option value="" disabled>
                {draft.action === 'block-ip' ? 'Run lookup-ip first' : 'Nothing discovered yet'}
              </option>
            )}
          </select>
        </div>
        <button type="button" className="soclab-btn soclab-btn-primary soclab-btn-small soclab-order-ticket-close-btn" onClick={() => closeTicket(key, stageDef)}>
          Close Ticket
        </button>
        {feedback && <div className="soclab-order-ticket-feedback">{feedback}</div>}
      </div>
    );
  };

  // Teacher-facing class roster overlay — every completed case on this
  // machine, with a full score breakdown per student and a one-click CSV
  // export for gradebooks. Reads straight from localStorage so it works
  // even if the page was reloaded between students.
  const renderTeacherView = () => {
    const roster = loadRoster();
    return (
      <div className="soclab-teacher-overlay" onClick={() => setShowTeacherView(false)}>
        <div className="soclab-teacher-modal" onClick={e => e.stopPropagation()}>
          <div className="soclab-teacher-modal-header">
            <h2>Class Results</h2>
            <button type="button" className="soclab-teacher-close" onClick={() => setShowTeacherView(false)}>✕</button>
          </div>
          <p className="soclab-teacher-modal-sub">
            {roster.length === 0
              ? 'No completed cases recorded on this computer yet.'
              : `${roster.length} completed case${roster.length === 1 ? '' : 's'} recorded on this computer.`}
          </p>
          {roster.length > 0 && (
            <div className="soclab-teacher-table-wrap">
              <table className="soclab-teacher-table">
                <thead>
                  <tr>{ROSTER_COLUMNS.map(c => <th key={c.key}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {roster.map((entry, i) => (
                    <tr key={i}>
                      {ROSTER_COLUMNS.map(c => <td key={c.key}>{entry[c.key]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="soclab-teacher-actions">
            <button
              type="button"
              className="soclab-btn soclab-btn-primary soclab-btn-small"
              disabled={roster.length === 0}
              onClick={() => downloadCsv(`soclab-class-results-${new Date().toISOString().slice(0, 10)}.csv`, rosterToCsv(roster))}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="soclab-btn soclab-btn-small"
              disabled={roster.length === 0}
              onClick={() => { if (window.confirm('Clear all recorded class results on this computer? This cannot be undone.')) { clearRoster(); setShowTeacherView(false); } }}
            >
              Clear class data
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPlaybook = () => {
    if (!playbookOpen) return null;
    if (phase === 'act1' && !act1StepCaps?.showPlaybook) return null;
    const playbookFilter = phase === 'act1' ? act1StepCaps?.playbookFilter : null;
    return (
      <>
        <div className="soclab-playbook-backdrop" onClick={() => setPlaybookOpen(false)} aria-hidden="true" />
        <aside className={`soclab-playbook-drawer ${tourHighlight === 'playbook' ? 'soclab-tour-highlight' : ''}`}>
          <div className="soclab-playbook-header">
            <span className="soclab-panel-title">Analyst Playbook</span>
            <button type="button" className="soclab-playbook-close" onClick={() => setPlaybookOpen(false)} aria-label="Close playbook">✕</button>
          </div>
          <div className="soclab-playbook-body">
            {PLAYBOOK_SECTIONS.map(section => {
              const visibleItems = section.items.filter(item => {
                if (phase !== 'act1') return true;
                const cmd = item.cmd.split(/\s+/)[0];
                if (!act1Unlocks.cmds.has(cmd)) return false;
                if (playbookFilter && !playbookFilter(item.cmd)) return false;
                return true;
              });
              if (phase === 'act1' && visibleItems.length === 0) return null;
              return (
              <div key={section.title} className="soclab-playbook-section">
                <div className="soclab-playbook-section-title">{section.title}</div>
                {visibleItems.map(item => (
                  <button
                    key={item.cmd}
                    type="button"
                    className="soclab-playbook-cmd"
                    onClick={() => {
                      if (phase === 'act1') {
                        printLine(`Try typing: ${item.cmd}`, 'mentor');
                        termInputRef.current?.focus();
                        return;
                      }
                      const cmd = item.cmd.includes('<') ? `${item.cmd.split(' ')[0]} ` : item.cmd;
                      if (item.cmd.includes('<')) {
                        setTermInput(cmd);
                        termInputRef.current?.focus();
                      } else {
                        executeTerminalCommand(cmd, 'playbook');
                      }
                    }}
                    title={item.desc}
                  >
                    <code>{item.cmd}</code>
                    <span>{item.desc}</span>
                  </button>
                ))}
              </div>
              );
            })}
            {phase === 'act1' && act1UnlockIndex < ACT1_TASKS.length && (
              <p className="soclab-playbook-locked-note">
                More commands appear in the playbook as you complete each training step.
              </p>
            )}
            {intelGatingActive && (act1StepCaps?.showIntelBanner || phase === 'act2') && (
              <p className="soclab-playbook-intel-note">
                <strong>Containment policy:</strong> isolate hosts in evidence · lookup-ip before block-ip · disable only accounts from auth logs.
              </p>
            )}
          </div>
        </aside>
      </>
    );
  };

  const renderDeskTour = () => {
    if (tourStep === null || phase !== 'act1' || act1ActiveTaskId !== 'a1-read-alert') return null;
    const step = DESK_TOUR_STEPS[tourStep];
    if (!step) return null;
    return (
      <div className="soclab-tour-overlay" role="dialog" aria-modal="true" aria-label="Desk tour">
        <div className="soclab-tour-card">
          <div className="soclab-tour-step-label">Desk tour · {tourStep + 1}/{DESK_TOUR_STEPS.length}</div>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
          <div className="soclab-tour-actions">
            <button type="button" className="soclab-btn soclab-btn-primary soclab-btn-small" onClick={advanceDeskTour}>
              {tourStep >= DESK_TOUR_STEPS.length - 1 ? 'Start investigating' : 'Next'}
            </button>
            <button type="button" className="soclab-btn soclab-btn-small soclab-btn-secondary" onClick={finishDeskTour}>Skip tour</button>
          </div>
        </div>
      </div>
    );
  };

  const renderAct1StepBanner = () => {
    if (phase !== 'act1' || act1Complete || !act1ActiveTaskId) return null;
    const task = ACT1_TASKS.find(t => t.id === act1ActiveTaskId);
    if (!task) return null;
    const stepNum = ACT1_TASKS.findIndex(t => t.id === act1ActiveTaskId) + 1;
    return (
      <div className="soclab-act1-step-banner" role="status">
        <span className="soclab-act1-step-badge">Step {stepNum} of {ACT1_TASKS.length}</span>
        <div className="soclab-act1-step-body">
          <strong>{task.title}</strong>
          <span>{task.instruction}</span>
        </div>
      </div>
    );
  };

  const renderIntelPolicyBanner = () => {
    if (!intelGatingActive || intelPolicyDismissed) return null;
    if (phase === 'act1' && !act1StepCaps?.showIntelBanner) return null;
    return (
      <div className="soclab-intel-policy-banner" role="note">
        <div className="soclab-intel-policy-body">
          <strong>Investigate → confirm → contain</strong>
          <p>
            {phase === 'act1'
              ? 'Hosts must appear in your evidence tray before isolate. IPs need lookup-ip before block-ip. Accounts need to show up in auth logs before disable-user.'
              : 'Same rules as Act 1: evidence-backed containment only. Observed IPs in logs are not enough to block — run lookup-ip first.'}
          </p>
        </div>
        <button type="button" className="soclab-intel-policy-dismiss" onClick={() => setIntelPolicyDismissed(true)} aria-label="Dismiss">✕</button>
      </div>
    );
  };

  const renderEvidenceTray = () => {
    if (phase !== 'act1' && phase !== 'act2') return null;
    if (phase === 'act1' && !act1StepCaps?.showEvidenceTray) return null;
    return (
      <div className="soclab-evidence-tray">
        <div className="soclab-evidence-tray-title">Evidence collected</div>
        {!hasEvidence ? (
          <div className="soclab-evidence-empty">
            {phase === 'act1' && act1UnlockIndex === 0
              ? 'Read the Security Events tab first — evidence from queries and lookups will appear here.'
              : <>Run <code>query</code> to observe IOCs, <code>lookup-ip</code> to confirm malicious IPs — then contain. Log actions and alerts pin evidence here.</>}
          </div>
        ) : (
          <div className="soclab-evidence-groups">
            {evidenceHosts.length > 0 && (
              <div className="soclab-evidence-group">
                <span className="soclab-evidence-label">Hosts</span>
                <div className="soclab-evidence-chips">
                  {evidenceHosts.map(h => (
                    <button
                      key={h.id}
                      type="button"
                      className="soclab-evidence-chip"
                      onClick={() => {
                        focusHostOnMap(h.id);
                        if (phase === 'act2' || (phase === 'act1' && act1Unlocks.cmds.has('query'))) {
                          executeTerminalCommand(`query host:${h.id}`, 'evidence tray');
                        } else if (phase === 'act1') {
                          printLine(`When this step unlocks, try: query host:${h.id}`, 'mentor');
                        }
                      }}
                      title={`Show on map and query logs for ${h.name}`}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {observedOnlyIPs.length > 0 && (
              <div className="soclab-evidence-group">
                <span className="soclab-evidence-label">IPs observed</span>
                <div className="soclab-evidence-chips">
                  {observedOnlyIPs.map(ip => (
                    <button
                      key={ip}
                      type="button"
                      className="soclab-evidence-chip soclab-evidence-chip-ip soclab-evidence-chip-observed"
                      onClick={() => runLogLookupIp(ip, 'evidence tray')}
                      title="Confirm with threat intel (lookup-ip)"
                      disabled={phase === 'act1' && !act1Unlocks.cmds.has('lookup-ip')}
                    >
                      {ip}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {confirmedIPList.length > 0 && (
              <div className="soclab-evidence-group">
                <span className="soclab-evidence-label">IPs confirmed malicious</span>
                <div className="soclab-evidence-chips">
                  {confirmedIPList.map(ip => (
                    <button
                      key={ip}
                      type="button"
                      className="soclab-evidence-chip soclab-evidence-chip-ip soclab-evidence-chip-confirmed"
                      onClick={() => {
                        if (phase === 'act1') {
                          printLine(`Type in the terminal: block-ip ${ip}`, 'mentor');
                        } else {
                          setTermInput(`block-ip ${ip}`);
                        }
                      }}
                      title="Eligible for block-ip"
                      disabled={phase === 'act1' && !act1Unlocks.cmds.has('block-ip')}
                    >
                      {ip} ✓
                    </button>
                  ))}
                </div>
              </div>
            )}
            {evidenceAccounts.length > 0 && (
              <div className="soclab-evidence-group">
                <span className="soclab-evidence-label">Accounts</span>
                <div className="soclab-evidence-chips">
                  {evidenceAccounts.map(user => (
                    <button
                      key={user}
                      type="button"
                      className="soclab-evidence-chip"
                      onClick={() => {
                        if (phase === 'act1' && act1Unlocks.cmds.has('disable-user')) {
                          printLine(`Type in the terminal: disable-user ${user}`, 'mentor');
                        } else if (phase === 'act1') {
                          printLine(`When this step unlocks, try: query user:${user}`, 'mentor');
                        } else {
                          setTermInput(`disable-user ${user}`);
                        }
                      }}
                      title={phase === 'act1' && act1Unlocks.cmds.has('disable-user') ? `Disable ${user}` : `Query logs for ${user}`}
                      disabled={phase === 'act1' && !act1Unlocks.cmds.has('disable-user') && !act1Unlocks.cmds.has('query')}
                    >
                      {user}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderKillChainBar = () => {
    if (phase !== 'act2') return null;
    const currentIdx = act2Stage ? ACT2_STAGE_ORDER.indexOf(act2Stage) : -1;
    return (
      <div className="soclab-killchain-bar">
        <div className="soclab-killchain-steps">
          {ACT2_STAGE_ORDER.map((stageId, i) => {
            const stage = ACT2_STAGES[stageId];
            let stepState = 'upcoming';
            if (act2Outcome === 'breach_completed' || act2Outcome === 'overrun') {
              stepState = i <= currentIdx ? 'breached' : 'upcoming';
            } else if (currentIdx >= 0) {
              if (i < currentIdx) stepState = 'done';
              else if (i === currentIdx) stepState = act2Outcome ? 'contained' : 'active';
            }
            return (
              <div key={stageId} className={`soclab-killchain-step soclab-killchain-step-${stepState}`}>
                <span className="soclab-killchain-dot" aria-hidden="true" />
                <span className="soclab-killchain-name">{stage?.label || stageId}</span>
              </div>
            );
          })}
        </div>
        {!act2Outcome && act2Stage && stageSecondsLeft !== null && (
          <div
            className={`soclab-killchain-timer ${stageSecondsLeft <= 15 ? 'soclab-killchain-timer-urgent' : ''}`}
            title="Time left in this kill-chain stage before it auto-advances"
          >
            <span className="soclab-killchain-timer-val">{stageSecondsLeft}s</span>
            <span className="soclab-killchain-timer-label">stage clock</span>
          </div>
        )}
        {act2Outcome && (
          <div className="soclab-killchain-outcome">{ACT2_OUTCOME_LABEL[act2Outcome]}</div>
        )}
      </div>
    );
  };

  const renderAct2ShiftBanners = () => {
    if (phase !== 'act2' || act2Outcome) return null;
    if (!act2Stage) {
      return (
        <div className="soclab-act2-quiet-banner" role="status">
          <span className="soclab-act2-banner-icon" aria-hidden="true">◉</span>
          <div>
            <strong>Shift quiet</strong> — routine helpdesk traffic only. Keep <em>Security Events</em> visible; the intrusion will land as a new alert.
          </div>
        </div>
      );
    }
    if (intrusionBannerVisible) {
      return (
        <div className="soclab-act2-intrusion-banner" role="status">
          <span className="soclab-act2-banner-icon" aria-hidden="true">⚠</span>
          <div>
            <strong>Intrusion activity detected</strong> — check the <em>P1 — Intrusion</em> ticket rail and Security Events tab.
          </div>
        </div>
      );
    }
    return null;
  };

  const act2LiveCards = useMemo(() => {
    if (phase !== 'act2') return [];
    if (act2Outcome) {
      return [{
        id: 'report',
        title: 'Write it up',
        body: 'Type report in the terminal to open the incident write-up and submit your findings.',
        tone: 'action'
      }];
    }
    const cards = [];
    if (!act2Stage) {
      cards.push({
        id: 'quiet',
        title: 'Quiet shift',
        body: 'Routine helpdesk noise is normal. Keep Security Events visible — the first probe will appear as a new high-severity alert.',
        tone: 'info'
      });
      if (act2PettyTickets.length > 0) {
        cards.push({
          id: 'helpdesk',
          title: 'Helpdesk queue',
          body: `${act2PettyTickets.length} routine ticket(s) in the rail. Optional to work — stay ready for security alerts.`,
          tone: 'info'
        });
      }
      return cards;
    }
    const stageDef = ACT2_STAGES[act2Stage];
    if (stageDef) {
      cards.push({
        id: 'stage',
        title: `Active: ${stageDef.label}`,
        body: stageSecondsLeft !== null
          ? `Stage advances in ${stageSecondsLeft}s. Work the P1 ticket rail before the window closes.`
          : 'Work the P1 ticket rail — hunt evidence, then contain.',
        tone: 'warn'
      });
    }
    const evidenceCount = Object.keys(discoveredHosts).length + Object.keys(discoveredIPs).length + Object.keys(discoveredAccounts).length;
    if (evidenceCount === 0) {
      cards.push({
        id: 'evidence',
        title: 'Build your case',
        body: 'Click alerts, run query, or use View related alerts on the ticket. Pin hosts and IPs in the evidence tray before you contain.',
        tone: 'action'
      });
    } else {
      cards.push({
        id: 'evidence-have',
        title: 'Evidence collected',
        body: `${evidenceCount} item(s) pinned — verify intel, then isolate, block-ip, or disable-account.`,
        tone: 'good'
      });
    }
    if (Object.keys(act2InfectedHosts).length > 0) {
      cards.push({
        id: 'spread',
        title: 'Lateral spread active',
        body: 'A stage window was missed. Isolate spreading hosts in the P1 rail before their bars run out.',
        tone: 'warn'
      });
    }
    if (discoveredIPs[ACT2_C2_IP_PRIMARY] && !confirmedIPs[ACT2_C2_IP_PRIMARY]) {
      cards.push({
        id: 'confirm-c2',
        title: 'C2 observed — confirm intel',
        body: `${ACT2_C2_IP_PRIMARY} appeared in logs. Run lookup-ip before block-ip.`,
        tone: 'action'
      });
    } else if (confirmedIPs[ACT2_C2_IP_PRIMARY] && !blockedIPs.includes(ACT2_C2_IP_PRIMARY)) {
      cards.push({
        id: 'block-c2',
        title: 'C2 confirmed — ready to block',
        body: `Intel confirms ${ACT2_C2_IP_PRIMARY} is malicious — block at the firewall when the ticket calls for it.`,
        tone: 'action'
      });
    } else if (blockedIPs.includes(ACT2_C2_IP_PRIMARY)) {
      cards.push({
        id: 'blocked-c2',
        title: 'C2 blocked',
        body: 'Primary command-and-control IP is blocked at the perimeter.',
        tone: 'good'
      });
    }
    if (hostStatus[ACT2_ENTRY_HOST] === 'compromised') {
      cards.push({
        id: 'foothold',
        title: 'Foothold compromised',
        body: `${ACT2_ENTRY_HOST_NAME} shows active intrusion indicators — isolate once evidence supports it.`,
        tone: 'warn'
      });
    }
    if (unnecessaryActions > 0) {
      cards.push({
        id: 'discipline',
        title: 'Unnecessary lockdowns',
        body: `${unnecessaryActions} action(s) cut off normal business without breach evidence. Target only what logs support.`,
        tone: 'warn'
      });
    }
    if (resolvedAct2Tickets[act2Stage]) {
      cards.push({
        id: 'logged',
        title: 'Response logged',
        body: 'Ticket response recorded. Containment is still evaluated live until the stage advances.',
        tone: 'good'
      });
    }
    return cards;
  }, [
    phase, act2Outcome, act2Stage, act2PettyTickets.length, stageSecondsLeft,
    discoveredHosts, discoveredIPs, confirmedIPs, discoveredAccounts, act2InfectedHosts,
    blockedIPs, hostStatus, unnecessaryActions, resolvedAct2Tickets,
    ACT2_ENTRY_HOST, ACT2_ENTRY_HOST_NAME, ACT2_C2_IP_PRIMARY, ACT2_STAGES
  ]);

  const renderAct2LiveCards = () => (
    <div className="soclab-act2-live-cards">
      {act2LiveCards.map(card => (
        <div key={card.id} className={`soclab-act2-live-card soclab-act2-live-card-${card.tone}`}>
          <div className="soclab-act2-live-card-title">{card.title}</div>
          <p>{card.body}</p>
        </div>
      ))}
      <details className="soclab-act2-guide-reference">
        <summary>Analyst reference</summary>
        <div className="soclab-act2-guide-reference-body">
          {ACT2_GUIDANCE.map((item, i) => (
            <div key={item.id} className="soclab-act2-guide-item">
              <div className="soclab-act2-guide-title">
                <span className="soclab-act2-guide-num">{i + 1}.</span>
                {item.title}
              </div>
              <p className="soclab-act2-guide-instruction">{item.instruction}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );

  const renderKillChainTicket = () => {
    const stageDef = ACT2_STAGES[act2Stage];
    if (!stageDef) return null;
    const shown = revealedAct2Hints[act2Stage] || 0;
    const closed = resolvedAct2Tickets[act2Stage];
    return (
      <div key={act2Stage} className={`soclab-order-ticket soclab-order-ticket-p1 ${closed ? 'soclab-order-ticket-closed' : ''}`}>
        <div className="soclab-order-ticket-bar" style={{ animationDuration: `${ACT2_STAGE_INTERVAL_MS}ms` }} />
        <div className="soclab-order-ticket-body">
          <span className="soclab-order-ticket-label">⚠ {stageDef.label}</span>
          <span className="soclab-order-ticket-desc">{stageDef.ticket}</span>
          {closed ? (
            <div className="soclab-order-ticket-done">✓ Response logged — too late to stop this one, but it's on the record.</div>
          ) : (
            <>
              <div className="soclab-ticket-quick-actions">
                <button type="button" className="soclab-btn soclab-btn-small" onClick={investigateCurrentStage}>
                  View related alerts
                </button>
              </div>
              {renderTicketForm(act2Stage, stageDef)}
              {shown > 0 && stageDef.hints.slice(0, shown).map((h, hi) => (
                <div key={hi} className="soclab-order-ticket-hint">💡 {h}</div>
              ))}
              {shown < stageDef.hints.length && (
                <button type="button" className="soclab-hint-btn soclab-order-ticket-hint-btn" onClick={() => revealAct2Hint(act2Stage)}>
                  Stuck? ({shown + 1}/{stageDef.hints.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderAct2TicketRail = () => {
    if (phase !== 'act2' || act2Outcome) return null;
    const hasP1 = act2Stage || act2Rerouted || Object.keys(act2InfectedHosts).length > 0;
    const hasP2 = act2UrgentTickets.length > 0 || act2ComplaintTickets.length > 0;
    const hasP3 = act2PettyTickets.length > 0;
    if (!hasP1 && !hasP2 && !hasP3) return null;

    return (
      <div className="soclab-ticket-rail">
        {hasP1 && (
          <div className="soclab-ticket-lane soclab-ticket-lane-p1">
            <div className="soclab-ticket-lane-label">P1 — Intrusion</div>
            <div className="soclab-ticket-lane-cards">
              {act2Stage && renderKillChainTicket()}
              {act2Rerouted && !resolvedAct2Tickets.reroute && (() => {
                const shown = revealedAct2Hints.reroute || 0;
                return (
                  <div className="soclab-order-ticket soclab-order-ticket-reroute soclab-order-ticket-p1">
                    <div className="soclab-order-ticket-body">
                      <span className="soclab-order-ticket-label">⚠ {ACT2_REROUTE_TICKET.ticket}</span>
                      {renderTicketForm('reroute', ACT2_REROUTE_TICKET)}
                      {shown > 0 && ACT2_REROUTE_TICKET.hints.slice(0, shown).map((h, hi) => (
                        <div key={hi} className="soclab-order-ticket-hint">💡 {h}</div>
                      ))}
                      {shown < ACT2_REROUTE_TICKET.hints.length && (
                        <button type="button" className="soclab-hint-btn soclab-order-ticket-hint-btn" onClick={() => revealAct2Hint('reroute')}>
                          Stuck? ({shown + 1}/{ACT2_REROUTE_TICKET.hints.length})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
              {Object.entries(act2InfectedHosts).map(([hostId, since]) => {
                const host = HOSTS.find(h => h.id === hostId);
                if (!host) return null;
                return (
                  <div key={`infected-${hostId}-${since}`} className="soclab-order-ticket soclab-order-ticket-infected soclab-order-ticket-p1">
                    <div className="soclab-order-ticket-bar soclab-order-ticket-bar-infected" style={{ animationDuration: `${ACT2_SPREAD_INTERVAL_MS}ms` }} />
                    <div className="soclab-order-ticket-body">
                      <span className="soclab-order-ticket-label soclab-order-ticket-label-infected">🦠 {host.sub} — Spreading</span>
                      <span className="soclab-order-ticket-desc">Stage window missed — {host.name} is spreading laterally. Isolate before this bar runs out or it jumps to another machine.</span>
                      <div className="soclab-petty-actions">
                        <button type="button" className="soclab-btn-petty-action soclab-btn-infected-action" onClick={() => cmdIsolate(host.id)}>
                          Contain — Isolate {host.id}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {hasP2 && (
          <div className="soclab-ticket-lane soclab-ticket-lane-p2">
            <div className="soclab-ticket-lane-label">P2 — Nudges</div>
            <div className="soclab-ticket-lane-cards">
              {act2UrgentTickets.map(t => (
                <div key={t.uid} className={`soclab-order-ticket soclab-order-ticket-urgent soclab-order-ticket-urgent-l${t.level}`}>
                  <div className="soclab-order-ticket-bar soclab-order-ticket-bar-urgent" style={{ animationDuration: `${ACT2_URGENT_TICKET_SLA_MS}ms` }} />
                  <div className="soclab-order-ticket-body">
                    <span className="soclab-order-ticket-label soclab-order-ticket-label-urgent">☎ {t.label}</span>
                    <span className="soclab-order-ticket-desc">{t.desc}</span>
                    <div className="soclab-petty-actions">
                      <button type="button" className="soclab-btn-petty-action soclab-btn-urgent-action" onClick={() => acknowledgeUrgentTicket(t.uid)}>
                        Acknowledge — Check Security Events
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {act2ComplaintTickets.map(t => (
                <div key={t.uid} className={`soclab-order-ticket soclab-order-ticket-complaint soclab-order-ticket-complaint-l${t.level}`}>
                  <div className="soclab-order-ticket-body">
                    <span className="soclab-order-ticket-label soclab-order-ticket-label-complaint">😠 {t.label}</span>
                    <span className="soclab-order-ticket-desc">{t.desc}</span>
                    <div className="soclab-petty-actions">
                      {Object.entries(t.responses).map(([key, resp]) => (
                        <button
                          key={key}
                          type="button"
                          className="soclab-btn-petty-action"
                          onClick={() => respondComplaintTicket(t.uid, key)}
                        >
                          {resp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {hasP3 && (
          <div className="soclab-ticket-lane soclab-ticket-lane-p3">
            <button
              type="button"
              className="soclab-petty-rail-toggle"
              onClick={() => setPettyRailExpanded(e => !e)}
              aria-expanded={pettyRailExpanded}
            >
              <span className="soclab-ticket-lane-label">P3 — Helpdesk ({act2PettyTickets.length})</span>
              <span className="soclab-petty-rail-chevron">{pettyRailExpanded ? '▼' : '▶'}</span>
            </button>
            {pettyRailExpanded && (
              <div className="soclab-ticket-lane-cards">
                {act2PettyTickets.map(t => (
                  <div key={t.uid} className="soclab-order-ticket soclab-order-ticket-petty">
                    <div className="soclab-order-ticket-bar soclab-order-ticket-bar-petty" style={{ animationDuration: `${ACT2_PETTY_TICKET_SLA_MS}ms` }} />
                    <div className="soclab-order-ticket-body">
                      <span className="soclab-order-ticket-label soclab-order-ticket-label-petty">🗒 {t.label}</span>
                      <span className="soclab-order-ticket-desc">{t.desc}</span>
                      <div className="soclab-petty-actions">
                        {Object.entries(t.responses).map(([key, resp]) => (
                          <button
                            key={key}
                            type="button"
                            className="soclab-btn-petty-action"
                            onClick={() => respondPettyTicket(t.uid, key)}
                          >
                            {resp.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDebriefTimeline = () => {
    if (!incidentTimeline.length) return null;
    return (
      <div className="soclab-debrief-timeline">
        <h3>Incident timeline</h3>
        <p className="soclab-debrief-timeline-intro">What happened during your shift — adversary moves vs. your responses.</p>
        <div className="soclab-timeline-track">
          {incidentTimeline.map(event => (
            <div key={event.id} className={`soclab-timeline-event soclab-timeline-${event.side}`}>
              <div className="soclab-timeline-marker" aria-hidden="true" />
              <div className="soclab-timeline-body">
                <div className="soclab-timeline-meta">
                  <span className="soclab-timeline-side">
                    {event.side === 'adversary' ? 'Adversary' : event.side === 'analyst' ? 'Your response' : 'Shift'}
                  </span>
                  <span className="soclab-timeline-clock">{event.clock}</span>
                </div>
                <strong>{event.title}</strong>
                {event.detail && <p>{event.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAct2Hud = () => {
    if (phase !== 'act2' || act2Outcome) return null;
    return (
      <div className="soclab-act2-hud">
        <span className="soclab-hud-item" title="Hint reveals during Act 2 cost points at debrief">
          Hints: <strong>{act2HintsUsed}</strong>
        </span>
        <span className={`soclab-hud-item ${unnecessaryActions > 0 ? 'soclab-hud-warn' : ''}`} title="Isolations, blocks, or disables with no evidence">
          Unnecessary lockdowns: <strong>{unnecessaryActions}</strong>
        </span>
      </div>
    );
  };

  // --- Render --------------------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className="soclab-root soclab-briefing">
        <div className="soclab-ticket-wrap">
          <div className="soclab-briefing-eyebrow">{SOC_PIXEL_LINES.introEyebrow} · {AEGIS_SOC_CLIENT}</div>
          <div className="soclab-briefing-card">
            <h1>Welcome to the Vault Operations Wing.</h1>
            <p>{AEGIS_SOC_CLIENT} keeps the back office running for a network of outpatient clinics — scheduling, billing, and the patient record archive that clinicians pull up mid-visit to see someone's history, allergies, and current medications.</p>
            <p>None of that works if the network doesn't. A file server that won't respond isn't just a ticket — it's a clinician standing in an exam room with no chart. And because everything on FS-01 is protected health information, a break-in here isn't only a downtime problem; it's patient data, and a HIPAA incident, the moment it's touched.</p>
            <p>That's the job. You're starting today as a Tier 1 analyst on the Aegis security team, assigned to this client. Most shifts are quiet — password resets, a slow laptop, the usual helpdesk churn. But the SIEM doesn't sleep, and neither does whoever might be on the other side of it.</p>
            <p className="soclab-aegis-pixel-note">{PIXEL.soc(SOC_PIXEL_LINES.deskNote)}</p>
            <div className="soclab-briefing-note">This is a simulation — every name, IP address, and account below is fictional. The tools, alerts, and workflow are modeled on how a real SOC actually triages, contains, and writes up an incident.</div>
            <div className="soclab-briefing-actions">
              <button
                type="button"
                className="soclab-btn soclab-btn-primary"
                onClick={() => {
                  try { localStorage.setItem(SOCLAB_RETURNING_KEY, '1'); } catch { /* no-op */ }
                  setPhase('briefing');
                }}
              >
                Head to your desk →
              </button>
              {isReturning && (
                <button type="button" className="soclab-btn soclab-btn-secondary" onClick={() => setPhase('briefing')}>
                  Skip intro — go to ticket →
                </button>
              )}
              {hasSavedSession && !sessionRestored && (
                <button type="button" className="soclab-btn soclab-btn-secondary" onClick={resumeSavedSession}>
                  Resume saved session →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'briefing') {
    return (
      <div className="soclab-root soclab-briefing">
        <div className="soclab-ticket-wrap">
          <div className="soclab-ticket-eyebrow">Aegis SOC · {AEGIS_SOC_CLIENT} · IT Service Management</div>
          <div className="soclab-ticket-card">
            <div className="soclab-ticket-topbar">
              <span className="soclab-ticket-id">TICKET #4471</span>
              <span className="soclab-ticket-status soclab-ticket-status-new">NEW</span>
            </div>
            <h1 className="soclab-ticket-subject">Multiple Failed Remote Logons — WKSTN-07</h1>
            <div className="soclab-ticket-meta-grid">
              <div className="soclab-ticket-meta-item">
                <span className="soclab-ticket-meta-label">Priority</span>
                <span className="soclab-ticket-meta-value soclab-priority-high">P2 — High</span>
              </div>
              <div className="soclab-ticket-meta-item">
                <span className="soclab-ticket-meta-label">Category</span>
                <span className="soclab-ticket-meta-value">Security / Unauthorized Access</span>
              </div>
              <div className="soclab-ticket-meta-item">
                <span className="soclab-ticket-meta-label">Reported By</span>
                <span className="soclab-ticket-meta-value">SIEM Auto-Detection</span>
              </div>
              <div className="soclab-ticket-meta-item">
                <span className="soclab-ticket-meta-label">Assigned To</span>
                <span className="soclab-ticket-meta-value">You — SOC Analyst, Tier 1</span>
              </div>
              <div className="soclab-ticket-meta-item">
                <span className="soclab-ticket-meta-label">Affected Asset</span>
                <span className="soclab-ticket-meta-value">WKSTN-07 (Sales — M. Lee)</span>
              </div>
              <div className="soclab-ticket-meta-item">
                <span className="soclab-ticket-meta-label">Opened</span>
                <span className="soclab-ticket-meta-value">Today, 09:41 AM</span>
              </div>
            </div>
            <div className="soclab-ticket-divider" />
            <div className="soclab-ticket-section-label">Description</div>
            <p className="soclab-ticket-description">Automated correlation flagged a probable brute-force attack against a remote login session on WKSTN-07: several failed password attempts immediately followed by a successful logon from an external IP address. No investigation has been performed yet — that's your job.</p>
            <div className="soclab-ticket-section-label">Analyst Notes</div>
            <p className="soclab-ticket-description soclab-ticket-note">This first ticket is a guided walkthrough of the SIEM, the topology map, and the containment commands. Once it's resolved, the case continues into Act 2 — live, unguided monitoring against a real adversary working the kill chain in real time.</p>
            <div className="soclab-name-field">
              <label htmlFor="soclab-student-name">Your name (for the class roster, optional)</label>
              <input
                id="soclab-student-name"
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="e.g. Jordan K."
              />
            </div>
            {hasSavedSession && !sessionRestored && (
              <div className="soclab-saved-session-prompt">
                <p><strong>Saved progress found</strong> on this browser — resume it, or start a new ticket from the beginning (tutorial unlocks reset).</p>
                <div className="soclab-saved-session-actions">
                  <button type="button" className="soclab-btn soclab-btn-secondary soclab-btn-small" onClick={resumeSavedSession}>
                    Resume saved session
                  </button>
                  <button
                    type="button"
                    className="soclab-btn soclab-btn-small"
                    onClick={() => { if (window.confirm('Clear saved progress and start the tutorial from scratch?')) startFreshSession(); }}
                  >
                    Start fresh
                  </button>
                </div>
              </div>
            )}
            <button type="button" className="soclab-btn soclab-btn-primary" onClick={startAct1}>Acknowledge &amp; Open Ticket</button>
          </div>
        </div>
        <button type="button" className="soclab-teacher-link" onClick={() => setShowTeacherView(true)}>📋 Teacher? View class results</button>
        {showTeacherView && renderTeacherView()}
      </div>
    );
  }

  if (phase === 'act2-intro') {
    return (
      <div className="soclab-root soclab-briefing">
        <div className="soclab-ticket-wrap">
          <div className="soclab-ticket-eyebrow">Aegis SOC · {AEGIS_SOC_CLIENT}</div>
          <div className="soclab-ticket-card">
            <div className="soclab-ticket-topbar">
              <span className="soclab-ticket-id">ACT 2</span>
              <span className="soclab-ticket-status soclab-ticket-status-new">LIVE MONITORING</span>
            </div>
            <h1 className="soclab-ticket-subject">What's different from here on</h1>
            <div className="soclab-ticket-divider" />
            <div className="soclab-ticket-section-label">No more numbered tasks</div>
            <p className="soclab-ticket-description">Act 1 told you exactly what to read and what to type, in order. From here on, nobody hands you a checklist — you're watching the queue like a working analyst, deciding for yourself what's worth a look.</p>
            <div className="soclab-ticket-section-label">The ticket rail still has your back</div>
            <p className="soclab-ticket-description">The strip across the top of the console shows what's actively unfolding, with a bar that drains as it gets more urgent. If you genuinely don't know where to start, every ticket has a "Stuck?" button — its first hint just describes what's happening, no spoilers; a second click gets you closer to an actual command.</p>
            <div className="soclab-ticket-section-label">Same toolkit, same rules</div>
            <p className="soclab-ticket-description">Every command you used in Act 1 — query, lookup-ip, isolate, block-ip, disable-user — still works exactly the same way. Type "help" any time. Nothing new to learn, just nobody telling you when to use it.</p>
            <div className="soclab-ticket-section-label">Investigate before you contain</div>
            <p className="soclab-ticket-description">Act 1 taught the same policy you will use here: hosts must be in your evidence tray before isolate; IPs need <code>lookup-ip</code> before <code>block-ip</code>; accounts must appear in auth logs before <code>disable-user</code>. The ticket rail only lists targets you have actually confirmed.</p>
            <p className="soclab-aegis-pixel-note">{PIXEL.soc(SOC_PIXEL_LINES.act2Shift)}</p>
            <div className="soclab-ticket-section-label">Isolating has a real cost</div>
            <p className="soclab-ticket-description">Every workstation starts this shift back online and clean. Isolating one cuts a real employee off — close it out with "remediate &lt;host&gt;" before you "restore" it, or it'll just sit offline. Leave it isolated too long without remediating and the employee starts opening their own complaint tickets.</p>
            <button type="button" className="soclab-btn soclab-btn-primary" onClick={beginAct2Monitoring}>Start Monitoring →</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'report') {
    return (
      <div className="soclab-root soclab-report">
        <div className="soclab-report-card">
          <h2>Incident Report — Operation Quiet Storm</h2>
          {reportPrefillNotice && (
            <div className="soclab-report-prefill-notice" role="note">
              Hosts and IOCs were pre-filled from your evidence tray — verify each field before submitting.
            </div>
          )}
          <label>Executive summary</label>
          <textarea rows={3} value={reportAnswers.summary} onChange={e => setReportAnswers(prev => ({ ...prev, summary: e.target.value }))} placeholder="What happened, in a few sentences..." />

          <label>Root cause / initial access vector</label>
          <textarea rows={2} value={reportAnswers.rootCause} onChange={e => setReportAnswers(prev => ({ ...prev, rootCause: e.target.value }))} placeholder="How did the attacker get in?" />

          <label>Hosts confirmed compromised</label>
          <div className="soclab-checkbox-grid">
            {HOSTS.filter(h => !h.undefendable && h.id !== 'fw-edge' && h.id !== 'web-01').map(h => (
              <label key={h.id} className="soclab-checkbox">
                <input
                  type="checkbox"
                  checked={reportAnswers.hosts.includes(h.id)}
                  onChange={() => setReportAnswers(prev => ({
                    ...prev,
                    hosts: prev.hosts.includes(h.id) ? prev.hosts.filter(x => x !== h.id) : [...prev.hosts, h.id]
                  }))}
                />
                {h.name} — {h.sub}
              </label>
            ))}
          </div>

          <label>Malicious IP(s) identified (comma-separated)</label>
          <input type="text" value={reportAnswers.ips} onChange={e => setReportAnswers(prev => ({ ...prev, ips: e.target.value }))} placeholder="e.g. 198.51.100.230" />

          <label>Compromised account (if any)</label>
          <input type="text" value={reportAnswers.account} onChange={e => setReportAnswers(prev => ({ ...prev, account: e.target.value }))} placeholder="username" />

          <label>Recommended remediation steps</label>
          <div className="soclab-checkbox-grid">
            {REPORT_RUBRIC.remediationOptions.map(o => (
              <label key={o.id} className="soclab-checkbox">
                <input
                  type="checkbox"
                  checked={reportAnswers.remediation.includes(o.id)}
                  onChange={() => setReportAnswers(prev => ({
                    ...prev,
                    remediation: prev.remediation.includes(o.id) ? prev.remediation.filter(x => x !== o.id) : [...prev.remediation, o.id]
                  }))}
                />
                {o.label}
              </label>
            ))}
          </div>

          <button type="button" className="soclab-btn soclab-btn-primary" onClick={submitReport}>Submit Report</button>
        </div>
      </div>
    );
  }

  if (phase === 'debrief' && reportResult) {
    return (
      <div className="soclab-root soclab-debrief">
        <div className="soclab-debrief-card">
          <div className="soclab-debrief-grade">{reportResult.grade}</div>
          <h2>Case Closed — {reportResult.overallScore}/100</h2>
          <p className="soclab-debrief-outcome">{ACT2_OUTCOME_LABEL[act2Outcome]}</p>
          <p>{act2Scenario.outcomeNarrative[act2Outcome]}</p>
          {renderDebriefTimeline()}
          <div className="soclab-debrief-breakdown">
            <div>Containment timeliness: {reportResult.containmentScore}/100</div>
            <div>Report accuracy: {reportResult.reportScore}/100</div>
            <div className="soclab-debrief-sub">— Root cause: {reportResult.breakdown.rootCauseScore}/100</div>
            <div className="soclab-debrief-sub">— Hosts identified: {reportResult.breakdown.hostsScore}/100</div>
            <div className="soclab-debrief-sub">— IOCs identified: {reportResult.breakdown.ipsScore}/100</div>
            <div className="soclab-debrief-sub">— Compromised account: {reportResult.breakdown.accountScore}/100</div>
            <div className="soclab-debrief-sub">— Remediation plan: {reportResult.breakdown.remediationScore}/100</div>
            <div>Operational discipline: {reportResult.disciplineScore}/100</div>
            <div className="soclab-debrief-sub">
              {reportResult.unnecessaryActions === 0
                ? '— No unnecessary lockdowns. Clean, targeted response.'
                : `— ${reportResult.unnecessaryActions} unnecessary isolation/block/disable action${reportResult.unnecessaryActions === 1 ? '' : 's'} against systems with no evidence tying them to the breach.`}
            </div>
            <div>Independent investigation: {reportResult.hintScore}/100</div>
            <div className="soclab-debrief-sub">
              {reportResult.hintsRevealed === 0
                ? '— No hints used. You worked every stage from the evidence alone.'
                : `— ${reportResult.hintsRevealed} hint${reportResult.hintsRevealed === 1 ? '' : 's'} revealed across Act 2.`}
            </div>
            <div>Response speed: {reportResult.speedScore}/100</div>
            <div className="soclab-debrief-sub">
              {reportResult.speedScore >= 90
                ? '— Near-instant containment once the evidence appeared.'
                : reportResult.speedScore > 0
                ? '— Correct containment landed, but with real time to spare on the clock.'
                : '— Containment landed right at the buzzer, or not at all.'}
            </div>
            {(reportResult.pettyStats.resolved + reportResult.pettyStats.missed) > 0 && (
              <>
                <div>Helpdesk multitasking (not scored)</div>
                <div className="soclab-debrief-sub">
                  — {reportResult.pettyStats.resolved}/{reportResult.pettyStats.resolved + reportResult.pettyStats.missed} routine helpdesk tickets handled while investigating the real incident ({reportResult.pettyStats.correct} good calls, {reportResult.pettyStats.incorrect} could've gone better).
                </div>
              </>
            )}
          </div>
          {isBlackSignalUnlocked() && (
            <div className="soclab-debrief-unlock" role="status">
              <span className="soclab-debrief-unlock-sigil">⚫</span>
              <div>
                <strong>BLACK SIGNAL unlocked</strong>
                <p>BLACK SIGNAL channel open — return to command console from the home screen.</p>
              </div>
            </div>
          )}
          <div className="soclab-aegis-badge" role="status">
            <span className="soclab-aegis-badge-icon">🎖️</span>
            <div>
              <strong>{getTierMeta('high').badgeAward}</strong>
              <span>{SOC_PIXEL_LINES.debriefBadge}</span>
            </div>
          </div>
          <button type="button" className="soclab-btn soclab-btn-primary" onClick={resetAll}>Restart Case</button>
        </div>
        <button type="button" className="soclab-teacher-link" onClick={() => setShowTeacherView(true)}>📋 Teacher? View class results</button>
        {showTeacherView && renderTeacherView()}
      </div>
    );
  }

  // act1 / act2 shared SOC workstation layout
  return (
    <div className="soclab-root soclab-workstation">
      <div className="soclab-header">
        <div className="soclab-header-title">⬡ Aegis Vault · Ops Wing · {AEGIS_SOC_CLIENT}</div>
        <div className="soclab-header-pixel" title="PIXEL — SOC probability interface">{PIXEL.soc('SOC interface active')}</div>
        <div className="soclab-header-phase">{phase === 'act1' ? 'ACT 1 · Ticket #4471' : `ACT 2 · ${act2Outcome ? ACT2_OUTCOME_LABEL[act2Outcome] : 'Live Monitoring'}`}</div>
        {phase === 'act2' && act2Stage && !act2Outcome && stageSecondsLeft !== null && (
          <div
            className={`soclab-header-stage-clock ${stageSecondsLeft <= 15 ? 'soclab-header-stage-clock-urgent' : ''}`}
            title="Kill-chain stage auto-advances when this clock hits zero"
          >
            <span className="soclab-header-stage-clock-label">{ACT2_STAGES[act2Stage]?.label}</span>
            <span className="soclab-header-stage-clock-val">{stageSecondsLeft}s</span>
          </div>
        )}
        {phase === 'act2' && (
          <div
            className={`soclab-disruption-indicator ${unnecessaryActions > 0 ? 'soclab-disruption-active' : 'soclab-disruption-clean'}`}
            title="Hosts, IPs, or accounts locked down with no evidence tying them to the breach — normal business operations are disrupted until you restore them."
          >
            <span className="soclab-disruption-icon">{unnecessaryActions > 0 ? '⚠' : '✓'}</span>
            <span className="soclab-disruption-text">
              {unnecessaryActions === 0
                ? 'Business operations normal'
                : `${unnecessaryActions} unnecessary lockdown${unnecessaryActions === 1 ? '' : 's'} — operations disrupted`}
            </span>
          </div>
        )}
        <div className="soclab-header-actions">
          {phase === 'act1' && act1Complete && (
            <button type="button" className="soclab-btn soclab-btn-primary soclab-btn-small" onClick={startAct2}>Begin Act 2 →</button>
          )}
          {(phase === 'act1' || phase === 'act2') && (
            <button
              type="button"
              className="soclab-btn soclab-btn-small soclab-btn-secondary"
              onClick={() => { if (window.confirm('Start over? This clears saved progress and reloads the tutorial from the beginning.')) startFreshSession(); }}
            >
              Start over
            </button>
          )}
          {(phase !== 'act1' || act1StepCaps?.showPlaybook) && (
            <button
              type="button"
              className="soclab-btn soclab-btn-small"
              onClick={() => setPlaybookOpen(o => !o)}
            >
              {playbookOpen ? 'Hide playbook' : 'Playbook'}
            </button>
          )}
        </div>
      </div>

      {sessionRestored && (phase === 'act1' || phase === 'act2') && (
        <div className="soclab-session-restored" role="status">
          Resumed your saved session. Use <strong>Start over</strong> in the header to reset the tutorial.
        </div>
      )}

      {panelUnlockToast && (
        <div className="soclab-panel-unlock-toast" role="status">
          {panelUnlockToast === 'casefile'
            ? 'Training checklist unlocked — follow your objectives on the right.'
            : 'Network map unlocked — click hosts for quick containment actions.'}
        </div>
      )}

      {renderDeskTour()}

      {renderKillChainBar()}
      {renderAct2ShiftBanners()}
      {renderAct2Hud()}
      {renderAct2TicketRail()}

      <div className={`soclab-body ${dragging ? 'soclab-dragging' : ''}`}>
        {showTopology && (
          <>
            <div className={`soclab-panel soclab-topology${panelUnlockToast === 'topology' ? ' soclab-panel-unlock-in soclab-panel-just-unlocked' : ''}`} style={{ width: leftWidth, flex: '0 0 auto' }}>
              <div className="soclab-panel-title">Network Topology</div>
          <svg viewBox={`0 0 ${TOPOLOGY_VIEW.width} ${TOPOLOGY_VIEW.height}`} className="soclab-topology-svg">
            {TOPOLOGY_EDGES.map(([a, b], i) => {
              const pa = NODE_POS[a]; const pb = NODE_POS[b];
              return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className="soclab-edge" />;
            })}
            {act2Churn.map(d => {
              const pa = NODE_POS['fw-edge']; const pb = churnPos[d.id];
              if (!pa || !pb) return null;
              return <line key={`churn-edge-${d.id}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className={`soclab-edge soclab-edge-churn soclab-edge-churn-${d.status}`} />;
            })}
            {HOSTS.map(h => {
              const pos = NODE_POS[h.id];
              const status = hostStatus[h.id] || 'normal';
              return (
                <g
                  key={h.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  className={`soclab-node soclab-node-${status} soclab-node-type-${h.type}${h.id === flashHostId ? ' soclab-node-flash-join' : ''}${selectedHost === h.id ? ' soclab-node-selected' : ''}`}
                  onClick={() => !h.undefendable && setSelectedHost(h.id)}
                >
                  {(status === 'suspicious' || status === 'compromised') && (
                    <circle className={`soclab-node-halo soclab-node-halo-${status}`} cx="0" cy="0" r="24" />
                  )}
                  {renderNodeShape(h.type)}
                  <text y={h.type === 'server' ? 30 : 26} textAnchor="middle" className="soclab-node-label">{h.name}</text>
                </g>
              );
            })}
            {act2Churn.map(d => {
              const pos = churnPos[d.id];
              if (!pos) return null;
              return (
                <g
                  key={d.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  className={`soclab-node soclab-node-churn soclab-node-churn-${d.status} soclab-node-type-${d.type}`}
                >
                  {renderNodeShape(d.type)}
                  <text y={26} textAnchor="middle" className="soclab-node-label">{d.name}</text>
                </g>
              );
            })}
          </svg>
          {selectedHost && (() => {
            const h = HOSTS.find(x => x.id === selectedHost);
            if (!h) return null;
            const status = hostStatus[h.id];
            const hostLogs = logs.filter(l => l.host === h.id).slice(-8).reverse();
            return (
              <div className="soclab-node-inspector">
                <div className="soclab-node-inspector-title">{h.name} <span className={`soclab-status-pill soclab-status-${status}`}>{status}</span></div>
                <div className="soclab-node-inspector-sub">{h.sub}</div>
                <div className="soclab-node-inspector-meta">
                  {h.ip && <span className="soclab-node-inspector-meta-item">{h.ip}</span>}
                  {h.os && <span className="soclab-node-inspector-meta-item">{h.os}</span>}
                  {h.agentId
                    ? <span className="soclab-node-inspector-meta-item">agent {h.agentId}</span>
                    : h.monitoring === 'agentless'
                      ? <span className="soclab-node-inspector-meta-item">agentless</span>
                      : null}
                </div>
                <div className="soclab-node-inspector-actions">
                {status === 'isolated' ? (
                  remediatedHosts[h.id] ? (
                    (phase !== 'act1' || act1Unlocks.cmds.has('restore')) && (
                      <button type="button" className="soclab-node-action" onClick={() => executeTerminalCommand(`restore ${h.id}`, 'network map')}>
                        Restore {h.id}
                      </button>
                    )
                  ) : (
                    (phase !== 'act1' || act1Unlocks.cmds.has('remediate')) && (
                      <button type="button" className="soclab-node-action" onClick={() => executeTerminalCommand(`remediate ${h.id}`, 'network map')}>
                        Remediate {h.id}
                      </button>
                    )
                  )
                ) : (
                  (phase !== 'act1' || act1Unlocks.cmds.has('isolate')) && (
                    <button
                      type="button"
                      className="soclab-node-action soclab-node-action-warn"
                      disabled={intelGatingActive && !hasHostIntel(h.id)}
                      title={intelGatingActive && !hasHostIntel(h.id) ? 'Add this host to evidence (query or alert) before isolating' : `Isolate ${h.id}`}
                      onClick={() => executeTerminalCommand(`isolate ${h.id}`, 'network map')}
                    >
                      Isolate {h.id}
                    </button>
                  )
                )}
                {(phase !== 'act1' || act1Unlocks.cmds.has('query')) && (
                  <button type="button" className="soclab-node-action" onClick={() => executeTerminalCommand(`query host:${h.id}`, 'network map')}>
                    Query logs
                  </button>
                )}
                </div>
                <div className="soclab-node-inspector-logs-title">Recent activity</div>
                <div className="soclab-node-inspector-logs">
                  {hostLogs.length === 0 ? (
                    <div className="soclab-node-inspector-log-empty">No log activity recorded for this host yet.</div>
                  ) : hostLogs.map(l => (
                    <div key={l.id} className="soclab-node-inspector-log-row">
                      <span className="soclab-node-inspector-log-ts">{l.ts}</span>
                      <span className="soclab-node-inspector-log-raw">{l.raw}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
            </div>

            <div className="soclab-resize-handle-v" onMouseDown={startDrag('left')} />
          </>
        )}

        <div className={`soclab-panel soclab-siem ${tourHighlight === 'siem' ? 'soclab-tour-highlight' : ''}`} style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div className="soclab-siem-toolbar">
          {phase === 'act1' && act1UnlockIndex === 0 && (
            <div className="soclab-siem-guide" role="note">
              <span className="soclab-siem-guide-icon" aria-hidden="true">↓</span>
              <div>
                <strong>Start here — Security Events tab</strong>
                <p>
                  Find the WKSTN-07 auth-bruteforce alert below and read its <strong>severity badge</strong> (left column).
                  Then type your answer in the <strong>Training Room</strong> checklist on the right.
                </p>
              </div>
            </div>
          )}
          {renderIntelPolicyBanner()}
          {renderAct1StepBanner()}
          <div className="soclab-siem-brand">
            <span className="soclab-siem-brand-mark">🛡️</span>
            <span className="soclab-siem-brand-name">wazuh.</span>
            <span className="soclab-siem-brand-crumb">
              {activeTab === 'alerts' && 'Security events'}
              {activeTab === 'logs' && 'Threat hunting'}
              {activeTab === 'agents' && 'Agents management'}
              {activeTab === 'notes' && 'Case notes'}
            </span>
          </div>
          <div className="soclab-tabs">
            {(['alerts', 'logs', 'agents', 'notes']).map((tab) => {
              const unlocked = phase !== 'act1' || act1Unlocks.tabs.has(tab);
              const labels = {
                alerts: `Security Events (${alerts.length}${unreadAlertCount > 0 ? ` · ${unreadAlertCount} new` : ''})`,
                logs: `Threat Hunting (${logs.length})`,
                agents: `Agents (${HOSTS.filter(h => h.agentId).length})`,
                notes: `Case Notes (${notes.length})`
              };
              return (
                <button
                  key={tab}
                  type="button"
                  disabled={!unlocked}
                  className={[
                    activeTab === tab ? 'active' : '',
                    tabPulse[tab] ? 'soclab-tab-pulse' : '',
                    phase === 'act1' && act1UnlockIndex === 0 && tab === 'alerts' ? 'soclab-tab-start-here' : '',
                    tourHighlight === 'logs-tab' && tab === 'logs' ? 'soclab-tour-highlight' : '',
                    !unlocked ? 'soclab-tab-locked' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => unlocked && trySelectTab(tab)}
                  title={!unlocked ? 'Unlocks in a later training step' : undefined}
                >
                  {labels[tab]}
                  {tabPulse[tab] && <span className="soclab-tab-dot" />}
                  {phase === 'act1' && act1UnlockIndex === 0 && tab === 'alerts' && (
                    <span className="soclab-tab-start-label">Start here</span>
                  )}
                  {!unlocked && <span className="soclab-tab-lock" aria-hidden="true">🔒</span>}
                </button>
              );
            })}
          </div>
          </div>
          {activeTab === 'logs' && (
            <input className="soclab-log-search" type="text" placeholder='Filter logs, e.g. host:wkstn-07 source:auth' value={logQuery} onChange={e => setLogQuery(e.target.value)} />
          )}
          {activeTab === 'notes' && (
            <form
              className="soclab-note-form"
              onSubmit={e => { e.preventDefault(); addNote(noteDraft); setNoteDraft(''); }}
            >
              <input
                type="text"
                placeholder="Add a case note and press Enter..."
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
              />
              <button type="submit">Add</button>
            </form>
          )}
          {renderEvidenceTray()}
          <div className="soclab-siem-list">
            {activeTab === 'alerts' && (
              <>
                {!(phase === 'act1' && !act1StepCaps?.showAlertToolbar) && (
                <div className="soclab-alert-toolbar">
                  <label className="soclab-alert-toolbar-field">
                    <span>Sort</span>
                    <select value={alertSort} onChange={e => setAlertSort(e.target.value)}>
                      <option value="severity">Severity (high first)</option>
                      <option value="time">Newest first</option>
                    </select>
                  </label>
                  <label className="soclab-alert-toolbar-field">
                    <span>Filter</span>
                    <select value={alertFilter} onChange={e => setAlertFilter(e.target.value)}>
                      <option value="all">All alerts</option>
                      <option value="unread">Unread ({unreadAlertCount})</option>
                      <option value="high">High severity (L≥10)</option>
                    </select>
                  </label>
                  {unreadAlertCount > 0 && (
                    <button type="button" className="soclab-btn soclab-btn-small soclab-alert-mark-read" onClick={markAllAlertsSeen}>
                      Mark all read
                    </button>
                  )}
                </div>
                )}
                <div className={`soclab-alert-columns${phase === 'act1' && !act1StepCaps?.showAlertToolbar ? ' soclab-alert-columns-compact' : ''}`} aria-hidden="true">
                  <span className="soclab-alert-col-severity">Severity</span>
                  <span className="soclab-alert-col-rule">Rule ID</span>
                  <span className="soclab-alert-col-host">Host</span>
                  <span className="soclab-alert-col-detail">Alert</span>
                  <span className="soclab-alert-col-ack">Read</span>
                  <span className="soclab-alert-col-action" />
                </div>
                {displayedAlerts.length === 0 ? (
                  <div className="soclab-alert-empty">
                    {alertFilter === 'unread' ? 'No unread alerts — you\'re caught up.' : 'No alerts match this filter.'}
                  </div>
                ) : displayedAlerts.map(a => {
              const alertInteractive = phase !== 'act1' || act1StepCaps?.showInvestigate;
              return (
              <div
                key={a.id}
                role={alertInteractive ? 'button' : undefined}
                tabIndex={alertInteractive ? 0 : undefined}
                className={`soclab-alert-row ${alertInteractive ? 'soclab-alert-row-clickable' : 'soclab-alert-row-static'} soclab-level-${a.level >= 10 ? 'high' : a.level >= 6 ? 'med' : 'low'} ${recentIds[a.id] ? 'soclab-flash-in' : ''} ${resolveHostId(a.host) === selectedHost ? 'soclab-alert-row-highlighted' : ''} ${!seenAlertIds.includes(a.id) ? 'soclab-alert-row-unread' : ''}`}
                onClick={alertInteractive ? () => runInvestigateAlert(a) : undefined}
                onKeyDown={alertInteractive ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); runInvestigateAlert(a); } }) : undefined}
                title={alertInteractive ? 'Click to investigate — opens Threat Hunting with a matching query' : undefined}
              >
                <span className="soclab-severity-badge" title={`Severity level ${a.level} — higher is more urgent`}>
                  <span className="soclab-severity-label">Level</span>
                  <span className="soclab-severity-value">{a.level}</span>
                </span>
                <span className="soclab-rule-id">{a.ruleId || '—'}</span>
                <span className="soclab-alert-host">{a.host}</span>
                <div className="soclab-alert-detail">
                  <span className="soclab-alert-text"><strong>{a.rule}</strong> — {a.description}</span>
                  {a.mitre && <span className="soclab-mitre-tag" title={a.mitre.tactic}>{a.mitre.id}</span>}
                  {!seenAlertIds.includes(a.id) && <span className="soclab-alert-new-badge">NEW</span>}
                </div>
                <button
                  type="button"
                  className="soclab-alert-ack-btn"
                  title="Mark as read without investigating"
                  onClick={e => { e.stopPropagation(); markAlertSeen(a.id); }}
                >
                  ✓
                </button>
                <span className={`soclab-alert-investigate${alertInteractive ? '' : ' soclab-alert-investigate-hidden'}`} aria-hidden={!alertInteractive}>
                  Investigate →
                </span>
              </div>
            );})}
              </>
            )}
            {activeTab === 'logs' && visibleLogs.map(l => {
              const hostMeta = l.host ? HOSTS.find(h => h.id === l.host) : null;
              const canIsolate = hostMeta && !hostMeta.undefendable;
              return (
                <div key={l.id} className={`soclab-log-row ${recentIds[l.id] ? 'soclab-flash-in' : ''}`}>
                  <div className="soclab-log-main">
                    <span className="soclab-log-ts">{l.ts}</span>
                    <span className="soclab-log-host">{l.host}</span>
                    <span className="soclab-log-source">[{l.source}]</span>
                    <span className="soclab-log-raw">{l.raw}</span>
                  </div>
                  <div className="soclab-log-actions">
                    {act1LogActionAllowed(act1StepCaps, 'query') && act1Unlocks.cmds.has('query') && (
                      <button type="button" className="soclab-log-action" onClick={() => runLogQuerySimilar(l)}>Query similar</button>
                    )}
                    {l.ip && act1LogActionAllowed(act1StepCaps, 'lookup') && act1Unlocks.cmds.has('lookup-ip') && (
                      <button type="button" className="soclab-log-action" onClick={() => runLogLookupIp(l.ip)}>Lookup IP</button>
                    )}
                    {canIsolate && act1LogActionAllowed(act1StepCaps, 'isolate') && act1Unlocks.cmds.has('isolate') && (
                      <button type="button" className="soclab-log-action soclab-log-action-warn" onClick={() => runLogIsolateHost(l.host)}>Isolate</button>
                    )}
                  </div>
                </div>
              );
            })}
            {activeTab === 'agents' && (
              <div className="soclab-agents-table">
                <div className="soclab-agents-row soclab-agents-head">
                  <span>ID</span>
                  <span>Agent name</span>
                  <span>IP address</span>
                  <span>OS</span>
                  <span>Status</span>
                  <span>Last keep-alive</span>
                </div>
                {HOSTS.filter(h => h.agentId).map(h => {
                  const disconnected = hostStatus[h.id] === 'isolated';
                  return (
                    <div key={h.id} className="soclab-agents-row">
                      <span className="soclab-agent-id">{h.agentId}</span>
                      <span>{h.name}</span>
                      <span className="soclab-agent-ip">{h.ip}</span>
                      <span>{h.os}</span>
                      <span className={`soclab-agent-status soclab-agent-status-${disconnected ? 'disconnected' : 'active'}`}>
                        <span className="soclab-agent-dot" />{disconnected ? 'disconnected' : 'active'}
                      </span>
                      <span className="soclab-agent-keepalive">{disconnected ? 'lost — host isolated' : 'just now'}</span>
                    </div>
                  );
                })}
                <div className="soclab-agents-row soclab-agents-agentless">
                  <span className="soclab-agent-id">—</span>
                  <span>EDGE-FW01</span>
                  <span className="soclab-agent-ip">198.18.0.1</span>
                  <span>Network Appliance</span>
                  <span className="soclab-agent-status soclab-agent-status-agentless"><span className="soclab-agent-dot" />agentless (syslog)</span>
                  <span className="soclab-agent-keepalive">forwarding</span>
                </div>
              </div>
            )}
            {activeTab === 'notes' && (notes.length === 0
              ? <div className="soclab-empty">No notes yet — type one above and press Enter.</div>
              : notes.map((n, i) => <div key={i} className="soclab-note-row">📝 {n}</div>))}
          </div>
        </div>

        {showCasefile && (
          <>
            <div className="soclab-resize-handle-v" onMouseDown={startDrag('right')} />

            <div
              className={`soclab-panel soclab-casefile${panelUnlockToast === 'casefile' ? ' soclab-panel-unlock-in soclab-panel-just-unlocked' : ''}`}
              style={{ width: rightWidth, flex: '0 0 auto' }}
            >
          <div className="soclab-panel-title">{phase === 'act1' ? 'Training Room — Ticket #4471' : 'Case File'}</div>
          {phase === 'act1' ? (
            <div className="soclab-room">
              <div className="soclab-room-progress">
                <div className="soclab-room-progress-bar">
                  <div
                    className="soclab-room-progress-fill"
                    style={{ width: `${Math.round((ACT1_TASKS.filter(t => act1Objectives[t.id]).length / ACT1_TASKS.length) * 100)}%` }}
                  />
                </div>
                <div className="soclab-room-progress-label">
                  {ACT1_TASKS.filter(t => act1Objectives[t.id]).length}/{ACT1_TASKS.length} tasks
                </div>
              </div>
              {act1Complete && (
                <div className="soclab-room-complete">
                  <div className="soclab-room-complete-badge">✓</div>
                  <div className="soclab-room-complete-text">
                    <strong>Ticket #4471 resolved.</strong>
                    <span>You traced the source, confirmed the threat, and contained it in the right order. The real adversary is next.</span>
                  </div>
                  <button type="button" className="soclab-btn soclab-btn-primary soclab-btn-small" onClick={startAct2}>Begin Act 2 →</button>
                </div>
              )}
              {ACT1_TASKS.some(t => act1Objectives[t.id]) && (
                <div className="soclab-room-done">
                  <div className="soclab-room-done-label">Completed</div>
                  {ACT1_TASKS.filter(t => act1Objectives[t.id]).map(task => (
                    <div key={task.id} className="soclab-task done soclab-task-compact">
                      <span className="soclab-task-check">✅</span>
                      <span>{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {!act1Complete && act1ActiveTaskId && (() => {
                const task = ACT1_TASKS.find(t => t.id === act1ActiveTaskId);
                if (!task) return null;
                const i = ACT1_TASKS.findIndex(t => t.id === act1ActiveTaskId);
                const hintsShown = revealedHints[task.id] || 0;
                const feedback = answerFeedback[task.id];
                const answered = feedback === 'correct';
                return (
                  <div
                    key={task.id}
                    ref={activeTaskRef}
                    className="soclab-task active"
                  >
                    <div className="soclab-task-now">▶ Current step</div>
                    <div className="soclab-task-title">
                      <span className="soclab-task-check">{`${i + 1}.`}</span>
                      <span>{task.title}</span>
                    </div>
                    <div className="soclab-task-tags">
                      {task.phase && <span className="soclab-task-chip soclab-chip-phase">{task.phase}</span>}
                      {task.concept && <span className="soclab-task-chip soclab-chip-concept">{task.concept}</span>}
                      {task.mitre && (
                        <span className="soclab-task-chip soclab-chip-mitre" title={task.mitre.tactic}>
                          MITRE {task.mitre.id}
                        </span>
                      )}
                    </div>
                    <p className="soclab-task-learn">{task.learn}</p>
                    <p className="soclab-task-instruction">{task.instruction}</p>
                    {task.why && (
                      <div className="soclab-task-why">
                        <span className="soclab-task-why-label">Why this matters</span>
                        {task.why}
                      </div>
                    )}
                    {task.hints.length > 0 && (
                      <div className="soclab-task-hints">
                        {Array.from({ length: hintsShown }).map((_, hi) => (
                          <div key={hi} className="soclab-task-hint-text">💡 {task.hints[hi]}</div>
                        ))}
                        {hintsShown < task.hints.length && (
                          <button type="button" className="soclab-hint-btn" onClick={() => revealHint(task.id)}>
                            Show hint ({hintsShown + 1}/{task.hints.length})
                          </button>
                        )}
                      </div>
                    )}
                    {task.answer && (
                      <form
                        className="soclab-task-answer"
                        onSubmit={e => { e.preventDefault(); submitAnswer(task.id); }}
                      >
                        <label>{task.answer.question}</label>
                        <div className="soclab-task-answer-row">
                          <input
                            type="text"
                            value={answerDrafts[task.id] || ''}
                            onChange={e => setAnswerDrafts(prev => ({ ...prev, [task.id]: e.target.value }))}
                            placeholder="Type your answer..."
                            disabled={answered}
                          />
                          <button type="submit" disabled={answered}>Check</button>
                        </div>
                        {feedback === 'correct' && <div className="soclab-answer-correct">✔ Correct.</div>}
                        {feedback === 'incorrect' && <div className="soclab-answer-incorrect">Not quite — try a hint, or check the SIEM panel again.</div>}
                      </form>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            renderAct2LiveCards()
          )}
            </div>
          </>
        )}
      </div>

      {renderPlaybook()}

      <div className="soclab-resize-handle-h" onMouseDown={startDrag('terminal')} />

      <div className={`soclab-terminal ${tourHighlight === 'terminal' ? 'soclab-tour-highlight' : ''}`} style={{ height: terminalHeight }}>
        <div className="soclab-terminal-output" ref={termScrollRef}>
          {termHistory.map((line, i) => (
            <div key={i} className={`soclab-term-line soclab-term-${line.type}`}>{line.type === 'input' ? `> ${line.text}` : line.text}</div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="soclab-terminal-form">
          <span className="soclab-prompt">analyst@meridian-soc:~$</span>
          <input
            ref={termInputRef}
            type="text"
            value={termInput}
            onChange={e => { setTermInput(e.target.value); termCmdHistoryPosRef.current = null; }}
            onKeyDown={handleTermKeyDown}
            placeholder='type "help" · ↑↓ history · Tab complete'
          />
        </form>
      </div>
    </div>
  );
};

// Node positions are computed, not hand-placed, so adding a new device to
// HOSTS (a new workstation, a new phone, a whole new device class) just
// works — it gets a slot in the right lane automatically instead of
// silently having no position (and crashing the topology render) until
// someone remembers to add a pixel coordinate for it.
const TOPOLOGY_VIEW = { width: 320, height: 320 };
const LANE_ORDER = ['edge', 'servers', 'workstations', 'mobile'];
const LANE_Y = { edge: 30, servers: 110, workstations: 195, mobile: 270 };
// Lane for Act 2's ambient churn devices — sits between the permanent
// workstation and phone rows so it never collides with a static node.
const ACT2_CHURN_LANE_Y = 235;
// Fixed slots for churn devices: a device claims one for its whole
// connected lifetime, so positions never shift/overlap as others churn.
const CHURN_SLOTS = 4;
function nextFreeChurnSlot(occupied) {
  for (let s = 0; s < CHURN_SLOTS; s++) {
    if (!occupied.has(s)) return s;
  }
  return null;
}

function laneForHost(h) {
  if (h.zone === 'external') return 'edge';
  if (h.type === 'firewall') return 'edge';
  if (h.zone === 'dmz') return 'edge';
  if (h.type === 'server') return 'servers';
  if (h.type === 'mobile') return 'mobile';
  return 'workstations';
}

const NODE_POS = (() => {
  const lanes = {};
  LANE_ORDER.forEach(lane => { lanes[lane] = []; });
  HOSTS.forEach(h => { (lanes[laneForHost(h)] || lanes.workstations).push(h.id); });
  const pos = {};
  LANE_ORDER.forEach(lane => {
    const ids = lanes[lane];
    const y = LANE_Y[lane];
    ids.forEach((id, i) => {
      pos[id] = { x: ((i + 1) / (ids.length + 1)) * TOPOLOGY_VIEW.width, y };
    });
  });
  return pos;
})();

// Real-looking network glyphs per host type: a status-colored background
// shape (square/cloud, picks up fill/stroke/pulse from the soclab-node-*
// status classes via the shared "soclab-node-bg" class) plus a small
// type-specific icon drawn on top — cloud for the internet, a brick-wall
// shield for the firewall, a rack of blades for servers, a monitor for
// workstations — so the topology actually reads as a network diagram
// instead of a row of plain dots.
function renderNodeShape(type) {
  const iconProps = { fill: 'none', stroke: '#cfe3f0', strokeWidth: 1.3, strokeLinecap: 'round' };
  switch (type) {
    case 'cloud':
      return (
        <path
          className="soclab-node-bg"
          d="M -19,3 C -19,-5 -12,-8 -7,-6 C -5,-13 8,-13 11,-5 C 18,-5 19,3 12,4 L -16,4 Z"
        />
      );
    case 'firewall':
      return (
        <>
          <rect className="soclab-node-bg" x="-17" y="-17" width="34" height="34" rx="6" />
          <g {...iconProps}>
            <line x1="-11" y1="-6" x2="11" y2="-6" />
            <line x1="-11" y1="3" x2="11" y2="3" />
            <line x1="-3.6" y1="-13" x2="-3.6" y2="-6" />
            <line x1="3.6" y1="-13" x2="3.6" y2="-6" />
            <line x1="0" y1="-6" x2="0" y2="3" />
            <line x1="-7.3" y1="-6" x2="-7.3" y2="3" />
            <line x1="7.3" y1="-6" x2="7.3" y2="3" />
            <line x1="-3.6" y1="3" x2="-3.6" y2="12" />
            <line x1="3.6" y1="3" x2="3.6" y2="12" />
          </g>
        </>
      );
    case 'server':
      return (
        <>
          <rect className="soclab-node-bg" x="-14" y="-21" width="28" height="42" rx="4" />
          <g {...iconProps}>
            <rect x="-9.5" y="-17" width="19" height="9" rx="1.3" />
            <rect x="-9.5" y="-6" width="19" height="9" rx="1.3" />
            <rect x="-9.5" y="5" width="19" height="9" rx="1.3" />
          </g>
          <circle cx="5" cy="-12.5" r="1" fill="#6dffb0" />
          <circle cx="5" cy="-1.5" r="1" fill="#6dffb0" />
          <circle cx="5" cy="9.5" r="1" fill="#6dffb0" />
        </>
      );
    case 'mobile':
      return (
        <>
          <rect className="soclab-node-bg" x="-9" y="-18" width="18" height="36" rx="5" />
          <g {...iconProps}>
            <rect x="-6" y="-13" width="12" height="21" rx="1.2" />
            <line x1="-2.5" y1="11" x2="2.5" y2="11" />
          </g>
        </>
      );
    case 'client':
      return (
        <>
          <rect className="soclab-node-bg" x="-17" y="-14" width="34" height="28" rx="8" />
          <g {...iconProps}>
            <circle cx="-5" cy="-4" r="3.2" />
            <path d="M -10,7 C -10,1 0,1 0,7" />
            <circle cx="6" cy="-3" r="3.2" />
            <path d="M 1,7 C 1,1.5 11,1.5 11,7" />
          </g>
        </>
      );
    case 'workstation':
    default:
      return (
        <>
          <rect className="soclab-node-bg" x="-15" y="-12" width="30" height="24" rx="4" />
          <g {...iconProps}>
            <rect x="-9.5" y="-8" width="19" height="12.5" rx="1.3" />
            <line x1="0" y1="4.5" x2="0" y2="8" />
            <line x1="-5.5" y1="8" x2="5.5" y2="8" />
          </g>
        </>
      );
  }
}

export default SOCLab;
