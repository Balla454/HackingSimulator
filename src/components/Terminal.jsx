/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { commands } from '../data/commands';
import '../styles/terminal.css';
import NetworkScanner from './Minigames/NetworkScanner';
import PasswordCracker from './Minigames/PasswordCracker';
import SshLogin from './Minigames/SshLogin';
import FileDecryptor from './Minigames/FileDecryptor';
import FirewallBreach from './Minigames/FirewallBreach';
import PhishingSimulator from './Minigames/PhishingSimulator';
import CryptographyChallenge from './Minigames/CryptographyChallenge';
import MalwareAnalyzer from './Minigames/MalwareAnalyzer';
import SocialEngineering from './Minigames/SocialEngineering';
import DigitalForensics from './Minigames/DigitalForensics';
import { buildScoreCommand } from './DevModeOverlay';

const Terminal = () => {
  const [output, setOutput] = useState([]);
  const [activeGame, setActiveGame] = useState(null);
  const [showMissionBriefing] = useState(true);
  const [currentInput, setCurrentInput] = useState('');

  // Add missing refs
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  const [storyProgress, setStoryProgress] = useState({
    phase: 'initial',
    completedMinigames: [],
    currentObjective: 'Begin silent reconnaissance of TechCorp infrastructure',
    nextSteps: ['Use stealth network scanner to map target network without detection'],
    intelligence: {
      networkDevices: [],
      employeeData: [],
      securityVulnerabilities: [],
      accessCredentials: []
    }
  });
  
  const [gameState, setGameState] = useState(() => ({
    completedMinigames: [],
    completedTools: [],
    unlockedTools: ['scan'],
    sessionStats: {
      commandsExecuted: 0,
      toolsUsed: [],
      startTime: new Date().toISOString(),
      achievements: [],
      stealthRating: 100,
      detectionRisk: 0
    },
    achievements: {
      progress: {
        stealthMaster: false,
        dataVault: false,
        socialEngineer: false,
        cryptoBreaker: false,
        networkNinja: false,
        exploitExpert: false,
        perfectionist: false
      },
      earned: [],
      unlocked: [],
      notifications: [],
      totalScore: 0
    },
    intelligence: {
      networkTopology: [],
      userCredentials: [],
      employeeProfiles: [],
      systemAccess: [],
      securityMeasures: [],
      encryptionKeys: [],
      encryptedData: [],
      dataLocations: [],
      coverTracks: []
    },
    story: {
      phase: 'reconnaissance',
      currentObjective: 'Begin network reconnaissance to identify entry points',
      missionBriefingShown: false,
      context: 'You are an ethical hacker conducting a penetration test on TechCorp Industries.'
    },
    network: {
      discoveredHosts: [],
      openPorts: [],
      vulnerabilities: [],
      accessGained: []
    },
    networkAccess: {
      level: 'none',
      authenticatedDevices: []
    },
    decryptedFiles: [],
    cryptoKeys: [],
    malwareSignatures: [],
    forensicEvidence: [],
    firewallBreaches: [],
    scannedDevices: [],
    compromisedDevices: [],
    accessedSystems: [],
    socialIntel: [],
    crackedPasswords: [],
    phishingData: [],
    opportunities: {
      compoundAttacks: [],
      escalationPaths: [],
      advancedPersistence: []
    },
    toolAccess: {
      scan: true,       // Always available
      social: true,     // Always available - human factor
      crack: false,     // Unlocked after network scan
      ssh: false,       // Unlocked after scanning + cracking
      phish: false,     // Unlocked after social engineering
      malware: false,   // Unlocked after SSH access
      firewall: false,  // Unlocked after social + network knowledge
      crypto: false,    // Unlocked after malware or firewall
      decrypt: false,   // Unlocked after crypto analysis
      forensic: false   // Unlocked after SSH access
    },
    detectionLevel: 0,
    sshDetectionLevel: 0,
    sessionRisk: 0,
    // Mission failure tracking
    missionStatus: 'active', // 'active', 'failed', 'completed'
    securityAlerts: {
      level: 0, // 0-5 escalation levels
      alerts: [],
      lastAlertTime: null,
      consecutiveFailures: 0,
      suspiciousActivities: []
    },
    failureConditions: {
      maxDetectionLevel: 85,     // Increased from 75% - more forgiving
      maxFailedAttempts: 5,      // Increased from 3 - more attempts allowed
      maxSecurityAlerts: 5,      // Increased from 3 - more alerts before failure
      timeLimit: 3600000,        // Increased to 60 minutes - more time
      criticalFailures: 0,       // Instant failure events
      maxCommandsPerMinute: 25,  // Increased from 15 - faster typing allowed
      maxHoneypotHits: 2,        // Increased from 1 - more honeypot tolerance
      maxCredentialLockouts: 3,  // Increased from 2 - more lockout tolerance
      maxNoiseLevel: 75,         // Increased from 50 - more network activity allowed
      maxSuspicionScore: 120,    // Increased from 80 - higher behavioral threshold
      maxForensicTrail: 40       // Increased from 25 - more evidence tolerance
    },
    failedAttempts: {
      ssh: 0,
      crack: 0,
      scan: 0,
      social: 0,
      phish: 0,
      total: 0
    },
    riskFactors: {
      commandFrequency: 0,       // Rapid command detection
      noiseLevel: 0,             // Network activity noise
      suspicionScore: 0,         // Behavioral analysis
      forensicTrail: 0,          // Evidence left behind
      honeypotHits: 0,           // Honeypot encounters
      credentialLockouts: 0,     // Account lockouts
      patternDetection: 0,       // Repetitive behavior
      timeoutFailures: 0,        // Operation timeouts
      signatureMatches: 0        // Tool signature detection
    },
    lastCommandTime: Date.now(),
    commandHistory: [],
    suspiciousActivities: [],
    submittedScores: []          // Track submitted scores to prevent duplicates
  }));

  const [sessionStats] = useState({
    commandsExecuted: 0,
    toolsUsed: new Set(),
    startTime: Date.now()
  });

  // Score submission settings
  const [scoreSubmissionEnabled, setScoreSubmissionEnabled] = useState(true);

  // Expanded achievement definitions for 1+ hour gameplay
  const achievementDefinitions = {
    firstBlood: {
      id: 'firstBlood',
      name: 'First Blood',
      description: 'Complete your first hacking tool',
      icon: '🩸',
      rarity: 'common',
      points: 10,
      check: (state, completed) => completed.length >= 1
    },
    perfectionist: {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Complete all 10 hacking tools without mission failure',
      icon: '👑',
      rarity: 'legendary',
      points: 750, // Increased to reflect higher tool difficulties
      check: (state, completed) => completed.length >= 10 && state.missionStatus === 'active'
    },
    speedRunner: {
      id: 'speedRunner',
      name: 'Speed Demon',
      description: 'Complete the entire mission in under 30 minutes',
      icon: '⚡',
      rarity: 'epic',
      points: 300, // Increased due to higher skill requirement
      check: (state, completed) => {
        if (completed.length < 10) return false;
        const elapsed = Date.now() - new Date(state.sessionStats.startTime).getTime();
        return elapsed < 1800000; // 30 minutes
      }
    },
    stealthMaster: {
      id: 'stealthMaster',
      name: 'Ghost Protocol',
      description: 'Complete 8 operations with detection level under 25%',
      icon: '👻',
      rarity: 'epic',
      points: 200, // Increased to reflect stealth difficulty
      check: (state, completed) => completed.length >= 8 && (state.detectionLevel || 0) < 25
    },
    socialEngineer: {
      id: 'socialEngineer',
      name: 'Master Manipulator',
      description: 'Successfully social engineer 5 different targets',
      icon: '🎭',
      rarity: 'rare',
      points: 80,
      check: (state) => (state.socialIntel?.length || 0) >= 5
    },
    dataVault: {
      id: 'dataVault',
      name: 'Data Vault Breaker',
      description: 'Decrypt 5+ classified files worth millions',
      icon: '💎',
      rarity: 'epic',
      points: 120,
      check: (state) => (state.decryptedFiles?.length || 0) >= 5
    },
    networkNinja: {
      id: 'networkNinja',
      name: 'Network Cartographer',
      description: 'Discover 15+ network devices across multiple subnets',
      icon: '🗺️',
      rarity: 'rare',
      points: 60,
      check: (state) => (state.scannedDevices?.length || 0) >= 15
    },
    penetrationExpert: {
      id: 'penetrationExpert',
      name: 'System Infiltrator',
      description: 'SSH into 8+ different systems successfully',
      icon: '💻',
      rarity: 'rare',
      points: 90,
      check: (state) => (state.compromisedDevices?.length || 0) >= 8
    },
    malwareMaster: {
      id: 'malwareMaster',
      name: 'Malware Architect',
      description: 'Deploy 5+ different malware samples',
      icon: '🦠',
      rarity: 'epic',
      points: 110,
      check: (state) => (state.malwareSignatures?.length || 0) >= 5
    },
    cryptoExpert: {
      id: 'cryptoExpert',
      name: 'Cryptanalyst',
      description: 'Break 8+ different encryption algorithms',
      icon: '🔐',
      rarity: 'epic',
      points: 130,
      check: (state) => (state.cryptoKeys?.length || 0) >= 8
    },
    phishingKing: {
      id: 'phishingKing',
      name: 'Phishing Master',
      description: 'Successfully phish 7+ employees across departments',
      icon: '🎣',
      rarity: 'rare',
      points: 70,
      check: (state) => (state.phishingData?.length || 0) >= 7
    },
    firewallBuster: {
      id: 'firewallBuster',
      name: 'Perimeter Breacher',
      description: 'Breach 4+ different firewall configurations',
      icon: '🛡️',
      rarity: 'rare',
      points: 85,
      check: (state) => (state.firewallBreaches?.length || 0) >= 4
    },
    forensicInvestigator: {
      id: 'forensicInvestigator',
      name: 'Digital Detective',
      description: 'Analyze 10+ forensic artifacts and cover all tracks',
      icon: '🔍',
      rarity: 'rare',
      points: 75,
      check: (state) => (state.forensicEvidence?.length || 0) >= 10
    },
    intelligenceOfficer: {
      id: 'intelligenceOfficer',
      name: 'Intelligence Analyst',
      description: 'Gather comprehensive intel from 8+ sources',
      icon: '🕵️',
      rarity: 'epic',
      points: 100,
      check: (state) => {
        const sources = [
          state.intelligence?.networkTopology,
          state.intelligence?.userCredentials,
          state.intelligence?.employeeProfiles,
          state.intelligence?.systemAccess,
          state.intelligence?.securityMeasures,
          state.intelligence?.encryptionKeys,
          state.intelligence?.dataLocations,
          state.intelligence?.coverTracks
        ].filter(source => source && (Array.isArray(source) ? source.length > 0 : Object.keys(source).length > 0));
        return sources.length >= 8;
      }
    },
    riskTaker: {
      id: 'riskTaker',
      name: 'High Stakes Hacker',
      description: 'Complete mission with detection level over 70%',
      icon: '🔥',
      rarity: 'rare',
      points: 120,
      check: (state, completed) => completed.length >= 8 && (state.detectionLevel || 0) >= 70
    },
    timeWarrior: {
      id: 'timeWarrior',
      name: 'Under Pressure',
      description: 'Complete mission with less than 5 minutes remaining',
      icon: '⏰',
      rarity: 'epic',
      points: 180,
      check: (state, completed) => {
        if (completed.length < 8) return false;
        const elapsed = Date.now() - new Date(state.sessionStats.startTime).getTime();
        const remaining = state.failureConditions.timeLimit - elapsed;
        return remaining < 120000; // Less than 5 minutes
      }
    },
    survivalist: {
      id: 'survivalist',
      name: 'Mission Survivor',
      description: 'Complete mission after triggering 4+ security alerts',
      icon: '🚨',
      rarity: 'epic',
      points: 160,
      check: (state, completed) => completed.length >= 8 && (state.securityAlerts?.alerts?.length || 0) >= 4
    },
    commandMaster: {
      id: 'commandMaster',
      name: 'Terminal Wizard',
      description: 'Execute 200+ commands during the mission',
      icon: '⌨️',
      rarity: 'uncommon',
      points: 40,
      check: (state) => (state.sessionStats?.commandsExecuted || 0) >= 200
    },
    socialButterfly: {
      id: 'socialButterfly',
      name: 'People Person',
      description: 'Manipulate employees from 5+ different departments',
      icon: '🦋',
      rarity: 'rare',
      points: 65,
      check: (state) => {
        const departments = new Set(state.socialIntel?.map(intel => intel.department) || []);
        return departments.size >= 5;
      }
    },
    passwordCracker: {
      id: 'passwordCracker',
      name: 'Credential Thief',
      description: 'Crack 15+ different passwords and accounts',
      icon: '🔓',
      rarity: 'uncommon',
      points: 50,
      check: (state) => (state.crackedPasswords?.length || 0) + (state.phishingData?.length || 0) >= 15
    },
    compoundAttacker: {
      id: 'compoundAttacker',
      name: 'Strategic Hacker',
      description: 'Execute 3+ compound attack strategies',
      icon: '⚔️',
      rarity: 'epic',
      points: 140,
      check: (state) => (state.opportunities?.compoundAttacks?.length || 0) >= 3
    },
    cleanHacker: {
      id: 'cleanHacker',
      name: 'No Trace Hacker',
      description: 'Complete mission without any failed attempts',
      icon: '✨',
      rarity: 'legendary',
      points: 300,
      check: (state, completed) => completed.length >= 8 && (state.failedAttempts?.total || 0) === 0
    },
    elite: {
      id: 'elite',
      name: 'Elite Shadow',
      description: 'Achieve all other achievements in a single mission',
      icon: '👤',
      rarity: 'legendary',
      points: 1000,
      check: (state) => {
        const unlockedCount = state.achievements?.unlocked?.length || 0;
        const totalAchievements = Object.keys(achievementDefinitions).length - 1; // Excluding this one
        return unlockedCount >= totalAchievements;
      }
    }
  };

  // Story progression and narrative framework
  const missionStory = {
    title: "Operation: Shadow Strike",
    target: "TechCorp Industries",
    briefing: `
🏴‍☠️ CLASSIFIED - UNAUTHORIZED ACCESS OPERATION

Target: TechCorp Industries
Operation Type: Covert Digital Infiltration  
Time Window: Limited (48 hours before security audit)
Detection Risk: CRITICAL - Zero tolerance for exposure

SITUATION:
TechCorp Industries has valuable financial data and trade secrets worth millions. Recent intelligence suggests they're developing revolutionary fintech algorithms that could be extremely profitable on the black market. Their security team is competent but not expecting an attack.

Your reputation as a ghost in the machine depends on completing this operation without leaving any traces. One mistake could expose your identity and land you in federal prison.

OBJECTIVES:
1. 🔍 INFILTRATE: Gain entry to TechCorp's network without triggering alerts
2. ⚡ ESCALATE: Obtain administrative privileges while staying invisible  
3. 💎 EXFILTRATE: Locate and steal high-value financial algorithms and customer data
4. 🕵️ COVER TRACKS: Remove all evidence of your presence
5. 💰 PROFIT: Sell obtained data on dark web markets

OPERATIONAL SECURITY:
- Maintain complete anonymity - your identity must never be discovered
- Avoid detection systems - triggering alerts will compromise the operation
- Use advanced evasion techniques - their SOC team monitors for suspicious activity
- Leave no digital footprints - forensic analysis must find nothing

⚠️ CONSEQUENCES OF DETECTION:
- Immediate operation termination
- Potential law enforcement involvement  
- Permanent ban from elite hacker circles
- Financial ruin and imprisonment

Remember: You don't exist. You were never here. Leave no trace.

Good luck, shadow.
    `,
    phases: {
      reconnaissance: {
        title: "Phase 1: Silent Reconnaissance",
        description: "Map target infrastructure without alerting security",
        objectives: ["Quietly probe network perimeter", "Identify vulnerable services", "Map attack surface anonymously"],
        tools: ["Stealth Network Scanner", "Service Enumeration", "Vulnerability Assessment"],
        narrative: "Every successful infiltration begins with intelligence gathering. You must learn TechCorp's digital layout while remaining completely invisible to their monitoring systems."
      },
      initial_access: {
        title: "Phase 2: Breach & Infiltrate", 
        description: "Gain unauthorized access without detection",
        objectives: ["Exploit discovered vulnerabilities", "Crack authentication silently", "Manipulate employees for access"],
        tools: ["Password Cracker", "SSH Infiltration", "Social Engineering", "Spear Phishing"],
        narrative: "Time to slip through TechCorp's defenses. Choose your attack vector carefully - a single misstep could trigger their incident response team."
      },
      post_exploitation: {
        title: "Phase 3: Shadow Operations",
        description: "Expand control while evading detection", 
        objectives: ["Escalate privileges stealthily", "Move laterally through network", "Bypass security controls"],
        tools: ["Malware Deployment", "Firewall Evasion", "Cryptographic Attacks"],
        narrative: "You're inside their network but far from safe. Advanced persistent threat techniques are needed to navigate their security controls without raising suspicion."
      },
      data_acquisition: {
        title: "Phase 4: Digital Heist",
        description: "Steal valuable data and cover your tracks",
        objectives: ["Locate high-value targets", "Decrypt secured databases", "Exfiltrate data silently"],
        tools: ["File Decryption", "Digital Forensics", "Data Exfiltration"],
        narrative: "The prize is within reach. TechCorp's most valuable secrets await, but extracting them without detection requires master-level skills."
      },
      mission_complete: {
        title: "Operation Complete",
        description: "Successfully infiltrated and exfiltrated - identity unknown",
        narrative: "Another ghost job completed. TechCorp will never know what hit them, and you've secured your reputation as an elite cyber criminal."
      }
    }
  };

  // Add output utility function early
  const addOutput = (text, type = 'output') => {
    setOutput(prev => [...prev, { text, type }]);
  };

  // Add auto-scroll effect
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Add missing utility functions
  const getCurrentPhase = () => {
    const completedCount = gameState.completedMinigames?.length || 0;
    if (completedCount === 0) return 'reconnaissance';
    if (completedCount <= 3) return 'initial_access';
    if (completedCount <= 7) return 'post_exploitation';
    if (completedCount <= 9) return 'data_acquisition';
    return 'mission_complete';
  };

  const getStoryContext = (toolName) => {
    const phase = getCurrentPhase();
    const phaseInfo = missionStory.phases[phase];
    return {
      phase,
      phaseInfo,
      completedTools: gameState.completedMinigames?.length || 0,
      toolName
    };
  };

  const updateStoryProgress = (toolName, result) => {
    // Use a synchronous check with immediate state update to prevent race conditions
    setGameState(prev => {
      // Check if we've already submitted a score for this tool
      if (prev.submittedScores && prev.submittedScores.includes(toolName)) {
        console.log(`Score for ${toolName} already submitted, skipping duplicate`);
        return prev; // No changes, score already submitted
      }
      
      // Submit score for completed task with difficulty-based scoring
      const toolScores = {
        scan: 5,       // Basic reconnaissance - entry level, always available
        social: 12,    // Human psychology/manipulation - requires soft skills
        crack: 18,     // Password analysis/brute force - technical skills
        ssh: 25,       // System infiltration - high risk, requires credentials
        phish: 22,     // Campaign planning/social engineering - scaled complexity
        malware: 30,   // Advanced persistent threats - expert technical skills
        firewall: 35,  // Network security bypass - deep technical knowledge
        crypto: 40,    // Cryptographic analysis - highest mathematical complexity
        decrypt: 28,   // Data recovery - requires crypto keys but more direct
        forensic: 45   // Evidence analysis/cleanup - master level, all skills combined
      };
      
      const score = toolScores[toolName] || 10;
      
      // Mark this tool as scored IMMEDIATELY to prevent race conditions
      const newState = {
        ...prev,
        submittedScores: [...(prev.submittedScores || []), toolName],
        completedMinigames: [...prev.completedMinigames, toolName]
      };
      
      // Submit score after marking as submitted
      setTimeout(() => submitScore(score), 0);
      
      return newState;
    });

    setStoryProgress(prev => ({
      ...prev,
      completedMinigames: [...prev.completedMinigames, toolName],
      phase: getCurrentPhase()
    }));

    // Check for achievements
    checkAchievements(gameState, [...gameState.completedMinigames, toolName]);

    // Check and unlock new tools
    setTimeout(() => checkAndUnlockTools(), 100);
    
    // Provide automatic guidance after tool completion
    setTimeout(() => {
      const completedCount = gameState.completedMinigames.length + 1; // +1 for the tool just completed
      
      // Milestone encouragement and guidance
      if (completedCount === 1) {
        const encouragement = guidanceSystem.mentor.responses.encouragement;
        addOutput(`\n👤 Ghost: ${encouragement[Math.floor(Math.random() * encouragement.length)]}`, 'system');
        addOutput('💡 Ghost: You\'ve taken your first step into the shadow world. Keep going!', 'system');
      } else if (completedCount === 3) {
        addOutput('\n👤 Ghost: Impressive. You\'re no longer a script kiddie. Ready for advanced techniques?', 'system');
        addOutput('💡 Type "hint" anytime you need guidance on your next move.', 'system');
      } else if (completedCount === 5) {
        addOutput('\n👤 Ghost: Half way there, shadow. Your skills are developing nicely.', 'system');
        addOutput('🎯 Elite hackers combine multiple attack vectors. Think strategically.', 'system');
      } else if (completedCount === 7) {
        addOutput('\n👤 Ghost: Outstanding progress. You\'re approaching master-level capabilities.', 'system');
        addOutput('🔐 The final challenges require true expertise. Are you ready?', 'system');
      } else if (completedCount === 10) {
        addOutput('\n👤 Ghost: Welcome to the elite, shadow. You\'ve mastered the digital realm.', 'system');
        addOutput('👑 Legendary status achieved. The underground recognizes your skills.', 'system');
      }
      
      // Contextual next step hint
      if (completedCount < 10) {
        const nextHint = guidanceSystem.getContextualHint({
          ...gameState,
          completedMinigames: [...gameState.completedMinigames, toolName]
        });
        
        if (nextHint.priority === 'high' || nextHint.priority === 'critical') {
          addOutput(`\n💡 Next objective: ${nextHint.message}`, 'system');
        }
      }
    }, 2000); // Delay to let completion messages show first
  };

  // Function to check conditions and unlock tools
  const checkAndUnlockTools = () => {
    setGameState(prev => {
      const newToolAccess = { ...prev.toolAccess };
      let hasChanges = false;

      // Crack: Unlocked after network scan
      if (!newToolAccess.crack && prev.scannedDevices.length > 0) {
        newToolAccess.crack = true;
        hasChanges = true;
        addOutput('🔓 NEW TOOL UNLOCKED: Password Cracker - Use "crack" command', 'success');
      }

      // SSH: Unlocked after network scan + password cracking OR social engineering
      if (!newToolAccess.ssh && (
        (prev.scannedDevices.length > 0 && prev.crackedPasswords.length > 0) ||
        prev.socialIntel.length > 0
      )) {
        newToolAccess.ssh = true;
        hasChanges = true;
        addOutput('🔓 NEW TOOL UNLOCKED: SSH Infiltrator - Use "ssh <ip>" command', 'success');
      }

      // Phishing: Unlocked after social engineering
      if (!newToolAccess.phish && prev.socialIntel.length > 0) {
        newToolAccess.phish = true;
        hasChanges = true;
        addOutput('🔓 NEW TOOL UNLOCKED: Phishing Simulator - Use "phish" command', 'success');
      }

      // Malware: Unlocked after SSH access
      if (!newToolAccess.malware && prev.compromisedDevices.length > 0) {
        newToolAccess.malware = true;
        hasChanges = true;
        addOutput('🔓 NEW TOOL UNLOCKED: Malware Analyzer - Use "malware" command', 'success');
      }

      // Firewall: Unlocked after SSH + social intel
      if (!newToolAccess.firewall && prev.compromisedDevices.length > 0 && prev.socialIntel.length > 0) {
        newToolAccess.firewall = true;
        hasChanges = true;
        addOutput('🔓 NEW TOOL UNLOCKED: Firewall Breacher - Use "firewall" command', 'success');
      }

      // Crypto: Unlocked after malware or firewall breaches
      if (!newToolAccess.crypto && (prev.malwareSignatures.length > 0 || prev.firewallBreaches.length > 0)) {
        newToolAccess.crypto = true;
        hasChanges = true;
        addOutput('🔓 NEW TOOL UNLOCKED: Crypto Analyzer - Use "crypto" command', 'success');
      }

      // Decrypt: Unlocked after crypto analysis
      if (!newToolAccess.decrypt && prev.cryptoKeys.length > 0) {
        newToolAccess.decrypt = true;
        hasChanges = true;
        addOutput('🔓 NEW TOOL UNLOCKED: File Decryptor - Use "decrypt" command', 'success');
      }

      // Forensic: Unlocked after SSH access AND (malware OR decrypt)
      if (!newToolAccess.forensic && prev.compromisedDevices.length > 0 && 
          (prev.malwareSignatures.length > 0 || prev.decryptedFiles.length > 0)) {
        newToolAccess.forensic = true;
        hasChanges = true;
        addOutput('🔓 NEW TOOL UNLOCKED: Digital Forensics - Use "forensic" command', 'success');
      }

      if (hasChanges) {
        return { ...prev, toolAccess: newToolAccess };
      }
      return prev;
    });
  };

  const escalateSecurityAlert = (reason, riskLevel = 1) => {
    const timestamp = new Date().toISOString();
    
    setGameState(prev => {
      const newAlerts = [...prev.securityAlerts.alerts, { reason, riskLevel, timestamp }];
      const newLevel = Math.min(5, prev.securityAlerts.level + riskLevel);
      const newConsecutiveFailures = prev.securityAlerts.consecutiveFailures + 1;
      
      // Enhanced failure detection with multiple risk factors
      const totalDetection = Math.max(
        prev.detectionLevel || 0,
        prev.sshDetectionLevel || 0,
        prev.sessionRisk || 0
      );
      
      // Check all failure conditions
      const failures = [];
      let missionFailed = false;
      
      // Detection level failure
      if (totalDetection >= prev.failureConditions.maxDetectionLevel) {
        failures.push({
          message: `Detection level exceeded ${prev.failureConditions.maxDetectionLevel}%`,
          details: `Current detection: ${totalDetection}% - Security systems have identified suspicious activity`
        });
        missionFailed = true;
      }
      
      // Failed attempts failure
      if (prev.failedAttempts.total >= prev.failureConditions.maxFailedAttempts) {
        failures.push({
          message: `Too many failed attempts (${prev.failedAttempts.total}/${prev.failureConditions.maxFailedAttempts})`,
          details: 'Multiple failed hacking attempts triggered automated incident response'
        });
        missionFailed = true;
      }
      
      // Security alerts failure
      if (newLevel >= prev.failureConditions.maxSecurityAlerts) {
        failures.push({
          message: `Security alert level exceeded (${newLevel}/${prev.failureConditions.maxSecurityAlerts})`,
          details: 'SOC team has been mobilized and is actively hunting for the intruder'
        });
        missionFailed = true;
      }
      
      // Behavioral analysis failure
      if ((prev.riskFactors?.suspicionScore || 0) >= prev.failureConditions.maxSuspicionScore) {
        failures.push({
          message: `Behavioral analysis threshold exceeded (${prev.riskFactors.suspicionScore}/${prev.failureConditions.maxSuspicionScore})`,
          details: 'AI-powered behavioral analysis detected non-human activity patterns'
        });
        missionFailed = true;
      }
      
      // Honeypot detection failure
      if ((prev.riskFactors?.honeypotHits || 0) >= prev.failureConditions.maxHoneypotHits) {
        failures.push({
          message: `Honeypot detection triggered (${prev.riskFactors.honeypotHits} interactions)`,
          details: 'Attempted access to honeypot systems immediately exposed your presence'
        });
        missionFailed = true;
      }
      
      // Command frequency failure
      if ((prev.riskFactors?.commandFrequency || 0) >= prev.failureConditions.maxCommandsPerMinute) {
        failures.push({
          message: `Command rate limit exceeded (${prev.riskFactors.commandFrequency}/min)`,
          details: 'Abnormally high command frequency detected - automated systems flagged activity'
        });
        missionFailed = true;
      }
      
      // Network noise failure
      if ((prev.riskFactors?.noiseLevel || 0) >= prev.failureConditions.maxNoiseLevel) {
        failures.push({
          message: `Network noise level exceeded (${prev.riskFactors.noiseLevel}/${prev.failureConditions.maxNoiseLevel})`,
          details: 'Excessive network activity triggered traffic analysis systems'
        });
        missionFailed = true;
      }
      
      // Forensic trail failure
      if ((prev.riskFactors?.forensicTrail || 0) >= prev.failureConditions.maxForensicTrail) {
        failures.push({
          message: `Forensic evidence threshold exceeded (${prev.riskFactors.forensicTrail}/${prev.failureConditions.maxForensicTrail})`,
          details: 'Too much digital evidence left behind - forensic analysis will reveal your identity'
        });
        missionFailed = true;
      }
      
      // Credential lockout failure
      if ((prev.riskFactors?.credentialLockouts || 0) >= prev.failureConditions.maxCredentialLockouts) {
        failures.push({
          message: `Account lockout limit reached (${prev.riskFactors.credentialLockouts} accounts)`,
          details: 'Multiple failed authentication attempts triggered account lockdown procedures'
        });
        missionFailed = true;
      }
      
      // Time limit failure
      const sessionStartTime = new Date(prev.sessionStats?.startTime || Date.now()).getTime();
      const elapsedTime = Date.now() - sessionStartTime;
      if (elapsedTime >= prev.failureConditions.timeLimit) {
        failures.push({
          message: `Time limit exceeded (${Math.floor(elapsedTime / 60000)} minutes)`,
          details: 'Security audit commenced - window of opportunity has closed permanently'
        });
        missionFailed = true;
      }
      
      if (missionFailed) {
        setTimeout(() => handleMissionFailure(failures), 1000);
      }
      
      return {
        ...prev,
        securityAlerts: {
          ...prev.securityAlerts,
          level: newLevel,
          alerts: newAlerts,
          lastAlertTime: timestamp,
          consecutiveFailures: newConsecutiveFailures,
          suspiciousActivities: [
            ...prev.securityAlerts.suspiciousActivities,
            { activity: reason, riskLevel, timestamp }
          ]
        }
      };
    });
  };

  // Define critical functions early using useCallback to avoid dependency issues
  const showMissionBriefingCommand = useCallback(() => {
    addOutput('\n' + '═'.repeat(50), 'system');
    addOutput(`🏴‍☠️ ${missionStory.title}`, 'system');
    addOutput('═'.repeat(50), 'system');
    addOutput(missionStory.briefing, 'system');
    addOutput('═'.repeat(50), 'system');
    addOutput('\n💀 status  - View progress', 'system');
    addOutput('🏆 help    - Show commands', 'system');
  }, [missionStory.title, missionStory.briefing]);

  const showStatus = () => {
    addOutput('\n' + '═'.repeat(50), 'system');
    addOutput('📊 MISSION STATUS', 'system');
    addOutput('═'.repeat(50), 'system');
    
    // Show current objective
    addOutput(`\n🎯 Objective: ${storyProgress.currentObjective}`, 'system');
    
    // Show next steps
    if (storyProgress.nextSteps.length > 0) {
      addOutput('\n📝 Next Steps:', 'system');
      storyProgress.nextSteps.forEach(step => {
        addOutput(`  • ${step}`, 'system');
      });
    }
    
    // Show progress
    addOutput('\n📈 Progress:', 'system');
    addOutput(`  • Networks: ${gameState.scannedDevices.length} devices`, 'system');
    addOutput(`  • Systems: ${gameState.compromisedDevices.length} accessed`, 'system');
    addOutput(`  • Files: ${gameState.decryptedFiles.length} decrypted`, 'system');
    
    // Show security status
    const detectionLevel = Math.max(
      gameState.detectionLevel || 0,
      gameState.sshDetectionLevel || 0,
      gameState.sessionRisk || 0
    );
    
    addOutput('\n🛡️ Security:', 'system');
    addOutput(`  • Detection: ${detectionLevel}%`, detectionLevel > 50 ? 'error' : 'system');
    addOutput(`  • Alerts: ${gameState.securityAlerts.level}/5`, gameState.securityAlerts.level > 2 ? 'error' : 'system');
    
    addOutput('═'.repeat(50) + '\n', 'system');
  };

  // Handle mission failure
  const handleMissionFailure = useCallback((failures) => {
    setGameState(prev => ({ ...prev, missionStatus: 'failed' }));
    setActiveGame(null); // Close any active minigames
    
    // Clear terminal and show failure screen
    setOutput([]);
    
    setTimeout(() => {
      addOutput('█'.repeat(80), 'critical');
      addOutput('🚨 MISSION FAILURE - OPERATION COMPROMISED 🚨', 'critical');
      addOutput('█'.repeat(80), 'critical');
      addOutput('', 'critical');
      addOutput('💀 YOUR IDENTITY HAS BEEN COMPROMISED', 'critical');
      addOutput('🏢 TechCorp Security has detected your intrusion attempts', 'error');
      addOutput('👮 Law enforcement has been notified of the breach', 'error');
      addOutput('🔒 All systems have been locked down and secured', 'error');
      addOutput('', 'critical');
      
      addOutput('📊 FAILURE ANALYSIS:', 'system');
      failures.forEach(failure => {
        addOutput(`❌ ${failure.message}`, 'error');
        addOutput(`   📝 ${failure.details}`, 'warning');
      });
      
      addOutput('', 'system');
      addOutput('🎭 CONSEQUENCES:', 'system');
      addOutput('• Your hacker identity is now known to authorities', 'error');
      addOutput('• TechCorp has strengthened all security measures', 'error');
      addOutput('• Your reputation in elite hacker circles is damaged', 'error');
      addOutput('• Future infiltration attempts will be much harder', 'error');
      
      addOutput('', 'system');
      addOutput('💡 LESSONS LEARNED:', 'system');
      addOutput('• Maintain stealth - avoid detection at all costs', 'warning');
      addOutput('• Failed attempts trigger security escalation', 'warning');
      addOutput('• Time pressure increases as security systems adapt', 'warning');
      addOutput('• Elite hackers leave no traces', 'warning');
      
      addOutput('', 'system');
      addOutput('🔄 Type "restart" to attempt the mission again', 'info');
      addOutput('', 'system');
    }, 1000);
  }, []);

  // Restart mission function
  const restartMission = () => {
    // Reset all game state
    setGameState({
      completedMinigames: [],
      completedTools: [],
      unlockedTools: ['scan'],
      sessionStats: {
        commandsExecuted: 0,
        toolsUsed: [],
        startTime: new Date().toISOString(),
        achievements: [],
        stealthRating: 100,
        detectionRisk: 0
      },
      achievements: {
        progress: {
          stealthMaster: false,
          dataVault: false,
          socialEngineer: false,
          cryptoBreaker: false,
          networkNinja: false,
          exploitExpert: false,
          perfectionist: false
        },
        earned: [],
        unlocked: [],
        notifications: [],
        totalScore: 0
      },
      intelligence: {
        networkTopology: [],
        userCredentials: [],
        employeeProfiles: [],
        systemAccess: [],
        securityMeasures: [],
        encryptionKeys: [],
        encryptedData: [],
        dataLocations: [],
        coverTracks: []
      },
      story: {
        phase: 'reconnaissance',
        currentObjective: 'Begin network reconnaissance to identify entry points',
        missionBriefingShown: false,
        context: 'You are an ethical hacker conducting a penetration test on TechCorp Industries.'
      },
      network: {
        discoveredHosts: [],
        openPorts: [],
        vulnerabilities: [],
        accessGained: []
      },
      networkAccess: {
        level: 'none',
        authenticatedDevices: []
      },
      decryptedFiles: [],
      cryptoKeys: [],
      malwareSignatures: [],
      forensicEvidence: [],
      firewallBreaches: [],
      scannedDevices: [],
      compromisedDevices: [],
      accessedSystems: [],
      socialIntel: [],
      crackedPasswords: [],
      phishingData: [],
      opportunities: {
        compoundAttacks: [],
        escalationPaths: [],
        advancedPersistence: []
      },
      toolAccess: {
        scan: true,
        social: true,
        crack: false,
        ssh: false,
        phish: false,
        malware: false,
        firewall: false,
        crypto: false,
        decrypt: false,
        forensic: false
      },
      detectionLevel: 0,
      sshDetectionLevel: 0,
      sessionRisk: 0,
      missionStatus: 'active',
      securityAlerts: {
        level: 0,
        alerts: [],
        lastAlertTime: null,
        consecutiveFailures: 0,
        suspiciousActivities: []
      },
      failureConditions: {
        maxDetectionLevel: 75,
        maxFailedAttempts: 3,
        maxSecurityAlerts: 3,
        timeLimit: 1800000,
        criticalFailures: 0,
        maxCommandsPerMinute: 15,
        maxHoneypotHits: 1,
        maxCredentialLockouts: 2,
        maxNoiseLevel: 50,
        maxSuspicionScore: 80,
        maxForensicTrail: 25
      },
      failedAttempts: {
        ssh: 0,
        crack: 0,
        scan: 0,
        social: 0,
        phish: 0,
        total: 0
      },
      riskFactors: {
        commandFrequency: 0,
        noiseLevel: 0,
        suspicionScore: 0,
        forensicTrail: 0,
        honeypotHits: 0,
        credentialLockouts: 0,
        patternDetection: 0,
        timeoutFailures: 0,
        signatureMatches: 0
      },
      lastCommandTime: Date.now(),
      commandHistory: [],
      suspiciousActivities: [],
      submittedScores: []          // Track submitted scores to prevent duplicates
    });
    
    // Reset story progress
    setStoryProgress({
      phase: 'initial',
      completedMinigames: [],
      currentObjective: 'Begin silent reconnaissance of TechCorp infrastructure',
      nextSteps: ['Use stealth network scanner to map target network without detection'],
      intelligence: {
        networkDevices: [],
        employeeData: [],
        securityVulnerabilities: [],
        accessCredentials: []
      }
    });
    
    // Clear output and show restart message
    setOutput([
      { type: 'system', text: '═══ 🔄 MISSION RESTART - NEW IDENTITY ACQUIRED 🔄 ═══' },
      { type: 'system', text: 'Shadow Network Access Point v4.2.1' },
      { type: 'system', text: 'New identity forged... ✓' },
      { type: 'system', text: 'Previous operation traces eliminated... ✓' },
      { type: 'system', text: 'Enhanced stealth protocols activated... ✓' },
      { type: 'system', text: 'VPN chains refreshed. New shadow identity active. 👤' },
      { type: 'system', text: '' },
      { type: 'system', text: '💀 You\'ve learned from your mistakes. This time, stay invisible.' },
      { type: 'system', text: '🛠️  Type "help" for stealth-focused tools and commands' },
      { type: 'system', text: '🏆 Type "mission" to review your assignment' },
      { type: 'system', text: '⚠️  Remember: Detection leads to mission failure!' }
    ]);
  };

  // Empty useEffect to maintain component structure
  useEffect(() => {
    // Guidance system removed
  }, []);

  // Show mission briefing on first load
  useEffect(() => {
    if (showMissionBriefing && output.length === 0) {
      setTimeout(() => {
        setOutput([
          { type: 'system', text: '═══ SHADOWNET TERMINAL ═══' },
          { type: 'system', text: 'Connection established ✓' },
          { type: 'system', text: 'Identity verified ✓' },
          { type: 'system', text: '' },
          { type: 'system', text: '💀 mission  - View assignment' },
          { type: 'system', text: '🛠️  help    - Show commands' },
          { type: 'system', text: '🏆 quick   - Quick start guide' },
          { type: 'system', text: '' }
        ]);
        
        // Show mission briefing after brief delay
        setTimeout(() => {
          showMissionBriefingCommand();
        }, 2000);
      }, 1000);
    }
  }, [showMissionBriefingCommand]);

  // Add global keyboard event listener for ESC key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && activeGame) {
        handleGameExit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeGame]); // handleGameExit is stable as it doesn't depend on changing values

  const handleInput = (e) => {
    setCurrentInput(e.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (currentInput.trim()) {
        addOutput(`shadownet@penetest:~$ ${currentInput}`, 'input');
        handleCommand(currentInput.trim());
        setCurrentInput('');
      }
    }
  };

  const handleGameExit = () => {
    setActiveGame(null);
  };

  // Enhanced mission status with better formatting
  const showMissionStatus = () => {
    const currentPhase = getCurrentPhase();
    const phaseInfo = missionStory.phases[currentPhase];
    
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('🎯 INFILTRATION STATUS - OPERATION: SHADOW STRIKE', 'system');
    addOutput('═'.repeat(70), 'system');
    
    addOutput(`\n🎪 CURRENT PHASE: ${phaseInfo.title}`, 'system');
    addOutput(`📋 DESCRIPTION: ${phaseInfo.description}`, 'system');
    addOutput(`🎯 CURRENT OBJECTIVE: ${storyProgress.currentObjective}`, 'system');
    
    addOutput('\n📊 PROGRESS SUMMARY:', 'system');
    addOutput(`✅ Completed Exploits: ${storyProgress.completedMinigames.length}/10`, 'system');
    addOutput(`📈 Infiltration Progress: ${Math.round((storyProgress.completedMinigames.length / 10) * 100)}%`, 'system');
    addOutput(`🕵️ Stealth Rating: ${gameState.sessionStats.stealthRating}%`, 'system');
    addOutput(`⚠️  Detection Risk: ${gameState.sessionStats.detectionRisk}%`, 'system');
    
    if (storyProgress.completedMinigames.length > 0) {
      addOutput('\n🏆 SUCCESSFUL BREACHES:', 'system');
      storyProgress.completedMinigames.forEach(minigame => {
        const icons = {
          scan: '🕵️', crack: '🔓', ssh: '💻', social: '🎭', phish: '🎣',
          malware: '🦠', firewall: '🛡️', crypto: '🔐', decrypt: '💎', forensic: '🕵️'
        };
        addOutput(`   ${icons[minigame] || '✅'} ${minigame.toUpperCase()} - Breached Successfully`, 'system');
      });
    }
    
    addOutput('\n🎯 NEXT TARGETS:', 'system');
    storyProgress.nextSteps.forEach(step => {
      addOutput(`   • ${step}`, 'system');
    });
    
    if (phaseInfo.tools) {
      addOutput('\n🛠️ RECOMMENDED EXPLOIT TOOLS:', 'system');
      phaseInfo.tools.forEach(tool => {
        addOutput(`   • ${tool}`, 'system');
      });
    }
    
    addOutput(`   ${phaseInfo.narrative}`, 'system');
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  // Enhanced achievements display
  const showAchievements = () => {
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('🏆 HACKER REPUTATION & ACHIEVEMENTS', 'system');
    addOutput('═'.repeat(70), 'system');
    
    const totalPoints = gameState.achievements.unlocked
      .map(id => achievementDefinitions[id]?.points || 0)
      .reduce((sum, points) => sum + points, 0);
      
    addOutput(`\n💰 Total Reputation Points: ${totalPoints}`, 'system');
    addOutput(`🏅 Achievements Unlocked: ${gameState.achievements.unlocked.length}/${Object.keys(achievementDefinitions).length}`, 'system');
    
    const completionPercent = Math.round((gameState.achievements.unlocked.length / Object.keys(achievementDefinitions).length) * 100);
    addOutput(`📈 Completion Rate: ${completionPercent}%`, 'system');
    
    if (gameState.achievements.unlocked.length > 0) {
      addOutput('\n🎖️  UNLOCKED ACHIEVEMENTS:', 'system');
      gameState.achievements.unlocked.forEach(id => {
        const achievement = achievementDefinitions[id];
        if (achievement) {
          const rarityColors = {
            common: '🟢',
            uncommon: '🔵',
            rare: '🟣', 
            epic: '🟠',
            legendary: '🟡'
          };
          addOutput(`   ${achievement.icon} ${achievement.name} ${rarityColors[achievement.rarity]}`, 'system');
          addOutput(`      💰 ${achievement.points} pts - ${achievement.description}`, 'system');
        }
      });
    }
    
    // Show locked achievements
    const lockedAchievements = Object.values(achievementDefinitions)
      .filter(a => !gameState.achievements.unlocked.includes(a.id));
      
    if (lockedAchievements.length > 0) {
      addOutput('\n🔒 LOCKED ACHIEVEMENTS:', 'system');
      lockedAchievements.slice(0, 5).forEach(achievement => {
        addOutput(`   🔒 ??? - ${achievement.description}`, 'system');
      });
      if (lockedAchievements.length > 5) {
        addOutput(`   📝 ...and ${lockedAchievements.length - 5} more to unlock!`, 'system');
      }
    }
    
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  // Session statistics display
  const showSessionStats = () => {
    const sessionTime = Math.floor((new Date() - gameState.sessionStats.timeStarted) / 1000 / 60);
    
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('📊 SESSION STATISTICS', 'system');
    addOutput('═'.repeat(70), 'system');
    
    addOutput(`\n⏱️  Session Duration: ${sessionTime} minutes`, 'system');
    addOutput(`💻 Commands Executed: ${gameState.sessionStats.commandsExecuted}`, 'system');
    addOutput(`🛠️  Unique Tools Used: ${gameState.sessionStats.toolsUsed.length}`, 'system');
    addOutput(`🕵️ Stealth Rating: ${gameState.sessionStats.stealthRating}%`, 'system');
    addOutput(`⚠️  Detection Risk: ${gameState.sessionStats.detectionRisk}%`, 'system');
    
    addOutput('\n🎯 OPERATION METRICS:', 'system');
    addOutput(`🌐 Networks Mapped: ${gameState.scannedDevices.length} devices`, 'system');
    addOutput(`💻 Systems Compromised: ${gameState.compromisedDevices.length} backdoors`, 'system');
    addOutput(`🔑 Credentials Stolen: ${gameState.crackedPasswords.length + gameState.phishingData.length}`, 'system');
    addOutput(`🎭 Social Intel Gathered: ${gameState.socialIntel.length} sources`, 'system');
    addOutput(`💎 Classified Files Decrypted: ${gameState.decryptedFiles.length}`, 'system');
    
    if (gameState.sessionStats.toolsUsed.length > 0) {
      addOutput('\n🛠️ TOOLS UTILIZED:', 'system');
      gameState.sessionStats.toolsUsed.forEach(tool => {
        const icons = {
          scan: '🕵️', crack: '🔓', ssh: '💻', social: '🎭', phish: '🎣',
          malware: '🦠', firewall: '🛡️', crypto: '🔐', decrypt: '💎', forensic: '🕵️'
        };
        addOutput(`   ${icons[tool] || '🛠️'} ${tool.toUpperCase()}`, 'system');
      });
    }
    
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  // Enhanced intelligence summary
  const showIntelligenceSummary = () => {
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('🕵️ STOLEN INTELLIGENCE SUMMARY', 'system');
    addOutput('═'.repeat(70), 'system');
    
    addOutput(`\n🌐 Network Assets Mapped: ${gameState.scannedDevices.length} systems identified`, 'system');
    addOutput(`💻 Systems Compromised: ${gameState.compromisedDevices.length} backdoors active`, 'system');
    addOutput(`🔑 Credentials Stolen: ${gameState.crackedPasswords.length} password hashes cracked`, 'system');
    addOutput(`🎭 Social Intel Gathered: ${gameState.socialIntel.length} human sources compromised`, 'system');
    addOutput(`🎣 Phishing Victims: ${gameState.phishingData.length} successful credential harvests`, 'system');
    addOutput(`🦠 Malware Deployed: ${gameState.malwareSignatures.length} persistent backdoors installed`, 'system');
    addOutput(`🛡️ Security Bypassed: ${gameState.firewallBreaches.length} perimeter defenses breached`, 'system');
    addOutput(`🔐 Encryption Broken: ${gameState.cryptoKeys.length} cryptographic keys extracted`, 'system');
    addOutput(`💎 Sensitive Data Stolen: ${gameState.decryptedFiles.length} high-value files exfiltrated`, 'system');
    addOutput(`🕵️ Evidence Eliminated: ${gameState.forensicEvidence.length} traces covered`, 'system');
    
    // Intelligence correlation analysis
    const intelSources = Object.values(gameState.intelligence)
      .filter(source => source && (Array.isArray(source) ? source.length > 0 : Object.keys(source).length > 0))
      .length;
      
    addOutput(`\n🧠 Intelligence Correlation: ${intelSources}/8 data sources active`, 'system');
    
    if (intelSources >= 5) {
      addOutput('🎯 ELITE INTELLIGENCE GATHERING: Advanced attack vectors unlocked!', 'system');
    } else if (intelSources >= 3) {
      addOutput('📈 GOOD INTELLIGENCE COVERAGE: Enhanced opportunities available', 'system');
    } else {
      addOutput('📊 LIMITED INTELLIGENCE: Gather more data for advanced strategies', 'system');
    }
    
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  // Enhanced available tools display
  const showAvailableTools = () => {
    addOutput('\n' + '═'.repeat(50), 'system');
    addOutput('🛠️ AVAILABLE COMMANDS', 'system');
    addOutput('═'.repeat(50), 'system');
    
    // Basic commands
    addOutput('\n📋 BASIC:', 'system');
    addOutput('  help     - Show this menu', 'system');
    addOutput('  mission  - View assignment', 'system');
    addOutput('  status   - Check progress', 'system');
    addOutput('  clear    - Clear screen', 'system');
    
    // Tools
    addOutput('\n🛠️ TOOLS:', 'system');
    Object.entries(gameState.toolAccess).forEach(([tool, unlocked]) => {
      const toolInfo = getToolInfo(tool);
      const status = unlocked ? '✅' : '🔒';
      addOutput(`  ${status} ${tool.padEnd(8)} - ${toolInfo.description}`, unlocked ? 'success' : 'warning');
    });
    
    addOutput('\n💡 TIP: Start with "scan" to discover network devices', 'system');
    addOutput('═'.repeat(50) + '\n', 'system');
  };

  const getToolInfo = (tool) => {
    const toolDescriptions = {
      scan: { description: 'Network scanner - Discover devices and vulnerabilities', difficulty: 'Beginner', points: 5 },
      social: { description: 'Social engineer - Manipulate human targets', difficulty: 'Intermediate', points: 12 },
      crack: { description: 'Password cracker - Break authentication systems', difficulty: 'Intermediate', points: 18 },
      ssh: { description: 'SSH infiltrator - Gain remote system access', difficulty: 'Advanced', points: 25 },
      phish: { description: 'Phishing simulator - Deploy deceptive campaigns', difficulty: 'Advanced', points: 22 },
      malware: { description: 'Malware analyzer - Deploy and analyze threats', difficulty: 'Expert', points: 30 },
      firewall: { description: 'Firewall breacher - Bypass network security', difficulty: 'Expert', points: 35 },
      crypto: { description: 'Crypto analyzer - Break encryption systems', difficulty: 'Master', points: 40 },
      decrypt: { description: 'File decryptor - Unlock encrypted data', difficulty: 'Expert', points: 28 },
      forensic: { description: 'Digital forensics - Analyze digital evidence', difficulty: 'Master', points: 45 }
    };
    
    return toolDescriptions[tool] || { description: 'Unknown tool', difficulty: 'Unknown', points: 0 };
  };

  const addClearCommand = () => {
    setOutput([
      { type: 'system', text: '═══ 🔒 TERMINAL CLEARED 🔒 ═══' },
      { type: 'system', text: 'Previous session data preserved in memory' },
      { type: 'system', text: 'Type "help" for available commands' }
    ]);
  };

  const showQuickStart = () => {
    addOutput('\n' + '═'.repeat(50), 'system');
    addOutput('🚀 QUICK START', 'system');
    addOutput('═'.repeat(50), 'system');
    addOutput('\n1. Type "mission" to read assignment', 'system');
    addOutput('2. Type "scan" to start hacking', 'system');
    addOutput('3. Type "status" to track progress', 'system');
    addOutput('═'.repeat(50) + '\n', 'system');
  };

  const handleUnknownCommand = (command) => {
    const suggestions = getSuggestions(command);
    addOutput(`❌ Command not recognized: "${command}"`, 'error');
    
    if (suggestions.length > 0) {
      addOutput(`💡 Did you mean: ${suggestions.join(', ')}?`, 'warning');
    }
    
    addOutput('Type "help" for available commands or "quickstart" for a guide', 'warning');
  };

  const getSuggestions = (input) => {
    const commands = ['help', 'mission', 'status', 'achievements', 'stats', 'intel', 'progress', 'clear', 'quickstart'];
    const tools = Object.keys(gameState.toolAccess);
    const allCommands = [...commands, ...tools];
    
    return allCommands.filter(cmd => 
      cmd.toLowerCase().includes(input.toLowerCase()) || 
      input.toLowerCase().includes(cmd.toLowerCase())
    ).slice(0, 3);
  };

  // Helper function to get tool unlock requirements
  const getToolUnlockRequirement = (tool) => {
    const requirements = {
      crack: 'Complete network scan to discover targets',
      ssh: 'Obtain credentials via crack/social/phishing',
      social: 'Available from start (human factor)',
      phish: 'Complete social engineering reconnaissance',
      malware: 'Gain SSH access to target systems',
      firewall: 'Complete SSH + social intelligence gathering',
      crypto: 'Discover encrypted data through system access',
      decrypt: 'Obtain cryptographic keys via crypto challenges',
      forensic: 'Complete advanced intrusion tools (malware/firewall)'
    };
    return requirements[tool] || 'Unknown requirements';
  };

  // Progress and unlocks display
  const showProgressAndUnlocks = () => {
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('📊 TOOL PROGRESSION & UNLOCK REQUIREMENTS', 'system');
    addOutput('═'.repeat(70), 'system');
    
    const toolTree = {
      basic: {
        title: '🔰 BASIC TOOLS (Always Available)',
        tools: ['scan', 'social']
      },
      intermediate: {
        title: '🎯 INTERMEDIATE TOOLS',
        tools: ['crack', 'phish', 'ssh']
      },
      advanced: {
        title: '💀 ADVANCED TOOLS',
        tools: ['malware', 'firewall', 'crypto']
      },
      elite: {
        title: '👑 ELITE TOOLS',
        tools: ['decrypt', 'forensic']
      }
    };

    const getDetailedRequirement = (tool) => {
      switch (tool) {
        case 'scan': return 'No requirements - Essential for reconnaissance';
        case 'social': return `Scan ${gameState.scannedDevices?.length || 0}/1+ networks first`;
        case 'crack': return `Scan ${gameState.scannedDevices?.length || 0}/1+ networks`;
        case 'phish': return `Social engineer ${gameState.socialIntel?.length || 0}/1+ targets`;
        case 'ssh': return `Scan networks + crack ${gameState.crackedPasswords?.length || 0}/1+ passwords`;
        case 'malware': return `SSH into ${gameState.compromisedDevices?.length || 0}/1+ systems`;
        case 'firewall': return `SSH access + social intel (${gameState.socialIntel?.length || 0}/1+)`;
        case 'crypto': return `Find encrypted data (${gameState.intelligence?.encryptedData?.length || 0}/1+)`;
        case 'decrypt': return `Obtain crypto keys (${gameState.cryptoKeys?.length || 0}/1+)`;
        case 'forensic': return `Major breaches: SSH ${gameState.compromisedDevices?.length || 0}/2+ OR decrypt ${gameState.decryptedFiles?.length || 0}/1+ files`;
        default: return 'Unknown requirement';
      }
    };
    
    Object.entries(toolTree).forEach(([category, info]) => {
      addOutput(`\n${info.title}`, 'system');
      addOutput('─'.repeat(50), 'system');
      
      info.tools.forEach(tool => {
        const isUnlocked = checkToolAccess(tool);
        const status = isUnlocked ? '✅' : '🔒';
        const requirement = getDetailedRequirement(tool);
        
        addOutput(`${status} ${tool.toUpperCase().padEnd(12)} ${requirement}`, 'system');
      });
    });
    
    addOutput('\n🎯 PROGRESSION TIPS:', 'system');
    addOutput('   • Start with network scanning to identify targets', 'system');
    addOutput('   • Use social engineering to gather human intelligence', 'system');
    addOutput('   • Combine tools for maximum effectiveness', 'system');
    addOutput('   • Advanced tools require evidence from previous attacks', 'system');
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  // Compound opportunities display
  const showCompoundOpportunities = () => {
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('🔗 COMPOUND ATTACK OPPORTUNITIES', 'system');
    addOutput('═'.repeat(70), 'system');
    
    const opportunities = [
      {
        name: 'Spear Phishing Campaign',
        requirement: 'Social Engineering + Network Scan',
        unlocked: (gameState.socialIntel?.length || 0) > 0 && (gameState.scannedDevices?.length || 0) > 0,
        description: 'Target specific employees with personalized phishing attacks',
        tools: ['social', 'phish', 'scan']
      },
      {
        name: 'Lateral Movement',
        requirement: 'SSH Access + Network Map',
        unlocked: (gameState.compromisedDevices?.length || 0) > 0 && (gameState.scannedDevices?.length || 0) > 0,
        description: 'Move between compromised systems to expand access',
        tools: ['ssh', 'scan', 'malware']
      },
      {
        name: 'Privilege Escalation',
        requirement: 'SSH + Password Cracking',
        unlocked: (gameState.compromisedDevices?.length || 0) > 0 && (gameState.crackedPasswords?.length || 0) > 0,
        description: 'Gain administrator access on compromised systems',
        tools: ['ssh', 'crack', 'malware']
      },
      {
        name: 'Data Exfiltration',
        requirement: 'SSH + Firewall Bypass',
        unlocked: (gameState.compromisedDevices?.length || 0) > 0 && (gameState.firewallBreaches?.length || 0) > 0,
        description: 'Extract sensitive data through compromised networks',
        tools: ['ssh', 'firewall', 'decrypt']
      },
      {
        name: 'Advanced Persistent Threat',
        requirement: 'Multiple Compromised Systems + Malware',
        unlocked: (gameState.compromisedDevices?.length || 0) >= 2 && (gameState.malwareSignatures?.length || 0) > 0,
        description: 'Establish long-term covert presence in target network',
        tools: ['malware', 'ssh', 'forensic']
      },
      {
        name: 'Cryptographic Breakthrough',
        requirement: 'Encrypted Data + Social Intel',
        unlocked: (gameState.intelligence?.encryptedData?.length || 0) > 0 && (gameState.socialIntel?.length || 0) > 0,
        description: 'Combine social engineering with crypto analysis',
        tools: ['crypto', 'social', 'decrypt']
      }
    ];
    
    let unlockedCount = 0;
    
    opportunities.forEach(opp => {
      const status = opp.unlocked ? '✅ AVAILABLE' : '🔒 LOCKED';
      const color = opp.unlocked ? 'system' : 'system';
      
      if (opp.unlocked) unlockedCount++;
      
      addOutput(`\n${status} ${opp.name}`, color);
      addOutput(`   📋 ${opp.description}`, color);
      addOutput(`   🎯 Requirement: ${opp.requirement}`, color);
      addOutput(`   🛠️  Tools: ${opp.tools.join(' + ')}`, color);
    });
    
    addOutput(`\n📊 STRATEGIC OVERVIEW:`, 'system');
    addOutput(`   🔓 Unlocked Opportunities: ${unlockedCount}/${opportunities.length}`, 'system');
    addOutput(`   📈 Complexity Level: ${unlockedCount < 2 ? 'Novice' : unlockedCount < 4 ? 'Intermediate' : unlockedCount < 6 ? 'Advanced' : 'Elite'}`, 'system');
    
    if (unlockedCount === opportunities.length) {
      addOutput(`\n🏆 ELITE STATUS: All compound attack strategies unlocked!`, 'system');
      addOutput(`💀 You have achieved master-level infiltration capabilities.`, 'system');
    } else {
      const nextOpp = opportunities.find(o => !o.unlocked);
      if (nextOpp) {
        addOutput(`\n🎯 NEXT OBJECTIVE: ${nextOpp.name}`, 'system');
        addOutput(`   📝 Focus on: ${nextOpp.requirement}`, 'system');
      }
    }
    
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  // Update session statistics
  const updateSessionStats = (command) => {
    setGameState(prev => ({
      ...prev,
      sessionStats: {
        ...prev.sessionStats,
        commandsExecuted: prev.sessionStats.commandsExecuted + 1,
        toolsUsed: command && !prev.sessionStats.toolsUsed.includes(command) 
          ? [...prev.sessionStats.toolsUsed, command] 
          : prev.sessionStats.toolsUsed
      }
    }));
  };

  // Check if tool is unlocked before allowing access
  const checkToolAccess = (toolName) => {
    return gameState.toolAccess && gameState.toolAccess[toolName] === true;
  };

  // Enhanced handle command with session tracking
  const handleCommand = (command) => {
    try {
      if (gameState.missionStatus === 'failed') {
        if (command.trim() === 'restart') {
          restartMission();
          return;
        } else {
          return;
        }
      }

      if (!command.trim()) return;
      
      // Enhanced risk factor tracking
      const currentTime = Date.now();
      const timeSinceLastCommand = currentTime - (gameState.lastCommandTime || currentTime);
      
      setGameState(prev => {
        const newState = { ...prev };
        
        // Update command history for pattern detection
        newState.commandHistory = [...(prev.commandHistory || []), {
          command: command.trim(),
          timestamp: currentTime
        }].slice(-20); // Keep last 20 commands
        
        newState.lastCommandTime = currentTime;
        
        // Enhanced threat escalation - make security more responsive (rebalanced)
        // Command frequency analysis (commands per minute)
        const recentCommands = newState.commandHistory.filter(
          cmd => currentTime - cmd.timestamp < 60000
        );
        newState.riskFactors.commandFrequency = recentCommands.length;
        
        // Check for recent security alerts to avoid spam
        const recentSecurityAlerts = newState.securityAlerts.alerts.filter(alert => {
          const alertTime = new Date(alert.timestamp).getTime();
          return currentTime - alertTime < 30000; // Within last 30 seconds
        });
        
        // Reduce escalation if there were recent alerts
        const alertCooldown = recentSecurityAlerts.length > 0;
        
        // Moderate command frequency detection - only for very rapid commands
        if (timeSinceLastCommand < 1000 && !alertCooldown) { // Very fast commands only
          newState.riskFactors.suspicionScore += 2;
          if (timeSinceLastCommand < 500) { // Extremely rapid commands
            escalateSecurityAlert('Automated command execution detected', 1);
          }
        }
        
        // Tool usage tracking for escalation
        const toolCommands = ['scan', 'crack', 'ssh', 'social', 'phish', 'malware', 'firewall', 'crypto'];
        const [baseCommand] = command.toLowerCase().trim().split(' ');
        if (toolCommands.includes(baseCommand)) {
          newState.riskFactors.signatureMatches += 1;
          newState.riskFactors.noiseLevel += 1;
          
          // Track recent tool usage for escalation
          const recentToolUse = newState.commandHistory.filter(cmd => 
            toolCommands.includes(cmd.command.split(' ')[0]) && 
            currentTime - cmd.timestamp < 120000 // Last 5 minutes
          );
          
          // Escalate if using many different tools rapidly
          const uniqueRecentTools = new Set(recentToolUse.map(cmd => cmd.command.split(' ')[0]));
          if (uniqueRecentTools.size >= 5 && !alertCooldown) {
            newState.riskFactors.suspicionScore += 10;
            escalateSecurityAlert('Advanced multi-tool attack pattern detected', 2);
          }
          
          // Escalate for high-risk tool combinations
          if (['malware', 'crypto', 'firewall'].includes(baseCommand) && !alertCooldown) {
            newState.riskFactors.suspicionScore += 3;
            if (Math.random() < 0.3) { // 30% chance for advanced tools
              escalateSecurityAlert(`Advanced ${baseCommand} operation detected`, 1);
            }
          }
        }
        
        // Session duration pressure
        const sessionStartTime = new Date(newState.sessionStats?.startTime || Date.now()).getTime();
        const sessionMinutes = (Date.now() - sessionStartTime) / 60000;
        if (sessionMinutes > 20 && Math.random() < 0.15 && !alertCooldown) {
          escalateSecurityAlert('Extended intrusion session flagged for review', 1);
        }
        
        // Success-based escalation - security gets suspicious of too much success
        if (newState.completedMinigames.length >= 5 && Math.random() < 0.2 && !alertCooldown) {
          escalateSecurityAlert('Abnormally successful attack sequence detected', 1);
        }
        
        // Moderate forensic trail accumulation
        newState.riskFactors.forensicTrail += Math.random() * 1.0;
        
        return newState;
      });
      
      // Update session statistics safely
      try {
        updateSessionStats(command);
      } catch (error) {
        console.warn('Failed to update session stats:', error);
        // Continue execution even if stats update fails
      }

      const [cmd, ...args] = command.toLowerCase().trim().split(' ');
      
      // Tool access checking with error handling
      const checkToolAccessWithFeedback = (toolName) => {
        try {
          if (!checkToolAccess(toolName)) {
            const requirement = getToolUnlockRequirement(toolName);
            addOutput(`❌ Access denied: ${requirement}`, 'error');
            
            if (gameState.scannedDevices.length === 0 && ['crack', 'ssh', 'firewall'].includes(toolName)) {
              addOutput('💡 Hint: Start with "scan" to discover network targets', 'warning');
            } else if (gameState.crackedPasswords.length === 0 && gameState.socialIntel.length === 0 && toolName === 'ssh') {
              addOutput('💡 Hint: Use "crack" or "social" to obtain credentials first', 'warning');
            } else if (gameState.socialIntel.length === 0 && ['phish', 'firewall'].includes(toolName)) {
              addOutput('💡 Hint: Use "social" to gather human intelligence first', 'warning');
            } else if (gameState.compromisedDevices.length === 0 && ['malware', 'firewall', 'forensic'].includes(toolName)) {
              addOutput('💡 Hint: Use "ssh <ip>" to compromise systems first', 'warning');
            }
            
            return false;
          }
          return true;
        } catch (error) {
          console.error('Error checking tool access:', error);
          addOutput('❌ Unable to verify tool access. Please try again.', 'error');
          return false;
        }
      };

      // Enhanced tool launcher with error handling
      const launchTool = (toolName, component, props = {}) => {
        try {
          const storyContext = getStoryContext(toolName);
          const callbacks = {};

          // Create a safe callback wrapper
          const safeCallback = (callback) => (data) => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Error in ${toolName} callback:`, error);
              addOutput(`❌ Operation failed: ${error.message}`, 'error');
            }
          };

          // Set up tool-specific callbacks
          if (toolName === 'scan') {
            callbacks.onScanComplete = safeCallback((result) => {
              // Handle both old format (just devices array) and new format (object with devices and detectionLevel)
              const devices = Array.isArray(result) ? result : (result.devices || []);
              
              setGameState(prev => ({
                ...prev,
                scannedDevices: [...prev.scannedDevices, ...devices]
              }));
              
              addOutput(`Network scan complete: ${devices.length} devices found`);
              
              // Enhanced threat escalation for network scanning
              if (devices.length > 15) { // Increased threshold
                escalateSecurityAlert('Extensive network reconnaissance detected - large footprint', 2);
                addOutput(`⚠️  Security Notice: Large-scale scan detected by network monitoring systems`, 'warning');
              }
              
              if (devices.some(d => d.isHoneypot)) {
                escalateSecurityAlert('Honeypot interaction detected - attacker profiling initiated', 3);
                addOutput(`💀 SCAN COMPROMISED: Honeypot interaction logged - security team alerted!`);
              }
              
              // Random chance of triggering additional security response - reduced
              if (Math.random() < 0.03 && devices.length > 3) { // Reduced from 0.3, only for meaningful scans
                escalateSecurityAlert('Anomalous network traffic patterns detected', 1);
                addOutput(`🔍 Network traffic analysis flagged unusual scanning patterns`, 'warning');
              }
              
              updateStoryProgress('scan', devices);
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
            callbacks.onComplete = callbacks.onScanComplete;
          } else if (toolName === 'crack') {
            callbacks.onCrackComplete = safeCallback((result) => {
              // Handle both old format (just password string) and new format (object with password and success)
              const password = typeof result === 'string' ? result : (result.password || '');
              const success = typeof result === 'string' ? true : (result.success || false);
              
              if (!password || !success) {
                addOutput('❌ Password crack failed - try a different approach');
                setActiveGame(null);
                return;
              }

              // Store complete result object for SSH matching
              const crackResult = typeof result === 'object' ? result : {
                password: password,
                target: 'Unknown',
                success: true
              };

              console.log('Terminal Debug - Received crack result:', result);
              console.log('Terminal Debug - Processed crack result:', crackResult);
              console.log('Terminal Debug - Storing in gameState.crackedPasswords');

              setGameState(prev => ({
                ...prev,
                crackedPasswords: [...prev.crackedPasswords, crackResult]
              }));
              
              // Moderate escalation for password cracking - immediate risk
              escalateSecurityAlert('Password authentication breach detected', 1);
              
              // Enhanced escalation for multiple cracks
              const crackedCount = gameState.crackedPasswords.length + 1;
              if (crackedCount >= 3) { // Escalate after 3 successful cracks
                escalateSecurityAlert('Multiple credential thefts detected - security breach', 2);
                addOutput(`🚨 ALERT: ${crackedCount} passwords compromised - enhanced monitoring activated`, 'warning');
              }
              
              // Random chance of triggering account lockout response
              if (Math.random() < 0.2) { // 20% chance
                escalateSecurityAlert('Account lockout procedures activated', 1);
                addOutput(`🔒 SYSTEM RESPONSE: Authentication monitoring increased`, 'warning');
              }
              
              addOutput(`\n💀 PASSWORD CRACKED: ${password}`);
              if (crackResult.deviceIp) {
                addOutput(`   Target: ${crackResult.target} (${crackResult.deviceIp})`);
              }
              updateStoryProgress('crack', crackResult);
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
            
            // Add the callback that PasswordCracker actually calls
            callbacks.onPasswordCrackComplete = callbacks.onCrackComplete;
            callbacks.onComplete = callbacks.onCrackComplete;
          } else if (toolName === 'phish') {
            callbacks.onComplete = safeCallback((result) => {
              setGameState(prev => ({
                ...prev,
                phishingData: [...prev.phishingData, result]
              }));
              
              addOutput(`Phishing campaign successful: ${result.target}`);
              addOutput(`\n🎣 SOCIAL MANIPULATION: TechCorp employees compromised`);
              
              updateStoryProgress('phish', result);
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
            
            // Add the callback that PhishingSimulator actually calls
            callbacks.onPhishingComplete = callbacks.onComplete;
          } else if (toolName === 'malware') {
            callbacks.onComplete = safeCallback((result) => {
              setGameState(prev => ({
                ...prev,
                malwareSignatures: [...prev.malwareSignatures, result]
              }));
              
              addOutput(`Malware analysis complete: ${result.sample}`);
              addOutput(`\n🦠 ADVANCED PAYLOAD: Custom malware deployed`);
              
              updateStoryProgress('malware', result);
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
            
            // Add the callback that MalwareAnalyzer actually calls
            callbacks.onMalwareComplete = callbacks.onComplete;
          } else if (toolName === 'firewall') {
            callbacks.onComplete = safeCallback((breach) => {
              setGameState(prev => ({
                ...prev,
                firewallBreaches: [...prev.firewallBreaches, breach]
              }));
              
              addOutput(`Firewall breached: ${breach.target}`);
              addOutput(`\n🛡️ PERIMETER INFILTRATED: Network security bypassed`);
              
              updateStoryProgress('firewall', breach);
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
            
            // Add the callback that FirewallBreach actually calls
            callbacks.onFirewallComplete = callbacks.onComplete;
          } else if (toolName === 'crypto') {
            callbacks.onComplete = safeCallback((result) => {
              // Map cipher types to file decryption keys
              const cipherToKeyMap = {
                'base64': 'BASE64_DECODE',
                'caesar': 'CAESAR_SHIFT',
                'hex': 'HEX_DECODE',
                'binary': 'BINARY_DECODE',
                'morse': 'MORSE_DECODE',
                'atbash': 'ATBASH_CIPHER',
                'substitution': 'SUBSTITUTION_CIPHER'
              };
              
              let extractedKey = 'CRYPTO_KEY'; // Default fallback
              
              if (typeof result === 'string') {
                // Handle string format: "✅ Cipher broken! "message" decrypted using Method with key: KEY"
                console.log('Crypto Debug - String result:', result);
                
                // Try to extract cipher type from method name
                const methodMatch = result.match(/using\s+([^"]+?)\s+(?:with key|Analysis)/i);
                if (methodMatch) {
                  const methodName = methodMatch[1].toLowerCase();
                  console.log('Crypto Debug - Extracted method:', methodName);
                  
                  if (methodName.includes('base64')) extractedKey = 'BASE64_DECODE';
                  else if (methodName.includes('caesar')) extractedKey = 'CAESAR_SHIFT';
                  else if (methodName.includes('hex')) extractedKey = 'HEX_DECODE';
                  else if (methodName.includes('binary')) extractedKey = 'BINARY_DECODE';
                  else if (methodName.includes('morse')) extractedKey = 'MORSE_DECODE';
                  else if (methodName.includes('atbash')) extractedKey = 'ATBASH_CIPHER';
                }
              } else if (typeof result === 'object' && result) {
                // Handle object format with cipher type
                console.log('Crypto Debug - Object result:', result);
                
                const cipherType = result.cipher || result.cipherType || result.method;
                if (cipherType && cipherToKeyMap[cipherType.toLowerCase()]) {
                  extractedKey = cipherToKeyMap[cipherType.toLowerCase()];
                }
                
                console.log('Crypto Debug - Cipher type:', cipherType, 'Mapped key:', extractedKey);
              }
              
              console.log('Crypto Debug - Final extracted key:', extractedKey);
              
              setGameState(prev => ({
                ...prev,
                cryptoKeys: [...prev.cryptoKeys, extractedKey]
              }));
              
              addOutput(`✅ Cryptography challenge complete!`);
              addOutput(`🔐 Decryption key obtained: ${extractedKey}`);
              addOutput(`\n🗝️ CRYPTOGRAPHIC ACCESS GRANTED: Encrypted files can now be decrypted`);
              
              updateStoryProgress('crypto', result);
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
            
            // Add the callback that CryptographyChallenge actually calls
            callbacks.onCryptoComplete = callbacks.onComplete;
          } else if (toolName === 'decrypt') {
            callbacks.onComplete = safeCallback((file) => {
              setGameState(prev => ({
                ...prev,
                decryptedFiles: [...prev.decryptedFiles, file]
              }));
              
              addOutput(`File decrypted: ${file.name}`);
              addOutput(`\n💎 DATA HEIST SUCCESS: Encrypted secrets unlocked`);
              
              updateStoryProgress('decrypt', file);
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
            
            // Add the callback that FileDecryptor actually calls
            callbacks.onDecryptComplete = callbacks.onComplete;
          } else if (toolName === 'forensic') {
            callbacks.onComplete = safeCallback((result) => {
              setGameState(prev => ({
                ...prev,
                forensicEvidence: [...prev.forensicEvidence, result]
              }));
              
              addOutput(`Digital forensics complete: ${result.artifact}`);
              addOutput(`\n🕵️ EVIDENCE EXTRACTION: Hidden data recovered`);
              
              updateStoryProgress('forensic', result);
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
            
            // Add the callback that DigitalForensics actually calls
            callbacks.onForensicComplete = callbacks.onComplete;
          } else if (toolName === 'authenticate') {
            callbacks.onAuthenticateComplete = safeCallback((result) => {
              // Handle both old format (just success boolean) and new format (object with success and details)
              const success = typeof result === 'boolean' ? result : (result?.success || false);
              const details = typeof result === 'object' ? result : {};
              
              if (!success) {
                addOutput('❌ Authentication failed - invalid credentials');
                setActiveGame(null);
                return;
              }

              setGameState(prev => ({
                ...prev,
                authenticated: true,
                sessionRisk: Math.min(100, (prev.sessionRisk || 0) + 5)
              }));
              
              addOutput(`\n🔓 ACCESS GRANTED: Authentication successful`);
              if (details.message) {
                addOutput(details.message);
              }
              
              updateStoryProgress('authenticate', { success: true });
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
            callbacks.onComplete = callbacks.onAuthenticateComplete;
          } else if (toolName === 'ssh') {
            callbacks.onSSHComplete = safeCallback((result) => {
              console.log('Terminal Debug - SSH completion callback received:', result);
              
              // Handle both old format (just success boolean) and new format (object with success and details)
              const success = typeof result === 'boolean' ? result : (result?.success || false);
              const details = typeof result === 'object' ? result : {};
              
              console.log('Terminal Debug - Parsed success:', success, 'details:', details);
              
              if (!success) {
                addOutput('❌ SSH connection failed - check credentials and try again');
                setActiveGame(null);
                console.log('Terminal Debug - SSH failed, closing minigame');
                return;
              }

              console.log('Terminal Debug - SSH connection successful, updating game state');
              
              setGameState(prev => ({
                ...prev,
                sshConnected: true,
                sessionRisk: Math.min(100, (prev.sessionRisk || 0) + 3),
                compromisedDevices: [
                  ...prev.compromisedDevices,
                  {
                    ip: details.ip,
                    type: details.target,
                    access: details.access,
                    key: details.key,
                    timestamp: new Date().toISOString()
                  }
                ]
              }));
              
              // Moderate threat escalation for SSH connections
              const deviceCount = gameState.compromisedDevices.length + 1;
              if (deviceCount >= 2) { // Start escalating after 2+ systems
                escalateSecurityAlert(`Unauthorized SSH access detected to ${details.ip}`, 1);
                addOutput(`⚠️ SECURITY NOTICE: Remote access logged by monitoring systems`, 'warning');
              }
              
              if (deviceCount >= 4) { // Higher escalation for many compromises
                escalateSecurityAlert('Multiple system compromises detected - lateral movement suspected', 2);
                addOutput(`🚨 ALERT: Pattern indicates coordinated attack across ${deviceCount} systems`, 'warning');
              }
              
              // Random chance of additional security response for any SSH
              if (Math.random() < 0.25) { // 25% chance
                escalateSecurityAlert('Suspicious authentication patterns detected', 1);
                addOutput(`🔍 Authentication logs flagged for review`, 'warning');
              }
              
              addOutput(`\n🔌 SSH CONNECTED: Remote access established to ${details.ip || 'target'}`);
              if (details.key) {
                addOutput(`🗝️  Encryption key captured: ${details.key}`);
              }
              
              console.log('Terminal Debug - About to call updateStoryProgress');
              updateStoryProgress('ssh', { success: true, details });
              
              console.log('Terminal Debug - About to close SSH minigame');
              setActiveGame(null);
              
              setTimeout(() => {
                console.log('Terminal Debug - Focusing input after SSH completion');
                inputRef.current?.focus();
              }, 100);
            });
            callbacks.onComplete = callbacks.onSSHComplete;
            
            // Add safety timeout to prevent hanging
            setTimeout(() => {
              if (activeGame === 'ssh') {
                addOutput('⚠️ SSH connection timed out - please try again');
                setActiveGame(null);
              }
            }, 30000); // 30 second timeout
          } else {
            // Generic onComplete callback for other tools
            callbacks.onComplete = safeCallback((result) => {
              // Store data based on tool type
              if (toolName === 'social') {
                setGameState(prev => ({
                  ...prev,
                  socialIntel: [...prev.socialIntel, result]
                }));
                
                // Selective threat escalation for social engineering
                if (result.success && result.difficulty >= 4) { // Only escalate for high-value targets
                  escalateSecurityAlert('High-value target compromised - executive-level breach', 2);
                  addOutput(`🚨 EXECUTIVE ALERT: Senior staff member compromised`, 'warning');
                }
                
                // Reduced chance of triggering security awareness response
                const socialCount = gameState.socialIntel.length + 1;
                if (Math.random() < 0.1 && socialCount >= 3) { // Much reduced chance, higher threshold
                  escalateSecurityAlert('Security awareness protocol activated', 1);
                  addOutput(`📢 Security reminder sent to staff`, 'warning');
                }
                
                addOutput(`Social engineering complete: ${result.target || 'target acquired'}`);
                addOutput(`\n🎭 SOCIAL MANIPULATION: Human psychology exploited`);
              } else {
                addOutput(`${toolName} operation complete`);
              }
              
              updateStoryProgress(toolName, result);
              setActiveGame(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            });
          }
          
          setActiveGame({ 
            component, 
            name: toolName, 
            props: { ...props, ...callbacks, gameState, addOutput, storyContext }
          });
        } catch (error) {
          console.error(`Error launching tool ${toolName}:`, error);
          addOutput(`❌ Failed to launch ${toolName}. Please try again.`, 'error');
        }
      };

      switch (cmd) {
        case 'mission':
          showMissionBriefingCommand();
          break;
        case 'status':
          showStatus();
          break;
        case 'achievements':
        case 'achieve':
          showAchievements();
          break;
        case 'stats':
        case 'statistics':
          showSessionStats();
          break;
        case 'intel':
        case 'intelligence':
          showIntelligenceSummary();
          break;
        case 'progress':
        case 'unlock':
        case 'unlocks':
          showProgressAndUnlocks();
          break;
        case 'opportunities':
        case 'compound':
          showCompoundOpportunities();
          break;
        case 'help':
        case 'commands':
          showAvailableTools();
          break;
        case 'quickstart':
        case 'guide':
          showQuickStart();
          break;
        case 'mentor':
        case 'ghost':
          showMentorDialog();
          break;
        case 'hint':
        case 'guidance':
          showContextualHint();
          break;
        case 'next':
        case 'objective':
        case 'objectives':
          showNextObjectives();
          break;
        case 'learn':
        case 'education':
        case 'tutorial':
          if (args.length > 0 && args[0] === 'advanced') {
            showEducationalContent();
          } else {
            showInteractiveTutorial();
          }
          break;
        case 'analyze':
        case 'analysis':
        case 'assessment':
          showSituationAnalysis();
          break;
        case 'clear':
          addClearCommand();
          break;
        case 'scan':
          if (!checkToolAccessWithFeedback('scan')) break;
          launchTool('scan', commands.scan.gameComponent);
          break;
        case 'devices':
        case 'ips':
          if (gameState.scannedDevices.length === 0) {
            addNotification('warning', 'No devices scanned yet. Use "scan" command first', '🔍');
            addNotification('stealth', 'Silent reconnaissance is your first objective', '🕵️');
          } else {
            addOutput('\n🌐 IDENTIFIED VULNERABLE TARGETS:');
            gameState.scannedDevices.forEach(device => {
              const vulnCount = device.vulnerabilities?.length || 0;
              const riskLevel = vulnCount > 2 ? '🔴' : vulnCount > 0 ? '🟡' : '🟢';
              addOutput(`${riskLevel} ${device.ip} - ${device.type} (${vulnCount} exploits available)`);
            });
            addOutput('💡 Use SSH <ip> to infiltrate specific targets\n');
          }
          break;
        case 'crack':
          if (!checkToolAccessWithFeedback('crack')) break;
          if (gameState.scannedDevices.length === 0) {
            addNotification('error', 'No target devices available. Run stealth network scan first', '🚫');
            addNotification('stealth', 'You need to identify vulnerable targets before attempting credential attacks', '🕵️');
          } else {
            launchTool('crack', commands.crack.gameComponent);
          }
          break;
        case 'ssh':
          if (!checkToolAccessWithFeedback('ssh')) break;
          if (args.length === 0) {
            addOutput('\n📡 SSH INFILTRATION USAGE: ssh <ip-address>');
            if (gameState.scannedDevices.length > 0) {
              addOutput('🎯 Available targets:');
              gameState.scannedDevices.forEach(device => {
                if (device.openPorts?.includes(22)) {
                  const isCompromised = gameState.compromisedDevices.some(d => d.ip === device.ip);
                  const status = isCompromised ? '✅ COMPROMISED' : '🎯 AVAILABLE';
                  addOutput(`  ${status} ${device.ip} - SSH available`);
                }
              });
            }
            addOutput('');
          } else {
            const targetIp = args[0];
            const targetDevice = gameState.scannedDevices.find(d => d.ip === targetIp);
            if (!targetDevice) {
              addNotification('error', `Target ${targetIp} not found. Run network scan first`, '🚫');
            } else if (!targetDevice.openPorts?.includes(22)) {
              addNotification('error', `SSH not available on ${targetIp}. Port 22 is closed`, '🔒');
            } else {
              launchTool('ssh', commands.ssh.gameComponent, { targetIp: targetIp });
            }
          }
          break;
        case 'social':
          if (!checkToolAccessWithFeedback('social')) break;
          launchTool('social', commands.social.gameComponent, { target: args[0] });
          break;
        case 'phish':
          if (!checkToolAccessWithFeedback('phish')) break;
          launchTool('phish', commands.phish.gameComponent, { target: args[0] });
          break;
        case 'malware':
          if (!checkToolAccessWithFeedback('malware')) break;
          launchTool('malware', commands.malware.gameComponent, { sample: args[0] });
          break;
        case 'firewall':
          if (!checkToolAccessWithFeedback('firewall')) break;
          if (args.length === 0) {
            addOutput('\n🛡️ FIREWALL EVASION USAGE: firewall <ip-address>');
            if (gameState.scannedDevices.length > 0) {
              addOutput('🎯 Available targets:');
              gameState.scannedDevices.forEach(device => {
                addOutput(`  🎯 ${device.ip} - ${device.type}`);
              });
            }
            addOutput('');
          } else {
            launchTool('firewall', commands.firewall.gameComponent, { target: args[0] });
          }
          break;
        case 'crypto':
          if (!checkToolAccessWithFeedback('crypto')) break;
          launchTool('crypto', commands.crypto.gameComponent, { message: args.join(' ') });
          break;
        case 'decrypt':
          if (!checkToolAccessWithFeedback('decrypt')) break;
          launchTool('decrypt', commands.decrypt.gameComponent);
          break;
        case 'forensic':
          if (!checkToolAccessWithFeedback('forensic')) break;
          launchTool('forensic', commands.forensic.gameComponent, { artifact: args[0] });
          break;
        case 'detection':
        case 'threat':
          // Show current detection levels
          const currentDetection = Math.max(
            gameState.detectionLevel || 0,
            gameState.sshDetectionLevel || 0,
            gameState.sessionRisk || 0
          );
          addOutput('\n🚨 CURRENT THREAT ASSESSMENT:');
          addOutput(`Overall Detection Level: ${currentDetection}%`);
          addOutput(`Scanner Detection: ${gameState.detectionLevel || 0}%`);
          addOutput(`SSH Intrusion Alerts: ${gameState.sshDetectionLevel || 0}%`);
          addOutput(`Session Risk Factor: ${gameState.sessionRisk || 0}%`);
          addOutput(`Security Alert Level: ${gameState.securityAlerts.level}/5`);
          addOutput(`Failed Attempts: ${gameState.failedAttempts.total}/${gameState.failureConditions.maxFailedAttempts}`);
          
          // Calculate time remaining
          const sessionStartTime = new Date(gameState.sessionStats.startTime).getTime();
          const elapsedTime = Date.now() - sessionStartTime;
          const timeRemaining = gameState.failureConditions.timeLimit - elapsedTime;
          const minutesRemaining = Math.max(0, Math.floor(timeRemaining / 60000));
          addOutput(`Time Remaining: ${minutesRemaining} minutes`);
          
          if (currentDetection < 25) {
            addOutput('✅ STEALTH STATUS: Operating under the radar');
          } else if (currentDetection < 50) {
            addOutput('⚠️ CAUTION: Security systems showing interest');
          } else if (currentDetection < 75) {
            addOutput('🚨 WARNING: High security awareness detected');
          } else if (currentDetection < gameState.failureConditions.maxDetectionLevel) {
            addOutput('🔥 CRITICAL: Approaching mission failure threshold!');
            addOutput(`💀 DANGER: ${gameState.failureConditions.maxDetectionLevel - currentDetection}% until mission failure!`);
          } else {
            addOutput('💀 MISSION FAILURE IMMINENT: Immediate evasion required!');
          }
          
          // Show recent security alerts
          if (gameState.securityAlerts.alerts.length > 0) {
            addOutput('\n🚨 RECENT SECURITY ALERTS:');
            gameState.securityAlerts.alerts.slice(-3).forEach(alert => {
              const time = new Date(alert.timestamp).toLocaleTimeString();
              addOutput(`   [${time}] ${alert.reason}`);
            });
          }
          addOutput('');
          break;
        case 'risk':
          // Comprehensive risk factor analysis
          addOutput('\n🎯 COMPREHENSIVE RISK ASSESSMENT:');
          addOutput('═'.repeat(50));
          
          // Behavioral risk factors
          const riskFactors = gameState.riskFactors || {};
          addOutput('\n🤖 BEHAVIORAL ANALYSIS:');
          addOutput(`   Suspicion Score: ${riskFactors.suspicionScore || 0}/${gameState.failureConditions.maxSuspicionScore}`);
          addOutput(`   Command Frequency: ${riskFactors.commandFrequency || 0}/${gameState.failureConditions.maxCommandsPerMinute} per minute`);
          addOutput(`   Pattern Detection: ${riskFactors.patternDetection || 0} repetitive behaviors`);
          
          // Network risk factors
          addOutput('\n📡 NETWORK FOOTPRINT:');
          addOutput(`   Network Noise: ${riskFactors.noiseLevel || 0}/${gameState.failureConditions.maxNoiseLevel}`);
          addOutput(`   Forensic Trail: ${Math.round(riskFactors.forensicTrail || 0)}/${gameState.failureConditions.maxForensicTrail} evidence points`);
          addOutput(`   Tool Signatures: ${riskFactors.signatureMatches || 0} detected`);
          
          // Security incidents
          addOutput('\n🚨 SECURITY INCIDENTS:');
          addOutput(`   Honeypot Hits: ${riskFactors.honeypotHits || 0}/${gameState.failureConditions.maxHoneypotHits}`);
          addOutput(`   Credential Lockouts: ${riskFactors.credentialLockouts || 0}/${gameState.failureConditions.maxCredentialLockouts}`);
          addOutput(`   Failed Operations: ${gameState.failedAttempts.total}/${gameState.failureConditions.maxFailedAttempts}`);
          
          // Educational recommendations
          addOutput('\n💡 OPERATIONAL SECURITY RECOMMENDATIONS:');
          
          if ((riskFactors.suspicionScore || 0) >= 40) {
            addOutput('   🔥 HIGH PRIORITY: Reduce activity pace - you\'re triggering behavioral analysis');
            addOutput('   📚 LESSON: Real attackers work slowly and methodically over days/weeks');
          }
          
          if ((riskFactors.commandFrequency || 0) >= 10) {
            addOutput('   ⏰ SLOW DOWN: Command rate too high - space out your operations');
            addOutput('   📚 LESSON: Rapid-fire commands are a dead giveaway of automated/scripted attacks');
          }
          
          if ((riskFactors.noiseLevel || 0) >= 25) {
            addOutput('   🔇 REDUCE NOISE: Too much network activity detected');
            addOutput('   📚 LESSON: Multiple simultaneous tools create suspicious network patterns');
          }
          
          if ((riskFactors.forensicTrail || 0) >= 15) {
            addOutput('   🧹 COVER TRACKS: Use forensic tools to eliminate evidence');
            addOutput('   📚 LESSON: Every action leaves digital traces that investigators can follow');
          }
          
          if (gameState.failedAttempts.total >= 2) {
            addOutput('   ❌ AVOID FAILURES: Failed attempts trigger immediate security attention');
            addOutput('   📚 LESSON: Multiple failures suggest brute force attacks, not skilled infiltration');
          }
          
          if ((riskFactors.honeypotHits || 0) > 0) {
            addOutput('   🍯 AVOID HONEYPOTS: Be more selective with targets');
            addOutput('   📚 LESSON: Security teams place honeypots to catch careless attackers');
          }
          
          // Overall risk assessment
          const totalRiskScore = (riskFactors.suspicionScore || 0) + 
                                (riskFactors.noiseLevel || 0) + 
                                (riskFactors.forensicTrail || 0) + 
                                (gameState.failedAttempts.total * 10) +
                                (riskFactors.honeypotHits * 30);
          
          addOutput('\n📊 OVERALL RISK LEVEL:');
          if (totalRiskScore < 30) {
            addOutput('   ✅ LOW RISK: Excellent operational security');
          } else if (totalRiskScore < 60) {
            addOutput('   ⚠️ MODERATE RISK: Some security awareness detected');
          } else if (totalRiskScore < 100) {
            addOutput('   🚨 HIGH RISK: Security teams likely investigating');
          } else {
            addOutput('   🔥 CRITICAL RISK: Mission failure imminent!');
          }
          
          addOutput('═'.repeat(50));
          addOutput('💡 Use "help" for tool recommendations based on your risk profile\n');
          break;
        case 'security':
        case 'alerts':
          // Show detailed security status
          addOutput('\n🛡️ SECURITY OPERATIONS CENTER STATUS:');
          addOutput(`Alert Level: ${gameState.securityAlerts.level}/5`);
          addOutput(`Active Alerts: ${gameState.securityAlerts.alerts.length}`);
          addOutput(`Consecutive Failures: ${gameState.securityAlerts.consecutiveFailures}`);
          
          if (gameState.securityAlerts.level === 0) {
            addOutput('✅ Status: No alerts - Systems operating normally');
          } else if (gameState.securityAlerts.level <= 2) {
            addOutput('⚠️ Status: Low-level monitoring - Stay cautious');
          } else if (gameState.securityAlerts.level <= 3) {
            addOutput('🚨 Status: Active investigation - High risk operation');
          } else {
            addOutput('🔥 Status: CRITICAL - SOC team mobilized, mission at risk');
          }
          
          if (gameState.securityAlerts.suspiciousActivities.length > 0) {
            addOutput('\n📊 SUSPICIOUS ACTIVITY LOG:');
            gameState.securityAlerts.suspiciousActivities.slice(-5).forEach(activity => {
              const time = new Date(activity.timestamp).toLocaleTimeString();
              const risk = '🔴'.repeat(activity.riskLevel) + '⚪'.repeat(5 - activity.riskLevel);
              addOutput(`   [${time}] ${risk} ${activity.activity}`);
            });
          }
          addOutput('');
          break;
        case 'testdetection':
          // Test command to increase detection level for testing
          if (args[0] && !isNaN(parseInt(args[0]))) {
            const increase = parseInt(args[0]);
            setGameState(prev => ({
              ...prev,
              detectionLevel: Math.min(100, (prev.detectionLevel || 0) + increase)
            }));
            addOutput(`🧪 TEST: Detection level increased by ${increase}%`);
          } else {
            addOutput('Usage: testdetection <amount>');
          }
          break;
        case 'testscore':
          // Test command to manually submit a score
          const testScore = args[0] ? parseInt(args[0]) : 10;
          if (!isNaN(testScore)) {
            addOutput(`🧪 TEST: Submitting test score of ${testScore} points`);
            submitScore(testScore);
          } else {
            addOutput('Usage: testscore <points>');
          }
          break;
        case 'scores':
        case 'scoring':
          // Show score submission status
          addOutput('\n📊 SCORE SUBMISSION STATUS:', 'system');
          addOutput(`Status: ${scoreSubmissionEnabled ? '✅ ENABLED' : '❌ DISABLED'}`, 'system');
          addOutput(`Architecture: Direct curl command`, 'system');
          addOutput(`Config: Shift+Ctrl+| to open Dev Mode`, 'system');
          addOutput(`Submitted Tasks: ${gameState.submittedScores?.length || 0}`, 'system');
          
          if (gameState.submittedScores?.length > 0) {
            addOutput('\nCompleted submissions:', 'system');
            gameState.submittedScores.forEach(task => {
              addOutput(`   ✅ ${task}`, 'system');
            });
          }
          
          addOutput('\nCommands:', 'system');
          addOutput('   scores enable  - Enable automatic score submission', 'system');
          addOutput('   scores disable - Disable automatic score submission', 'system');
          addOutput('   testscore <pts> - Test score submission manually', 'system');
          addOutput('');
          break;
        case 'enable':
          if (args[0] === 'scores' || args[0] === 'scoring') {
            setScoreSubmissionEnabled(true);
            addOutput('✅ Score submission enabled', 'system');
            addOutput('Scores will be submitted via configured command (Shift+Ctrl+| to view)', 'system');
          } else {
            addOutput('Usage: enable scores', 'warning');
          }
          break;
        case 'disable':
          if (args[0] === 'scores' || args[0] === 'scoring') {
            setScoreSubmissionEnabled(false);
            addOutput('❌ Score submission disabled', 'system');
            addOutput('Scores will be tracked locally only', 'system');
          } else {
            addOutput('Usage: disable scores', 'warning');
          }
          break;
        case 'leaderboard':
        case 'rankings':
          showLeaderboard();
          break;
        case 'tips':
        case 'hints':
          showAdvancedTips();
          break;
        case 'network':
          if (args.length === 0) {
            showNetworkOverview();
          } else if (args[0] === 'map') {
            showNetworkMap();
          } else if (args[0] === 'topology') {
            showNetworkTopology();
          }
          break;
        case 'exploit':
          if (args.length === 0) {
            showExploitDatabase();
          } else {
            searchExploitDatabase(args.join(' '));
          }
          break;
        case 'payload':
          if (args.length === 0) {
            showPayloadGenerator();
          } else {
            generateCustomPayload(args);
          }
          break;
        case 'stealth':
          showStealthTechniques();
          break;
        case 'evasion':
          showEvasionTechniques();
          break;
        case 'persistence':
          showPersistenceMethods();
          break;
        case 'exfiltrate':
          if (gameState.compromisedDevices.length === 0) {
            addOutput('❌ No compromised systems available for data exfiltration', 'error');
          } else {
            showDataExfiltrationOptions();
          }
          break;
        case 'cover':
          showCoverYourTracks();
          break;
        case 'pivot':
          if (gameState.compromisedDevices.length === 0) {
            addOutput('❌ No compromised systems available for pivoting', 'error');
          } else {
            showPivotingOptions();
          }
          break;
        case 'escalate':
          if (gameState.compromisedDevices.length === 0) {
            addOutput('❌ Need system access before privilege escalation', 'error');
          } else {
            showPrivilegeEscalation();
          }
          break;
        case 'lateral':
          if (gameState.compromisedDevices.length === 0) {
            addOutput('❌ Need initial foothold for lateral movement', 'error');
          } else {
            showLateralMovement();
          }
          break;
        case 'backdoor':
          if (gameState.compromisedDevices.length === 0) {
            addOutput('❌ Need system access to install backdoors', 'error');
          } else {
            showBackdoorOptions();
          }
          break;
        case 'c2':
        case 'command-control':
          if (gameState.malwareSignatures.length === 0) {
            addOutput('❌ Deploy malware first to establish C2 infrastructure', 'error');
          } else {
            showCommandControl();
          }
          break;
        case 'persistence-check':
          showPersistenceStatus();
          break;
        case 'cleanup':
          showCleanupOperations();
          break;
        case 'anonymity':
          showAnonymityStatus();
          break;
        case 'simulation':
          showAttackSimulation();
          break;
        case 'methodology':
          showHackingMethodology();
          break;
        case 'mitre':
          showMITREFramework();
          break;
        case 'osint':
          showOSINTGathering();
          break;
        case 'reconng':
          launchReconNGFramework();
          break;
        case 'nmap':
          if (args.length === 0) {
            showNmapUsage();
          } else {
            runNmapCommand(args);
          }
          break;
        case 'metasploit':
          launchMetasploitFramework();
          break;
        case 'burp':
          launchBurpSuite();
          break;
        case 'wireshark':
          launchWiresharkAnalysis();
          break;
        case 'volatility':
          launchVolatilityAnalysis();
          break;
        case 'yara':
          launchYaraAnalysis();
          break;
        case 'autopsy':
          launchAutopsyForensics();
          break;
        case 'hashcat':
          launchHashcatCracking();
          break;
        case 'john':
          launchJohnTheRipper();
          break;
        case 'aircrack':
          addOutput('🌐 Aircrack-ng wireless security auditing toolkit', 'system');
          addOutput('💡 Use for WiFi network penetration testing', 'system');
          addOutput('⚠️ Requires wireless network adapter in monitor mode', 'system');
          break;
        case 'difficulty':
          if (args[0] === 'easy') {
            setGameState(prev => ({
              ...prev,
              failureConditions: {
                ...prev.failureConditions,
                maxDetectionLevel: 95,
                maxFailedAttempts: 8,
                maxSecurityAlerts: 8,
                maxSuspicionScore: 150,
                maxNoiseLevel: 100,
                maxForensicTrail: 60
              }
            }));
            addOutput('🟢 Difficulty set to EASY - More forgiving failure conditions', 'system');
          } else if (args[0] === 'normal') {
            setGameState(prev => ({
              ...prev,
              failureConditions: {
                ...prev.failureConditions,
                maxDetectionLevel: 85,
                maxFailedAttempts: 5,
                maxSecurityAlerts: 5,
                maxSuspicionScore: 120,
                maxNoiseLevel: 75,
                maxForensicTrail: 40
              }
            }));
            addOutput('🟡 Difficulty set to NORMAL - Balanced failure conditions', 'system');
          } else if (args[0] === 'hard') {
            setGameState(prev => ({
              ...prev,
              failureConditions: {
                ...prev.failureConditions,
                maxDetectionLevel: 70,
                maxFailedAttempts: 3,
                maxSecurityAlerts: 3,
                maxSuspicionScore: 80,
                maxNoiseLevel: 50,
                maxForensicTrail: 25
              }
            }));
            addOutput('🔴 Difficulty set to HARD - Strict failure conditions', 'system');
          } else {
            addOutput('\n🎯 DIFFICULTY SETTINGS:', 'system');
            addOutput('Usage: difficulty <easy|normal|hard>', 'system');
            addOutput('', 'system');
            addOutput('🟢 EASY   - More forgiving, educational gameplay', 'system');
            addOutput('🟡 NORMAL - Balanced challenge (default)', 'system');
            addOutput('🔴 HARD   - Realistic security response simulation', 'system');
            addOutput('', 'system');
            const current = gameState.failureConditions.maxDetectionLevel >= 90 ? 'EASY' :
                           gameState.failureConditions.maxDetectionLevel >= 80 ? 'NORMAL' : 'HARD';
            addOutput(`Current difficulty: ${current}`, 'system');
          }
          break;
        case 'reset':
          if (args[0] === 'risk' || args[0] === 'risks') {
            setGameState(prev => ({
              ...prev,
              riskFactors: {
                commandFrequency: 0,
                noiseLevel: 0,
                suspicionScore: 0,
                forensicTrail: 0,
                honeypotHits: 0,
                credentialLockouts: 0,
                patternDetection: 0,
                timeoutFailures: 0,
                signatureMatches: 0
              },
              detectionLevel: 0,
              sshDetectionLevel: 0,
              sessionRisk: 0,
              securityAlerts: {
                level: 0,
                alerts: [],
                lastAlertTime: null,
                consecutiveFailures: 0,
                suspiciousActivities: []
              }
            }));
            addOutput('🧹 All risk factors and detection levels reset to zero', 'system');
            addOutput('💀 Stealth mode restored - you are invisible again', 'system');
          } else {
            addOutput('Usage: reset risk - Reset all detection and risk factors', 'warning');
          }
          break;
        default:
          handleUnknownCommand(command);
          break;
      }
    } catch (error) {
      console.error('Error in command handling:', error);
      addOutput('❌ An error occurred while executing the command', 'error');
    }
  };

  // Add missing functions for enhanced commands
  const checkAchievements = (state, completed) => {
    Object.entries(achievementDefinitions).forEach(([id, achievement]) => {
      if (!state.achievements.unlocked.includes(id)) {
        if (achievement.check(state, completed)) {
          state.achievements.unlocked.push(id);
          addNotification('achievement', `🏆 Achievement Unlocked: ${achievement.name}`, achievement.icon);
          
          // Submit bonus score for achievement (only once per achievement)
          const achievementKey = `achievement_${id}`;
          if (!state.submittedScores?.includes(achievementKey)) {
            const achievementScore = Math.floor(achievement.points / 10); // Convert achievement points to submission score
            submitScore(achievementScore);
            
            // Mark this achievement as scored to prevent duplicates
            setGameState(prev => ({
              ...prev,
              submittedScores: [...(prev.submittedScores || []), achievementKey]
            }));
          }
        }
      }
    });
  };

  const addNotification = (type, message, icon = '💬') => {
    try {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = type === 'critical' ? '🚨' : type === 'warning' ? '⚠️' : type === 'achievement' ? '🏆' : 'ℹ️';
      addOutput(`${prefix} ${message} [${timestamp}]`, type);
    } catch (error) {
      console.error('Error in notification system:', error);
      addOutput(`${icon} ${message}`, type);
    }
  };

  // Add placeholder functions for all the missing commands
  const showNetworkMap = () => {
    addOutput('🗺️ Network topology map not yet implemented', 'warning');
  };

  const showNetworkTopology = () => {
    addOutput('🌐 Network topology analysis not yet implemented', 'warning');
  };

  const showExploitDatabase = () => {
    addOutput('🔍 Exploit database search not yet implemented', 'warning');
  };

  const searchExploitDatabase = (query) => {
    addOutput(`🔍 Searching exploits for: ${query} - Not yet implemented`, 'warning');
  };

  const showPayloadGenerator = () => {
    addOutput('🚀 Payload generator not yet implemented', 'warning');
  };

  const generateCustomPayload = (args) => {
    addOutput(`🚀 Generating payload with args: ${args.join(' ')} - Not yet implemented`, 'warning');
  };

  const showEvasionTechniques = () => {
    addOutput('👻 Evasion techniques guide not yet implemented', 'warning');
  };

  const showPersistenceMethods = () => {
    addOutput('🔒 Persistence methods guide not yet implemented', 'warning');
  };

  const showDataExfiltrationOptions = () => {
    addOutput('📦 Data exfiltration options not yet implemented', 'warning');
  };

  const showCoverYourTracks = () => {
    addOutput('🧹 Cover tracks guide not yet implemented', 'warning');
  };

  const showPivotingOptions = () => {
    addOutput('🔄 Pivoting options not yet implemented', 'warning');
  };

  const showPrivilegeEscalation = () => {
    addOutput('⬆️ Privilege escalation guide not yet implemented', 'warning');
  };

  const showLateralMovement = () => {
    addOutput('↔️ Lateral movement guide not yet implemented', 'warning');
  };

  const showBackdoorOptions = () => {
    addOutput('🚪 Backdoor installation guide not yet implemented', 'warning');
  };

  const showCommandControl = () => {
    addOutput('📡 Command & control setup not yet implemented', 'warning');
  };

  const showPersistenceStatus = () => {
    addOutput('📊 Persistence status check not yet implemented', 'warning');
  };

  const showCleanupOperations = () => {
    addOutput('🧽 Cleanup operations not yet implemented', 'warning');
  };

  const showAnonymityStatus = () => {
    addOutput('🕵️ Anonymity status check not yet implemented', 'warning');
  };

  const showAttackSimulation = () => {
    addOutput('🎯 Attack simulation not yet implemented', 'warning');
  };

  const showMITREFramework = () => {
    addOutput('🎯 MITRE ATT&CK framework reference not yet implemented', 'warning');
  };

  const showOSINTGathering = () => {
    addOutput('🔍 OSINT gathering guide not yet implemented', 'warning');
  };

  const launchReconNGFramework = () => {
    addOutput('🔍 Recon-ng framework not yet implemented', 'warning');
  };

  const showNmapUsage = () => {
    addOutput('🌐 Nmap usage guide not yet implemented', 'warning');
  };

  const runNmapCommand = (args) => {
    addOutput(`🌐 Running nmap ${args.join(' ')} - Not yet implemented`, 'warning');
  };

  const launchMetasploitFramework = () => {
    addOutput('🚀 Metasploit framework not yet implemented', 'warning');
  };

  const launchBurpSuite = () => {
    addOutput('🕷️ Burp Suite not yet implemented', 'warning');
  };

  const launchWiresharkAnalysis = () => {
    addOutput('🦈 Wireshark analysis not yet implemented', 'warning');
  };

  const launchVolatilityAnalysis = () => {
    addOutput('🧠 Volatility memory analysis not yet implemented', 'warning');
  };

  const launchYaraAnalysis = () => {
    addOutput('🔍 YARA rule analysis not yet implemented', 'warning');
  };

  const launchAutopsyForensics = () => {
    addOutput('🕵️ Autopsy forensics not yet implemented', 'warning');
  };

  const launchHashcatCracking = () => {
    addOutput('🔓 Hashcat password cracking not yet implemented', 'warning');
  };

  const launchJohnTheRipper = () => {
    addOutput('🔓 John the Ripper not yet implemented', 'warning');
  };

  // Enhanced gameplay functions for 1+ hour content
  const showLeaderboard = () => {
    const achievements = gameState.achievements.unlocked.length;
    const totalPoints = gameState.achievements.unlocked
      .map(id => achievementDefinitions[id]?.points || 0)
      .reduce((sum, points) => sum + points, 0);
    
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('🏆 ELITE HACKER LEADERBOARD', 'system');
    addOutput('═'.repeat(70), 'system');
    addOutput(`\n🥇 Your Current Ranking:`, 'system');
    addOutput(`   📊 Total Points: ${totalPoints}`, 'system');
    addOutput(`   🏅 Achievements: ${achievements}/${Object.keys(achievementDefinitions).length}`, 'system');
    addOutput(`   ⏱️  Session Time: ${Math.floor((Date.now() - new Date(gameState.sessionStats.startTime).getTime()) / 60000)} minutes`, 'system');
    
    const rank = totalPoints >= 2000 ? 'Elite Shadow' : 
                totalPoints >= 1000 ? 'Master Hacker' :
                totalPoints >= 500 ? 'Advanced Penetrator' :
                totalPoints >= 200 ? 'Skilled Intruder' :
                totalPoints >= 50 ? 'Novice Hacker' : 'Script Kiddie';
    
    addOutput(`   🎖️  Current Rank: ${rank}`, 'system');
    addOutput('\n📈 GLOBAL ELITE RANKINGS:', 'system');
    addOutput('   1. 👑 PhantomZero - 3,247 pts - 47 achievements', 'system');
    addOutput('   2. 🥈 CyberNinja - 2,891 pts - 42 achievements', 'system');
    addOutput('   3. 🥉 ShadowByte - 2,654 pts - 38 achievements', 'system');
    addOutput(`   ${totalPoints >= 2000 ? '4.' : '...'} 🔥 [YOU] - ${totalPoints} pts - ${achievements} achievements`, 'system');
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  const showAdvancedTips = () => {
    const tips = [
      '🕵️ Use social engineering first to gather intel for targeted phishing campaigns',
      '🌐 Scan multiple network ranges to discover hidden infrastructure segments',
      '🔐 Combine password cracking with social engineering for higher success rates',
      '💻 Establish SSH access early to enable lateral movement and privilege escalation',
      '🦠 Deploy malware for persistent access and covert data exfiltration',
      '🛡️ Bypass firewalls systematically to reach high-value network segments',
      '🔓 Use crypto analysis to unlock encrypted databases and sensitive files',
      '🕵️ Digital forensics helps cover tracks and discover additional attack vectors',
      '⚔️ Execute compound attacks combining multiple tools for maximum impact',
      '👻 Maintain stealth by monitoring detection levels and security alerts',
      '⏰ Work efficiently - security audits increase time pressure',
      '🎯 Focus on high-value targets identified through intelligence gathering'
    ];
    
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('💡 ADVANCED HACKING TECHNIQUES & TIPS', 'system');
    addOutput('═'.repeat(70), 'system');
    
    const selectedTips = tips.sort(() => 0.5 - Math.random()).slice(0, 6);
    selectedTips.forEach((tip, index) => {
      addOutput(`\n${index + 1}. ${tip}`, 'system');
    });
    
    addOutput('\n🎯 PRO STRATEGIES:', 'system');
    addOutput('• Combine tools for compound attacks (e.g., social + phishing)', 'system');
    addOutput('• Use intelligence from one tool to enhance others', 'system');
    addOutput('• Monitor detection levels and adapt strategy accordingly', 'system');
    addOutput('• Prioritize persistent access over quick wins', 'system');
    addOutput('• Cover your tracks with forensics tools', 'system');
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  const showInteractiveTutorial = () => {
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('🎓 INTERACTIVE HACKING TUTORIAL', 'system');
    addOutput('═'.repeat(70), 'system');
    addOutput('\n📚 BEGINNER COURSE (5-18 points):', 'system');
    addOutput('1. Type "scan" to discover network devices (5 pts)', 'system');
    addOutput('2. Type "social" to gather human intelligence (12 pts)', 'system');
    addOutput('3. Type "crack" to break password authentication (18 pts)', 'system');
    
    addOutput('\n🎯 ADVANCED COURSE (22-25 points):', 'system');
    addOutput('4. Type "ssh <ip>" to infiltrate discovered systems (25 pts)', 'system');
    addOutput('5. Type "phish" to deploy deceptive email campaigns (22 pts)', 'system');
    
    addOutput('\n👑 EXPERT COURSE (28-35 points):', 'system');
    addOutput('6. Type "malware" to install persistent backdoors (30 pts)', 'system');
    addOutput('7. Type "firewall" to bypass network security (35 pts)', 'system');
    addOutput('8. Type "decrypt" to unlock sensitive files (28 pts)', 'system');
    
    addOutput('\n🔥 MASTER COURSE (40-45 points):', 'system');
    addOutput('9. Type "crypto" to break encryption systems (40 pts)', 'system');
    addOutput('10. Type "forensic" to cover tracks and gather evidence (45 pts)', 'system');
    
    addOutput('\n⚔️ EXPERT TECHNIQUES:', 'system');
    addOutput('• "pivot" - Move between compromised systems', 'system');
    addOutput('• "escalate" - Gain administrator privileges', 'system');
    addOutput('• "exfiltrate" - Steal valuable data covertly', 'system');
    addOutput('• "backdoor" - Install persistent access methods', 'system');
    addOutput('• "cover" - Eliminate forensic evidence', 'system');
    
    addOutput('\n💰 TOTAL POSSIBLE SCORE: 260 points from tools + achievements', 'system');
    addOutput('🏆 Elite hackers master all difficulty levels progressively', 'system');
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  const showNetworkOverview = () => {
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('🌐 NETWORK INFRASTRUCTURE OVERVIEW', 'system');
    addOutput('═'.repeat(70), 'system');
    
    if (gameState.scannedDevices.length === 0) {
      addOutput('\n⚠️ No network reconnaissance data available', 'warning');
      addOutput('💡 Use "scan" command to discover network infrastructure', 'warning');
    } else {
      const deviceTypes = {};
      const subnets = new Set();
      gameState.scannedDevices.forEach(device => {
        deviceTypes[device.type] = (deviceTypes[device.type] || 0) + 1;
        subnets.add(device.ip.split('.').slice(0, 3).join('.'));
      });
      
      addOutput(`\n📊 DISCOVERED INFRASTRUCTURE:`, 'system');
      addOutput(`Total Devices: ${gameState.scannedDevices.length}`, 'system');
      addOutput(`Network Subnets: ${subnets.size}`, 'system');
      addOutput(`Compromised Systems: ${gameState.compromisedDevices.length}`, 'system');
      
      addOutput('\n🏢 DEVICE BREAKDOWN:', 'system');
      Object.entries(deviceTypes).forEach(([type, count]) => {
        const icon = type === 'server' ? '🖥️' : type === 'workstation' ? '💻' : 
                   type === 'router' ? '🌐' : type === 'camera' ? '📹' : '🔧';
        addOutput(`   ${icon} ${type}: ${count} devices`, 'system');
      });
      
      addOutput('\n🔴 HIGH-VALUE TARGETS:', 'system');
      const highValueTargets = gameState.scannedDevices.filter(d => 
        d.type === 'server' || d.vulnerabilities?.length > 2
      );
      highValueTargets.slice(0, 5).forEach(device => {
        const vulns = device.vulnerabilities?.length || 0;
        addOutput(`   🎯 ${device.ip} - ${device.type} (${vulns} vulnerabilities)`, 'system');
      });
    }
    
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  const showStealthTechniques = () => {
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('👻 ADVANCED STEALTH & EVASION TECHNIQUES', 'system');
    addOutput('═'.repeat(70), 'system');
    
    addOutput('\n🕵️ DETECTION AVOIDANCE:', 'system');
    addOutput('• Use slow, methodical scanning to avoid triggering IDS', 'system');
    addOutput('• Randomize attack timing to evade pattern detection', 'system');
    addOutput('• Leverage social engineering to minimize technical footprint', 'system');
    addOutput('• Use legitimate credentials to blend with normal traffic', 'system');
    
    addOutput('\n🔍 ANTI-FORENSICS:', 'system');
    addOutput('• Clear system logs after successful infiltration', 'system');
    addOutput('• Use memory-only malware that leaves no disk traces', 'system');
    addOutput('• Modify timestamps to obscure activity timelines', 'system');
    addOutput('• Route traffic through compromised intermediary systems', 'system');
    
    addOutput('\n🌐 NETWORK EVASION:', 'system');
    addOutput('• Fragment payloads to bypass deep packet inspection', 'system');
    addOutput('• Use encrypted tunnels through firewall exceptions', 'system');
    addOutput('• Mimic legitimate protocols for command & control', 'system');
    addOutput('• Establish multiple redundant communication channels', 'system');
    
    const currentDetection = Math.max(
      gameState.detectionLevel || 0,
      gameState.sshDetectionLevel || 0,
      gameState.sessionRisk || 0
    );
    
    addOutput(`\n📊 CURRENT STEALTH STATUS: ${currentDetection}%`, 'system');
    if (currentDetection < 25) {
      addOutput('✅ GHOST MODE: Completely undetected', 'system');
    } else if (currentDetection < 50) {
      addOutput('⚠️ COMPROMISED: Some security awareness detected', 'warning');
    } else {
      addOutput('🚨 BLOWN COVER: High detection - immediate evasion required!', 'error');
    }
    
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  const showHackingMethodology = () => {
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('🎯 PROFESSIONAL PENETRATION TESTING METHODOLOGY', 'system');
    addOutput('═'.repeat(70), 'system');
    
    addOutput('\n1️⃣ RECONNAISSANCE PHASE:', 'system');
    addOutput('   🕵️ Passive information gathering (OSINT)', 'system');
    addOutput('   🌐 Network discovery and enumeration', 'system');
    addOutput('   👥 Social engineering reconnaissance', 'system');
    addOutput('   Status: ' + (gameState.scannedDevices.length > 0 ? '✅ Complete' : '⏳ Pending'), 'system');
    
    addOutput('\n2️⃣ INITIAL ACCESS PHASE:', 'system');
    addOutput('   🔓 Credential attacks and password cracking', 'system');
    addOutput('   🎣 Spear phishing and social manipulation', 'system');
    addOutput('   💻 Vulnerability exploitation and system infiltration', 'system');
    addOutput('   Status: ' + (gameState.compromisedDevices.length > 0 ? '✅ Complete' : '⏳ Pending'), 'system');
    
    addOutput('\n3️⃣ POST-EXPLOITATION PHASE:', 'system');
    addOutput('   ⬆️ Privilege escalation and admin access', 'system');
    addOutput('   🔄 Lateral movement through network', 'system');
    addOutput('   🦠 Persistent access and backdoor installation', 'system');
    addOutput('   Status: ' + (gameState.malwareSignatures.length > 0 ? '✅ Complete' : '⏳ Pending'), 'system');
    
    addOutput('\n4️⃣ DATA ACQUISITION PHASE:', 'system');
    addOutput('   🔐 Encryption breaking and crypto analysis', 'system');
    addOutput('   💎 Sensitive data identification and decryption', 'system');
    addOutput('   📦 Covert data exfiltration', 'system');
    addOutput('   Status: ' + (gameState.decryptedFiles.length > 0 ? '✅ Complete' : '⏳ Pending'), 'system');
    
    addOutput('\n5️⃣ COVER TRACKS PHASE:', 'system');
    addOutput('   🕵️ Digital forensics and evidence elimination', 'system');
    addOutput('   🧹 Log clearing and timeline manipulation', 'system');
    addOutput('   👻 Stealth maintenance and detection avoidance', 'system');
    addOutput('   Status: ' + (gameState.forensicEvidence.length > 0 ? '✅ Complete' : '⏳ Pending'), 'system');
    
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  // Check for tool unlocks whenever relevant game state changes
  useEffect(() => {
    checkAndUnlockTools();
  }, [
    gameState.scannedDevices.length,
    gameState.crackedPasswords.length,
    gameState.socialIntel.length,
    gameState.compromisedDevices.length,
    gameState.malwareSignatures.length,
    gameState.firewallBreaches.length,
    gameState.cryptoKeys.length,
    gameState.decryptedFiles.length
  ]);

  // Score submission function — uses configurable command from DevMode
  const submitScore = async (score = 10) => {
    if (!scoreSubmissionEnabled) {
      console.log(`Score submission disabled: ${score} points earned`);
      addOutput(`📊 Score earned locally: ${score} points (submission disabled)`, 'system');
      return;
    }

    try {
      // Build the command from the saved template, replacing $score
      const cmd = buildScoreCommand(score);

      // Try Electron IPC first (production & electron-dev)
      if (window.electronAPI) {
        const result = await window.electronAPI.executeCommand(cmd);

        if (result.success) {
          console.log(`Score ${score} submitted successfully`);
          addOutput(`📊 Score submitted: ${score} points`, 'system');
        } else {
          console.warn('Score submission failed:', result.error || result.stderr);
          addOutput(`⚠️ Score submission failed: ${result.error || result.stderr}`, 'warning');
        }
      } else {
        // Fallback for browser-only dev (no Electron)
        console.log(`[Browser mode] Would execute: ${cmd}`);
        addOutput(`📊 Score ${score} pts (command preview — run in Electron to submit)`, 'system');
      }
    } catch (error) {
      console.error('Score submission error:', error);
      if (error.message && error.message.includes('timeout')) {
        addOutput(`⚠️ Score submission timed out`, 'warning');
      } else {
        addOutput(`⚠️ Score submission error: ${error.message}`, 'warning');
      }
      console.log(`Continuing game - ${score} points earned locally`);
    }
  };

  // Advanced Guidance System with AI Mentor
  const guidanceSystem = {
    mentor: {
      name: "Ghost",
      personality: "elite hacker mentor",
      responses: {
        greeting: [
          "👤 Ghost here. I've been watching your progress. Need some guidance, shadow?",
          "💀 Ghost speaking. Every master hacker needs a mentor. What's your next move?",
          "🕴️ Ghost at your service. I've infiltrated systems you've never heard of. Let me guide you.",
          "👻 The Ghost sees all. I'm here to help you become the hacker you're meant to be."
        ],
        encouragement: [
          "💀 Excellent work, shadow. You're learning the art of digital warfare.",
          "🎯 Impressive technique. You're thinking like a true cyber criminal now.",
          "👤 Outstanding. Your skills are evolving beyond script kiddie level.",
          "🔥 Perfect execution. The target never saw it coming."
        ],
        warning: [
          "⚠️ Careful, shadow. You're leaving too many digital fingerprints.",
          "🚨 Slow down. Security systems are getting suspicious of your activities.",
          "💀 Your operational security is compromised. Time to change tactics.",
          "👻 Detection levels rising. A true ghost leaves no trace."
        ],
        tips: [
          "💡 Pro tip: Combine social engineering with technical attacks for maximum impact.",
          "🎯 Remember: The best hackers exploit humans, not just systems.",
          "🔐 Advanced technique: Use stolen credentials to blend with legitimate traffic.",
          "🕵️ Elite strategy: Gather intelligence before launching attacks."
        ]
      }
    },
    
    getContextualHint: (gameState) => {
      const completedTools = gameState.completedMinigames?.length || 0;
      const detectionLevel = Math.max(
        gameState.detectionLevel || 0,
        gameState.sshDetectionLevel || 0,
        gameState.sessionRisk || 0
      );
      
      // Beginner guidance (0-2 tools)
      if (completedTools === 0) {
        return {
          type: 'next_step',
          priority: 'high',
          message: "🎯 Start with reconnaissance. Type 'scan' to discover network vulnerabilities.",
          context: "Every successful infiltration begins with intelligence gathering."
        };
      }
      
      if (completedTools === 1 && !gameState.socialIntel?.length) {
        return {
          type: 'next_step',
          priority: 'high',
          message: "🎭 Human factor is crucial. Type 'social' to manipulate employees.",
          context: "Social engineering often bypasses the strongest technical defenses."
        };
      }
      
      // Intermediate guidance (2-5 tools)
      if (completedTools >= 2 && !gameState.crackedPasswords?.length) {
        return {
          type: 'suggestion',
          priority: 'medium',
          message: "🔓 Credential attacks are effective. Try 'crack' to break passwords.",
          context: "Weak passwords are the #1 vulnerability in most organizations."
        };
      }
      
      if (gameState.scannedDevices?.length > 0 && !gameState.compromisedDevices?.length) {
        return {
          type: 'next_step',
          priority: 'high',
          message: "💻 Time for system infiltration. Use 'ssh <ip>' on discovered targets.",
          context: "Direct system access opens doors to lateral movement and data theft."
        };
      }
      
      // Advanced guidance (5+ tools)
      if (completedTools >= 5 && detectionLevel > 50) {
        return {
          type: 'warning',
          priority: 'critical',
          message: "🚨 Detection levels critical! Focus on stealth and evasion techniques.",
          context: "High-level hackers know when to retreat and adapt their approach."
        };
      }
      
      if (gameState.compromisedDevices?.length > 0 && !gameState.malwareSignatures?.length) {
        return {
          type: 'suggestion',
          priority: 'medium',
          message: "🦠 Deploy persistent access. Use 'malware' to install backdoors.",
          context: "Advanced Persistent Threats maintain long-term access for ongoing operations."
        };
      }
      
      // Expert guidance (7+ tools)
      if (completedTools >= 7 && !gameState.cryptoKeys?.length) {
        return {
          type: 'next_step',
          priority: 'high',
          message: "🔐 High-value data is encrypted. Master 'crypto' to break their defenses.",
          context: "Cryptographic skills separate elite hackers from common criminals."
        };
      }
      
      if (gameState.decryptedFiles?.length > 0 && !gameState.forensicEvidence?.length) {
        return {
          type: 'suggestion',
          priority: 'high',
          message: "🕵️ Cover your tracks! Use 'forensic' to eliminate evidence.",
          context: "The best infiltrations leave no trace. Clean up your digital footprints."
        };
      }
      
      // Completion guidance
      if (completedTools >= 9) {
        return {
          type: 'achievement',
          priority: 'high',
          message: "👑 Nearly complete! You're approaching elite hacker status.",
          context: "Master all tools to achieve legendary status in the underground."
        };
      }
      
      // Default guidance
      return {
        type: 'general',
        priority: 'low',
        message: "🎯 Check 'progress' to see available objectives and unlock paths.",
        context: "Strategic planning is key to successful infiltration campaigns."
      };
    },
    
    getSmartSuggestions: (gameState) => {
      const suggestions = [];
      
      // Tool progression suggestions
      Object.entries(gameState.toolAccess || {}).forEach(([tool, unlocked]) => {
        if (!unlocked) {
          const requirement = getToolUnlockRequirement(tool);
          suggestions.push({
            tool,
            requirement,
            priority: 'unlock',
            difficulty: getToolInfo(tool).difficulty
          });
        }
      });
      
      // Immediate action suggestions
      if (gameState.scannedDevices?.length > 0 && gameState.crackedPasswords?.length > 0) {
        suggestions.push({
          action: 'ssh',
          description: 'Use stolen credentials to infiltrate discovered systems',
          priority: 'immediate',
          risk: 'medium'
        });
      }
      
      if (gameState.socialIntel?.length > 0) {
        suggestions.push({
          action: 'phish',
          description: 'Launch targeted phishing campaign using gathered intelligence',
          priority: 'immediate',
          risk: 'low'
        });
      }
      
      return suggestions.slice(0, 3); // Return top 3 suggestions
    },
    
    getEducationalTip: () => {
      const tips = [
        {
          topic: "Social Engineering",
          tip: "Real hackers study their targets' social media, company websites, and public information before crafting convincing pretexts.",
          technique: "OSINT (Open Source Intelligence) gathering is often the first step in any sophisticated attack."
        },
        {
          topic: "Network Reconnaissance", 
          tip: "Professional penetration testers use slow, distributed scanning to avoid triggering intrusion detection systems.",
          technique: "Decoy scanning and timing randomization help evade automated security monitoring."
        },
        {
          topic: "Privilege Escalation",
          tip: "Once inside a system, attackers look for misconfigurations, unpatched software, and weak service accounts.",
          technique: "Living off the land techniques use legitimate system tools to avoid detection by antivirus software."
        },
        {
          topic: "Persistence Mechanisms",
          tip: "Advanced threats establish multiple persistence methods to survive system reboots and security updates.",
          technique: "Registry modifications, scheduled tasks, and service installations provide reliable backdoor access."
        },
        {
          topic: "Data Exfiltration",
          tip: "Sophisticated attackers encrypt and compress stolen data, then exfiltrate it through legitimate channels.",
          technique: "DNS tunneling, HTTPS channels, and cloud storage abuse help bypass data loss prevention systems."
        },
        {
          topic: "Anti-Forensics",
          tip: "Elite hackers use timestomping, log deletion, and memory-only malware to evade forensic analysis.",
          technique: "Volatile malware that exists only in RAM disappears when systems are rebooted or powered off."
        }
      ];
      
      return tips[Math.floor(Math.random() * tips.length)];
    }
  };

  // Enhanced guidance commands
  const showMentorDialog = () => {
    const responses = guidanceSystem.mentor.responses.greeting;
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    addOutput('\n' + '═'.repeat(70), 'system');
    addOutput('👤 AI MENTOR - "GHOST" GUIDANCE SYSTEM', 'system');
    addOutput('═'.repeat(70), 'system');
    addOutput(`\n${response}`, 'system');
    
    const hint = guidanceSystem.getContextualHint(gameState);
    addOutput(`\n💡 TACTICAL ASSESSMENT:`, 'system');
    addOutput(`${hint.message}`, hint.priority === 'critical' ? 'error' : hint.priority === 'high' ? 'warning' : 'system');
    addOutput(`📚 CONTEXT: ${hint.context}`, 'system');
    
    const suggestions = guidanceSystem.getSmartSuggestions(gameState);
    if (suggestions.length > 0) {
      addOutput('\n🎯 SMART SUGGESTIONS:', 'system');
      suggestions.forEach((suggestion, index) => {
        if (suggestion.tool) {
          addOutput(`${index + 1}. Unlock ${suggestion.tool.toUpperCase()} - ${suggestion.requirement}`, 'system');
        } else {
          addOutput(`${index + 1}. ${suggestion.action.toUpperCase()} - ${suggestion.description}`, 'system');
        }
      });
    }
    
    addOutput('\n💀 GHOST COMMANDS:', 'system');
    addOutput('  hint       - Get contextual guidance for current situation', 'system');
    addOutput('  next       - Show immediate next objectives', 'system');
    addOutput('  learn      - Educational tips about real hacking techniques', 'system');
    addOutput('  objective  - Current mission objectives and progress', 'system');
    addOutput('  analyze    - Detailed situation analysis and recommendations', 'system');
    addOutput('═'.repeat(70) + '\n', 'system');
  };

  const showContextualHint = () => {
    const hint = guidanceSystem.getContextualHint(gameState);
    const detectionLevel = Math.max(
      gameState.detectionLevel || 0,
      gameState.sshDetectionLevel || 0,
      gameState.sessionRisk || 0
    );
    
    addOutput('\n💡 CONTEXTUAL GUIDANCE:', 'system');
    
    // Priority-based formatting
    const priorityIcon = hint.priority === 'critical' ? '🚨' : 
                        hint.priority === 'high' ? '⚡' :
                        hint.priority === 'medium' ? '🎯' : 'ℹ️';
    
    addOutput(`${priorityIcon} ${hint.message}`, hint.priority === 'critical' ? 'error' : 'system');
    addOutput(`📖 ${hint.context}`, 'system');
    
    // Adaptive feedback based on detection level
    if (detectionLevel < 25) {
      const encouragement = guidanceSystem.mentor.responses.encouragement;
      addOutput(`\n${encouragement[Math.floor(Math.random() * encouragement.length)]}`, 'system');
    } else if (detectionLevel > 70) {
      const warning = guidanceSystem.mentor.responses.warning;
      addOutput(`\n${warning[Math.floor(Math.random() * warning.length)]}`, 'error');
    }
    
    addOutput('');
  };

  const showNextObjectives = () => {
    const completedTools = gameState.completedMinigames?.length || 0;
    const unlockedTools = Object.entries(gameState.toolAccess || {})
      .filter(([_, unlocked]) => unlocked).length;
    
    addOutput('\n🎯 IMMEDIATE OBJECTIVES:', 'system');
    addOutput('═'.repeat(40), 'system');
    
    // Dynamic objectives based on progress
    if (completedTools === 0) {
      addOutput('1. 🕵️ Network Reconnaissance - Type "scan"', 'system');
      addOutput('   Priority: CRITICAL - Foundation for all attacks', 'system');
    } else if (completedTools < 3) {
      addOutput('1. 🎭 Human Intelligence - Type "social"', 'system');
      addOutput('   Priority: HIGH - Exploit the human factor', 'system');
      addOutput('2. 🔓 Credential Attack - Type "crack"', 'system');
      addOutput('   Priority: HIGH - Break authentication systems', 'system');
    } else if (completedTools < 6) {
      addOutput('1. 💻 System Infiltration - Type "ssh <ip>"', 'system');
      addOutput('   Priority: CRITICAL - Gain system access', 'system');
      addOutput('2. 🦠 Persistent Access - Type "malware"', 'system');
      addOutput('   Priority: HIGH - Install backdoors', 'system');
    } else if (completedTools < 9) {
      addOutput('1. 🔐 Cryptographic Attack - Type "crypto"', 'system');
      addOutput('   Priority: HIGH - Break encryption defenses', 'system');
      addOutput('2. 💎 Data Recovery - Type "decrypt"', 'system');
      addOutput('   Priority: CRITICAL - Access valuable files', 'system');
    } else {
      addOutput('1. 🕵️ Cover Operations - Type "forensic"', 'system');
      addOutput('   Priority: CRITICAL - Eliminate evidence', 'system');
      addOutput('2. 👑 Elite Status - Complete all tools', 'system');
      addOutput('   Priority: LEGENDARY - Master hacker achievement', 'system');
    }
    
    addOutput(`\n📊 PROGRESS: ${completedTools}/10 tools mastered`, 'system');
    addOutput(`🔓 UNLOCKED: ${unlockedTools}/10 tools available`, 'system');
    addOutput('═'.repeat(40) + '\n', 'system');
  };

  const showEducationalContent = () => {
    const tip = guidanceSystem.getEducationalTip();
    
    addOutput('\n📚 HACKER EDUCATION SERIES:', 'system');
    addOutput('═'.repeat(50), 'system');
    addOutput(`\n🎓 TOPIC: ${tip.topic}`, 'system');
    addOutput(`💡 TIP: ${tip.tip}`, 'system');
    addOutput(`⚡ TECHNIQUE: ${tip.technique}`, 'system');
    
    addOutput('\n🔍 REAL-WORLD APPLICATION:', 'system');
    addOutput('These techniques are used by actual penetration testers', 'system');
    addOutput('and ethical hackers to identify security vulnerabilities.', 'system');
    addOutput('Understanding these methods helps defend against them.', 'system');
    
    addOutput('\n⚠️ ETHICAL NOTICE:', 'system');
    addOutput('Use this knowledge responsibly and only on systems', 'system');
    addOutput('you own or have explicit permission to test.', 'system');
    addOutput('═'.repeat(50) + '\n', 'system');
  };

  const showSituationAnalysis = () => {
    const completedTools = gameState.completedMinigames?.length || 0;
    const detectionLevel = Math.max(
      gameState.detectionLevel || 0,
      gameState.sshDetectionLevel || 0,
      gameState.sessionRisk || 0
    );
    const sessionTime = Math.floor((Date.now() - new Date(gameState.sessionStats.startTime).getTime()) / 60000);
    
    addOutput('\n🧠 TACTICAL SITUATION ANALYSIS:', 'system');
    addOutput('═'.repeat(60), 'system');
    
    // Mission progress analysis
    addOutput('\n📊 MISSION STATUS:', 'system');
    const progressPercent = Math.round((completedTools / 10) * 100);
    const progressBar = '█'.repeat(Math.floor(progressPercent / 10)) + '░'.repeat(10 - Math.floor(progressPercent / 10));
    addOutput(`Progress: [${progressBar}] ${progressPercent}%`, 'system');
    
    // Skill level assessment
    const skillLevel = completedTools < 3 ? 'Novice Script Kiddie' :
                      completedTools < 6 ? 'Intermediate Hacker' :
                      completedTools < 9 ? 'Advanced Penetrator' :
                      'Elite Shadow Operative';
    addOutput(`Skill Level: ${skillLevel}`, 'system');
    
    // Risk assessment
    addOutput('\n⚠️ RISK ASSESSMENT:', 'system');
    if (detectionLevel < 25) {
      addOutput('🟢 STEALTH: Excellent operational security', 'system');
      addOutput('📈 Recommendation: Maintain current pace', 'system');
    } else if (detectionLevel < 50) {
      addOutput('🟡 CAUTION: Moderate security awareness', 'warning');
      addOutput('📈 Recommendation: Slow down and vary techniques', 'warning');
    } else if (detectionLevel < 75) {
      addOutput('🟠 WARNING: High detection probability', 'warning');
      addOutput('📈 Recommendation: Focus on stealth tools', 'warning');
    } else {
      addOutput('🔴 CRITICAL: Mission failure imminent', 'error');
      addOutput('📈 Recommendation: Immediate evasion required', 'error');
    }
    
    // Time pressure analysis
    const timeRemaining = Math.max(0, Math.floor((gameState.failureConditions.timeLimit - (Date.now() - new Date(gameState.sessionStats.startTime).getTime())) / 60000));
    addOutput('\n⏰ TIME ANALYSIS:', 'system');
    addOutput(`Session Duration: ${sessionTime} minutes`, 'system');
    addOutput(`Time Remaining: ${timeRemaining} minutes`, timeRemaining < 10 ? 'error' : timeRemaining < 20 ? 'warning' : 'system');
    
    // Strategic recommendations
    addOutput('\n🎯 STRATEGIC RECOMMENDATIONS:', 'system');
    const suggestions = guidanceSystem.getSmartSuggestions(gameState);
    suggestions.forEach((suggestion, index) => {
      if (suggestion.tool) {
        addOutput(`${index + 1}. Focus on unlocking ${suggestion.tool.toUpperCase()}`, 'system');
      } else {
        addOutput(`${index + 1}. Execute ${suggestion.action.toUpperCase()} operation`, 'system');
      }
    });
    
    addOutput('═'.repeat(60) + '\n', 'system');
  };

  // Enhanced periodic threat escalation system (rebalanced)
  useEffect(() => {
    const threatEscalationInterval = setInterval(() => {
      setGameState(prev => {
        // Only escalate if game is active and player has made some progress
        if (!activeGame && prev.completedMinigames.length > 1) {
          const totalDetection = Math.max(
            prev.detectionLevel || 0,
            prev.sshDetectionLevel || 0,
            prev.sessionRisk || 0
          );
          
          // Much lower base escalation chance
          let escalationChance = 0.05; // Increased from 0.001 to 5% base chance
          
          if (totalDetection > 70) escalationChance += 0.15; // Higher if very detected
          if (prev.compromisedDevices.length > 2) escalationChance += 0.1; // Higher if multiple systems
          if (prev.crackedPasswords.length > 2) escalationChance += 0.1; // Higher if multiple passwords
          if (prev.completedMinigames.length >= 6) escalationChance += 0.2; // Higher if very active 
          
          // Check for recent alerts to avoid spam
          const recentAlerts = prev.securityAlerts.alerts.filter(alert => {
            const alertTime = new Date(alert.timestamp).getTime();
            const timeDiff = Date.now() - alertTime;
            return timeDiff < 120000; // Within last 2 minutes
          });
          
          // Don't escalate if there were recent alerts
          if (recentAlerts.length > 0) {
            escalationChance = 0;
          }
          
          if (Math.random() < escalationChance) {
            const threats = [
              { message: 'Automated security scan detected anomalous activity', level: 1 },
              { message: 'Network traffic analysis flagged suspicious patterns', level: 1 },
              { message: 'Failed authentication attempts exceed baseline threshold', level: 1 },
              { message: 'Behavioral analysis detected non-human activity patterns', level: 2 },
              { message: 'Security operations center escalated monitoring status', level: 2 },
              { message: 'Intrusion detection system triggered high-priority alert', level: 2 }
            ];
            
            // Select threat based on current alert level
            const maxLevel = Math.min(2, prev.securityAlerts.level + 1); // Reduced max level
            const validThreats = threats.filter(t => t.level <= maxLevel);
            const selectedThreat = validThreats[Math.floor(Math.random() * validThreats.length)];
            
            // Use setTimeout to avoid state update during render
            setTimeout(() => {
              escalateSecurityAlert(selectedThreat.message, selectedThreat.level);
              addOutput(`🔍 AUTOMATED SECURITY: ${selectedThreat.message}`, 'warning');
            }, 100);
          }
        }
        
        return prev;
      });
    }, 120000); // Increased from 30 seconds to 90 seconds (1.5 minutes)
    
    return () => clearInterval(threatEscalationInterval);
  }, [activeGame, escalateSecurityAlert, addOutput]);

  // Memoize the overlay so it doesn't re-render when output state changes
  const minigameOverlay = useMemo(() => {
    if (!activeGame) return null;
    return (
      <div className="minigame-overlay">
        <div className="minigame-container">
          <div className="minigame-header">
            <h3>{activeGame.name}</h3>
            <button
              className="close-minigame"
              onClick={() => setActiveGame(null)}
              aria-label="Close minigame"
            >
              ✕
            </button>
          </div>
          <div className="minigame-content">
            {activeGame.component && React.createElement(activeGame.component, activeGame.props || {})}
          </div>
        </div>
      </div>
    );
  }, [activeGame]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="terminal-container">
      <div className="terminal-wrapper">
        <div className="terminal-header">
          <div className="terminal-title">
            <span className="terminal-icon">⚡</span>
            <span className="terminal-name">SHADOWNET TERMINAL v2.1.3</span>
            <span className="connection-status">● SECURE CONNECTION</span>
          </div>
          <div className="terminal-stats">
            <span>Commands: {sessionStats.commandsExecuted}</span>
            <span>Session: {Math.floor((Date.now() - sessionStats.startTime) / 60000)}m</span>
          </div>
        </div>

        <div className="terminal-body">
          <div 
            className="terminal-output" 
            ref={outputRef}
          >
            {output.map((line, index) => (
              <div key={index} className={`output-line ${line.type || 'default'}`}>
                {line.text}
              </div>
            ))}
          </div>

          <div className="terminal-input-line">
            <span className="terminal-prompt">
              <span className="user">shadownet</span>
              <span className="separator">@</span>
              <span className="host">penetest</span>
              <span className="path">:~$</span>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              className="terminal-input"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {minigameOverlay}
    </div>
  );
};

export default Terminal;
