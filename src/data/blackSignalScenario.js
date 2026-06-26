// =============================================================================
// BLACK SIGNAL — Hidden post-SOC campaign
// "The real incident begins here"
// =============================================================================

export const GHOST_SOURCE_IP = '203.0.113.88';
export const GHOST_C2_IP = '198.51.100.230';
export const GHOST_SHADOW_USER = 'jhart-shadow';
export const GHOST_COMPROMISED_HOST = 'wkstn-19';
export const SENTINEL_HOST = 'sentinel-core';

export const BLACK_SIGNAL_INTEL = {
  [GHOST_SOURCE_IP]: {
    asn: 'AS64599 — QuietRoute Transit',
    geo: 'Amsterdam, NL',
    reputation: 'SUSPICIOUS — low-volume beaconing, no public blocklist hits yet',
    firstSeen: '2025-11-02',
    note: 'Login traffic mimics legitimate VPN endpoints'
  },
  [GHOST_C2_IP]: {
    asn: 'AS64512 — GhostRelay Cooperative',
    geo: 'Unknown — anycast',
    reputation: 'CONFIRMED ADVERSARY INFRA — linked to long-dwell mapping ops',
    firstSeen: '2024-08-19',
    note: 'Infrastructure rotates every 72h — this node is still live'
  },
  '10.0.4.61': {
    asn: 'Internal — Meridian LAN',
    geo: 'On-premise',
    reputation: 'HOST ANOMALY — duplicate auth sessions from two workstations',
    firstSeen: '2026-06-01'
  }
};

export const STORY_PHASES = [
  {
    id: 'phase1',
    num: 1,
    title: 'The First Signal',
    subtitle: 'Unusual login activity',
    briefing: 'A low-severity alert fired after hours. It looks minor — investigate before you dismiss it.',
    objectives: [
      'Query auth logs for duplicate or overlapping sessions',
      'Identify the shadow account jhart-shadow',
      `Run lookup-ip on ${GHOST_SOURCE_IP}`
    ],
    completeWhen: { discoveredAccounts: [GHOST_SHADOW_USER], confirmedIPs: [GHOST_SOURCE_IP] }
  },
  {
    id: 'phase2',
    num: 2,
    title: 'The Hidden Presence',
    subtitle: 'Connected past incidents',
    briefing: 'Intel cross-reference found three "closed" tickets from the last six months. They were never unrelated.',
    objectives: [
      'Search mail logs for the phishing thread (source:mail)',
      'Find references to prior login anomalies',
      'Discover that the attacker mapped your SOC response patterns'
    ],
    completeWhen: { logQueryHits: ['source:mail', 'soc-pattern'] }
  },
  {
    id: 'phase3',
    num: 3,
    title: 'BLACK SIGNAL',
    subtitle: 'The campaign revealed',
    briefing: 'BLACK SIGNAL is not a breach — it is a coordinated test of your detection, response time, and blind spots.',
    objectives: [
      'Read the BLACK SIGNAL dossier in the case file',
      'Acknowledge the campaign briefing'
    ],
    completeWhen: { acknowledged: true }
  },
  {
    id: 'phase4',
    num: 4,
    title: 'Full Incident Response',
    subtitle: 'Emergency mode',
    briefing: 'The SOC is flooding. Thousands of alerts. Real attacks hide inside normal activity. Prioritize — do not panic-lock everything.',
    objectives: [
      'Identify the real threat on WKSTN-19 (not the decoys)',
      `Confirm ${GHOST_C2_IP} via lookup-ip`,
      `Isolate ${GHOST_COMPROMISED_HOST} with evidence`
    ],
    completeWhen: { confirmedIPs: [GHOST_C2_IP], isolatedHosts: [GHOST_COMPROMISED_HOST] }
  },
  {
    id: 'phase5',
    num: 5,
    title: 'The Ghost Revealed',
    subtitle: 'Hidden infrastructure',
    briefing: 'You traced the infrastructure. The Ghost was not purely malicious — they were proving systemic failure exists.',
    objectives: [
      'Query logs for ghost-relay infrastructure',
      'Block C2 at the firewall after intel confirmation'
    ],
    completeWhen: { blockedIPs: [GHOST_C2_IP] }
  },
  {
    id: 'phase6',
    num: 6,
    title: 'SENTINEL SYSTEM',
    subtitle: 'Abandoned AI',
    briefing: 'A decommissioned AI security system is still receiving telemetry. It was shut down — or so everyone believed.',
    objectives: [
      'Run scan-sentinel in the terminal',
      'Review SENTINEL capabilities in the case file',
      'Prepare for the final decision'
    ],
    completeWhen: { sentinelScanned: true }
  }
];

