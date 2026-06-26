// =============================================================================
// SOC LAB SCENARIO DATA — High School (9-12) tier
// -----------------------------------------------------------------------------
// One continuous case at a fictional Aegis client assignment, "Meridian Health Analytics."
// Act 1 is a guided single-host incident that teaches the SIEM query syntax,
// the network topology panel, and the containment-action commands. Act 2 is
// an unguided, multi-stage intrusion run by a scripted-but-reactive "AI
// pentester" — a state machine that advances through a real kill chain on a
// clock, and which branches/slows/reroutes based on which containment
// actions the player has actually taken, so it *feels* adaptive without
// needing a live model. Nothing here is randomized in outcome, only in
// timing, so the case is fair and replayable.
// =============================================================================

// ---------------------------------------------------------------------------
// Network topology
// ---------------------------------------------------------------------------
// `agentId` follows real Wazuh convention (000 is reserved for the manager
// itself, agents are zero-padded from 001). The firewall is monitored
// agentlessly — Wazuh collects its syslog rather than running an agent on
// it — and the internet cloud node obviously isn't a monitored asset at
// all, so neither gets an agentId.
export const HOSTS = [
  { id: 'internet', name: 'Internet', type: 'cloud', zone: 'external', undefendable: true },
  { id: 'fw-edge', name: 'EDGE-FW01', sub: 'Perimeter Firewall', type: 'firewall', zone: 'perimeter', ip: '198.18.0.1', os: 'Network Appliance', monitoring: 'agentless' },
  { id: 'web-01', name: 'WEB-01', sub: 'Public Web/Portal Server', type: 'server', zone: 'dmz', agentId: '001', ip: '10.0.2.10', os: 'Ubuntu 22.04 LTS', version: 'Wazuh agent 4.9.2' },
  { id: 'dc-01', name: 'DC-01', sub: 'Domain Controller', type: 'server', zone: 'internal', agentId: '002', ip: '10.0.4.10', os: 'Windows Server 2022', version: 'Wazuh agent 4.9.2' },
  { id: 'fs-01', name: 'FS-01', sub: 'File Server — Patient Records', type: 'server', zone: 'internal', agentId: '003', ip: '10.0.4.20', os: 'Windows Server 2022', version: 'Wazuh agent 4.9.2' },
  { id: 'wkstn-04', name: 'WKSTN-04', sub: 'Finance — D. Cho', type: 'workstation', zone: 'internal', agentId: '004', ip: '10.0.4.41', os: 'Windows 11 Enterprise', version: 'Wazuh agent 4.9.2' },
  { id: 'wkstn-07', name: 'WKSTN-07', sub: 'Sales — M. Lee', type: 'workstation', zone: 'internal', agentId: '005', ip: '10.0.4.44', os: 'Windows 11 Enterprise', version: 'Wazuh agent 4.9.2' },
  { id: 'wkstn-12', name: 'WKSTN-12', sub: 'Helpdesk — P. Patel', type: 'workstation', zone: 'internal', agentId: '006', ip: '10.0.4.52', os: 'Windows 10 Enterprise', version: 'Wazuh agent 4.9.2' },
  // Extra Helpdesk-role workstations — one of these (picked at random each
  // session, see ACT2_ENTRY_HOST_POOL below) plays the role of "the machine
  // that opened the phishing macro" in Act 2. The rest just sit there as
  // decoys, same as wkstn-04 always has — which matters more now that
  // isolating an uninvolved host costs you (see evaluateContainment).
  { id: 'wkstn-15', name: 'WKSTN-15', sub: 'Helpdesk — R. Nguyen', type: 'workstation', zone: 'internal', agentId: '007', ip: '10.0.4.58', os: 'Windows 11 Enterprise', version: 'Wazuh agent 4.9.2' },
  { id: 'wkstn-19', name: 'WKSTN-19', sub: 'Helpdesk — A. Brooks', type: 'workstation', zone: 'internal', agentId: '008', ip: '10.0.4.61', os: 'Windows 10 Enterprise', version: 'Wazuh agent 4.9.2' },
  { id: 'wkstn-23', name: 'WKSTN-23', sub: 'Helpdesk — J. Kim', type: 'workstation', zone: 'internal', agentId: '009', ip: '10.0.4.66', os: 'Windows 10 Enterprise', version: 'Wazuh agent 4.9.2' },
  // BYOD phones — personal devices that are MDM-enrolled but don't run a
  // Wazuh agent (same "agentless" monitoring story as the firewall, just
  // for a different reason: it's not company-owned hardware). They're
  // decoys like the spare workstations, just on a different device class,
  // so the network reads like an actual mixed-device office instead of
  // "every node is a desktop."
  { id: 'mob-01', name: 'PHONE-01', sub: 'BYOD — C. Diaz (Practice Manager)', type: 'mobile', zone: 'internal', ip: '10.0.5.21', os: 'iOS 18 · MDM-enrolled', monitoring: 'agentless' },
  { id: 'mob-02', name: 'PHONE-02', sub: 'BYOD — On-call Helpdesk', type: 'mobile', zone: 'internal', ip: '10.0.5.34', os: 'Android 15 · MDM-enrolled', monitoring: 'agentless' },
  // Live customer traffic — patients actually using the portal right now.
  // This is the thing WEB-01 exists to serve, and it's also the source of
  // the "normal business noise" mixed into the recon-stage logs: real SOC
  // work means picking the actual scan out of a server that's busy doing
  // its job, not reading a feed that's 100% attack signal. Undefendable —
  // you cannot isolate your own customers.
  { id: 'client-pool', name: 'PORTAL-USERS', sub: 'Live Patient Portal Traffic — ~247 active sessions', type: 'client', zone: 'external', undefendable: true }
];

