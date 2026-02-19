import React, { useState, useEffect, useCallback, useMemo } from 'react';

const NetworkScanner = ({ onComplete, onScanComplete, gameState, addOutput }) => {
  // Enhanced state management with proper cleanup
  const [currentStep, setCurrentStep] = useState('setup'); // setup, analysis, scanning, results
  const [scanType, setScanType] = useState('basic');
  const [targetNetwork, setTargetNetwork] = useState(null);
  const [devices, setDevices] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('targeting');
  const [currentTarget, setCurrentTarget] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [detectionLevel, setDetectionLevel] = useState(0);
  const [scanResults, setScanResults] = useState(null);
  const [intervalId, setIntervalId] = useState(null);
  const [countdownId, setCountdownId] = useState(null);

  // Cleanup intervals on unmount or reset - FIX for timeout issues
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (countdownId) {
        clearInterval(countdownId);
      }
    };
  }, [intervalId, countdownId]);

  // Enhanced scan types with proper timing - wrapped in useMemo to fix dependency warning
  const scanTypes = useMemo(() => [
    {
      id: 'stealth',
      name: 'Stealth Scan',
      icon: '🥷',
      description: 'Low-profile scanning to avoid detection',
      speed: 'Very Slow',
      accuracy: 'Medium',
      stealth: 'Excellent',
      detectionRisk: 10,
      effectiveness: { low: 95, medium: 80, high: 60, critical: 40 },
      bestFor: ['High-security networks', 'Corporate environments', 'When stealth is priority'],
      consequences: {
        wrong: 'May miss critical vulnerabilities due to limited scan depth',
        right: 'Successfully avoids detection while gathering intelligence'
      },
      timeMultiplier: 2.5,
      complexity: 'Advanced - requires patience and precision'
    },
    {
      id: 'basic',
      name: 'Basic Ping Sweep',
      icon: '📡',
      description: 'Simple network discovery scan',
      speed: 'Fast',
      accuracy: 'Low',
      stealth: 'Poor',
      detectionRisk: 70,
      effectiveness: { low: 90, medium: 60, high: 30, critical: 10 },
      bestFor: ['Low-security networks', 'Initial reconnaissance', 'Quick overview'],
      consequences: {
        wrong: 'High chance of detection on secure networks, limited information',
        right: 'Quick results for basic network mapping'
      },
      timeMultiplier: 0.5,
      complexity: 'Beginner - fast but limited'
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Scan',
      icon: '🔍',
      description: 'Deep analysis of all network services',
      speed: 'Slow',
      accuracy: 'Excellent',
      stealth: 'Fair',
      detectionRisk: 50,
      effectiveness: { low: 85, medium: 90, high: 85, critical: 70 },
      bestFor: ['Medium-security networks', 'Detailed vulnerability assessment', 'Balanced approach'],
      consequences: {
        wrong: 'Moderate detection risk, may be overkill for simple networks',
        right: 'Thorough analysis reveals detailed vulnerability information'
      },
      timeMultiplier: 1.5,
      complexity: 'Intermediate - balanced approach'
    },
    {
      id: 'aggressive',
      name: 'Aggressive Scan',
      icon: '⚡',
      description: 'Fast, intensive scanning with service detection',
      speed: 'Very Fast',
      accuracy: 'High',
      stealth: 'Very Poor',
      detectionRisk: 90,
      effectiveness: { low: 70, medium: 75, high: 80, critical: 85 },
      bestFor: ['Critical security assessments', 'Time-sensitive operations', 'When detection is acceptable'],
      consequences: {
        wrong: 'Almost guaranteed detection, may trigger security responses',
        right: 'Rapid comprehensive results for high-security targets'
      },
      timeMultiplier: 0.8,
      complexity: 'Expert - high risk, high reward'
    },
    {
      id: 'adaptive',
      name: 'Adaptive Scan',
      icon: '🧠',
      description: 'AI-powered scanning that adjusts based on target responses',
      speed: 'Variable',
      accuracy: 'Very High',
      stealth: 'Good',
      detectionRisk: 30,
      effectiveness: { low: 85, medium: 90, high: 95, critical: 90 },
      bestFor: ['Unknown security levels', 'Advanced persistent threats', 'Maximum effectiveness'],
      consequences: {
        wrong: 'Complex setup may be unnecessary for simple targets',
        right: 'Optimal results regardless of network security configuration'
      },
      timeMultiplier: 1.2,
      complexity: 'Expert - requires advanced knowledge'
    }
  ], []);

  const networkTargets = useMemo(() => [
    {
      id: 'home-wifi',
      name: 'Home Wi-Fi Network',
      description: 'Residential network with basic security',
      icon: '🏠',
      securityLevel: 'low',
      securityDesc: 'Basic WPA2, consumer router, minimal monitoring',
      expectedDevices: '3-8 devices',
      commonVulns: ['Default passwords', 'Outdated firmware', 'Open services'],
      recommendedScan: 'basic',
      detectionCapability: 'None - No monitoring systems',
      networkComplexity: 'Simple flat network topology'
    },
    {
      id: 'small-office',
      name: 'Small Office Network',
      description: 'SMB network with moderate security measures',
      icon: '🏢',
      securityLevel: 'medium',
      securityDesc: 'Managed firewall, basic intrusion detection, regular updates',
      expectedDevices: '10-25 devices',
      commonVulns: ['Unpatched systems', 'Weak policies', 'Limited monitoring'],
      recommendedScan: 'comprehensive',
      detectionCapability: 'Moderate - Basic IDS/IPS systems',
      networkComplexity: 'Segmented network with VLANs'
    },
    {
      id: 'corporate-lan',
      name: 'Corporate Network',
      description: 'Enterprise network with advanced security',
      icon: '🏛️',
      securityLevel: 'high',
      securityDesc: 'Enterprise firewall, SIEM, threat detection, security team',
      expectedDevices: '50-200 devices',
      commonVulns: ['Zero-day exploits', 'Advanced persistent threats', 'Insider threats'],
      recommendedScan: 'stealth',
      detectionCapability: 'High - 24/7 SOC monitoring',
      networkComplexity: 'Complex multi-tier architecture with DMZ'
    },
    {
      id: 'government',
      name: 'Government Infrastructure',
      description: 'High-security government network',
      icon: '🏛️',
      securityLevel: 'critical',
      securityDesc: 'Military-grade security, AI-powered detection, rapid response',
      expectedDevices: '100-500 devices',
      commonVulns: ['Nation-state attacks', 'Supply chain compromises', 'Advanced malware'],
      recommendedScan: 'adaptive',
      detectionCapability: 'Maximum - Advanced AI detection systems',
      networkComplexity: 'Highly secure air-gapped segments'
    }
  ], []);

  // Move generateVulnerabilities before generateRealisticDevices to fix initialization order
  const generateVulnerabilities = useCallback((deviceType, count, scanTypeId) => {
    const vulnerabilityDatabase = {
      'Router': ['Default SSH credentials', 'Firmware outdated', 'WPS vulnerability', 'Weak SSH password'],
      'Database Server': ['Default SSH key', 'SQL injection possible', 'Weak authentication', 'Unencrypted connections'],
      'Web Server': ['SSH root access enabled', 'XSS vulnerability', 'Directory traversal', 'Outdated SSL/TLS'],
      'Workstation': ['Default SSH credentials', 'Missing patches', 'Weak passwords', 'Shared folders exposed'],
      'Laptop': ['Weak SSH password', 'Missing patches', 'Auto-login enabled', 'Unencrypted storage'],
      'Smart TV': ['Default SSH credentials', 'Firmware outdated', 'Telnet enabled', 'Weak authentication'],
      'Printer': ['Default SSH key', 'SNMP community string', 'Web interface exposed', 'Firmware outdated'],
      'NAS': ['Default SSH credentials', 'FTP anonymous access', 'SMB signing disabled', 'Weak authentication'],
      'Domain Controller': ['SSH root access enabled', 'Kerberos weakness', 'LDAP anonymous bind', 'Weak GPO'],
      'File Server': ['Default SSH credentials', 'SMB v1 enabled', 'Share permissions weak', 'Missing patches'],
      'Firewall': ['Default SSH password', 'Configuration weakness', 'Bypass vulnerability', 'Logging disabled'],
      'Load Balancer': ['Default SSH credentials', 'SSL/TLS misconfiguration', 'Health check bypass', 'Weak ciphers'],
      'API Gateway': ['Default SSH key', 'API key exposure', 'Rate limiting bypass', 'Authentication bypass'],
      'default': ['Default SSH credentials', 'Security misconfiguration', 'Weak authentication', 'Unpatched software']
    };

    const deviceVulns = vulnerabilityDatabase[deviceType] || vulnerabilityDatabase['default'];
    const selectedType = scanTypes.find(s => s.id === scanTypeId);
    
    // Limit vulnerabilities based on scan type effectiveness
    const maxVulns = Math.ceil((selectedType?.effectiveness || 50) / 100 * count);
    return deviceVulns.slice(0, Math.max(1, maxVulns));
  }, [scanTypes]);

  // Enhanced device generation with realistic data
  const generateRealisticDevices = useCallback(() => {
    if (!targetNetwork || !scanType) return [];

    const deviceProfiles = {
      'local-subnet': [
        { type: 'Router', os: 'OpenWrt 21.02', vulns: 1, ports: [22, 80, 443] },
        { type: 'Laptop', os: 'Windows 10', vulns: 2, ports: [22, 135, 445, 3389] },
        { type: 'Smart TV', os: 'Android TV 9', vulns: 3, ports: [22, 80, 8080] },
        { type: 'Printer', os: 'Embedded Linux', vulns: 2, ports: [22, 80, 631, 9100] },
        { type: 'Phone', os: 'iOS 15.6', vulns: 0, ports: [443] },
        { type: 'NAS', os: 'DSM 7.1', vulns: 1, ports: [22, 80, 443, 5000] }
      ],
      'corporate-lan': [
        { type: 'Domain Controller', os: 'Windows Server 2019', vulns: 2, ports: [22, 53, 88, 389, 636] },
        { type: 'File Server', os: 'Windows Server 2016', vulns: 3, ports: [22, 135, 139, 445] },
        { type: 'Database Server', os: 'Ubuntu 20.04', vulns: 4, ports: [22, 3306, 5432] },
        { type: 'Web Server', os: 'CentOS 8', vulns: 2, ports: [22, 80, 443] },
        { type: 'Workstation', os: 'Windows 10 Pro', vulns: 1, ports: [22, 135, 445] }
      ],
      'dmz-network': [
        { type: 'Firewall', os: 'pfSense 2.6', vulns: 1, ports: [22, 80, 443] },
        { type: 'Load Balancer', os: 'HAProxy', vulns: 2, ports: [22, 80, 443, 8404] },
        { type: 'Web Server', os: 'nginx/1.18', vulns: 3, ports: [22, 80, 443] },
        { type: 'API Gateway', os: 'Kong 2.8', vulns: 2, ports: [22, 8000, 8001, 8443] }
      ]
    };

    const baseDevices = deviceProfiles[targetNetwork.id] || deviceProfiles['local-subnet'];
    const deviceCount = Math.floor(Math.random() * 6) + 5;
    
    return Array.from({ length: deviceCount }, (_, i) => {
      const template = baseDevices[Math.floor(Math.random() * baseDevices.length)];
      const ipBase = targetNetwork.id === 'local-subnet' ? '192.168.1' :
                    targetNetwork.id === 'corporate-lan' ? '10.0.1' : '172.16.0';
      const ip = `${ipBase}.${10 + i}`;
      
      const vulnerabilities = generateVulnerabilities(template.type, template.vulns, scanType);
      
      // Generate services based on open ports for SSH tool compatibility
      const services = template.ports.map(port => {
        const serviceMap = {
          22: 'SSH',
          23: 'Telnet', 
          53: 'DNS',
          80: 'HTTP',
          88: 'Kerberos',
          135: 'RPC',
          139: 'NetBIOS',
          389: 'LDAP',
          443: 'HTTPS',
          445: 'SMB',
          631: 'IPP',
          636: 'LDAPS',
          3306: 'MySQL',
          3389: 'RDP',
          5000: 'UPnP',
          5432: 'PostgreSQL',
          8000: 'HTTP-Alt',
          8001: 'HTTP-Alt',
          8080: 'HTTP-Proxy',
          8404: 'HAProxy-Stats',
          8443: 'HTTPS-Alt',
          9100: 'JetDirect'
        };
        
        return {
          port: port,
          service: serviceMap[port] || 'Unknown',
          state: 'open',
          version: Math.random() > 0.5 ? `v${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 10)}` : ''
        };
      });
      
      return {
        ip,
        type: template.type,
        os: template.os,
        mac: Array.from({ length: 6 }, () => 
          Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(':').toUpperCase(),
        manufacturer: ['Cisco', 'HP', 'Dell', 'Apple', 'Microsoft'][Math.floor(Math.random() * 5)],
        openPorts: template.ports,
        services: services, // Add services array for SSH tool compatibility
        vulnerabilities,
        uptime: Math.floor(Math.random() * 365) + ' days',
        lastSeen: 'Now',
        riskLevel: vulnerabilities.length > 2 ? 'High' : vulnerabilities.length > 0 ? 'Medium' : 'Low'
      };
    });
  }, [targetNetwork, scanType, generateVulnerabilities]);

  // Fixed timeout and interval management
  const startTimeCountdown = (timeLimit) => {
    const startTime = Date.now();
    
    const countdown = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, timeLimit - elapsed);
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(countdown);
        setCountdownId(null);
        handleScanTimeout();
      }
    }, 1000);
    
    // Store interval ID properly for cleanup
    setCountdownId(countdown);
  };

  const handleScanTimeout = () => {
    if (currentStep === 'scanning') {
      setCurrentStep('results');
      setScanResults({
        success: false,
        reason: '⏱️ SCAN TIMEOUT - Operation took too long and was terminated',
        data: null
      });
      addOutput('❌ Scan failed: Time limit exceeded');
      addOutput('💡 Try using a quicker scan type or stealth mode');
      
      // Increase detection level due to timeout
      setDetectionLevel(prev => Math.min(100, prev + 30));
    }
  };

  // Add security level analysis function
  const analyzeNetworkSecurity = useCallback((network, scanType) => {
    const scanMethod = scanTypes.find(s => s.id === scanType);
    const effectiveness = scanMethod.effectiveness[network.securityLevel];
    const isOptimal = network.recommendedScan === scanType;
    
    return {
      effectiveness,
      isOptimal,
      detectionLikelihood: scanMethod.detectionRisk,
      expectedResults: effectiveness > 70 ? 'Excellent' : effectiveness > 50 ? 'Good' : effectiveness > 30 ? 'Fair' : 'Poor',
      strategicAdvice: isOptimal ? 
        `✅ Optimal choice for ${network.securityLevel} security networks` :
        `⚠️ Consider ${network.recommendedScan} scan for better results on ${network.securityLevel} security`
    };
  }, [scanTypes]);

  // Enhanced scan execution with consequences
  const startScan = () => {
    if (!targetNetwork || !scanType) return;
    
    const analysis = analyzeNetworkSecurity(targetNetwork, scanType);
    setCurrentStep('analysis');
    setScanProgress(0);
    setCurrentPhase('security_assessment');
    setCurrentTarget('Analyzing network security posture...');
    
    // Show security analysis first
    setTimeout(() => {
      setCurrentPhase('scan_execution');
      setCurrentTarget('Executing scan strategy...');
      
      const interval = setInterval(() => {
        setScanProgress(prev => {
          const increment = Math.random() * 15 + 5;
          const newProgress = Math.min(prev + increment, 100);
          
          if (newProgress >= 100) {
            clearInterval(interval);
            
            // Generate results based on scan effectiveness
            const discoveredDevices = generateRealisticDevices();
            const effectiveDevices = discoveredDevices.slice(0, 
              Math.floor(discoveredDevices.length * (analysis.effectiveness / 100))
            );
            
            setDevices(effectiveDevices);
            setCurrentStep('results');
            
            // Apply detection consequences
            if (Math.random() * 100 < analysis.detectionLikelihood) {
              setDetectionLevel(prev => prev + 20);
              addOutput(`⚠️ DETECTION WARNING: Scan signatures detected by network security systems!`);
            }
            
            if (onScanComplete) {
              onScanComplete({
                devices: effectiveDevices,
                scanType: scanType,
                effectiveness: analysis.effectiveness,
                detected: Math.random() * 100 < analysis.detectionLikelihood,
                networkSecurity: targetNetwork.securityLevel
              });
            }
          }
          
          return newProgress;
        });
      }, 500); // Reduced from 200ms for Pi 4 performance
      
      setIntervalId(interval);
    }, 2000);
  };

  const handleDetection = () => {
    setCurrentStep('results');
    setScanResults({
      success: false,
      reason: 'Scan detected by security systems',
      data: null
    });
    addOutput('🚨 Scan detected! Connection terminated.');
  };

  const completeScan = () => {
    if (countdownId) {
      clearInterval(countdownId);
      setCountdownId(null);
    }
    
    const discoveredDevices = generateRealisticDevices();
    setDevices(discoveredDevices);
    
    const results = {
      totalDevices: discoveredDevices.length,
      vulnerableDevices: discoveredDevices.filter(d => d.vulnerabilities.length > 0).length,
      criticalVulns: discoveredDevices.reduce((sum, d) => sum + d.vulnerabilities.length, 0),
      openPorts: discoveredDevices.reduce((sum, d) => sum + d.openPorts.length, 0)
    };
    
    setScanResults({
      success: true,
      data: results,
      devices: discoveredDevices
    });
    
    setCurrentStep('results');
    addOutput(`✅ Scan completed successfully!`);
    addOutput(`Found ${results.totalDevices} devices with ${results.criticalVulns} vulnerabilities`);
    
    if (onScanComplete) {
      onScanComplete({
        devices: discoveredDevices,
        detectionLevel: detectionLevel,
        scanResults: results
      });
    }
  };

  const resetScan = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    if (countdownId) {
      clearInterval(countdownId);
      setCountdownId(null);
    }
    setCurrentStep('setup');
    setScanType('basic');
    setTargetNetwork(null);
    setDevices([]);
    setScanProgress(0);
    setDetectionLevel(0);
    setScanResults(null);
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 1: return '#00ff88';
      case 2: return '#88ff00';
      case 3: return '#ffaa00';
      case 4: return '#ff4444';
      default: return '#888888';
    }
  };

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'Very Low': return '#00ff88';
      case 'Low': return '#88ff00';
      case 'Medium': return '#ffaa00';
      case 'High': return '#ff4444';
      default: return '#888888';
    }
  };

  // Add missing utility functions
  const getRandomOS = (deviceType) => {
    const osOptions = {
      server: ['Ubuntu Server 20.04', 'Windows Server 2019', 'CentOS 8', 'Red Hat Enterprise', 'Debian 11'],
      workstation: ['Windows 10', 'Windows 11', 'macOS Monterey', 'Ubuntu Desktop', 'Linux Mint'],
      router: ['Cisco IOS', 'Juniper JUNOS', 'MikroTik RouterOS', 'pfSense', 'OpenWrt'],
      camera: ['Hikvision Firmware', 'Dahua Firmware', 'Axis Camera OS', 'Generic Linux', 'Custom Embedded'],
      iot: ['Android Things', 'FreeRTOS', 'Contiki', 'TinyOS', 'Custom Firmware'],
      database: ['PostgreSQL on Linux', 'MySQL on Ubuntu', 'MongoDB', 'Oracle Linux', 'SQL Server'],
      firewall: ['FortiGate OS', 'Palo Alto PAN-OS', 'Cisco ASA', 'pfSense', 'SonicOS']
    };
    
    const options = osOptions[deviceType] || osOptions.server;
    return options[Math.floor(Math.random() * options.length)];
  };

  const generateOpenPorts = (deviceType) => {
    const portSets = {
      server: [22, 80, 443, 8080, 3389],
      workstation: [135, 445, 3389, 5357],
      router: [22, 23, 80, 443, 161],
      camera: [80, 554, 8080, 37777],
      iot: [80, 443, 1883, 8883],
      database: [3306, 5432, 1521, 27017],
      firewall: [22, 80, 443, 4343]
    };
    
    const basePorts = portSets[deviceType] || portSets.server;
    const openPorts = [...basePorts];
    
    // Randomly add some additional common ports
    const commonPorts = [21, 25, 53, 110, 143, 993, 995, 8443, 9090];
    const additionalCount = Math.floor(Math.random() * 3);
    
    for (let i = 0; i < additionalCount; i++) {
      const randomPort = commonPorts[Math.floor(Math.random() * commonPorts.length)];
      if (!openPorts.includes(randomPort)) {
        openPorts.push(randomPort);
      }
    }
    
    return openPorts.sort((a, b) => a - b);
  };

  return (
    <div className="network-scanner-enhanced">
      {/* Header with step indicator */}
      <div className="scanner-header-enhanced">
        <div className="mission-badge">
          <div className="mission-icon">🔍</div>
          <div className="mission-info">
            <h2>Network Scanner</h2>
            <div className="mission-scenario">Advanced network reconnaissance and vulnerability discovery</div>
          </div>
        </div>
        
        <div className="progress-steps">
          <div className={`step ${currentStep === 'setup' ? 'active' : currentStep !== 'setup' ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Setup</div>
          </div>
          <div className={`step ${currentStep === 'analysis' ? 'active' : ['scanning', 'results'].includes(currentStep) ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Analysis</div>
          </div>
          <div className={`step ${currentStep === 'scanning' ? 'active' : currentStep === 'results' ? 'completed' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Scanning</div>
          </div>
          <div className={`step ${currentStep === 'results' ? 'active' : ''}`}>
            <div className="step-number">4</div>
            <div className="step-label">Results</div>
          </div>
        </div>
      </div>
      {/* Rest of the component */}
      
      {/* Step 1: Setup - Target Selection */}
      {currentStep === 'setup' && (
        <div className="step-content">
          <div className="step-header">
            <h3>🎯 Network Target Selection</h3>
            <p>Choose the network range for reconnaissance. Consider the security level and your available tools.</p>
          </div>
          
          <div className="targets-enhanced-grid">
            {networkTargets.map(target => (
              <div 
                key={target.id}
                className={`target-card-enhanced ${targetNetwork?.id === target.id ? 'selected' : ''}`}
                onClick={() => setTargetNetwork(target)}
              >
                <div className="target-avatar">{target.icon}</div>
                <div className="target-info">
                  <h4>{target.name}</h4>
                  <div className="target-description">{target.description}</div>
                  
                  <div className="security-overview">
                    <div className="security-level">
                      <span className="security-label">Security Level:</span>
                      <span className={`security-badge ${target.securityLevel}`}>
                        {target.securityLevel.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="security-details">
                      <div className="detail-item">
                        <span className="detail-label">Expected Devices:</span>
                        <span className="detail-value">{target.expectedDevices}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Detection Systems:</span>
                        <span className="detail-value">{target.detectionCapability}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Network Topology:</span>
                        <span className="detail-value">{target.networkComplexity}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {targetNetwork?.id === target.id && (
                  <div className="target-details-expanded">
                    <div className="security-assessment">
                      <h5>🔒 Security Assessment</h5>
                      <p>{target.securityDesc}</p>
                      
                      <div className="vuln-preview">
                        <strong>Common Vulnerabilities:</strong>
                        <div className="vuln-tags">
                          {target.commonVulns.map((vuln, index) => (
                            <span key={index} className="vuln-tag">{vuln}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="recommendation">
                        <strong>💡 Recommended Scan:</strong>
                        <span className="recommended-scan">{target.recommendedScan}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {targetNetwork?.id === target.id && (
                  <div className="selection-indicator">✓ SELECTED</div>
                )}
              </div>
            ))}
          </div>
          
          {targetNetwork && (
            <div className="continue-button-container">
              <button 
                className="continue-btn-enhanced"
                onClick={() => setCurrentStep('method')}
              >
                Select Scan Method →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Method Selection with Strategic Analysis */}
      {currentStep === 'method' && targetNetwork && (
        <div className="step-content">
          <div className="step-header">
            <h3>⚔️ Scan Strategy Selection</h3>
            <p>Choose your scanning approach carefully. The wrong choice could result in detection or poor intelligence gathering.</p>
          </div>

          <div className="target-reminder">
            <span className="target-avatar-small">{targetNetwork.icon}</span>
            <span>Target: <strong>{targetNetwork.name}</strong></span>
            <span className={`security-badge-small ${targetNetwork.securityLevel}`}>
              {targetNetwork.securityLevel.toUpperCase()} SECURITY
            </span>
            <button className="change-target-btn" onClick={() => setCurrentStep('setup')}>
              Change Target
            </button>
          </div>
          
          <div className="methods-enhanced-grid">
            {scanTypes.map(method => {
              const isSelected = scanType === method.id;
              const analysis = targetNetwork ? analyzeNetworkSecurity(targetNetwork, method.id) : null;
              const isOptimal = targetNetwork?.recommendedScan === method.id;
              
              return (
                <div 
                  key={method.id}
                  className={`method-card-enhanced ${isSelected ? 'selected' : ''} ${isOptimal ? 'optimal' : ''}`}
                  onClick={() => setScanType(method.id)}
                >
                  <div className="method-header">
                    <div className="method-icon-large">{method.icon}</div>
                    <div className="method-title">
                      <h4>{method.name}</h4>
                      <div className="method-complexity">{method.complexity}</div>
                      {isOptimal && <div className="optimal-badge">⭐ RECOMMENDED</div>}
                    </div>
                  </div>
                  
                  <p className="method-description">{method.description}</p>
                  
                  <div className="method-stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Speed:</span>
                      <span className="stat-value">{method.speed}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Accuracy:</span>
                      <span className="stat-value">{method.accuracy}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Stealth:</span>
                      <span className="stat-value">{method.stealth}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Detection Risk:</span>
                      <span className="stat-value risk">{method.detectionRisk}%</span>
                    </div>
                  </div>

                  {analysis && (
                    <div className="effectiveness-analysis">
                      <div className="effectiveness-bar">
                        <span className="analysis-label">Effectiveness vs {targetNetwork.securityLevel} security:</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${analysis.effectiveness}%`,
                              backgroundColor: analysis.effectiveness > 70 ? '#4CAF50' : analysis.effectiveness > 50 ? '#FF9800' : '#f44336'
                            }}
                          ></div>
                        </div>
                        <span className="percentage">{analysis.effectiveness}%</span>
                      </div>
                      
                      <div className="strategic-advice">
                        {analysis.strategicAdvice}
                      </div>
                    </div>
                  )}
                  
                  <div className="method-best-for">
                    <strong>Best For:</strong>
                    <ul>
                      {method.bestFor.map((use, index) => (
                        <li key={index}>{use}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="consequences">
                    <div className="consequence-item">
                      <strong>✅ Success:</strong>
                      <span>{method.consequences.right}</span>
                    </div>
                    <div className="consequence-item">
                      <strong>❌ Risk:</strong>
                      <span>{method.consequences.wrong}</span>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="selection-indicator">✓ SELECTED</div>
                  )}
                </div>
              );
            })}
          </div>
          
          {scanType && (
            <div className="continue-button-container">
              <button 
                className="execute-btn-enhanced"
                onClick={startScan}
              >
                🚀 Execute Scan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Security Analysis Phase */}
      {currentStep === 'analysis' && (
        <div className="analysis-interface">
          <div className="analysis-header">
            <div className="scan-info">
              <span className="target-avatar-analysis">{targetNetwork.icon}</span>
              <div className="analysis-title">
                <h3>🔍 Pre-Scan Security Analysis</h3>
                <div className="scan-details">
                  {scanTypes.find(s => s.id === scanType)?.name} → {targetNetwork.name}
                </div>
              </div>
            </div>
          </div>

          <div className="security-assessment-display">
            <div className="assessment-section">
              <h4>🎯 Target Assessment</h4>
              <div className="assessment-grid">
                <div className="assessment-item">
                  <span className="assessment-label">Security Level:</span>
                  <span className={`security-badge ${targetNetwork.securityLevel}`}>
                    {targetNetwork.securityLevel.toUpperCase()}
                  </span>
                </div>
                <div className="assessment-item">
                  <span className="assessment-label">Detection Systems:</span>
                  <span className="assessment-value">{targetNetwork.detectionCapability}</span>
                </div>
                <div className="assessment-item">
                  <span className="assessment-label">Network Complexity:</span>
                  <span className="assessment-value">{targetNetwork.networkComplexity}</span>
                </div>
              </div>
            </div>

            <div className="scan-strategy-section">
              <h4>⚔️ Scan Strategy Analysis</h4>
              <div className="strategy-analysis">
                {(() => {
                  const analysis = analyzeNetworkSecurity(targetNetwork, scanType);
                  return (
                    <div className="analysis-results">
                      <div className="effectiveness-display">
                        <span className="metric-label">Expected Effectiveness:</span>
                        <div className="effectiveness-bar-large">
                          <div 
                            className="effectiveness-fill" 
                            style={{ 
                              width: `${analysis.effectiveness}%`,
                              backgroundColor: analysis.effectiveness > 70 ? '#4CAF50' : analysis.effectiveness > 50 ? '#FF9800' : '#f44336'
                            }}
                          ></div>
                        </div>
                        <span className="effectiveness-percentage">{analysis.effectiveness}%</span>
                      </div>
                      
                      <div className="risk-assessment">
                        <span className="metric-label">Detection Risk:</span>
                        <span className={`risk-level ${analysis.detectionLikelihood > 70 ? 'high' : analysis.detectionLikelihood > 40 ? 'medium' : 'low'}`}>
                          {analysis.detectionLikelihood}% Chance
                        </span>
                      </div>
                      
                      <div className="strategic-recommendation">
                        {analysis.strategicAdvice}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="progress-section">
              <h4>📊 Scan Progress</h4>
              <div className="progress-display">
                <div className="current-phase">Phase: {currentPhase.replace('_', ' ').toUpperCase()}</div>
                <div className="progress-bar-large">
                  <div className="progress-fill-large" style={{ width: `${scanProgress}%` }}></div>
                </div>
                <div className="progress-text">{Math.round(scanProgress)}% Complete</div>
              </div>
              
              <div className="current-activity">
                <strong>Current Activity:</strong> {currentTarget}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Scanning */}
      {currentStep === 'scanning' && (
        <div className="step-content">
          <div className="scanning-interface">
            <div className="scanning-header">
              <div className="scan-info-header">
                <div className="scan-avatar">{scanTypes.find(s => s.id === scanType)?.icon || '🔍'}</div>
                <div className="scanning-title">
                  <h3>{scanTypes.find(s => s.id === scanType)?.name || 'Network Scan'} in Progress</h3>
                  <div className="target-info">Target: {targetNetwork?.name} ({targetNetwork?.range})</div>
                </div>
              </div>
              
              <div className="scan-metrics">
                <div className="metric">
                  <div className="metric-label">Progress</div>
                  <div className="metric-bar progress">
                    <div 
                      className="metric-fill" 
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <div className="metric-value">{scanProgress.toFixed(1)}%</div>
                </div>
                
                <div className="metric">
                  <div className="metric-label">Detection Risk</div>
                  <div className="metric-bar detection">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${detectionLevel}%`,
                        backgroundColor: detectionLevel > 70 ? '#ff4444' : detectionLevel > 40 ? '#ffaa00' : '#00ff88'
                      }}
                    ></div>
                  </div>
                  <div className="metric-value">{detectionLevel}%</div>
                </div>
                
                {timeRemaining !== null && (
                  <div className="metric">
                    <div className="metric-label">Time Remaining</div>
                    <div className="metric-value time">
                      {Math.floor(timeRemaining / 60000)}:{String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, '0')}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="scan-display">
              <div className="current-phase">
                <h4>Current Phase: {currentPhase || 'Initializing...'}</h4>
                <div className="phase-description">
                  {currentPhase === 'Network Discovery' && 'Identifying active hosts on the network...'}
                  {currentPhase === 'Discovery' && 'Performing comprehensive host discovery...'}
                  {currentPhase === 'Port Scanning' && 'Analyzing open ports and services...'}
                  {currentPhase === 'Vulnerability Assessment' && 'Identifying security vulnerabilities...'}
                  {currentPhase === 'Passive Discovery' && 'Gathering network intelligence passively...'}
                  {currentPhase === 'Stealthy Port Analysis' && 'Carefully probing ports without detection...'}
                  {currentPhase === 'Covert Assessment' && 'Performing stealth vulnerability analysis...'}
                </div>
              </div>
              
              <div className="current-target">
                <div className="target-label">Scanning:</div>
                <div className="target-ip">{currentTarget || 'Initializing...'}</div>
              </div>
              
              <div className="live-results">
                <h4>Devices Found: {devices.length}</h4>
                {devices.length > 0 && (
                  <div className="device-preview">
                    {devices.slice(0, 3).map((device, index) => (
                      <div key={index} className="device-item">
                        <span className="device-ip">{device.ip}</span>
                        <span className="device-type">{device.type}</span>
                      </div>
                    ))}
                    {devices.length > 3 && <div className="more-devices">+{devices.length - 3} more...</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {currentStep === 'results' && (
        <div className="step-content">
          <div className="results-interface">
            <div className="results-header">
              <div className={`result-status-large ${scanResults?.success ? 'success' : 'failure'}`}>
                {scanResults?.success ? '✅ Scan Completed' : '❌ Scan Failed'}
              </div>
              {!scanResults?.success && (
                <div className="result-reason">{scanResults?.reason}</div>
              )}
            </div>
            
            {scanResults?.success && scanResults.data && (
              <>
                <div className="results-analysis">
                  <h4>📊 Scan Analysis</h4>
                  <div className="analysis-grid">
                    <div className="analysis-item">
                      <div className="analysis-label">Total Devices</div>
                      <div className="analysis-value">{scanResults.data.totalDevices}</div>
                    </div>
                    <div className="analysis-item">
                      <div className="analysis-label">Vulnerable Devices</div>
                      <div className="analysis-value critical">{scanResults.data.vulnerableDevices}</div>
                    </div>
                    <div className="analysis-item">
                      <div className="analysis-label">Open Ports</div>
                      <div className="analysis-value">{scanResults.data.openPorts}</div>
                    </div>
                    <div className="analysis-item">
                      <div className="analysis-label">Critical Vulnerabilities</div>
                      <div className="analysis-value critical">{scanResults.data.criticalVulns}</div>
                    </div>
                  </div>
                </div>
                
                <div className="devices-section">
                  <h4>🔍 Discovered Devices</h4>
                  <div className="devices-grid">
                    {scanResults.devices?.map((device, index) => (
                      <div key={index} className="device-card">
                        <div className="device-header">
                          <div className="device-ip">{device.ip}</div>
                          <div className={`device-risk ${device.riskLevel.toLowerCase()}`}>
                            {device.riskLevel} Risk
                          </div>
                        </div>
                        <div className="device-details">
                          <div className="device-type">{device.type}</div>
                          <div className="device-os">{device.os}</div>
                          <div className="device-ports">
                            Ports: {device.openPorts.join(', ')}
                          </div>
                          {device.vulnerabilities.length > 0 && (
                            <div className="device-vulns">
                              <strong>Vulnerabilities:</strong>
                              <ul>
                                {device.vulnerabilities.map((vuln, vIndex) => (
                                  <li key={vIndex}>{vuln}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <div className="results-actions">
              <button 
                onClick={resetScan}
                className="new-scan-btn"
              >
                🔄 New Scan
              </button>
              <button 
                onClick={() => onComplete && onComplete(scanResults)}
                className="complete-btn"
              >
                📋 Complete Mission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkScanner;