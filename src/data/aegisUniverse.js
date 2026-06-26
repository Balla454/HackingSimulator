// =============================================================================
// AEGIS NETWORK — Shared universe across K-12 + BLACK SIGNAL
// "The digital world is always talking. Defenders learn how to understand it."
// =============================================================================

export const AEGIS_TAGLINE =
  'The digital world is always talking. Defenders learn how to understand what it is saying.';

export const AEGIS_MISSION =
  'Train future defenders · Simulate real threats · Study attacker behavior · Strengthen systems through education';

/** Simulated company inside Aegis training exercises (K-5 / 6-8 terminal missions). */
export const AEGIS_TRAINING_SECTOR = 'TechCorp Industries';

/** Live SOC assignment client (9-12). */
export const AEGIS_SOC_CLIENT = 'Meridian Health Analytics';

export const PIXEL = {
  name: 'PIXEL',
  /** K-5: teacher — explains patterns after every action */
  teacher: (line) => `🤖 PIXEL: ${line}`,
  /** 6-8: mentor — fewer answers, more questions */
  mentor: (line) => `🤖 PIXEL: ${line}`,
  /** 9-12: SOC dashboard voice — probabilities, not directives */
  soc: (line) => `◈ PIXEL: ${line}`,
  /** BLACK SIGNAL: distant system observer */
  observer: (line) => `◈ PIXEL // ${line}`
};

export const AEGIS_TIERS = [
  {
    id: 'k5',
    badge: 'K-5',
    name: 'Security Explorer',
    role: 'Explorer Wing',
    rank: 'Security Explorer',
    wingLabel: 'Clearance I',
    thinking: 'Observation + curious questioning',
    question: 'What is happening?',
    blurb: 'PIXEL walks you through the Vault\'s beginner simulation. Notice unusual behavior, spot phishing tricks, and watch how devices talk on a network.',
    tags: ['See the digital world', 'Spot odd behavior', 'PIXEL teaches', 'Digital Awareness'],
    color: '#37e3ff',
    badgeAward: 'Digital Awareness Badge'
  },
  {
    id: 'middle',
    badge: '6-8',
    name: 'Junior Cyber Analyst',
    role: 'Analyst Wing',
    rank: 'Junior Cyber Analyst',
    wingLabel: 'Clearance II',
    thinking: 'Pattern recognition + cause & effect',
    question: 'How is it connected?',
    blurb: 'Deeper Vault clearance. PIXEL asks more than it answers while you scan networks, read logs, and connect events in a structured adversary simulation.',
    tags: ['Systems thinking', 'Logs & patterns', 'PIXEL mentors', 'Cause & effect'],
    color: '#ffd23f',
    badgeAward: 'Junior Cyber Analyst Badge'
  },
  {
    id: 'high',
    badge: '9-12',
    name: 'SOC Analyst',
    role: 'Operations Wing',
    rank: 'SOC Analyst',
    wingLabel: 'Clearance III',
    thinking: 'Decision making under uncertainty',
    question: 'What should I do?',
    preview: 'Defend a hospital network — triage alerts, hunt logs, contain breaches',
    blurb: `Full Vault clearance — live SOC assignment. PIXEL is wired into your console as a probability engine. Defend ${AEGIS_SOC_CLIENT} and write a scored incident report.`,
    tags: ['SIEM workflow', 'Prioritize under pressure', 'PIXEL · SOC interface', 'Scored report'],
    color: '#ff3f5f',
    badgeAward: 'SOC Analyst Badge'
  }
];

export const AEGIS_VAULT = {
  name: 'AEGIS VAULT',
  subtitle: 'Secure Training Archive',
  codename: 'AV-TRAIN-01',
  tagline: AEGIS_TAGLINE,
  note: 'Three clearance levels. One defender pipeline. Every simulation runs in isolation — nothing touches a real network.'
};

export const AEGIS_HOME_INTRO = {
  title: AEGIS_VAULT.name,
  subtitle: AEGIS_VAULT.subtitle,
  note: AEGIS_VAULT.note
};

