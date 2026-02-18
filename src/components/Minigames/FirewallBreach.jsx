import React, { useState, useEffect } from 'react';

const FirewallBreach = ({ gameState, onFirewallComplete, addOutput, targetIp }) => {
  const [firewallCode, setFirewallCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState('');
  const [pattern, setPattern] = useState('');
  const [bypassMethod, setBypassMethod] = useState('pattern-injection');
  const [isBreaching, setIsBreaching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [discoveredRules, setDiscoveredRules] = useState([]);
  const [useIntelligence, setUseIntelligence] = useState(false);
  
  const targetDevice = gameState.scannedDevices?.find(d => d.ip === targetIp);
  
  // Enhanced firewall types based on device intelligence
  const getFirewallInfo = () => {
    if (!targetDevice) return null;
    
    const firewallTypes = {
      'Router': { type: 'Cisco ASA 5500', difficulty: 2, ports: [443, 8080] },
      'Server': { type: 'pfSense', difficulty: 3, ports: [22, 80, 443] },
      'Security Camera': { type: 'Basic Packet Filter', difficulty: 1, ports: [80, 554] },
      'Workstation': { type: 'Windows Firewall', difficulty: 1, ports: [135, 445] },
      'IoT Device': { type: 'Minimal Protection', difficulty: 1, ports: [80, 443] },
      'Printer': { type: 'None', difficulty: 0, ports: [] }
    };
    
    return firewallTypes[targetDevice.type] || firewallTypes['Router'];
  };

  const firewallInfo = getFirewallInfo();

  // Get available bypass methods based on gathered intelligence
  const getAvailableBypassMethods = () => {
    const methods = [
      { 
        id: 'pattern-injection', 
        name: 'Pattern Injection',
        success: 60,
        description: 'Inject bypass patterns into firewall rules'
      },
      { 
        id: 'port-hopping', 
        name: 'Port Hopping',
        success: 40,
        description: 'Exploit open ports to bypass restrictions'
      }
    ];

    // Add methods based on intelligence
    if (gameState.compromisedDevices?.length > 0) {
      methods.push({
        id: 'lateral-movement',
        name: 'Lateral Movement',
        success: 80,
        description: 'Use compromised devices to bypass firewall'
      });
    }

    if (gameState.crackedPasswords?.length > 0) {
      methods.push({
        id: 'credential-bypass',
        name: 'Credential Bypass',
        success: 75,
        description: 'Use stolen credentials to disable firewall'
      });
    }

    if (gameState.malwareSignatures?.length > 0) {
      methods.push({
        id: 'exploit-injection',
        name: 'Exploit Injection',
        success: 85,
        description: 'Use known exploits to breach firewall'
      });
    }

    return methods;
  };

  const bypassMethods = getAvailableBypassMethods();
  const selectedMethod = bypassMethods.find(m => m.id === bypassMethod);

  useEffect(() => {
    if (targetDevice && targetDevice.vulnerabilities) {
      const rules = [];
      if (targetDevice.vulnerabilities.some(v => v.toLowerCase().includes('firewall'))) {
        rules.push('🔓 Firewall has known vulnerabilities');
      }
      if (targetDevice.vulnerabilities.some(v => v.toLowerCase().includes('default'))) {
        rules.push('🔑 Default firewall configuration detected');
      }
      if (targetDevice.openPorts?.length > 5) {
        rules.push('🚪 Multiple open ports detected');
      }
      setDiscoveredRules(rules);
    }
  }, [targetDevice]);
  
  const handleBreach = () => {
    if (!targetDevice) {
      setStatus('Device not found. Run scan first.');
      return;
    }

    if (!firewallInfo || firewallInfo.difficulty === 0) {
      setStatus('SUCCESS: No firewall detected!');
      const result = {
        ip: targetIp,
        method: 'No Firewall',
        bypassData: { type: 'none', access: 'full' },
        timestamp: new Date().toISOString()
      };
      setTimeout(() => onFirewallComplete(result), 1000);
      return;
    }
    
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (newAttempts > 3) {
      setStatus('FIREWALL LOCKED: Too many failed attempts');
      addOutput(`Firewall breach failed on ${targetIp} - locked out`);
      return;
    }

    setIsBreaching(true);
    setProgress(0);
    
    // Simulate breach attempt with progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsBreaching(false);
          
          // Calculate success chance based on method and intelligence
          let successChance = selectedMethod.success;
          
          if (useIntelligence && gameState.compromisedDevices?.length > 0) {
            successChance += 20;
          }
          if (targetDevice.vulnerabilities?.some(v => v.toLowerCase().includes('firewall'))) {
            successChance += 15;
          }
          
          successChance = Math.min(successChance, 95);
          
          if (Math.random() * 100 < successChance || firewallCode === pattern) {
            setStatus('FIREWALL BREACHED! Network access gained');
            addOutput(`Firewall breached on ${targetIp} using ${selectedMethod.name}`);
            
            // Generate valuable bypass data for other minigames
            const result = {
              ip: targetIp,
              method: selectedMethod.name,
              firewallType: firewallInfo.type,
              bypassData: {
                openPorts: targetDevice.openPorts,
                accessLevel: 'admin',
                bypassRules: discoveredRules,
                networkSegment: targetIp.split('.').slice(0, 3).join('.') + '.0/24'
              },
              timestamp: new Date().toISOString(),
              intelligence: {
                compromisedDevices: gameState.compromisedDevices?.length || 0,
                availablePorts: targetDevice.openPorts?.length || 0,
                vulnerabilities: targetDevice.vulnerabilities?.length || 0
              }
            };
            
            setTimeout(() => onFirewallComplete(result), 1500);
          } else {
            const newPattern = Array(6).fill().map(() => Math.floor(Math.random() * 10)).join('');
            setPattern(newPattern);
            setStatus(`Breach failed! Try pattern: ${newPattern} (or use different method)`);
          }
        }
        return newProgress;
      });
    }, 200);
  };

  return (
    <div className="minigame firewall-breach-enhanced">
      <h3>🛡️ FIREWALL BREACH SYSTEM</h3>
      
      {targetDevice ? (
        <>
          <div className="target-firewall-info">
            <h4>🎯 Target Analysis: {targetIp}</h4>
            <div className="firewall-details">
              <div className="info-row">
                <span>Device Type:</span>
                <span>{targetDevice.type}</span>
              </div>
              <div className="info-row">
                <span>Firewall:</span>
                <span>{firewallInfo?.type || 'Unknown'}</span>
              </div>
              <div className="info-row">
                <span>Difficulty:</span>
                <span>{Array(firewallInfo?.difficulty || 0).fill('⭐').join('') || 'None'}</span>
              </div>
              <div className="info-row">
                <span>Protected Ports:</span>
                <span>{firewallInfo?.ports?.join(', ') || 'None'}</span>
              </div>
            </div>
          </div>

          {discoveredRules.length > 0 && (
            <div className="discovered-vulnerabilities">
              <h4>🔍 Firewall Intelligence</h4>
              {discoveredRules.map((rule, index) => (
                <div key={index} className="vuln-rule">{rule}</div>
              ))}
            </div>
          )}

          <div className="bypass-methods">
            <h4>⚔️ Bypass Methods</h4>
            <div className="method-selection">
              {bypassMethods.map(method => (
                <div 
                  key={method.id}
                  className={`method-card ${bypassMethod === method.id ? 'selected' : ''}`}
                  onClick={() => setBypassMethod(method.id)}
                >
                  <div className="method-name">{method.name}</div>
                  <div className="method-success">Success: {method.success}%</div>
                  <div className="method-description">{method.description}</div>
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
                Use compromised devices for enhanced bypass (+20% success)
              </label>
            </div>
          )}

          {bypassMethod === 'pattern-injection' && (
            <div className="pattern-input">
              <h4>🔢 Pattern Injection</h4>
              <p>Enter bypass pattern (or attempt breach to reveal pattern):</p>
              <input
                type="text"
                value={firewallCode}
                onChange={(e) => setFirewallCode(e.target.value)}
                placeholder="Enter 6-digit pattern"
                maxLength="6"
              />
            </div>
          )}

          {isBreaching && (
            <div className="breach-progress">
              <h4>🚀 Breaching Firewall...</h4>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">{progress}%</div>
            </div>
          )}
          
          <button 
            onClick={handleBreach}
            disabled={isBreaching}
            className="breach-btn"
          >
            {isBreaching ? 'BREACHING...' : `🔥 EXECUTE ${selectedMethod?.name.toUpperCase()}`}
          </button>
          
          {status && (
            <div className={`breach-status ${status.includes('BREACHED') || status.includes('SUCCESS') ? 'success' : 'error'}`}>
              {status}
            </div>
          )}

          <div className="breach-intel">
            <h4>📊 Available Intelligence</h4>
            <div className="intel-stats">
              <div className="stat">Compromised Devices: {gameState.compromisedDevices?.length || 0}</div>
              <div className="stat">Known Vulnerabilities: {targetDevice.vulnerabilities?.length || 0}</div>
              <div className="stat">Open Ports: {targetDevice.openPorts?.length || 0}</div>
              <div className="stat">Previous Breaches: {gameState.firewallBreaches?.length || 0}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="no-target">
          <h4>❌ No Target Selected</h4>
          <p>Usage: firewall &lt;ip-address&gt;</p>
          <p>Run 'devices' to see available targets</p>
        </div>
      )}
    </div>
  );
};

export default FirewallBreach;
