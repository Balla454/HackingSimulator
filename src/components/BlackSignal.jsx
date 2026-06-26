import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { HOSTS, TOPOLOGY_EDGES, THREAT_INTEL } from '../data/socScenario';
import {
  STORY_PHASES,
  INTRO_CUTSCENES,
  PHASE_CUTSCENES,
  ENDINGS,
  FINALE_CHOICES,
  BLACK_SIGNAL_INTEL,
  buildPhaseLogs,
  buildPhaseAlerts,
  buildFloodAlerts,
  GHOST_SOURCE_IP,
  GHOST_C2_IP,
  GHOST_SHADOW_USER,
  GHOST_COMPROMISED_HOST,
  SENTINEL_HOST
} from '../data/blackSignalScenario';
import { saveBlackSignalEnding } from '../data/blackSignalProgress';
import { BLACK_SIGNAL_AEGIS, PIXEL } from '../data/aegisUniverse';
import '../styles/blacksignal.css';

// --- SIEM query mini-engine (same syntax as SOC Lab) -------------------------
function tokenize(expr) {
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(expr)) !== null) tokens.push(m[1] !== undefined ? m[1] : m[2]);
  return tokens;
}

function wildcardMatch(haystack, pattern) {
  if (!pattern.includes('*')) return haystack.toLowerCase().includes(pattern.toLowerCase());
  const escaped = pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${escaped}$`, 'i').test(haystack);
}

function matchField(row, field, value) {
  const lowerVal = value.toLowerCase();
  switch (field) {
    case 'host': return wildcardMatch((row.host || '').toLowerCase(), lowerVal);
    case 'source': return (row.source || '').toLowerCase() === lowerVal;
    case 'user': return (row.user || '').toLowerCase().includes(lowerVal);
    case 'ip': return wildcardMatch(row.ip || '', value);
    default: return (row.raw || '').toLowerCase().includes(lowerVal);
  }
}

function matchToken(row, token) {
  let negate = false;
  let t = token;
  if (t.startsWith('-') && t.length > 1) { negate = true; t = t.slice(1); }
  const colonIdx = t.indexOf(':');
  const result = colonIdx > 0
    ? matchField(row, t.slice(0, colonIdx).toLowerCase(), t.slice(colonIdx + 1))
    : (row.raw || '').toLowerCase().includes(t.toLowerCase());
  return negate ? !result : result;
}

function runQueryFilter(rows, expr) {
  if (!expr?.trim()) return rows;
  const orGroups = expr.split(/\sOR\s/i).map(g => tokenize(g.trim()));
  return rows.filter(row => orGroups.some(group => group.every(tok => matchToken(row, tok))));
}

const TERMINAL_COMMANDS = [
  'help', 'clear', 'status', 'alerts', 'query', 'lookup-ip', 'isolate',
  'block-ip', 'hosts', 'scan-sentinel', 'notes'
];

const ALL_INTEL = { ...THREAT_INTEL, ...BLACK_SIGNAL_INTEL };

// --- Cutscene overlay --------------------------------------------------------
function CutsceneOverlay({ scenes, onComplete }) {
  const [idx, setIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  const scene = scenes[idx];
  const line = scene?.lines[lineIdx];

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [idx, lineIdx]);

  if (!scene) return null;

  const advance = () => {
    if (lineIdx < scene.lines.length - 1) {
      setLineIdx(lineIdx + 1);
    } else if (idx < scenes.length - 1) {
      setIdx(idx + 1);
      setLineIdx(0);
    } else {
      onComplete();
    }
  };

  return (
    <div className="bs-cutscene" role="dialog" aria-modal="true">
      <div className="bs-cutscene-vignette" />
      <div className="bs-cutscene-grain" />
      <div className={`bs-cutscene-card ${visible ? 'bs-cutscene-visible' : ''}`}>
        <div className="bs-cutscene-label">BLACK SIGNAL</div>
        <h2 className="bs-cutscene-title">{scene.title}</h2>
        <p className="bs-cutscene-line">{line}</p>
        <div className="bs-cutscene-progress">
          {scenes.map((s, i) => (
            <span key={s.id || i} className={`bs-cutscene-dot ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}`} />
          ))}
        </div>
        <button type="button" className="bs-btn bs-btn-primary" onClick={advance}>
          {idx === scenes.length - 1 && lineIdx === scene.lines.length - 1 ? 'Continue' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

function SingleCutscene({ scene, onComplete }) {
  return <CutsceneOverlay scenes={[scene]} onComplete={onComplete} />;
}

// --- Main component ----------------------------------------------------------
const BlackSignal = ({ onExit }) => {
  const [mode, setMode] = useState('intro'); // intro | play | finale | ending
  const [storyPhaseIdx, setStoryPhaseIdx] = useState(0);
  const [phaseCutscene, setPhaseCutscene] = useState(null);
  const [phaseCutsceneAction, setPhaseCutsceneAction] = useState('dismiss');

  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [hostStatus, setHostStatus] = useState(() => {
    const s = {};
    HOSTS.forEach(h => { s[h.id] = 'normal'; });
    return s;
  });
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [disabledUsers, setDisabledUsers] = useState([]);
  const [discoveredHosts, setDiscoveredHosts] = useState({});
  const [discoveredIPs, setDiscoveredIPs] = useState({});
  const [confirmedIPs, setConfirmedIPs] = useState({});
  const [discoveredAccounts, setDiscoveredAccounts] = useState({});
  const [queryHits, setQueryHits] = useState(new Set());
  const [sentinelScanned, setSentinelScanned] = useState(false);
  const [phase3Ack, setPhase3Ack] = useState(false);
  const [unnecessaryActions, setUnnecessaryActions] = useState(0);
  const [realThreatFound, setRealThreatFound] = useState(false);
  const [decoyInvestigations, setDecoyInvestigations] = useState(0);

  const [activeTab, setActiveTab] = useState('alerts');
  const [logQuery, setLogQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [selectedHost, setSelectedHost] = useState(null);
  const [termHistory, setTermHistory] = useState([]);
  const [termInput, setTermInput] = useState('');
  const [endingId, setEndingId] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);

  const termInputRef = useRef(null);
  const termScrollRef = useRef(null);
  const floodTimerRef = useRef(null);
  const floodBatchRef = useRef(0);
  const phaseCompletedRef = useRef(new Set());

  const storyPhase = STORY_PHASES[storyPhaseIdx];

  const printLine = useCallback((text, type = 'output') => {
    setTermHistory(prev => [...prev, { text, type }]);
  }, []);

  const visibleLogs = useMemo(() => runQueryFilter(logs, logQuery), [logs, logQuery]);

  const evidenceHosts = useMemo(
    () => Object.keys(discoveredHosts).map(id => HOSTS.find(h => h.id === id)).filter(Boolean),
    [discoveredHosts]
  );
  const observedIPs = Object.keys(discoveredIPs).filter(ip => !confirmedIPs[ip]);
  const confirmedIPList = Object.keys(confirmedIPs);
  const evidenceAccounts = Object.keys(discoveredAccounts);

  const hasHostIntel = useCallback((hostId) => !!discoveredHosts[hostId], [discoveredHosts]);

  const registerFromRow = useCallback((row) => {
    if (row.host) setDiscoveredHosts(prev => ({ ...prev, [row.host]: true }));
    if (row.ip) setDiscoveredIPs(prev => ({ ...prev, [row.ip]: true }));
    if (row.user) setDiscoveredAccounts(prev => ({ ...prev, [row.user]: true }));
  }, []);

  const startPlay = useCallback(() => {
    const phaseId = STORY_PHASES[0].id;
    setLogs(buildPhaseLogs(phaseId).map((l, i) => ({ ...l, id: `bs-log-${i}` })));
    setAlerts(buildPhaseAlerts(phaseId, 0));
    setMode('play');
    printLine('══ BLACK SIGNAL — OPERATION LIVE ══', 'system');
    printLine(PIXEL.observer(BLACK_SIGNAL_AEGIS.observerLine), 'mentor');
    printLine(BLACK_SIGNAL_AEGIS.pipelineNote, 'mentor');
  }, [printLine]);

  const checkPhaseComplete = useCallback(() => {
    if (!storyPhase) return false;
    const cw = storyPhase.completeWhen;

    if (cw.discoveredAccounts) {
      if (!cw.discoveredAccounts.every(u => discoveredAccounts[u])) return false;
    }
    if (cw.confirmedIPs) {
      if (!cw.confirmedIPs.every(ip => confirmedIPs[ip])) return false;
    }
    if (cw.logQueryHits) {
      if (!cw.logQueryHits.every(h => queryHits.has(h))) return false;
    }
    if (cw.acknowledged && !phase3Ack) return false;
    if (cw.isolatedHosts) {
      if (!cw.isolatedHosts.every(h => hostStatus[h] === 'isolated')) return false;
    }
    if (cw.blockedIPs) {
      if (!cw.blockedIPs.every(ip => blockedIPs.includes(ip))) return false;
    }
    if (cw.sentinelScanned && !sentinelScanned) return false;
    return true;
  }, [storyPhase, discoveredAccounts, confirmedIPs, queryHits, phase3Ack, hostStatus, blockedIPs, sentinelScanned]);

  const advanceStoryPhase = useCallback(() => {
    const nextIdx = storyPhaseIdx + 1;
    if (nextIdx >= STORY_PHASES.length) {
      setMode('finale');
      return;
    }
    const nextPhase = STORY_PHASES[nextIdx];
    setStoryPhaseIdx(nextIdx);
    setLogs(buildPhaseLogs(nextPhase.id).map((l, i) => ({ ...l, id: `bs-log-${nextIdx}-${i}` })));
    setAlerts(buildPhaseAlerts(nextPhase.id, nextIdx));

    if (nextPhase.id === 'phase4') {
      setEmergencyMode(true);
      setPhaseCutsceneAction('dismiss');
      setPhaseCutscene(PHASE_CUTSCENES.phase4_start);
    } else if (nextPhase.id === 'phase3') {
      setPhaseCutsceneAction('dismiss');
      setPhaseCutscene(PHASE_CUTSCENES.phase3_reveal);
    } else if (nextPhase.id === 'phase6') {
      setPhaseCutsceneAction('dismiss');
      setPhaseCutscene(PHASE_CUTSCENES.phase6_sentinel);
    }

    printLine(`── Phase ${nextPhase.num}: ${nextPhase.title} ──`, 'system');
    printLine(nextPhase.briefing, 'mentor');
  }, [storyPhaseIdx, printLine]);

  const completeCurrentPhase = useCallback(() => {
    const phaseId = storyPhase?.id;
    if (!phaseId || phaseCompletedRef.current.has(phaseId)) return;
    phaseCompletedRef.current.add(phaseId);
    const cutsceneMap = {
      phase1: PHASE_CUTSCENES.phase1_end,
      phase2: PHASE_CUTSCENES.phase2_end,
      phase4: PHASE_CUTSCENES.phase4_end,
      phase5: PHASE_CUTSCENES.phase5_end
    };
    if (cutsceneMap[phaseId]) {
      setPhaseCutsceneAction('advance');
      setPhaseCutscene(cutsceneMap[phaseId]);
    } else {
      advanceStoryPhase();
    }
  }, [storyPhase, advanceStoryPhase]);

  useEffect(() => {
    if (mode !== 'play' || phaseCutscene) return;
    if (checkPhaseComplete()) completeCurrentPhase();
  }, [mode, phaseCutscene, checkPhaseComplete, completeCurrentPhase, discoveredAccounts, confirmedIPs, queryHits, phase3Ack, hostStatus, blockedIPs, sentinelScanned]);

  // Phase 4 alert flood
  useEffect(() => {
    if (!emergencyMode || mode !== 'play') return;
    floodTimerRef.current = setInterval(() => {
      floodBatchRef.current += 1;
      const batch = buildFloodAlerts(floodBatchRef.current);
      setAlerts(prev => [...batch, ...prev].slice(0, 80));
    }, 4500);
    return () => { if (floodTimerRef.current) clearInterval(floodTimerRef.current); };
  }, [emergencyMode, mode]);

  useEffect(() => {
    if (termScrollRef.current) termScrollRef.current.scrollTop = termScrollRef.current.scrollHeight;
  }, [termHistory]);

  const cmdQuery = useCallback((expr) => {
    const matched = runQueryFilter(logs, expr);
    setLogQuery(expr);
    matched.forEach(registerFromRow);
    if (expr.includes('source:mail')) setQueryHits(prev => new Set(prev).add('source:mail'));
    if (expr.includes('soc-pattern') || matched.some(r => (r.raw || '').includes('soc-pattern'))) {
      setQueryHits(prev => new Set(prev).add('soc-pattern'));
    }
    printLine(`${matched.length} log entr${matched.length === 1 ? 'y' : 'ies'} matched.`, matched.length ? 'success' : 'output');
    matched.slice(0, 12).forEach(r => {
      printLine(`  ${r.ts}  ${r.host}  [${r.source}]  ${r.raw}`, 'output');
    });
    if (matched.length > 12) printLine(`  … and ${matched.length - 12} more (refine your query)`, 'output');
  }, [logs, registerFromRow, printLine]);

  const cmdLookupIp = useCallback((ip) => {
    const intel = ALL_INTEL[ip];
    if (!intel) {
      printLine(`No threat intel for ${ip}.`, 'error');
      return;
    }
    setDiscoveredIPs(prev => ({ ...prev, [ip]: true }));
    setConfirmedIPs(prev => ({ ...prev, [ip]: true }));
    printLine(`── Threat Intel: ${ip} ──`, 'success');
    printLine(`  ASN: ${intel.asn}`, 'output');
    printLine(`  Geo: ${intel.geo}`, 'output');
    printLine(`  Reputation: ${intel.reputation}`, 'output');
    if (intel.note) printLine(`  Note: ${intel.note}`, 'output');
  }, [printLine]);

  const cmdIsolate = useCallback((hostId) => {
    const host = HOSTS.find(h => h.id === hostId || h.name.toLowerCase() === hostId?.toLowerCase());
    if (!host || host.undefendable) {
      printLine(`Cannot isolate ${hostId}.`, 'error');
      return;
    }
    if (!hasHostIntel(host.id)) {
      printLine(`Policy: ${host.id} must appear in evidence before isolation.`, 'error');
      return;
    }
    if (host.id !== GHOST_COMPROMISED_HOST && storyPhase?.id === 'phase4') {
      setUnnecessaryActions(n => n + 1);
      setDecoyInvestigations(n => n + 1);
      printLine(`WARNING: ${host.id} has no Ghost TTP correlation — unnecessary lockdown recorded.`, 'error');
    }
    setHostStatus(prev => ({ ...prev, [host.id]: 'isolated' }));
    printLine(`Host ${host.name} isolated from network.`, 'success');
    if (host.id === GHOST_COMPROMISED_HOST) setRealThreatFound(true);
  }, [hasHostIntel, storyPhase, printLine]);

  const cmdBlockIp = useCallback((ip) => {
    if (!confirmedIPs[ip]) {
      printLine(`Policy: run lookup-ip on ${ip} before block-ip.`, 'error');
      return;
    }
    if (!blockedIPs.includes(ip)) setBlockedIPs(prev => [...prev, ip]);
    printLine(`Firewall rule added: DROP ${ip}`, 'success');
  }, [confirmedIPs, blockedIPs, printLine]);

  const cmdScanSentinel = useCallback(() => {
    setSentinelScanned(true);
    setDiscoveredHosts(prev => ({ ...prev, [SENTINEL_HOST]: true }));
    printLine('── SENTINEL CORE SCAN ──', 'system');
    printLine('  Status: DORMANT (listening mode)', 'output');
    printLine('  Capabilities: attack prediction · vuln synthesis · adversary simulation', 'output');
    printLine('  Last operator: decommissioned 2024-12-01', 'output');
    printLine('  Note: System was designed to train defenders — not replace them.', 'mentor');
  }, [printLine]);

  const executeCommand = useCallback((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setTermHistory(prev => [...prev, { text: trimmed, type: 'input' }]);
    const [cmd, ...rest] = trimmed.split(/\s+/);
    const arg = rest.join(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        printLine('Commands: ' + TERMINAL_COMMANDS.join(', '), 'output');
        break;
      case 'clear':
        setTermHistory([]);
        break;
      case 'status':
        printLine(`Phase ${storyPhase?.num || '?'}: ${storyPhase?.title || '—'} · Alerts: ${alerts.length} · Emergency: ${emergencyMode ? 'YES' : 'no'}`, 'output');
        break;
      case 'alerts':
        setActiveTab('alerts');
        printLine(`${alerts.length} alerts in queue.`, 'output');
        break;
      case 'query':
        if (!arg) { printLine('Usage: query <expression>', 'error'); return; }
        cmdQuery(arg);
        break;
      case 'lookup-ip':
        if (!arg) { printLine('Usage: lookup-ip <ip>', 'error'); return; }
        cmdLookupIp(arg);
        break;
      case 'isolate':
        if (!arg) { printLine('Usage: isolate <host>', 'error'); return; }
        cmdIsolate(arg);
        break;
      case 'block-ip':
        if (!arg) { printLine('Usage: block-ip <ip>', 'error'); return; }
        cmdBlockIp(arg);
        break;
      case 'hosts':
        HOSTS.filter(h => !h.undefendable).forEach(h => {
          printLine(`${h.name.padEnd(12)} ${hostStatus[h.id].toUpperCase()}`, 'output');
        });
        break;
      case 'scan-sentinel':
        cmdScanSentinel();
        break;
      case 'notes':
        if (arg) { setNotes(prev => [...prev, arg]); printLine('Note saved.', 'success'); }
        else printLine('Usage: notes <text>', 'error');
        break;
      default:
        printLine(`Unknown command: ${cmd}. Type help.`, 'error');
    }
  }, [printLine, storyPhase, alerts.length, emergencyMode, cmdQuery, cmdLookupIp, cmdIsolate, cmdBlockIp, cmdScanSentinel, hostStatus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    executeCommand(termInput);
    setTermInput('');
  };

  const investigateAlert = (alert) => {
    if (storyPhase?.id === 'phase4' && !alert.real && alert.level < 10) {
      setDecoyInvestigations(n => n + 1);
      printLine(`Decoy priority: ${alert.rule} on ${alert.host} — routine noise.`, 'mentor');
      return;
    }
    if (alert.host) {
      setDiscoveredHosts(prev => ({ ...prev, [alert.host]: true }));
      if (alert.real) setRealThreatFound(true);
    }
    const expr = alert.host ? `host:${alert.host}` : '';
    if (expr) {
      setActiveTab('logs');
      setLogQuery(expr);
      cmdQuery(expr);
      printLine(`> query ${expr}  (via Security Events)`, 'gui-echo');
    }
  };

  const resolveEnding = (choiceId) => {
    let id = choiceId;
    const failed = unnecessaryActions >= 3 || decoyInvestigations >= 4 || (storyPhaseIdx >= 3 && !realThreatFound);
    if (failed && choiceId !== 'balanced') id = 'failure';
    const perfect = unnecessaryActions === 0 && realThreatFound && sentinelScanned
      && confirmedIPs[GHOST_C2_IP] && hostStatus[GHOST_COMPROMISED_HOST] === 'isolated'
      && queryHits.has('soc-pattern');
    if (perfect && choiceId === 'balanced') id = 'ghost_protocol';
    setEndingId(id);
    saveBlackSignalEnding(id);
    setMode('ending');
  };

  const renderEnding = () => {
    const ending = ENDINGS[endingId];
    if (!ending) return null;
    return (
      <div className="bs-ending">
        <div className="bs-ending-card">
          <div className="bs-ending-icon">{ending.icon}</div>
          <h1>{ending.title}</h1>
          <p className="bs-ending-sub">{ending.subtitle}</p>
          {ending.lines.map((line, i) => (
            <p key={i} className="bs-ending-line">{line}</p>
          ))}
          <div className="bs-ending-lesson">
            <strong>Lesson:</strong> {ending.lesson}
          </div>
          <div className="bs-ending-actions">
            <button type="button" className="bs-btn bs-btn-primary" onClick={onExit}>Return to Home</button>
          </div>
        </div>
      </div>
    );
  };

  const renderFinale = () => (
    <div className="bs-finale">
      <div className="bs-finale-backdrop" />
      <div className="bs-finale-card">
        <div className="bs-finale-label">FINAL DECISION</div>
        <h2>SENTINEL is still online.</h2>
        <p>The Ghost campaign exposed every gap. SENTINEL can predict, simulate, and assist — or become the next liability. Choose your ending route.</p>
        <div className="bs-finale-choices">
          {FINALE_CHOICES.map(c => (
            <button key={c.id} type="button" className="bs-finale-choice" onClick={() => resolveEnding(c.id)}>
              <strong>{c.label}</strong>
              <span>{c.desc}</span>
            </button>
          ))}
        </div>
        <p className="bs-finale-hint">Perfect discipline + Hybrid SOC may unlock a secret ending…</p>
      </div>
    </div>
  );

  if (mode === 'intro') {
    return <CutsceneOverlay scenes={INTRO_CUTSCENES} onComplete={startPlay} />;
  }

  if (mode === 'ending') return renderEnding();
  if (mode === 'finale') return renderFinale();

  return (
    <div className="bs-root">
      {phaseCutscene && (
        <SingleCutscene
          scene={phaseCutscene}
          onComplete={() => {
            setPhaseCutscene(null);
            if (phaseCutsceneAction === 'advance') advanceStoryPhase();
          }}
        />
      )}

      <header className="bs-header">
        <div className="bs-header-brand">
          <span className="bs-header-sigil">⚫</span>
          <div>
            <div className="bs-header-title">BLACK SIGNAL</div>
            <div className="bs-header-sub">Aegis Vault · Classified Channel</div>
          </div>
        </div>
        <div className="bs-header-phase">
          Phase {storyPhase.num}: {storyPhase.title}
          {emergencyMode && <span className="bs-emergency-badge">EMERGENCY</span>}
        </div>
        <div className="bs-header-actions">
          <button type="button" className="bs-btn bs-btn-small" onClick={onExit}>Exit</button>
        </div>
      </header>

      <div className="bs-body">
        <aside className="bs-casefile">
          <div className="bs-panel-title">Operation Dossier</div>
          <div className="bs-phase-card active">
            <div className="bs-phase-num">Phase {storyPhase.num}</div>
            <h3>{storyPhase.title}</h3>
            <p className="bs-phase-sub">{storyPhase.subtitle}</p>
            <p>{storyPhase.briefing}</p>
            <ul className="bs-objectives">
              {storyPhase.objectives.map(obj => (
                <li key={obj}>{obj}</li>
              ))}
            </ul>
            {storyPhase.id === 'phase3' && !phase3Ack && (
              <button type="button" className="bs-btn bs-btn-primary bs-btn-small" onClick={() => setPhase3Ack(true)}>
                Acknowledge BLACK SIGNAL briefing
              </button>
            )}
            {storyPhase.id === 'phase6' && (
              <div className="bs-sentinel-brief">
                <strong>SENTINEL</strong>
                <p>Abandoned AI: prediction, vulnerability analysis, adversary simulation. Run <code>scan-sentinel</code> in the terminal.</p>
              </div>
            )}
          </div>
          {storyPhaseIdx > 0 && (
            <div className="bs-phase-done">
              {STORY_PHASES.slice(0, storyPhaseIdx).map(p => (
                <div key={p.id} className="bs-phase-done-item">✓ {p.title}</div>
              ))}
            </div>
          )}
        </aside>

        <main className={`bs-siem ${emergencyMode ? 'bs-siem-emergency' : ''}`}>
          <div className="bs-siem-brand">
            <span>🛡️</span> wazuh. <span className="bs-siem-crumb">BLACK SIGNAL monitoring</span>
          </div>
          <div className="bs-tabs">
            <button type="button" className={activeTab === 'alerts' ? 'active' : ''} onClick={() => setActiveTab('alerts')}>
              Security Events ({alerts.length})
            </button>
            <button type="button" className={activeTab === 'logs' ? 'active' : ''} onClick={() => setActiveTab('logs')}>
              Threat Hunting ({logs.length})
            </button>
            <button type="button" className={activeTab === 'notes' ? 'active' : ''} onClick={() => setActiveTab('notes')}>
              Case Notes ({notes.length})
            </button>
          </div>

          {(evidenceHosts.length > 0 || observedIPs.length > 0 || confirmedIPList.length > 0 || evidenceAccounts.length > 0) && (
            <div className="bs-evidence">
              <span className="bs-evidence-label">Evidence</span>
              <div className="bs-evidence-chips">
                {evidenceHosts.map(h => (
                  <span key={h.id} className="bs-chip">{h.name}</span>
                ))}
                {observedIPs.map(ip => (
                  <button key={ip} type="button" className="bs-chip bs-chip-ip" onClick={() => cmdLookupIp(ip)}>{ip}</button>
                ))}
                {confirmedIPList.map(ip => (
                  <span key={ip} className="bs-chip bs-chip-confirmed">{ip} ✓</span>
                ))}
                {evidenceAccounts.map(u => (
                  <span key={u} className="bs-chip">{u}</span>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <input
              className="bs-log-search"
              placeholder="Filter logs — e.g. source:auth OR source:mail"
              value={logQuery}
              onChange={e => setLogQuery(e.target.value)}
            />
          )}

          <div className="bs-list">
            {activeTab === 'alerts' && alerts.map(a => (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                className={`bs-alert bs-level-${a.level >= 10 ? 'high' : a.level >= 6 ? 'med' : 'low'}${a.real ? ' bs-alert-real' : ''}`}
                onClick={() => investigateAlert(a)}
                onKeyDown={e => { if (e.key === 'Enter') investigateAlert(a); }}
              >
                <span className="bs-severity">L{a.level}</span>
                <span className="bs-alert-host">{a.host}</span>
                <span className="bs-alert-rule">{a.rule}</span>
                <span className="bs-alert-desc">{a.description}</span>
              </div>
            ))}
            {activeTab === 'logs' && visibleLogs.map(l => (
              <div key={l.id} className="bs-log-row">
                <span className="bs-log-ts">{l.ts}</span>
                <span>{l.host}</span>
                <span>[{l.source}]</span>
                <span>{l.raw}</span>
                {l.ip && (
                  <button type="button" className="bs-log-action" onClick={() => cmdLookupIp(l.ip)}>Lookup</button>
                )}
              </div>
            ))}
            {activeTab === 'notes' && (
              <>
                <form className="bs-note-form" onSubmit={e => { e.preventDefault(); if (noteDraft.trim()) { setNotes(p => [...p, noteDraft.trim()]); setNoteDraft(''); } }}>
                  <input value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Add note…" />
                  <button type="submit">Add</button>
                </form>
                {notes.map((n, i) => <div key={i} className="bs-note">📝 {n}</div>)}
              </>
            )}
          </div>
        </main>

        <aside className="bs-topology">
          <div className="bs-panel-title">Network</div>
          <div className="bs-topology-hosts">
            {HOSTS.filter(h => !h.undefendable && h.id !== 'internet' && h.id !== 'client-pool').map(h => (
              <button
                key={h.id}
                type="button"
                className={`bs-topo-node bs-topo-${hostStatus[h.id] || 'normal'}${selectedHost === h.id ? ' selected' : ''}`}
                onClick={() => setSelectedHost(h.id)}
              >
                {h.name}
              </button>
            ))}
            {sentinelScanned && (
              <button type="button" className="bs-topo-node bs-topo-sentinel selected">
                SENTINEL-CORE
              </button>
            )}
          </div>
          {selectedHost && (() => {
            const h = HOSTS.find(x => x.id === selectedHost);
            if (!h) return null;
            return (
              <div className="bs-topo-inspector">
                <strong>{h.name}</strong>
                <span className={`bs-status bs-status-${hostStatus[h.id]}`}>{hostStatus[h.id]}</span>
                {hostStatus[h.id] !== 'isolated' && (
                  <button
                    type="button"
                    className="bs-btn bs-btn-warn bs-btn-small"
                    disabled={!hasHostIntel(h.id)}
                    onClick={() => executeCommand(`isolate ${h.id}`)}
                  >
                    Isolate
                  </button>
                )}
                <button type="button" className="bs-btn bs-btn-small" onClick={() => executeCommand(`query host:${h.id}`)}>
                  Query logs
                </button>
              </div>
            );
          })()}
        </aside>
      </div>

      <div className="bs-terminal">
        <div className="bs-term-out" ref={termScrollRef}>
          {termHistory.map((line, i) => (
            <div key={i} className={`bs-term-line bs-term-${line.type}`}>
              {line.type === 'input' ? `> ${line.text}` : line.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="bs-term-form">
          <span className="bs-prompt">analyst@black-signal:~$</span>
          <input
            ref={termInputRef}
            value={termInput}
            onChange={e => setTermInput(e.target.value)}
            placeholder='help · query · lookup-ip · isolate · scan-sentinel'
            autoFocus
          />
        </form>
      </div>
    </div>
  );
};

export default BlackSignal;