export const K5_PIXEL_LINES = {
  introOpen: 'Everything you touch online is part of a network. Let\'s learn how it speaks.',
  phaseDetect: 'Look at something → notice what\'s odd → choose → see what happens. I\'ll help you spot the pattern.',
  phaseContain: 'That scan turned up a dusty old account nobody\'s used in months — and it just logged in. Weak password? Tricky email? Let\'s find out.',
  phaseEradicate: 'Door\'s locked. But there\'s a scrambled note in the logs — every click leaves a trace. Let\'s crack the code.',
  phaseRecover: 'They were after the customer vault. Unlock it safely, then sweep for anything else they touched.',
  caseClosed: `Vault's safe, trail's cold. You learned detect → contain → eradicate → recover. ${AEGIS_TRAINING_SECTOR} is safe — and you earned your Digital Awareness Badge.`,
  toolNudge: (phaseLabel, toolLabel) => `Nice! One more lead in ${phaseLabel} — try ${toolLabel} next.`,
  encouragement: [
    'Great job on your first tool! You\'re learning to see the digital world.',
    'Halfway there! Notice how the clues connect?',
    'One more to go — what pattern are you seeing?',
    'You finished every module. That\'s real defender thinking.'
  ],
  hintGreeting: [
    "Hi! I'm PIXEL. Need a hand spotting something?",
    "Let's figure out your next step together — what looks unusual?",
    "Remember: look, notice, choose, learn the pattern."
  ]
};

export const MIDDLE_PIXEL_LINES = {
  labOpen: 'You\'ve seen the digital world. Now let\'s understand how it works.',
  briefingFooter: 'PIXEL will ask guiding questions — not hand you answers. Connect the events yourself.',
  patternReminder: 'What caused this? What changed first? What else might be affected?'
};

export const SOC_PIXEL_LINES = {
  introEyebrow: 'Aegis Vault · Operations Wing',
  introLead: 'You are now responsible for defending the system.',
  deskNote: 'PIXEL is integrated into this console. It surfaces confidence levels and correlations — you make the calls.',
  act2Shift: 'Confidence is incomplete. Prioritize threats. I\'ll show probabilities — not answers.',
  act2Ticket: (confidence) => `Estimated threat confidence: ${confidence}% — based on correlated events, not certainty.`,
  debriefBadge: 'SOC Analyst Badge — Aegis Vault'
};

export const BLACK_SIGNAL_HOME = {
  title: 'BLACK SIGNAL',
  subtitle: 'Classified Channel — Active',
  tagline: 'The real incident begins here.',
  briefing: 'THE GHOST has been inside longer than any simulation. Six phases. Five endings. PIXEL observes — you decide.',
  phases: ['First Signal', 'Hidden Presence', 'BLACK SIGNAL', 'Emergency Response', 'Ghost Revealed', 'SENTINEL'],
  enterLabel: 'Initialize Operation',
  vaultLink: 'Training Vault Archive'
};

export const BLACK_SIGNAL_AEGIS = {
  pipelineNote: 'Vault clearance exceeded. This channel sits above standard training archives.',
  observerLine: 'You trained for this. The Ghost has been inside longer than any simulation.'
};

/** PIXEL SOC hints keyed by rough game moment — kept short for terminal mentor lines. */
export const SOC_PIXEL_HINTS = {
  act1_start: 'Alert severity is a hint, not a verdict. Confidence: low until you read the row.',
  act1_query: 'Logs name what alerts only suggest. Confidence rises when host and IP agree.',
  act1_contain: 'Isolation stops spread; it does not prove guilt. Confidence should be medium+ before you act.',
  act2_flood: 'Volume is a tactic. Probability of any single alert being the breach: falling as noise rises.',
  act2_decoy: 'Normal software and malware can look alike. What evidence ties this host to the intrusion?'
};

export function getTierMeta(tierId) {
  return AEGIS_TIERS.find(t => t.id === tierId) ?? AEGIS_TIERS[1];
}