export const INTRO_CUTSCENES = [
  {
    id: 'graduation',
    title: 'Aegis Vault — Graduation Day',
    lines: [
      'Your incident report scored in the top tier. Explorer Wing → Analyst Wing → Operations Wing — the Vault pipeline is complete.',
      'PIXEL shifts mode one last time: from SOC interface to silent observer.',
      'The shift lead hands you a badge sticker: ANALYST — CLEARED.',
      'You think the training is over.',
      'It is not.'
    ]
  },
  {
    id: 'final-alert',
    title: 'Unauthorized Activity Detected',
    lines: [
      'Your personal queue receives one last alert — severity Level 4. Routine, on paper.',
      'Rule: auth.session.duplicate — host WKSTN-19 — user jhart',
      'The description is a single line: "Session overlap detected outside business hours."',
      'Something about it feels wrong. Too quiet. Too clean.'
    ]
  },
  {
    id: 'ghost-intro',
    title: 'They Call It THE GHOST',
    lines: [
      'The attacker is not breaking systems.',
      'They are hiding inside normal behavior.',
      'Legitimate credentials. Scheduled jobs. Approved VPN paths.',
      'Months of patience. One operation: map how you defend.'
    ]
  }
];

export const PHASE_CUTSCENES = {
  phase1_end: {
    title: 'Phase 1 — Discovery',
    lines: [
      'The duplicate sessions are not a glitch — jhart-shadow is a planted identity.',
      'The Ghost uses your own tools against you: SSO, VPN, helpdesk workflows.',
      'First insight: this is not malware. It is mimicry.'
    ]
  },
  phase2_end: {
    title: 'Phase 2 — The Pattern',
    lines: [
      'Three "minor" incidents — phishing, login noise, access irregularities — one thread.',
      'Internal mail shows the Ghost studied your runbooks and escalation paths.',
      'They know how long you take. They know what you ignore.'
    ]
  },
  phase3_reveal: {
    title: '⚫ BLACK SIGNAL',
    lines: [
      'BLACK SIGNAL: a coordinated cyber campaign designed to test SOC response time, detection accuracy, and organizational blind spots.',
      'You are not chasing a script kiddie. You are inside a live evaluation.',
      'Every choice from here is scored — including the ones you do not make.'
    ]
  },
  phase4_start: {
    title: 'Emergency Shift — All Hands',
    lines: [
      'Alert volume spikes 40× in ninety seconds.',
      'Patient portal traffic, patch windows, and real intrusion artifacts share the same queue.',
      'The Ghost is watching what you prioritize when everything screams at once.'
    ]
  },
  phase4_end: {
    title: 'Containment Under Fire',
    lines: [
      'WKSTN-19 isolated. C2 confirmed. The noise drops — but the campaign is not over.',
      'The Ghost left a message in the firewall logs: "Good. Now find the rest."'
    ]
  },
  phase5_end: {
    title: 'The Ghost Speaks',
    lines: [
      'Infrastructure traced to GhostRelay — a cooperative, not a lone wolf.',
      'Their manifesto is not destruction. It is proof: "Your defenses fail quietly before they fail loudly."',
      'One system on your network was never in the official inventory.'
    ]
  },
  phase6_sentinel: {
    title: 'SENTINEL',
    lines: [
      'SENTINEL: abandoned AI security platform — attack prediction, vulnerability synthesis, adversary simulation.',
      'Decommissioned eighteen months ago after a false-positive cascade.',
      'It is still listening. Still learning. Still waiting for an operator.'
    ]
  }
};