// Act 2 ambient churn pool — devices that aren't part of the permanent
// network map. During Act 2 these randomly connect and disconnect (shift
// changes, staff stepping away, BYOD phones drifting on/off Wi-Fi) so the
// topology feels alive instead of static. Purely cosmetic: not in HOSTS,
// can't be isolated, generate no logs of their own. The actual entry
// host's reconnect at initial_access gets folded into this same churn
// (see SOCLab.jsx revealStage) so it doesn't visually stick out.
export const ACT2_CHURN_POOL = [
  { id: 'chrn-laptop-01', name: 'LAPTOP-A13', sub: 'Front Desk — shift laptop', type: 'workstation' },
  { id: 'chrn-laptop-02', name: 'LAPTOP-B07', sub: 'Billing — shift laptop', type: 'workstation' },
  { id: 'chrn-laptop-03', name: 'LAPTOP-C19', sub: 'Guest — conference room', type: 'workstation' },
  { id: 'chrn-phone-01', name: 'PHONE-06', sub: 'BYOD — Nursing staff', type: 'mobile' },
  { id: 'chrn-phone-02', name: 'PHONE-07', sub: 'BYOD — Front Desk', type: 'mobile' },
  { id: 'chrn-phone-03', name: 'PHONE-08', sub: 'BYOD — Billing', type: 'mobile' },
  { id: 'chrn-tablet-01', name: 'TABLET-02', sub: 'Vendor — pharmacy rep', type: 'mobile' }
];

export const TOPOLOGY_EDGES = [
  ['internet', 'fw-edge'],
  ['internet', 'client-pool'],
  ['fw-edge', 'web-01'],
  ['fw-edge', 'dc-01'],
  ['fw-edge', 'fs-01'],
  ['fw-edge', 'wkstn-04'],
  ['fw-edge', 'wkstn-07'],
  ['fw-edge', 'wkstn-12'],
  ['fw-edge', 'wkstn-15'],
  ['fw-edge', 'wkstn-19'],
  ['fw-edge', 'wkstn-23'],
  ['fw-edge', 'mob-01'],
  ['fw-edge', 'mob-02']
];

// Simple "threat intel" lookup table for the lookup-ip command. Not every IP
// in the logs is in here on purpose — part of the exercise is recognizing
// which IPs are actually worth looking up.
export const THREAT_INTEL = {
  '203.0.113.55': {
    asn: 'AS64531 — BulletShield Hosting Ltd.',
    geo: 'Bucharest, RO',
    reputation: 'KNOWN BAD — flagged in 3 public blocklists for credential-stuffing campaigns',
    firstSeen: '2026-01-04'
  },
  '198.51.100.230': {
    asn: 'AS64612 — Quasar VPS Group',
    geo: 'Sofia, BG',
    reputation: 'SUSPICIOUS — bulletproof hosting range, no prior reports but high-risk ASN',
    firstSeen: 'No prior sightings'
  },
  '198.51.100.231': {
    asn: 'AS64612 — Quasar VPS Group',
    geo: 'Sofia, BG',
    reputation: 'SUSPICIOUS — same hosting range as 198.51.100.230, likely same operator',
    firstSeen: 'No prior sightings'
  },
  '192.0.2.18': {
    asn: 'AS7018 — Regional ISP',
    geo: 'Columbus, US',
    reputation: 'CLEAN — residential IP, no flags',
    firstSeen: 'N/A'
  }
};

// ---------------------------------------------------------------------------
// ACT 1 — Guided tutorial incident
// A noisy brute-force campaign against one workstation's RDP-style remote
// login, ending in one successful login on a reused/weak password. Small
// enough to fully resolve in one sitting, used to teach: reading the alert
// queue, querying logs with the field:value syntax, and the
// isolate / block-ip / disable-user commands.
// ---------------------------------------------------------------------------
export const ACT1_SOURCE_IP = '203.0.113.55';
export const ACT1_HOST = 'wkstn-07';
export const ACT1_USER = 'mlee';

export const ACT1_LOGS = [
  // --- benign baseline noise, present from the start ---
  { ts: '08:01:12', host: 'dc-01', source: 'auth', user: 'dcho', ip: '10.0.4.41', raw: 'Successful logon: user=dcho method=password workstation=WKSTN-04', level: 2 },
  { ts: '08:14:55', host: 'web-01', source: 'web', ip: '192.0.2.18', raw: 'GET /portal/dashboard 200 OK user=dcho', level: 1 },
  { ts: '08:22:30', host: 'fs-01', source: 'auth', user: 'mlee', ip: '10.0.4.44', raw: 'Successful logon: user=mlee method=password workstation=WKSTN-07', level: 2 },
  { ts: '09:03:18', host: 'fw-edge', source: 'firewall', ip: '192.0.2.18', raw: 'ALLOW tcp 192.0.2.18:51223 -> web-01:443', level: 1 },
  // --- the actual incident: brute force against WKSTN-07's remote login ---
  { ts: '09:41:02', host: 'wkstn-07', source: 'auth', user: 'mlee', ip: '203.0.113.55', raw: 'Failed remote logon attempt: user=mlee method=password reason=bad_password', level: 5 },
  { ts: '09:41:09', host: 'wkstn-07', source: 'auth', user: 'mlee', ip: '203.0.113.55', raw: 'Failed remote logon attempt: user=mlee method=password reason=bad_password', level: 5 },
  { ts: '09:41:16', host: 'wkstn-07', source: 'auth', user: 'mlee', ip: '203.0.113.55', raw: 'Failed remote logon attempt: user=mlee method=password reason=bad_password', level: 5 },
  { ts: '09:41:24', host: 'wkstn-07', source: 'auth', user: 'mlee', ip: '203.0.113.55', raw: 'Failed remote logon attempt: user=mlee method=password reason=bad_password', level: 5 },
  { ts: '09:41:31', host: 'wkstn-07', source: 'auth', user: 'mlee', ip: '203.0.113.55', raw: 'Failed remote logon attempt: user=mlee method=password reason=bad_password', level: 5 },
  { ts: '09:41:39', host: 'wkstn-07', source: 'auth', user: 'mlee', ip: '203.0.113.55', raw: 'Failed remote logon attempt: user=mlee method=password reason=bad_password', level: 5 },
  { ts: '09:41:47', host: 'wkstn-07', source: 'auth', user: 'mlee', ip: '203.0.113.55', raw: 'Failed remote logon attempt: user=mlee method=password reason=bad_password', level: 5 },
  { ts: '09:41:55', host: 'wkstn-07', source: 'auth', user: 'mlee', ip: '203.0.113.55', raw: 'SUCCESSFUL remote logon: user=mlee method=password', level: 10 },
  { ts: '09:42:10', host: 'wkstn-07', source: 'process', user: 'mlee', ip: '203.0.113.55', raw: 'New process created: cmd.exe parent=remote_session.exe', level: 8 },
  { ts: '09:43:01', host: 'fw-edge', source: 'firewall', ip: '203.0.113.55', raw: 'ALLOW tcp 203.0.113.55:33182 -> wkstn-07:3389', level: 6 }
];

export const ACT1_ALERTS = [
  { ts: '09:41:24', host: 'wkstn-07', level: 7, rule: 'auth-bruteforce', ruleId: '100201', mitre: { id: 'T1110', tactic: 'Credential Access' }, description: '5+ failed remote logons for user mlee in under 60s' },
  { ts: '09:41:55', host: 'wkstn-07', level: 12, rule: 'auth-bruteforce-success', ruleId: '100202', mitre: { id: 'T1078', tactic: 'Initial Access' }, description: 'Remote logon succeeded for mlee immediately following a brute-force pattern' }
];

// ---------------------------------------------------------------------------
// Act 1 is structured like a TryHackMe "room": each task pairs a short
// concept explainer ("learn") with a concrete thing to go do ("instruction"),
// progressive hints you can reveal one at a time, and — for the
// investigative tasks — a comprehension question with a real answer to
// type in. Tasks with no `answer` are action-only (you complete them by
// actually doing the containment step, not by answering a question about
// it). Order here is the suggested order, but nothing is hard-locked: read
// ahead any time, same as a THM room.
// ---------------------------------------------------------------------------
export const ACT1_TASKS = [
  {
    id: 'a1-read-alert',
    title: 'Read the Alert',
    phase: 'Triage',
    concept: 'Alert Triage',
    mitre: { id: 'T1110', tactic: 'Credential Access' },
    learn: "Every new alert lands in the queue with a severity level and a short rule description. Before touching anything, read what the SIEM is telling you — what triggered it, on which host, and how severe it is.",
    instruction: 'In the center SIEM panel, open the Security Events tab. Read the alert on WKSTN-07, note the severity level in the left column, then type your answer in the Training Room checklist on the right.',
    why: "Real SOC analysts start every shift the same way: working the alert queue from the top. Reading before reacting is what separates an investigation from a panic.",
    hints: [
      "The Security Events tab is in the center panel — it's selected by default when the ticket opens.",
      "Look at the severity badge on the left of each row — Level 7 on the auth-bruteforce alert is what the comprehension question asks for."
    ],
    answer: { question: 'What severity level did the SIEM assign to the auth-bruteforce alert on WKSTN-07?', accept: ['7', 'seven', 'l7', 'level 7'] }
  },
  {
    id: 'a1-query-auth',
    title: 'Find the Source',
    phase: 'Investigate',
    concept: 'Threat Hunting',
    mitre: { id: 'T1110', tactic: 'Credential Access' },
    learn: "Alerts tell you something happened; logs tell you the details. The query command searches the raw log store using field filters like host:, source:, and user: — the same skill as writing a search in Splunk or Wazuh.",
    instruction: 'Switch to the Threat Hunting tab, then type and run a log query in the terminal to find the attacker\'s IP.',
    why: "An alert points you at a host; the logs name the attacker. Pivoting from alert to raw evidence is the core loop of every investigation you'll ever run.",
    hints: [
      'Try: query host:wkstn-07 source:auth',
      "Every failed-logon line lists the same ip: value — that's your attacker."
    ],
    answer: { question: 'What IP address is performing the brute-force attempts against WKSTN-07?', accept: ['203.0.113.55'] }
  },
  {
    id: 'a1-lookup-ip',
    title: 'Check Threat Intel',
    phase: 'Investigate',
    concept: 'Threat Intelligence',
    mitre: { id: 'T1591', tactic: 'Reconnaissance' },
    learn: "Before acting on an IP, analysts pivot to threat intelligence — reputation feeds, ASN ownership, geolocation — to confirm it's actually malicious and not, say, a remote employee. The lookup-ip command checks this case's intel feed.",
    instruction: 'Type and run lookup-ip on the IP you found in the previous step.',
    why: "Blocking the wrong IP can lock out a real employee or customer. Confirming reputation first is how you act fast without breaking the business.",
    hints: [
      'Try: lookup-ip 203.0.113.55',
      "Check the \"Reputation\" line in the result — it tells you everything you need."
    ],
    answer: { question: 'Based on the threat intel, what country is this IP geolocated to?', accept: ['romania', 'ro'] }
  },
  {
    id: 'a1-isolate',
    title: 'Contain the Host',
    phase: 'Contain',
    concept: 'Containment',
    mitre: { id: 'T1078', tactic: 'Defense / Response' },
    learn: "Once you've confirmed an active intrusion, the fastest way to stop the bleeding is Wazuh's \"agent isolation\" Active Response — it cuts the compromised machine off the network without destroying evidence. Meridian policy: only isolate hosts already in your evidence tray (from alerts, queries, or logs).",
    instruction: 'Type and run isolate wkstn-07 in the terminal — or click the host on the network map when it appears.',
    why: "Isolation beats powering the machine off: it strands the attacker while keeping memory and disk intact for the forensics team. Evidence survives, the threat doesn't.",
    hints: [
      'Try: isolate wkstn-07',
      'You can also click the host on the topology map and use the quick-action it offers.'
    ],
    answer: null
  },
  {
    id: 'a1-block-ip',
    title: 'Block at the Firewall',
    phase: 'Contain',
    concept: 'Network Defense',
    mitre: { id: 'T1110', tactic: 'Defense / Response' },
    learn: "Isolating the host protects that one machine, but the attacker's IP can still try other targets. Wazuh's \"firewall-drop\" Active Response pushes a block to the perimeter firewall. You must run lookup-ip first — observed in logs is not enough to block.",
    instruction: 'Type and run block-ip with the attacker IP you confirmed in threat intel.',
    why: "Defense in depth: one control rarely covers everything. Host isolation guards WKSTN-07; a firewall block stops that same attacker from simply pivoting to the next machine.",
    hints: ['Try: block-ip 203.0.113.55'],
    answer: null
  },
  {
    id: 'a1-disable-user',
    title: 'Lock the Account',
    phase: 'Eradicate',
    concept: 'Credential Hygiene',
    mitre: { id: 'T1078', tactic: 'Credential Access' },
    learn: "The attacker had a valid password for mlee's account — until it's reset, that credential is still usable anywhere it's accepted. Wazuh's \"disable-account\" Active Response closes that door immediately. Only disable accounts you have seen in auth logs during this investigation.",
    instruction: 'Type and run disable-user with the account you saw in the auth logs.',
    why: "A stolen password works on every system that trusts it, not just the machine where it leaked. Locking the account closes the door everywhere at once.",
    hints: ['Try: disable-user mlee'],
    answer: null
  }
];

