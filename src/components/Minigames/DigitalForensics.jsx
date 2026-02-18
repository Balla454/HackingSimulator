import React, { useState, useEffect } from 'react';

const DigitalForensics = ({ onForensicComplete, addOutput, artifact, gameState }) => {
  // Enhanced forensic artifacts with realistic data
  const forensicArtifacts = [
    { 
      id: 'memory', 
      name: 'Memory Dump', 
      clue: 'encryption_key',
      description: 'RAM snapshot from compromised server',
      size: '8.2 GB',
      evidence: {
        keys: ['MASTER-KEY-2024', 'SESSION-781A5B'],
        passwords: ['backup_admin', 'forensic123'],
        processData: ['suspicious.exe', 'keylogger.dll']
      }
    },
    { 
      id: 'disk', 
      name: 'Disk Image', 
      clue: 'hidden_file',
      description: 'Full disk image from workstation',
      size: '500 GB',
      evidence: {
        hiddenFiles: ['/var/secrets/access.txt', 'C:\\Users\\admin\\hidden\\passwords.txt'],
        deletedFiles: ['financial_records.xlsx', 'employee_list.csv'],
        artifacts: ['browser_cache', 'registry_changes']
      }
    },
    { 
      id: 'logs', 
      name: 'System Logs', 
      clue: 'access_times',
      description: 'Aggregated system and security logs',
      size: '245 MB',
      evidence: {
        suspiciousLogins: ['02:47 AM - Failed SSH attempts', '03:15 AM - Admin login from unusual IP'],
        networkActivity: ['Data exfiltration to 192.168.100.50', 'Malware C&C communication'],
        systemEvents: ['Service installation', 'Registry modification']
      }
    },
    {
      id: 'network',
      name: 'Network Capture',
      clue: 'traffic_analysis',
      description: 'Packet capture from network intrusion',
      size: '1.8 GB',
      evidence: {
        credentials: ['ftp://admin:password123@server.local', 'smtp:user@domain.com:secret'],
        malwareComms: ['C&C server: 185.234.72.45', 'Exfiltration target: dropbox.evil.com'],
        protocols: ['Unencrypted FTP', 'Clear-text HTTP']
      }
    }
  ];
  
  const [tool, setTool] = useState('auto-detect');
  const [foundClues, setFoundClues] = useState([]);
  const [status, setStatus] = useState('');
  const [analysisPhase, setAnalysisPhase] = useState('idle'); // idle, scanning, extracting, analyzing, complete
  const [progress, setProgress] = useState(0);
  const [evidenceRevealed, setEvidenceRevealed] = useState([]);
  const [useIntelligence, setUseIntelligence] = useState(false);
  const [hints, setHints] = useState([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState(artifact || 'memory'); // Add state for artifact selection

  const selectedArtifact = forensicArtifacts.find(a => a.id === selectedArtifactId) || forensicArtifacts[0];

  // Reset analysis state when switching artifacts
  const resetAnalysisState = () => {
    setAnalysisPhase('idle');
    setProgress(0);
    setFoundClues([]);
    setEvidenceRevealed([]);
    setStatus('');
  };

  // Handle artifact selection with state reset
  const handleArtifactSelect = (artifactId) => {
    if (artifactId !== selectedArtifactId) {
      setSelectedArtifactId(artifactId);
      resetAnalysisState();
    }
  };

  // Generate hints based on intelligence and context
  useEffect(() => {
    const generatedHints = [];
    
    if (gameState.compromisedDevices?.length > 0) {
      generatedHints.push('💡 Compromised devices may have left forensic traces');
    }
    
    if (gameState.malwareSignatures?.length > 0) {
      generatedHints.push('💡 Malware signatures can help identify attack patterns');
    }
    
    if (gameState.networkAccess?.authenticatedDevices?.length > 0) {
      generatedHints.push('💡 Network access logs may reveal additional evidence');
    }

    // Add artifact-specific hints
    if (selectedArtifact.id === 'memory') {
      generatedHints.push('🧠 Memory dumps often contain encryption keys and passwords');
    } else if (selectedArtifact.id === 'disk') {
      generatedHints.push('💾 Look for hidden and deleted files in unallocated space');
    } else if (selectedArtifact.id === 'logs') {
      generatedHints.push('📝 Timeline analysis can reveal attack sequences');
    } else if (selectedArtifact.id === 'network') {
      generatedHints.push('🌐 Network captures contain credentials and malware communications');
    }

    setHints(generatedHints);
  }, [selectedArtifact, gameState]);

  // Analysis tools with specific capabilities
  const analysisTools = {
    'auto-detect': { name: 'Auto-Detection', success: 90, speed: 1.0 },
    'strings': { name: 'Strings Search', success: 70, speed: 1.5 },
    'hex': { name: 'Hex Analysis', success: 60, speed: 1.2 },
    'timeline': { name: 'Timeline Analysis', success: 80, speed: 0.8 },
    'metadata': { name: 'Metadata Extractor', success: 75, speed: 1.1 },
    'carving': { name: 'File Carving', success: 85, speed: 0.6 },
    'volatility': { name: 'Memory Analysis', success: 95, speed: 0.7 }
  };

  const analyzeArtifact = () => {
    setAnalysisPhase('scanning');
    setProgress(0);
    setFoundClues([]);
    setEvidenceRevealed([]);
    setStatus('Initializing forensic analysis...');
    
    // Phase 1: Scanning
    const scanInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 8 + 2;
        
        if (newProgress >= 30) {
          clearInterval(scanInterval);
          setStatus('Scanning complete. Extracting evidence...');
          setAnalysisPhase('extracting');
          startExtraction();
        }
        
        return Math.min(newProgress, 30);
      });
    }, 300);
  };

  const startExtraction = () => {
    let evidenceIndex = 0;
    const evidenceKeys = Object.keys(selectedArtifact.evidence);
    
    const extractInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 6 + 3;
        
        // Reveal evidence progressively
        if (evidenceIndex < evidenceKeys.length && newProgress > 30 + (evidenceIndex * 20)) {
          const evidenceType = evidenceKeys[evidenceIndex];
          const evidence = selectedArtifact.evidence[evidenceType];
          
          setEvidenceRevealed(prev => [...prev, { type: evidenceType, data: evidence }]);
          addOutput(`Evidence found: ${evidenceType} - ${Array.isArray(evidence) ? evidence.length + ' items' : evidence}`);
          evidenceIndex++;
        }
        
        if (newProgress >= 80) {
          clearInterval(extractInterval);
          setStatus('Evidence extraction complete. Analyzing findings...');
          setAnalysisPhase('analyzing');
          startAnalysis();
        }
        
        return Math.min(newProgress, 80);
      });
    }, 400);
  };

  const startAnalysis = () => {
    const analysisInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 5 + 2;
        
        if (newProgress >= 100) {
          clearInterval(analysisInterval);
          setAnalysisPhase('complete');
          
          // Generate comprehensive forensic report
          const forensicFindings = generateForensicFindings();
          setFoundClues(forensicFindings);
          setStatus('🎯 FORENSIC ANALYSIS COMPLETE! Evidence acquired');
          addOutput(`Digital forensics successful: ${selectedArtifact.name}`);
          addOutput(`Evidence pieces found: ${forensicFindings.length}`);
          
          setTimeout(() => {
            onForensicComplete({
              artifact: selectedArtifact.name,
              findings: forensicFindings,
              evidence: evidenceRevealed,
              tool: analysisTools[tool].name,
              timestamp: new Date().toISOString(),
              intelligence: {
                compromisedDevices: gameState.compromisedDevices?.length || 0,
                malwareSignatures: gameState.malwareSignatures?.length || 0,
                networkAccess: gameState.networkAccess?.authenticatedDevices?.length || 0
              }
            });
          }, 2000);
        }
        
        return Math.min(newProgress, 100);
      });
    }, 250);
  };

  const generateForensicFindings = () => {
    const findings = [];
    
    // Generate specific clues based on artifact type
    if (selectedArtifact.id === 'memory') {
      findings.push(`Encryption key recovered: ${selectedArtifact.evidence.keys[0]}`);
      findings.push(`Session token found: ${selectedArtifact.evidence.keys[1]}`);
      findings.push(`Cached password: ${selectedArtifact.evidence.passwords[0]}`);
    } else if (selectedArtifact.id === 'disk') {
      findings.push(`Hidden file location: ${selectedArtifact.evidence.hiddenFiles[0]}`);
      findings.push(`Deleted file recovered: ${selectedArtifact.evidence.deletedFiles[0]}`);
      findings.push('Registry modification timestamps');
    } else if (selectedArtifact.id === 'logs') {
      findings.push('Unauthorized access detected at 02:47 AM');
      findings.push('Administrative privilege escalation logged');
      findings.push('Data exfiltration attempt identified');
    } else if (selectedArtifact.id === 'network') {
      findings.push(`Credentials intercepted: ${selectedArtifact.evidence.credentials[0]}`);
      findings.push(`Malware C&C server: ${selectedArtifact.evidence.malwareComms[0]}`);
      findings.push('Unencrypted protocol usage detected');
    }
    
    // Add intelligence-based findings
    if (gameState.malwareSignatures?.length > 0) {
      findings.push('Malware signature correlation confirmed');
    }
    
    if (gameState.compromisedDevices?.length > 0) {
      findings.push('Device compromise timeline established');
    }
    
    return findings;
  };

  return (
    <div className="minigame digital-forensics-enhanced">
      <h3>🔍 ADVANCED DIGITAL FORENSICS</h3>
      
      <div className="artifact-selection">
        <h4>📁 Evidence Selection</h4>
        <div className="current-selection">
          <span className="current-label">Currently Analyzing:</span>
          <span className="current-artifact">{selectedArtifact.name}</span>
          <span className="switch-hint">Click any artifact below to switch</span>
        </div>
        <div className="artifact-grid">
          {forensicArtifacts.map(art => (
            <div 
              key={art.id}
              className={`artifact-card ${selectedArtifactId === art.id ? 'selected' : ''}`}
              onClick={() => handleArtifactSelect(art.id)}
            >
              <div className="artifact-header">
                <span className="artifact-name">{art.name}</span>
                <span className="artifact-size">{art.size}</span>
              </div>
              <div className="artifact-description">{art.description}</div>
              <div className="evidence-preview">
                Evidence Types: {Object.keys(art.evidence).length}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="artifact-details">
        <h4>📊 Evidence Analysis: {selectedArtifact.name}</h4>
        <div className="details-section">
          <div className="artifact-info">
            <span>Artifact Type:</span><span>{selectedArtifact.name}</span>
            <span>File Size:</span><span>{selectedArtifact.size}</span>
            <span>Expected Evidence:</span><span>{selectedArtifact.clue.replace(/_/g, ' ')}</span>
            <span>Evidence Categories:</span><span>{Object.keys(selectedArtifact.evidence).join(', ')}</span>
          </div>
        </div>
      </div>

      {hints.length > 0 && (
        <div className="forensic-hints">
          <h4>💡 Analysis Hints</h4>
          <div className="hints-list">
            {hints.map((hint, index) => (
              <div key={index} className="hint-item">{hint}</div>
            ))}
          </div>
        </div>
      )}

      <div className="tool-selection">
        <h4>🛠️ Forensic Tools</h4>
        <div className="tools-grid">
          {Object.entries(analysisTools).map(([key, toolData]) => (
            <div 
              key={key}
              className={`tool-card ${tool === key ? 'selected' : ''}`}
              onClick={() => setTool(key)}
            >
              <div className="tool-name">{toolData.name}</div>
              <div className="tool-success">Success: {toolData.success}%</div>
              <div className="tool-speed">Speed: {(toolData.speed * 100).toFixed(0)}%</div>
              {key === 'auto-detect' && (
                <div className="recommended">✅ Recommended</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {gameState.compromisedDevices?.length > 0 && (
        <div className="intelligence-boost">
          <label>
            <input 
              type="checkbox" 
              checked={useIntelligence}
              onChange={(e) => setUseIntelligence(e.target.checked)}
            />
            Correlate with compromised device data (+10% success rate)
          </label>
        </div>
      )}

      <button 
        onClick={analyzeArtifact}
        disabled={analysisPhase !== 'idle' && analysisPhase !== 'complete'}
        className="analyze-btn"
      >
        {analysisPhase === 'idle' || analysisPhase === 'complete' ? 
          '🔬 START FORENSIC ANALYSIS' : 
          'ANALYZING...'
        }
      </button>

      {analysisPhase !== 'idle' && (
        <div className="forensic-progress">
          <h4>🔍 Analysis Progress</h4>
          <div className="progress-phases">
            <span className={`phase ${analysisPhase === 'scanning' ? 'active' : progress > 30 ? 'complete' : ''}`}>
              Scanning
            </span>
            <span className={`phase ${analysisPhase === 'extracting' ? 'active' : progress > 80 ? 'complete' : ''}`}>
              Extracting
            </span>
            <span className={`phase ${analysisPhase === 'analyzing' ? 'active' : progress >= 100 ? 'complete' : ''}`}>
              Analyzing
            </span>
          </div>
          
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-text">{progress.toFixed(1)}%</div>
        </div>
      )}

      {evidenceRevealed.length > 0 && (
        <div className="evidence-findings">
          <h4>📋 Evidence Discovered</h4>
          <div className="evidence-list">
            {evidenceRevealed.map((evidence, index) => (
              <div key={index} className="evidence-item">
                <div className="evidence-type">{evidence.type.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="evidence-data">
                  {Array.isArray(evidence.data) ? (
                    evidence.data.map((item, i) => (
                      <div key={i} className="evidence-detail">{item}</div>
                    ))
                  ) : (
                    <div className="evidence-detail">{evidence.data}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {foundClues.length > 0 && (
        <div className="forensic-results">
          <h4>🎯 Forensic Findings</h4>
          <div className="findings-list">
            {foundClues.map((clue, index) => (
              <div key={index} className="finding-item">
                <span className="finding-icon">🔍</span>
                <span className="finding-text">{clue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {status && (
        <div className={`forensic-status ${status.includes('COMPLETE') ? 'success' : 'info'}`}>
          {status}
        </div>
      )}

      <div className="intelligence-summary">
        <h4>🧠 Available Intelligence</h4>
        <div className="intel-stats">
          <div className="stat">Compromised Devices: {gameState.compromisedDevices?.length || 0}</div>
          <div className="stat">Malware Signatures: {gameState.malwareSignatures?.length || 0}</div>
          <div className="stat">Network Access: {gameState.networkAccess?.authenticatedDevices?.length || 0}</div>
        </div>
      </div>
    </div>
  );
};

export default DigitalForensics;