export const ENDINGS = {
  lockdown: {
    id: 'lockdown',
    icon: '🛡️',
    title: 'LOCKDOWN',
    subtitle: 'Destroy SENTINEL. Remove all risk.',
    lesson: 'Immediate containment matters.',
    lines: [
      'You pull the plug on SENTINEL and purge every artifact of the Ghost campaign.',
      'The attack ends. Systems stabilize. Leadership calls it a win.',
      'No one asks what you did not learn by stopping early.'
    ]
  },
  hunter: {
    id: 'hunter',
    icon: '🔍',
    title: 'THE HUNTER',
    subtitle: 'Keep investigating attackers.',
    lesson: 'Understanding threats prevents future attacks.',
    lines: [
      'You refuse to close the case. Intelligence feeds open. Partners contacted.',
      'The Ghost network is wider than Meridian — but now you are hunting back.',
      'Defense becomes pursuit. The SOC will never sleep the same way again.'
    ]
  },
  balanced: {
    id: 'balanced',
    icon: '⚫',
    title: 'BALANCED DEFENSE',
    subtitle: 'SENTINEL with human control.',
    lesson: 'Technology + humans = strongest defense.',
    lines: [
      'SENTINEL reactivates under strict human oversight — recommendations only, never autonomous action.',
      'Analysts stay in the loop. AI handles correlation at machine speed.',
      'Meridian publishes the first hybrid SOC playbook in the sector.'
    ]
  },
  failure: {
    id: 'failure',
    icon: '🟡',
    title: 'CASCADE FAILURE',
    subtitle: 'Missed indicators. Overreaction.',
    lesson: 'Mistakes are part of security operations.',
    lines: [
      'Too many false lockdowns. Too many missed signals. The Ghost walks through the gaps you opened.',
      'Patient-facing systems stutter. Recovery takes weeks.',
      'The after-action review is brutal — but you survive it. Next time will be different.'
    ]
  },
  ghost_protocol: {
    id: 'ghost_protocol',
    icon: '🟣',
    title: 'GHOST PROTOCOL',
    subtitle: 'SECRET — BLACK SIGNAL INITIATIVE',
    lesson: 'The best defenders do not stop every attack. They prepare for the next one.',
    lines: [
      'Perfect discipline. Every real IOC confirmed. Every decoy ignored. SENTINEL was never meant to replace defenders.',
      'It was meant to train them.',
      'A new program spins up: BLACK SIGNAL INITIATIVE — a global cybersecurity training simulation network.',
      'The Ghost removes their mask. Not an enemy — an architect.',
      '"The best defenders do not stop every attack. They prepare for the next one."'
    ]
  }
};

export const FINALE_CHOICES = [
  { id: 'lockdown', label: 'Destroy SENTINEL', desc: 'Pull the plug. Zero residual risk. End the operation now.' },
  { id: 'hunter', label: 'Keep Hunting', desc: 'Expand intelligence. Chase the wider Ghost network.' },
  { id: 'balanced', label: 'Hybrid SOC', desc: 'Reactivate SENTINEL under human control — AI assists, humans decide.' }
];

export function buildPhaseLogs(phaseId) {
  const base = [
    { ts: '23:41:08', host: 'wkstn-19', source: 'auth', user: 'jhart', ip: '10.0.4.61', raw: 'Successful logon — session id 0x8f2a (VPN path)' },
    { ts: '23:41:09', host: 'wkstn-04', source: 'auth', user: 'jhart-shadow', ip: GHOST_SOURCE_IP, raw: 'Successful logon — session id 0x8f2b (DUPLICATE USER CONTEXT)' },
    { ts: '23:41:11', host: 'wkstn-19', source: 'auth', user: 'jhart-shadow', ip: GHOST_SOURCE_IP, raw: 'Successful logon — overlapping session with jhart' }
  ];

  if (phaseId === 'phase1') return base;

  if (phaseId === 'phase2') {
    return [
      ...base,
      { ts: '22:15:00', host: 'wkstn-12', source: 'mail', user: 'jhart', ip: '', raw: 'Phishing thread reopened — subject: "Password refresh required"' },
      { ts: '22:15:44', host: 'wkstn-12', source: 'mail', user: 'jhart', ip: '', raw: 'User clicked tracked link — ticket #3892 closed as "user error"' },
      { ts: '14:02:19', host: 'dc-01', source: 'auth', user: 'jhart', ip: '10.0.4.10', raw: 'Login anomaly — off-hours DC auth (ticket #4011 — no escalation)' },
      { ts: '09:33:55', host: 'fs-01', source: 'process', user: 'svc-backup', ip: '', raw: 'Access irregularity — backup job window overlap (ticket #4156 — benign)' },
      { ts: '18:44:02', host: 'wkstn-07', source: 'auth', user: 'mlee', ip: '10.0.4.44', raw: 'SOC pattern note embedded — attacker mapped soc-pattern response: avg 4.2 min to isolate' }
    ];
  }

  return base;
}