// ---------------------------------------------------------------------------
// ACT 2 — Adaptive multi-stage intrusion ("AI pentester")
// A kill-chain state machine. `advance` for each stage returns the next
// stage id given the current containment state — this is the "reactive AI"
// layer. Stages fire their log/alert lines when they become active.
//
// REPLAYABILITY: which workstation got phished, which service account got
// stolen, and which C2 IPs were used are now picked randomly per session
// from small pools (see ACT2_ENTRY_HOST_POOL / ACT2_STOLEN_ACCOUNT_POOL /
// ACT2_C2_VARIANT_POOL below) instead of being fixed constants. The story
// beats, MITRE mapping, and difficulty are identical every time — only the
// identifiers change — so a memorized answer ("isolate wkstn-12, disable
// svc-helpdesk-adm") from a classmate's playthrough won't transfer directly
// to the next student's session. Call pickAct2Variant() once per session and
// pass the result into buildAct2Scenario() to get the full data bundle.
// ---------------------------------------------------------------------------
export const ACT2_ENTRY_HOST_POOL = [
  { hostId: 'wkstn-12', entryUser: 'ppatel' },
  { hostId: 'wkstn-15', entryUser: 'rnguyen' },
  { hostId: 'wkstn-19', entryUser: 'abrooks' },
  { hostId: 'wkstn-23', entryUser: 'jkim' }
];

export const ACT2_STOLEN_ACCOUNT_POOL = ['svc-helpdesk-adm', 'svc-it-admin', 'svc-support-adm', 'svc-deskadmin'];