export function buildPhaseAlerts(phaseId, alertSeq = 0) {
  if (phaseId === 'phase1' || phaseId === 'phase2') {
    return [{
      id: `bs-alert-${alertSeq}`,
      level: 4,
      ruleId: '5710',
      host: 'wkstn-19',
      rule: 'auth.session.duplicate',
      description: 'Session overlap detected outside business hours',
      mitre: { id: 'T1078', tactic: 'Valid Accounts' }
    }];
  }

  if (phaseId === 'phase4') {
    const decoys = [
      { level: 3, host: 'web-01', rule: 'web.scanner', description: 'Routine vulnerability scan — scheduled' },
      { level: 5, host: 'client-pool', rule: 'portal.traffic.spike', description: 'Patient portal traffic surge — expected' },
      { level: 6, host: 'wkstn-04', rule: 'auth.failed_logon', description: 'Failed logon — user typo (3 attempts)' },
      { level: 7, host: 'mob-02', rule: 'mdm.checkin', description: 'BYOD check-in from new cell tower' },
      { level: 8, host: 'wkstn-07', rule: 'process.office.macro', description: 'Macro execution — finance spreadsheet (approved)' }
    ];
    const real = {
      id: `bs-real-${alertSeq}`,
      level: 12,
      ruleId: '100302',
      host: GHOST_COMPROMISED_HOST,
      rule: 'lateral.tool.transfer',
      description: 'Suspicious admin tool staged — matches Ghost TTP',
      mitre: { id: 'T1021', tactic: 'Lateral Movement' },
      real: true
    };
    return [
      real,
      ...decoys.map((d, i) => ({
        id: `bs-decoy-${alertSeq}-${i}`,
        ...d,
        ruleId: `9${i}${i}${i}`,
        mitre: { id: 'T1595', tactic: 'Reconnaissance' }
      }))
    ];
  }

  if (phaseId === 'phase5' || phaseId === 'phase6') {
    return [{
      id: `bs-alert-${alertSeq}`,
      level: 10,
      ruleId: '87101',
      host: GHOST_COMPROMISED_HOST,
      rule: 'firewall.beacon',
      description: `Outbound beacon to ${GHOST_C2_IP} — ghost-relay infrastructure`,
      mitre: { id: 'T1071', tactic: 'Command and Control' }
    }];
  }

  return [];
}

export function buildFloodAlerts(batchId) {
  const templates = [
    { level: 2, host: 'web-01', rule: 'web.health', description: 'Health check OK' },
    { level: 3, host: 'wkstn-12', rule: 'patch.success', description: 'Windows update installed' },
    { level: 4, host: 'mob-01', rule: 'mdm.sync', description: 'MDM policy sync complete' },
    { level: 5, host: 'fs-01', rule: 'backup.complete', description: 'Nightly backup finished' },
    { level: 6, host: 'wkstn-15', rule: 'auth.success', description: 'Standard user logon' }
  ];
  return templates.map((t, i) => ({
    id: `bs-flood-${batchId}-${i}`,
    ...t,
    ruleId: `F${batchId}${i}`,
    mitre: { id: 'T1595', tactic: 'Reconnaissance' }
  }));
}