// Three different "bulletproof hosting" identities, each its own primary +
// backup IP pair plus matching threat-intel flavor text for lookup-ip.
export const ACT2_C2_VARIANT_POOL = [
  { primary: '198.51.100.230', backup: '198.51.100.231', asn: 'AS64612 — Quasar VPS Group', geo: 'Sofia, BG' },
  { primary: '192.0.2.210', backup: '192.0.2.211', asn: 'AS64720 — Nightshade Cloud Ltd.', geo: 'Riga, LV' },
  { primary: '203.0.113.190', backup: '203.0.113.191', asn: 'AS64801 — Obscura Networks', geo: 'Chisinau, MD' }
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Picks one random combination of entry host / stolen account / C2
// infrastructure. Call this once per Act 2 session and feed the result to
// buildAct2Scenario().
export function pickAct2Variant() {
  const entry = pickRandom(ACT2_ENTRY_HOST_POOL);
  const entryHost = HOSTS.find(h => h.id === entry.hostId);
  const c2 = pickRandom(ACT2_C2_VARIANT_POOL);
  return {
    entryHostId: entry.hostId,
    entryHostName: entryHost ? entryHost.name : entry.hostId.toUpperCase(),
    entryUser: entry.entryUser,
    stolenAccount: pickRandom(ACT2_STOLEN_ACCOUNT_POOL),
    c2Primary: c2.primary,
    c2Backup: c2.backup,
    c2Asn: c2.asn,
    c2Geo: c2.geo
  };
}

// Builds the full Act 2 data bundle (stages, reroute content, threat intel
// for the C2 IPs, report rubric) for a given variant. Every previously
// hardcoded "wkstn-12" / "svc-helpdesk-adm" / "198.51.100.230" reference is
// now interpolated from the variant instead.
export function buildAct2Scenario(variant) {
  const { entryHostId, entryHostName, entryUser, stolenAccount, c2Primary, c2Backup, c2Asn, c2Geo } = variant;

  const ACT2_STAGES = {
    recon: {
      id: 'recon',
      label: 'Reconnaissance',
      ticket: 'Unfamiliar IP probing the perimeter',
      hints: [
        "EDGE-FW01 is logging probe traffic from an IP you haven't seen before — worth a look before it finds a way in.",
        `Try: lookup-ip ${c2Primary}`
      ],
      validResponses: [{ action: 'block-ip', target: c2Primary }],
      // The recon scan is buried in normal portal traffic on purpose — real
      // SOC work means finding the actual probe inside a server that's
      // busy serving real patients, not reading a feed that's 100% signal.
      // The PORTAL-USERS lines (203.0.113.1x, level 2) are background noise;
      // the level-3 fw-edge DENY/ALLOW lines from c2Primary are the actual
      // recon pattern this stage is built around.
      logs: [
        { ts: '13:01:47', host: 'web-01', source: 'web', ip: '203.0.113.10', raw: 'GET /portal/dashboard HTTP/1.1 200 — session=a91f', level: 2 },
        { ts: '13:01:55', host: 'web-01', source: 'web', ip: '203.0.113.11', raw: 'POST /portal/login HTTP/1.1 200 — session=7bd2', level: 2 },
        { ts: '13:02:04', host: 'fw-edge', source: 'firewall', ip: c2Primary, raw: `DENY tcp ${c2Primary}:* -> web-01:22`, level: 3 },
        { ts: '13:02:05', host: 'fw-edge', source: 'firewall', ip: c2Primary, raw: `DENY tcp ${c2Primary}:* -> web-01:3389`, level: 3 },
        { ts: '13:02:05', host: 'web-01', source: 'web', ip: '203.0.113.12', raw: 'GET /portal/records HTTP/1.1 200 — session=44ce', level: 2 },
        { ts: '13:02:06', host: 'fw-edge', source: 'firewall', ip: c2Primary, raw: `DENY tcp ${c2Primary}:* -> web-01:445`, level: 3 },
        { ts: '13:02:08', host: 'web-01', source: 'web', ip: '203.0.113.13', raw: 'GET /portal/dashboard HTTP/1.1 200 — session=91aa', level: 2 },
        { ts: '13:02:09', host: 'fw-edge', source: 'firewall', ip: c2Primary, raw: `ALLOW tcp ${c2Primary}:51110 -> web-01:443`, level: 3 },
        { ts: '13:02:11', host: 'web-01', source: 'web', ip: '203.0.113.14', raw: 'POST /portal/appointments HTTP/1.1 200 — session=c310', level: 2 }
      ],
      alerts: [
        { ts: '13:02:09', host: 'fw-edge', level: 5, rule: 'port-scan', ruleId: '100210', mitre: { id: 'T1595', tactic: 'Reconnaissance' }, description: `Sequential port probe against web-01 from ${c2Primary} (22, 3389, 445, then 443)` }
      ]
    },
    initial_access: {
      id: 'initial_access',
      label: 'Initial Access',
      ticket: 'Macro payload just popped a shell',
      hints: [
        `Something on ${entryHostName} opened an outbound connection right after a suspicious file ran. Sound familiar from Act 1?`,
        `Try: isolate ${entryHostId}`
      ],
      validResponses: [{ action: 'isolate', target: entryHostId }],
      logs: [
        { ts: '13:18:40', host: entryHostId, source: 'web', user: entryUser, raw: 'Email opened: subject="Updated Helpdesk Ticket Macro.docm" attachment macro-enabled', level: 4 },
        { ts: '13:18:55', host: entryHostId, source: 'process', user: entryUser, raw: 'New process created: powershell.exe parent=winword.exe args="-enc <base64>"', level: 9 },
        { ts: '13:19:02', host: 'fw-edge', source: 'firewall', ip: c2Primary, raw: `ALLOW tcp ${entryHostId}:51544 -> ${c2Primary}:8443`, level: 8 }
      ],
      alerts: [
        { ts: '13:18:55', host: entryHostId, level: 11, rule: 'office-macro-spawns-shell', ruleId: '100211', mitre: { id: 'T1566.001', tactic: 'Initial Access' }, description: 'winword.exe spawned powershell.exe with an encoded command — classic macro payload pattern' },
        { ts: '13:19:02', host: entryHostId, level: 9, rule: 'outbound-beacon', ruleId: '100212', mitre: { id: 'T1071', tactic: 'Command and Control' }, description: `${entryHostName} opened an outbound connection to ${c2Primary}:8443 immediately after the macro ran` }
      ]
    },
    privesc_credtheft: {
      id: 'privesc_credtheft',
      label: 'Privilege Escalation & Credential Theft',
      ticket: 'Memory access pattern + odd-hours admin logon',
      hints: [
        "A process is reaching into memory it has no business touching, and an admin account just logged on at a strange hour.",
        `Try: isolate ${entryHostId} — or disable-user ${stolenAccount} if the credential is already out`
      ],
      validResponses: [
        { action: 'isolate', target: entryHostId },
        { action: 'disable-account', target: stolenAccount }
      ],
      logs: [
        { ts: '13:31:20', host: entryHostId, source: 'process', user: entryUser, raw: 'powershell.exe opened a handle to lsass.exe with PROCESS_VM_READ — credential-dumping pattern', level: 12 },
        { ts: '13:34:02', host: 'dc-01', source: 'auth', user: stolenAccount, ip: '10.0.4.62', raw: `Successful logon: user=${stolenAccount} method=NTLM workstation=${entryHostName} time=unusual_hour`, level: 10 }
      ],
      alerts: [
        { ts: '13:31:20', host: entryHostId, level: 13, rule: 'lsass-credential-access', ruleId: '100213', mitre: { id: 'T1003.001', tactic: 'Credential Access' }, description: 'powershell.exe accessed lsass.exe memory — likely credential dumping (Mimikatz-style)' },
        { ts: '13:34:02', host: 'dc-01', level: 11, rule: 'anomalous-admin-logon', ruleId: '100214', mitre: { id: 'T1078', tactic: 'Privilege Escalation' }, description: `Service account ${stolenAccount} authenticated to the domain controller from ${entryHostName} outside business hours` }
      ]
    },
    lateral_movement: {
      id: 'lateral_movement',
      label: 'Lateral Movement',
      ticket: 'Stolen admin account reached the file server',
      hints: [
        "That same admin account just showed up somewhere it's never logged into before.",
        `Try: isolate fs-01, isolate dc-01, or disable-user ${stolenAccount}`
      ],
      validResponses: [
        { action: 'isolate', target: entryHostId },
        { action: 'isolate', target: 'fs-01' },
        { action: 'isolate', target: 'dc-01' },
        { action: 'disable-account', target: stolenAccount }
      ],
      logs: [
        { ts: '13:47:11', host: 'fs-01', source: 'auth', user: stolenAccount, ip: '10.0.4.62', raw: `Successful logon: user=${stolenAccount} method=NTLM workstation=${entryHostName}`, level: 10 },
        { ts: '13:48:02', host: 'fs-01', source: 'process', user: stolenAccount, raw: 'Patient_Records_Archive directory accessed and compressed: archive.zip (1.8GB)', level: 11 }
      ],
      alerts: [
        { ts: '13:47:11', host: 'fs-01', level: 12, rule: 'lateral-movement-admin-creds', ruleId: '100215', mitre: { id: 'T1021', tactic: 'Lateral Movement' }, description: `Service account ${stolenAccount} logged into the patient records file server for the first time ever from ${entryHostName}` },
        { ts: '13:48:02', host: 'fs-01', level: 10, rule: 'mass-file-staging', ruleId: '100216', mitre: { id: 'T1074', tactic: 'Collection' }, description: 'Large archive of patient records staged immediately after an unusual admin logon' }
      ]
    },
    exfiltration: {
      id: 'exfiltration',
      label: 'Exfiltration',
      ticket: 'Patient records leaving the building',
      hints: [
        'Data is moving out, fast — this is the last stop before it\'s gone for good.',
        "It may be too late to fully stop this one, but isolating fs-01 still matters for the record."
      ],
      validResponses: [
        { action: 'isolate', target: 'fs-01' },
        { action: 'disable-account', target: stolenAccount }
      ],
      logs: [
        { ts: '14:01:40', host: 'fs-01', source: 'firewall', ip: c2Primary, raw: `ALLOW tcp fs-01:52310 -> ${c2Primary}:8443 bytes_out=1.79GB`, level: 14 }
      ],
      alerts: [
        { ts: '14:01:40', host: 'fs-01', level: 15, rule: 'mass-exfiltration', ruleId: '100217', mitre: { id: 'T1041', tactic: 'Exfiltration' }, description: '1.79GB transferred from the patient records server to an external IP in a single HTTPS session — likely data theft in progress' }
      ]
    }
  };

  // Reroute logic when the primary C2 channel gets blocked but the host
  // itself is never isolated — the "AI pentester" switches infrastructure
  // instead of giving up, which is what real adversaries do.
  const ACT2_C2_REROUTE_LOGS = [
    { ts: '13:52:00', host: entryHostId, source: 'dns', raw: `DNS query: update-cdn-sync.net -> resolves to ${c2Backup}`, level: 6 },
    { ts: '13:52:04', host: 'fw-edge', source: 'firewall', ip: c2Backup, raw: `ALLOW tcp ${entryHostId}:52201 -> ${c2Backup}:443`, level: 8 }
  ];
  const ACT2_C2_REROUTE_ALERT = {
    ts: '13:52:04', host: entryHostId, level: 9, rule: 'outbound-beacon-secondary',
    ruleId: '100218', mitre: { id: 'T1071', tactic: 'Command and Control' },
    description: `${entryHostName} began beaconing to a new domain (update-cdn-sync.net -> ${c2Backup}) minutes after ${c2Primary} was blocked — likely backup C2 infrastructure`
  };
  // Shown as its own ticket if the reroute fires — blocking the IP alone
  // wasn't enough, the host itself is still talking to someone.
  const ACT2_REROUTE_TICKET = {
    ticket: 'Backup C2 channel just lit up',
    hints: [
      'Blocking the IP didn\'t stop it — the host found a new domain to talk to. The IP was never the real problem.',
      `Try: isolate ${entryHostId}`
    ],
    validResponses: [{ action: 'isolate', target: entryHostId }]
  };

  const REPORT_RUBRIC = {
    rootCauseKeywords: ['phishing', 'macro', 'email', 'attachment'],
    correctHosts: [entryHostId, 'dc-01', 'fs-01'],
    correctIPs: [c2Primary, c2Backup],
    correctAccounts: [stolenAccount],
    remediationOptions: [
      { id: 'reset-creds', label: 'Force password reset on all admin/service accounts used during the incident', correct: true },
      { id: 'mfa', label: 'Require MFA for remote and admin logons', correct: true },
      { id: 'macro-policy', label: 'Block macros from internet-sourced Office documents', correct: true },
      { id: 'segment', label: 'Segment workstation VLANs from the file server VLAN', correct: true },
      { id: 'rename-cabinet', label: 'Rename the office break room supply cabinet', correct: false },
      { id: 'new-logo', label: 'Redesign the company logo', correct: false },
      { id: 'edr', label: 'Deploy EDR alerting on LSASS access attempts', correct: true }
    ]
  };

  // Per-session threat intel for the randomized C2 IPs, merged on top of the
  // static THREAT_INTEL table at runtime (the lookup-ip command needs to
  // find intel on whichever IPs this session actually used).
  const intel = {
    [c2Primary]: {
      asn: c2Asn,
      geo: c2Geo,
      reputation: 'SUSPICIOUS — bulletproof hosting range, no prior reports but high-risk ASN',
      firstSeen: 'No prior sightings'
    },
    [c2Backup]: {
      asn: c2Asn,
      geo: c2Geo,
      reputation: `SUSPICIOUS — same hosting range as ${c2Primary}, likely same operator`,
      firstSeen: 'No prior sightings'
    }
  };

  const outcomeNarrative = {
    contained_early: `You isolated ${entryHostName} the moment the macro spawned a shell — the intrusion never got past the entry point. No credentials stolen, no lateral movement, nothing to exfiltrate. That is as close to a perfect response as this case allows.`,
    contained_at_privesc: 'You caught the credential theft and shut the door before the stolen account could be used anywhere else. The attacker never reached the patient records server.',
    contained_at_lateral: 'You stopped the intrusion after it reached the file server but before any data left the building. Patient records were touched but not confirmed stolen.',
    breach_completed: 'The intrusion ran its full course: phishing, credential theft, lateral movement, and roughly 1.8GB of patient records exfiltrated to external infrastructure before it was stopped. This is a reportable breach.',
    overrun: 'Every endpoint on the floor ended up compromised. Tickets that timed out kept handing the intrusion a fresh foothold, and the spread outran any containment that landed — by the time it stopped, there was nothing left uninfected to protect. This is the worst-case version of this case: not just a breach, but a total loss of the network.'
  };

  return {
    ACT2_ENTRY_HOST: entryHostId,
    ACT2_ENTRY_HOST_NAME: entryHostName,
    ACT2_ENTRY_USER: entryUser,
    ACT2_STOLEN_ACCOUNT: stolenAccount,
    ACT2_C2_IP_PRIMARY: c2Primary,
    ACT2_C2_IP_BACKUP: c2Backup,
    ACT2_STAGES,
    ACT2_C2_REROUTE_LOGS,
    ACT2_C2_REROUTE_ALERT,
    ACT2_REROUTE_TICKET,
    REPORT_RUBRIC,
    intel,
    outcomeNarrative
  };
}

// Order the kill chain advances in, absent any containment.
export const ACT2_STAGE_ORDER = ['recon', 'initial_access', 'privesc_credtheft', 'lateral_movement', 'exfiltration'];

// Real seconds between automatic stage advances if the player takes no
// relevant containment action. Tutorial-paced, not twitchy.
export const ACT2_STAGE_INTERVAL_MS = 55000;

// --- Act 2's sneaky opening -------------------------------------------------
// The intrusion doesn't announce itself the second monitoring starts. Act 2
// opens with several real-time minutes of ordinary, alert-free traffic (and
// a queue of mundane helpdesk tickets to work, see below) on hosts that are
// never the (randomized) entry host — a normal SOC shift — so the player
// has to actually notice when the real first alert (recon) lands rather
// than it just being there waiting on screen. None of this touches
// discoveredHosts/alerts — it's pure atmosphere with no kill-chain
// significance.
export const ACT2_SNEAKY_DELAY_MIN_MS = 180000; // 3 minutes
export const ACT2_SNEAKY_DELAY_MAX_MS = 240000; // 4 minutes

export const ACT2_AMBIENT_OPENING_LOGS = [
  { ts: '12:54:02', host: 'dc-01', source: 'auth', user: 'dcho', ip: '10.0.4.41', raw: 'Successful logon: user=dcho method=password workstation=WKSTN-04', level: 2 },
  { ts: '12:55:41', host: 'web-01', source: 'web', ip: '192.0.2.18', raw: 'GET /portal/dashboard 200 OK user=dcho', level: 1 },
  { ts: '12:57:09', host: 'mob-02', source: 'auth', user: 'helpdesk-oncall', ip: '10.0.5.34', raw: 'MDM check-in: compliance OK, policy version current', level: 1 },
  { ts: '12:58:25', host: 'fs-01', source: 'auth', user: 'mlee', ip: '10.0.4.44', raw: 'Successful logon: user=mlee method=password workstation=WKSTN-07', level: 2 },
  { ts: '12:59:47', host: 'fw-edge', source: 'firewall', ip: '192.0.2.18', raw: 'ALLOW tcp 192.0.2.18:51230 -> web-01:443', level: 1 },
  { ts: '13:00:30', host: 'mob-01', source: 'auth', user: 'cdiaz', ip: '10.0.5.21', raw: 'MDM check-in: compliance OK, policy version current', level: 1 }
];

function pad2(n) { return n.toString().padStart(2, '0'); }

// Keeps the log feed feeling alive during the multi-minute quiet opening,
// one harmless line at a time, on hosts that are never the entry host.
const ACT2_AMBIENT_FILLER_TEMPLATES = [
  { host: 'web-01', source: 'web', ip: '192.0.2.21', raw: 'GET /portal/appointments HTTP/1.1 200 OK', level: 1 },
  { host: 'web-01', source: 'web', ip: '192.0.2.27', raw: 'POST /portal/login HTTP/1.1 200 OK', level: 1 },
  { host: 'dc-01', source: 'auth', user: 'mlee', ip: '10.0.4.44', raw: 'Successful logon: user=mlee method=password workstation=WKSTN-07', level: 2 },
  { host: 'fs-01', source: 'auth', user: 'dcho', ip: '10.0.4.41', raw: 'Successful logon: user=dcho method=password workstation=WKSTN-04', level: 2 },
  { host: 'mob-01', source: 'auth', user: 'cdiaz', ip: '10.0.5.21', raw: 'MDM check-in: compliance OK, policy version current', level: 1 },
  { host: 'mob-02', source: 'auth', user: 'helpdesk-oncall', ip: '10.0.5.34', raw: 'MDM check-in: compliance OK, policy version current', level: 1 },
  { host: 'fw-edge', source: 'firewall', ip: '192.0.2.21', raw: 'ALLOW tcp 192.0.2.21:51244 -> web-01:443', level: 1 },
  { host: 'wkstn-04', source: 'process', user: 'dcho', raw: 'New process created: excel.exe parent=explorer.exe', level: 1 }
];

export function randomAmbientFillerLog() {
  const d = new Date();
  const ts = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  const t = ACT2_AMBIENT_FILLER_TEMPLATES[Math.floor(Math.random() * ACT2_AMBIENT_FILLER_TEMPLATES.length)];
  return { ts, ...t };
}

// --- Act 2 "petty tickets" --------------------------------------------------
// A real SOC analyst doesn't get to drop everything for the big incident —
// mundane helpdesk noise keeps arriving the whole time, both before and
// during the real incident. These spawn purely to make the multitasking
// real: each one offers a small set of realistic dispositions (accept,
// deny, dispatch a technician, send a templated email reply), exactly one
// of which is the sound call for that ticket. They carry no MITRE mapping,
// don't touch hostStatus/discoveredHosts, and are not folded into the
// scored axes (so they can't be exploited or relied on to pad a score) —
// just tracked and shown as a flavor stat in the debrief.
export const ACT2_PETTY_TICKET_SLA_MS = 40000;
export const ACT2_PETTY_TICKET_MAX_CONCURRENT = 2;

export const ACT2_PETTY_TICKET_POOL = [
  {
    id: 'petty-pw-reset',
    label: 'Password Reset',
    desc: 'D. Cho (Finance) is locked out after 3 failed logins — routine reset request, nothing suspicious in the pattern.',
    responses: {
      accept: { label: 'Reset Password', correct: true, feedback: 'Correct call — a routine lockout. Reset issued, Finance is back in.' },
      deny: { label: 'Deny — Escalate to Security', correct: false, feedback: "Nothing in the pattern justifies escalating a routine lockout — that just burns time you don't have." },
      email: { label: 'Email Self-Service Link', correct: false, feedback: 'Reasonable, but D. Cho already tried three times — faster to just reset it yourself.' }
    }
  },
  {
    id: 'petty-printer',
    label: 'Printer Offline',
    desc: 'Front desk printer showing offline. Probably just out of paper or toner.',
    responses: {
      email: { label: 'Email Troubleshooting Steps', correct: true, feedback: 'Right call — check paper/toner/cable first, save the technician visit for if that fails.' },
      dispatch: { label: 'Send Technician', correct: false, feedback: 'A technician visit for an offline printer is overkill before checking the obvious.' },
      deny: { label: 'Deny — Not a SOC Issue', correct: false, feedback: 'Dismissing it outright leaves the front desk stuck — a one-line reply costs nothing.' }
    }
  },
  {
    id: 'petty-vpn-slow',
    label: 'VPN Running Slow',
    desc: 'A remote sales rep is reporting a sluggish VPN connection. Bandwidth complaint, not a security issue.',
    responses: {
      accept: { label: 'Acknowledge — Monitor', correct: true, feedback: "Correct — no indicator of compromise here, just bandwidth. Logged and moving on." },
      deny: { label: 'Deny — Not Reproducible', correct: false, feedback: 'Dismissing it without even acknowledging it looks bad and helps no one.' },
      email: { label: 'Email Bandwidth Tips', correct: false, feedback: "Not wrong, but doesn't address that this is likely just a network condition outside their control." }
    }
  },
  {
    id: 'petty-phish-fp',
    label: 'Reported Email — Likely False Positive',
    desc: 'An employee flagged a marketing newsletter as phishing. Headers and sender check out as legitimate.',
    responses: {
      accept: { label: 'Confirm Legitimate — Close', correct: true, feedback: 'Correct — headers check out, this is a false positive. Closing it keeps the real signal clean.' },
      deny: { label: 'Escalate as Phishing', correct: false, feedback: 'Escalating a verified-legitimate sender as phishing creates noise and erodes trust in real alerts.' },
      email: { label: 'Email Reporter — Thanks, Closing', correct: false, feedback: 'A nice touch, but the ticket itself still needs to be marked resolved either way.' }
    }
  },
  {
    id: 'petty-access-request',
    label: 'Shared Drive Access Request',
    desc: 'A new hire needs read access to the Billing shared drive. Standard onboarding request.',
    responses: {
      accept: { label: 'Approve Access', correct: true, feedback: 'Correct — standard onboarding request, matches their role. Approved.' },
      deny: { label: 'Deny — Needs Manager Sign-off', correct: false, feedback: "Slows onboarding for a request that matches their role with no red flags." },
      email: { label: 'Email — Confirm With Manager First', correct: false, feedback: "Not wrong to double-check, but standard onboarding requests like this don't usually need it." }
    }
  },
  {
    id: 'petty-mfa-resync',
    label: 'MFA App Out of Sync',
    desc: "A user's MFA app clock drifted and codes are being rejected. Needs a resync, not a lockout.",
    responses: {
      accept: { label: 'Resync MFA', correct: true, feedback: 'Correct — simple clock drift. Resynced and the user is back in.' },
      deny: { label: 'Deny — Re-enroll Required', correct: false, feedback: 'Forcing a full re-enrollment over a clock drift issue is unnecessary friction.' },
      email: { label: 'Email Resync Instructions', correct: false, feedback: "Workable, but they're already locked out — faster to just fix it from your end." }
    }
  },
  {
    id: 'petty-wifi-drop',
    label: 'Guest Wi-Fi Dropping',
    desc: 'Front office guest Wi-Fi keeps dropping. Likely an AP issue on the guest SSID, unrelated to the main network.',
    responses: {
      dispatch: { label: 'Send Technician — Check AP', correct: true, feedback: 'Correct — recurring drops on one AP usually need a hands-on look.' },
      deny: { label: 'Deny — Guest Network Not Supported', correct: false, feedback: "Telling a clinic to just live with broken guest Wi-Fi isn't a great look." },
      email: { label: 'Email — Try Reconnecting', correct: false, feedback: "Worth a try, but this has been recurring — it needs an actual look, not just a reconnect tip." }
    }
  }
];

// --- Act 2 "urgent" nudge tickets -------------------------------------------
// If the player is heads-down in the petty queue and hasn't actually engaged
// the real incident (no containment action, no kill-chain ticket closed) a
// while after the attack quietly starts, the helpdesk noise itself starts
// tilting toward the incident — vaguer, second-hand reports that read as
// "something's off" without ever naming the compromised host or giving away
// the analysis. Three escalating tiers; each is a single acknowledge-and-go
// action (jumps the player to Security Events), not a graded decision —
// their whole job is to be a nudge, not a quiz. Never scored.
export const ACT2_URGENT_TICKET_SLA_MS = 70000;

export const ACT2_URGENT_TICKET_POOL = [
  {
    id: 'urgent-l1-logons',
    level: 1,
    label: 'Helpdesk Lead — Heads Up',
    desc: '"Getting a few calls about slow logons on the floor — probably nothing, but wanted you to know in case it adds up."'
  },
  {
    id: 'urgent-l1-popups',
    level: 1,
    label: 'Helpdesk Lead — Heads Up',
    desc: '"A couple of users mentioned odd pop-ups and their machine acting sluggish this morning. Logged it, didn\'t seem urgent."'
  },
  {
    id: 'urgent-l2-lockouts',
    level: 2,
    label: 'IT Manager — Can You Check?',
    desc: '"Three separate workstation lockouts in the last ten minutes, all different users, no pattern I can see. Might be worth a look on your end."'
  },
  {
    id: 'urgent-l2-fileserver',
    level: 2,
    label: 'IT Manager — Can You Check?',
    desc: '"File server\'s running hotter than usual and a couple people say shared drives are crawling. Nothing\'s down, but it\'s not normal either."'
  },
  {
    id: 'urgent-l3-admin',
    level: 3,
    label: 'IT Manager — Need Eyes On This Now',
    desc: '"This is more than a one-off — multiple systems acting strange at once and now an admin account logged in somewhere nobody recognizes. Please tell me someone is watching the security feed."'
  },
  {
    id: 'urgent-l3-spreading',
    level: 3,
    label: 'IT Manager — Need Eyes On This Now',
    desc: '"Whatever this is, it\'s not staying in one place. I\'ve got reports from three different parts of the building now. Can you confirm Security is actually on this?"'
  }
];

// Act 2 case-file guidance — structured objectives so the right panel doesn't
// drop to four generic bullets after the rich Act 1 checklist.
export const ACT2_GUIDANCE = [
  {
    id: 'watch',
    title: 'Work the ticket rail',
    instruction: 'The strip above the console shows what is actively unfolding. Read it first, then decide whether to hunt or contain.',
    why: 'Real analysts triage from the queue — the ticket tells you what stage the intrusion is in before you touch anything.'
  },
  {
    id: 'hunt',
    title: 'Correlate hosts, accounts, and IPs',
    instruction: 'Use Security Events and Threat Hunting together. Run query searches, lookup-ip on suspicious addresses, and click hosts on the map.',
    why: 'Alerts point you at a symptom; logs name the attacker. Pivoting between them is the core investigation loop.'
  },
  {
    id: 'contain',
    title: 'Contain as early as you can',
    instruction: 'Close tickets with isolate, block-ip, or disable-account once you have evidence — or type the same commands in the terminal.',
    why: 'Every stage the attacker advances costs the business more. Fast, correct containment is what separates a B from an A.'
  },
  {
    id: 'discipline',
    title: 'Lock down only what the evidence supports',
    instruction: 'Wrong isolations and blocks disrupt real employees and cost discipline points. Remediate, then restore, when you acted on a mistake.',
    why: 'Panic-locking the whole network looks busy but breaks the clinic. Targeted response is how SOC teams actually operate.'
  },
  {
    id: 'report',
    title: 'Write it up when Act 2 ends',
    instruction: 'Once the intrusion concludes, type report in the terminal to open the incident write-up and submit your findings.',
    why: 'Investigation without documentation never happened — the report is how leadership and compliance learn what went wrong.'
  }
];
