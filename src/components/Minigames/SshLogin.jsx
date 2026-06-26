import React, { useState, useEffect } from 'react';

// Age-tier max login attempts before lockout: K-5 gets the most forgiving runway
const TIER_MAX_ATTEMPTS = { k5: 10, middle: 5, high: 3 };

const SshLogin = ({ gameState, onSSHComplete, onFailure, addOutput, targetIp, onExit }) => {
  const ageTier = gameState?.ageTier || 'middle';
  const maxLoginAttempts = TIER_MAX_ATTEMPTS[ageTier] || TIER_MAX_ATTEMPTS.middle;
  const [ip, setIp] = useState('');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetDevice, setTargetDevice] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [step, setStep] = useState('setup'); // setup, connecting, authenticating, success, failed, locked
  const [showInstructions, setShowInstructions] = useState(true);
  const [connectionLog, setConnectionLog] = useState([]);
  const [accountLocked, setAccountLocked] = useState(false);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [honeypotTriggered, setHoneypotTriggered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [securityLevel, setSecurityLevel] = useState(0);
  const [failureReason, setFailureReason] = useState('');
  
  // Set IP from command argument
  useEffect(() => {
    if (targetIp) {
      setIp(targetIp);
      
      // Debug: Log what we have in gameState
      console.log('SSH Debug - targetIp:', targetIp);
      console.log('SSH Debug - gameState.scannedDevices:', gameState.scannedDevices);
      console.log('SSH Debug - scannedDevices length:', gameState.scannedDevices?.length || 0);
      
      // Find device in scanned devices
      const foundDevice = gameState.scannedDevices?.find(d => d.ip === targetIp);
      
      if (foundDevice) {
        console.log('SSH Debug - Found device:', foundDevice);
        setTargetDevice(foundDevice);
        
        // Debug the password generation
        const debugPassword = generateCorrectPassword(foundDevice);
        console.log('SSH Debug - Generated password for', foundDevice.type, 'at', foundDevice.ip, ':', debugPassword);
        
        // Test if this matches what PasswordCracker would generate for the same device
        console.log('SSH Debug - Testing PasswordCracker consistency...');
        const testPassword = generateCorrectPassword(foundDevice);
        console.log('SSH Debug - Second generation test:', testPassword);
        console.log('SSH Debug - Passwords match:', debugPassword === testPassword);
        
        addToLog(`Target device found: ${targetIp}`, 'info');
        addToLog(`Device type: ${foundDevice.type} (${foundDevice.manufacturer})`, 'info');
        addToLog(`Operating System: ${foundDevice.os}`, 'info');
        
        if (foundDevice.vulnerabilities && foundDevice.vulnerabilities.length > 0) {
          addToLog(`⚠️ Vulnerabilities detected: ${foundDevice.vulnerabilities.length}`, 'warning');
        }
        
        setStep('ready');
      } else {
        console.log('SSH Debug - Device not found. Available IPs:', gameState.scannedDevices?.map(d => d.ip) || []);
        
        if (!gameState.scannedDevices || gameState.scannedDevices.length === 0) {
          setStatus('ERROR: No network scan data available');
          addToLog('No network scan data found', 'error');
          addToLog('💡 Run "scan" command first to discover network devices', 'hint');
          addToLog('📋 Available commands: scan, help', 'hint');
        } else {
          setStatus(`ERROR: IP ${targetIp} not found in scan results`);
          addToLog(`Target IP ${targetIp} not found in previous network scan`, 'error');
          addToLog(`📊 Scanned devices: ${gameState.scannedDevices.length}`, 'info');
          addToLog('💡 Available IPs from last scan:', 'hint');
          gameState.scannedDevices.slice(0, 5).forEach(device => {
            addToLog(`   • ${device.ip} (${device.type})`, 'info');
          });
          if (gameState.scannedDevices.length > 5) {
            addToLog(`   ... and ${gameState.scannedDevices.length - 5} more`, 'info');
          }
        }
      }
    } else {
      addToLog('No target IP specified. Usage: ssh <ip-address>', 'error');
      addToLog('💡 Example: ssh 192.168.1.100', 'hint');
      addToLog('💡 Use "scan" to find available devices first', 'hint');
    }
  }, [targetIp, gameState.scannedDevices, addOutput]);

  const addToLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [...prev, { timestamp, message, type }]);
  };

  // Generate the correct password for this device
  const generateCorrectPassword = (device) => {
    if (!device) return 'admin';
    
    // Generate realistic password based on device type and context
    const generateDevicePassword = (device) => {
      // Enhanced password lists with multiple complexity levels
      const devicePasswords = {
        'Router': {
          basic: ['admin', 'password', 'router', 'default'],
          intermediate: ['router123', 'admin2024', 'netgear01', 'linksys123'],
          advanced: ['R0ut3r@dmin!', 'N3tw0rk$ecure', 'Admin#Route2024', 'C1sc0_P@ssw0rd'],
          manufacturer: (mfg) => [`${mfg}123`, `${mfg}admin`, `${mfg}2024`, `${mfg}_default`]
        },
        'Security Camera': {
          basic: ['admin', '123456', 'camera', 'viewer'],
          intermediate: ['camera123', 'admin2024', 'viewer01', 'security123'],
          advanced: ['C@mer@Admin!', 'V1ew3r$ecure', 'S3cur1ty#C@m', 'Surv3ill@nce2024'],
          manufacturer: (mfg) => [`${mfg}cam`, `${mfg}123`, `${mfg}viewer`, `${mfg}admin`]
        },
        'Server': {
          basic: ['root', 'administrator', 'server', 'admin'],
          intermediate: ['server2024', 'root123', 'sysadmin', 'password123'],
          advanced: ['S3rv3r@dmin!', 'R00t#P@ssw0rd', 'Adm1n$yst3m', 'Serv3r_M@nag3r'],
          manufacturer: (mfg) => [`${mfg}server`, `${mfg}admin`, `${mfg}root`, `${mfg}sys`]
        },
        'Workstation': {
          basic: ['password', 'user', 'welcome', 'login'],
          intermediate: ['user123', 'welcome2024', 'password01', 'workstation'],
          advanced: ['W0rkst@t1on!', 'Us3r#P@ssw0rd', 'W3lc0m3$yst3m', 'L0g1n@ccess'],
          manufacturer: (mfg) => [`${mfg}user`, `${mfg}work`, `${mfg}123`, `${mfg}pc`]
        },
        'Printer': {
          basic: ['admin', 'print', '0000', 'printer'],
          intermediate: ['printer123', 'admin2024', 'print01', 'hp123'],
          advanced: ['Pr1nt3r@dm1n', 'HP_Pr1nt$3rv', 'C@n0n#Pr1nt', 'Pr1nt$p00l3r'],
          manufacturer: (mfg) => [`${mfg}print`, `${mfg}123`, `${mfg}admin`, `${mfg}spool`]
        },
        'IoT Device': {
          basic: ['123456', 'default', 'iot', 'smart'],
          intermediate: ['smart123', 'iot2024', 'device01', 'connect123'],
          advanced: ['I0T_D3v1c3!', 'Sm@rt#H0m3', 'C0nn3ct3d$ys', 'I0T@ccess2024'],
          manufacturer: (mfg) => [`${mfg}iot`, `${mfg}smart`, `${mfg}123`, `${mfg}connect`]
        }
      };
      
      const deviceType = device.type;
      const deviceInfo = devicePasswords[deviceType] || devicePasswords['Server']; // Fallback to server
      const manufacturer = device.manufacturer?.toLowerCase() || 'generic';
      
      // Build comprehensive password list with different complexity levels
      const allVariations = [
        ...deviceInfo.basic,
        ...deviceInfo.intermediate,
        ...deviceInfo.advanced,
        ...deviceInfo.manufacturer(manufacturer),
        // Generic corporate patterns
        'Company123!', 'Corp@2024', 'Business#01', 'Enterprise$ys',
        // Common vulnerability-based passwords
        device.type.toLowerCase(), 
        device.type.toLowerCase() + '123',
        device.type.toLowerCase() + '2024',
        device.type.toLowerCase() + '@admin',
        // IP-based passwords
        device.ip.split('.').pop(), 
        device.ip.split('.').slice(-2).join(''),
        'IP' + device.ip.split('.').pop(),
        // Date-based passwords
        'Jan2024!', 'Admin2024#', 'System@2024', 'Winter24!',
        // Common substitutions
        'P@ssw0rd123', '@dmin123!', 'R00t@ccess', 'L0g1n$yst3m',
        // Device-specific technical terms
        'Firmware123!', 'Config@2024', 'Setup#Admin', 'Install$ys',
        // Security-through-obscurity attempts
        'changeme', 'guest', 'temp123', 'test@123',
        // More sophisticated patterns
        deviceType.split(' ').join('') + '2024!',
        manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1) + '#2024',
        device.ip.replace(/\./g, '') + '!',
        // Common enterprise patterns
        'Welcome@123', 'Access#2024', 'Secure$ystem', 'Manager@123'
      ].filter(Boolean);
      
      // Use device IP as seed for consistent password per device
      const seed = device.ip.split('.').reduce((acc, num) => acc + parseInt(num), 0);
      return allVariations[seed % allVariations.length];
    };
    
    // Enhanced vulnerability-based password selection
    const vulnerabilityPatterns = {
      'default ssh credentials': ['admin', 'root', 'administrator', 'sysadmin'],
      'weak ssh password': ['password', '123456', 'password123', 'admin123'],
      'ssh root access': ['root', 'toor', 'r00t', 'administrator'],
      'default ssh key': ['123456', '000000', 'admin', 'default'],
      'unpatched ssh': [device.type.toLowerCase(), 'system', 'service', 'daemon'],
      'hardcoded credentials': ['admin', 'service', 'system', 'embedded'],
      'factory default': ['admin', 'default', '123456', 'password'],
      'weak authentication': ['guest', 'user', 'test', 'demo'],
      'default admin': ['admin', 'administrator', 'root', 'super'],
      'backdoor access': ['backdoor', 'debug', 'maint', 'service'],
      'development credentials': ['dev', 'test', 'debug', 'developer'],
      'maintenance account': ['maint', 'service', 'support', 'tech'],
      'legacy system': ['legacy', 'old', 'system', 'compat']
    };
    
    // Check for specific vulnerability patterns first
    for (const [pattern, passwords] of Object.entries(vulnerabilityPatterns)) {
      if (device.vulnerabilities?.some(v => v.toLowerCase().includes(pattern))) {
        const seed = device.ip.split('.').reduce((acc, num) => acc + parseInt(num), 0);
        return passwords[seed % passwords.length];
      }
    }
    
    // If no specific vulnerability pattern, use device-based generation
    return generateDevicePassword(device);
  };

  // Check for honeypots and security traps
  const checkForHoneypot = () => {
    if (!targetDevice) return false;
    
    // Higher chance for honeypots on certain device types
    const honeypotChance = {
      'Server': 0.15,
      'Router': 0.08,
      'Security Camera': 0.05,
      'Workstation': 0.03,
      'Printer': 0.01,
      'IoT Device': 0.02
    };
    
    const chance = honeypotChance[targetDevice.type] || 0.05;
    
    if (Math.random() < chance) {
      setHoneypotTriggered(true);
      setStep('failed');
      setFailureReason('🍯 HONEYPOT DETECTED - Connection trapped by security system');
      addToLog('❌ WARNING: Honeypot detected! This is a trap system.', 'error');
      addToLog('Your connection attempt has been logged and traced.', 'error');
      addToLog('💡 Avoid suspicious systems or use proxy chains', 'hint');
      
      // Call onFailure for honeypot detection
      if (onFailure) {
        onFailure(`Honeypot trap triggered on ${targetDevice.type} at ${ip}`);
      }
      
      return true;
    }
    
    return false;
  };

  // Enhanced security monitoring
  const checkSecurityMonitoring = () => {
    if (!targetDevice) return false;
    
    // Increase security level with each attempt
    setSecurityLevel(prev => prev + 20 + (attempts * 10));
    
    // Some devices have active monitoring
    if (targetDevice.vulnerabilities?.some(v => v.toLowerCase().includes('monitoring'))) {
      if (securityLevel > 50 && Math.random() < 0.3) {
        setIpBlocked(true);
        setStep('failed');
        setFailureReason('🚫 IP BLOCKED - Security system has flagged this connection');
        addToLog('❌ Your IP address has been blocked by intrusion detection', 'error');
        addToLog('Multiple failed attempts detected from this source', 'error');
        addToLog('💡 Use different attack vectors or wait for cooldown', 'hint');
        
        // Call onFailure for IP blocking
        if (onFailure) {
          onFailure(`IP address blocked by intrusion detection on ${targetDevice.type} at ${ip}`);
        }
        
        return true;
      }
    }
    
    return false;
  };

  // Generate time limits based on device security
  const getConnectionTimeLimit = () => {
    if (!targetDevice) return 30000; // 30 seconds for connection only
    
    const timeLimits = {
      'Server': 45000,        // 45 seconds - high security
      'Router': 30000,        // 30 seconds - medium security  
      'Security Camera': 60000, // 60 seconds - often poorly secured
      'Workstation': 40000,   // 40 seconds - varies
      'Printer': 60000,       // 60 seconds - usually no timeout
      'IoT Device': 90000     // 90 seconds - often no security
    };
    
    return timeLimits[targetDevice.type] || 30000;
  };

  const handleLogin = () => {
    if (!ip) {
      setStatus('ERROR: No target IP specified');
      addToLog('Target IP is required', 'error');
      return;
    }
    
    if (!targetDevice) {
      setStatus('ERROR: Device data unavailable');
      addToLog('Device information not available', 'error');
      return;
    }
    
    if (accountLocked) {
      setStatus('ACCOUNT LOCKED: Too many failed attempts');
      addToLog('Account has been locked due to multiple failed attempts', 'error');
      addToLog('💡 Try a different username or wait for unlock', 'hint');
      return;
    }
    
    if (ipBlocked) {
      setStatus('IP BLOCKED: Connection refused by security system');
      addToLog('IP address is blocked by security system', 'error');
      return;
    }
    
    if (attempts >= maxLoginAttempts) {
      setAccountLocked(true);
      setStep('failed');
      setFailureReason('🔒 ACCOUNT LOCKOUT - Maximum login attempts exceeded');
      addToLog(`Account locked after ${maxLoginAttempts} failed attempts`, 'error');
      addToLog('Security policy enforced - account disabled', 'error');
      return;
    }

    if (!password.trim()) {
      setStatus('ERROR: Password cannot be empty');
      addToLog('Password field is required', 'error');
      return;
    }
    
    // Check for honeypot before attempting connection
    if (checkForHoneypot()) {
      return;
    }
    
    setLoading(true);
    setStep('connecting');
    setStatus('Establishing SSH connection...');
    addToLog(`Attempting SSH connection to ${ip}`, 'info');
    setAttempts(attempts + 1);
    
    // Debug logging
    console.log('SSH Debug - Starting connection process');
    console.log('SSH Debug - Target device:', targetDevice);
    console.log('SSH Debug - Device type:', targetDevice?.type);
    console.log('SSH Debug - Has SSH service:', targetDevice?.services?.some(s => s.service === 'SSH' || s.port === 22));
    console.log('SSH Debug - Has port 22:', targetDevice?.openPorts?.includes(22));
    console.log('SSH Debug - Connection timeout will be:', getConnectionTimeLimit(), 'ms');
    
    // Set connection timeout - only for connection phase
    const timeLimit = getConnectionTimeLimit();
    setTimeRemaining(timeLimit);
    
    const startTime = Date.now();
    let timeoutCleared = false;
    
    console.log('SSH Debug - Setting up timeout check with limit:', timeLimit);
    
    const timeoutCheck = setInterval(() => {
      if (timeoutCleared) {
        clearInterval(timeoutCheck);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeRemaining(remaining);
      
      // Debug every 5 seconds
      if (elapsed % 5000 < 1000) {
        console.log('SSH Debug - Timeout check: elapsed=', elapsed, 'remaining=', remaining);
      }
      
      if (remaining <= 0) {
        console.log('SSH Debug - Connection timeout reached');
        clearInterval(timeoutCheck);
        timeoutCleared = true;
        setLoading(false);
        setStep('failed');
        setFailureReason('⏱️ CONNECTION TIMEOUT - Server did not respond in time');
        addToLog('❌ Connection timeout - no response from server', 'error');
        addToLog('💡 Server may be overloaded or filtering connections', 'hint');
      }
    }, 1000);
    
    // Simulate connection delay
    setTimeout(() => {
      console.log('SSH Debug - Connection delay completed, timeoutCleared=', timeoutCleared);
      if (!timeoutCleared) { // Only proceed if not timed out
        console.log('SSH Debug - Proceeding with connection');
        clearInterval(timeoutCheck);
        timeoutCleared = true;
        setTimeRemaining(null);
        setStep('authenticating');
        setStatus('Connected! Attempting authentication...');
        addToLog('SSH connection established', 'success');
        addToLog(`Authenticating user: ${username}`, 'info');
        
        // Check if device is vulnerable to SSH
        const hasSSHService = targetDevice.services?.some(service => 
          service.service === 'SSH' || 
          service.service === 'ssh' || 
          service.port === 22
        );
        const hasSSHPort = targetDevice.openPorts?.includes(22);
        
        if (!hasSSHService && !hasSSHPort) {
          setLoading(false);
          setStep('failed');
          setFailureReason('❌ SSH SERVICE UNAVAILABLE');
          setStatus('CONNECTION FAILED: SSH service not available on target');
          addToLog('SSH service not detected on target device', 'error');
          addToLog('Available services: ' + (targetDevice.services?.map(s => `${s.service}:${s.port}`).join(', ') || 'none'), 'info');
          addToLog('Open ports: ' + (targetDevice.openPorts?.join(', ') || 'none'), 'info');
          addToLog('Tip: Try a different attack vector or scan for other services', 'hint');
          return;
        }
        
        // Check for security monitoring
        if (checkSecurityMonitoring()) {
          setLoading(false);
          return;
        }
        
        // Simulate authentication delay - no timeout for this phase
        setTimeout(() => {
          authenticateUser();
        }, 1500);
      }
    }, 2000); // 2 seconds for connection time
  };

  const authenticateUser = () => {
    const correctPassword = generateCorrectPassword(targetDevice);
    
    // Enhanced debugging for password sources and generation
    console.log('SSH Debug - Target device for password generation:', targetDevice);
    console.log('SSH Debug - Generated correct password:', correctPassword);
    console.log('SSH Debug - Device IP:', targetDevice.ip);
    console.log('SSH Debug - Device type:', targetDevice.type);
    console.log('SSH Debug - Device vulnerabilities:', targetDevice.vulnerabilities);
    console.log('SSH Debug - Device manufacturer:', targetDevice.manufacturer);
    
    console.log('SSH Debug - All cracked passwords in gameState:', gameState?.crackedPasswords);
    console.log('SSH Debug - Phishing data:', gameState?.phishingData);
    console.log('SSH Debug - Social intel:', gameState?.socialIntel);
    
    // Accept the correct password AND common fallbacks for user convenience
    const acceptedPasswords = [
      correctPassword,
      // Only include these if they match logical patterns
      ...(targetDevice?.type === 'Router' ? ['admin'] : []),
      ...(targetDevice?.type === 'Server' ? ['root', 'administrator'] : []),
      ...(targetDevice?.type === 'Security Camera' ? ['admin', '123456'] : []),
      ...(targetDevice?.type === 'Workstation' ? ['password', 'user'] : []),
      ...(targetDevice?.type === 'Printer' ? ['admin', 'print'] : []),
      ...(targetDevice?.type === 'IoT Device' ? ['123456', 'default'] : [])
    ];
    
    // Add passwords from password cracker minigame
    if (gameState?.crackedPasswords?.length > 0) {
      // Filter cracked passwords for this specific device IP or general passwords
      const relevantCrackedPasswords = gameState.crackedPasswords
        .filter(crack => {
          // Accept passwords if:
          // 1. They're for this specific device IP
          // 2. They're for the same device type
          // 3. They're general passwords (no deviceIp specified)
          const ipMatch = !crack.deviceIp || crack.deviceIp === targetDevice.ip;
          const typeMatch = crack.target && crack.target.includes(targetDevice.type);
          const generalPassword = !crack.deviceIp;
          
          console.log('SSH Debug - Checking crack:', crack);
          console.log('SSH Debug - IP match:', ipMatch, '(crack.deviceIp:', crack.deviceIp, 'vs targetDevice.ip:', targetDevice.ip, ')');
          console.log('SSH Debug - Type match:', typeMatch);
          console.log('SSH Debug - General password:', generalPassword);
          console.log('SSH Debug - Overall match:', ipMatch || typeMatch || generalPassword);
          
          return ipMatch || typeMatch || generalPassword;
        })
        .map(crack => crack.password || crack)
        .filter(Boolean);
      
      console.log('SSH Debug - Relevant cracked passwords for', targetDevice.ip, ':', relevantCrackedPasswords);
      acceptedPasswords.push(...relevantCrackedPasswords);
    }
    
    // Add passwords from phishing and social engineering
    if (gameState?.phishingData?.length > 0) {
      const phishingPasswords = gameState.phishingData
        .filter(data => data?.password)
        .map(data => data.password);
      console.log('SSH Debug - Adding phishing passwords:', phishingPasswords);
      acceptedPasswords.push(...phishingPasswords);
    }
    
    if (gameState?.socialIntel?.length > 0) {
      const socialPasswords = gameState.socialIntel
        .filter(intel => intel?.password)
        .map(intel => intel.password);
      console.log('SSH Debug - Adding social intel passwords:', socialPasswords);
      acceptedPasswords.push(...socialPasswords);
    }
    
    // Remove duplicates and convert all to lowercase for comparison
    const uniqueAcceptedPasswords = [...new Set(acceptedPasswords
      .filter(p => p) // Filter out any undefined/null values
      .map(p => p.toLowerCase()))];
    
    // Debug logging for password comparison
    console.log('SSH Debug - Password Comparison:');
    console.log('  - Entered password:', password);
    console.log('  - Entered password (lowercase):', password?.toLowerCase());
    console.log('  - Accepted passwords:', uniqueAcceptedPasswords);
    console.log('  - Password match:', uniqueAcceptedPasswords.includes(password?.toLowerCase()));
    
    // Calculate failure probability based on device security
    const deviceSecurityLevel = {
      'Server': 0.2,           // 20% chance of additional security (reduced)
      'Router': 0.15,          // 15% chance (reduced)
      'Security Camera': 0.05, // 5% chance (reduced)
      'Workstation': 0.1,      // 10% chance (reduced)
      'Printer': 0.02,         // 2% chance (reduced)
      'IoT Device': 0.01       // 1% chance (reduced)
    };
    
    const baseFailureChance = deviceSecurityLevel[targetDevice?.type] || 0.05;
    const securityFailure = Math.random() < baseFailureChance;
    
    if (password && uniqueAcceptedPasswords.includes(password.toLowerCase()) && !securityFailure) {
      // Success path
      setLoading(false);
      setStep('success');
      setStatus('ACCESS GRANTED! Authentication successful');
      addToLog('✅ Authentication successful!', 'success');
      addToLog('SSH session established with administrative privileges', 'success');
      
      // Generate encryption key
      const key = `SSH-KEY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      addToLog(`Encryption key extracted: ${key}`, 'success');
      
      setTimeout(() => {
        console.log('SSH Debug - About to call onSSHComplete with:', {
          success: true,
          ip: ip,
          key: key,
          target: targetDevice?.type || 'Unknown',
          access: 'admin'
        });
        
        if (onSSHComplete) {
          onSSHComplete({
            success: true,
            ip: ip,
            key: key,
            target: targetDevice?.type || 'Unknown',
            access: 'admin'
          });
          console.log('SSH Debug - onSSHComplete called successfully');
        } else {
          console.error('SSH Debug - onSSHComplete callback is not defined!');
        }
      }, 2000);
    } else {
      // Failure path
      setLoading(false);
      setStep('failed');
      
      if (securityFailure && password && uniqueAcceptedPasswords.includes(password.toLowerCase())) {
        // Correct password but security system interference
        setFailureReason('🛡️ SECURITY SYSTEM INTERFERENCE - Additional protection detected');
        setStatus('ACCESS DENIED: Enhanced security measures active');
        addToLog('❌ Correct credentials but blocked by security system', 'error');
        addToLog('💡 Target may have 2FA, VPN requirements, or advanced protection', 'hint');
        addToLog('💡 Try again - security interference is random', 'hint');
        
        // Call onFailure for security system interference
        if (onFailure) {
          onFailure('Enhanced security measures blocked access attempt');
        }
      } else {
        // Wrong password
        setFailureReason('❌ AUTHENTICATION FAILED - Invalid credentials');
        setStatus('ACCESS DENIED: Authentication failed');
        addToLog('❌ Authentication failed - invalid credentials', 'error');
        
        // Call onFailure for wrong password
        if (onFailure) {
          onFailure(`Invalid credentials on ${targetDevice?.type || 'Unknown'} at ${ip}`);
        }
        
        // Provide hints based on attempts
        if (attempts === 1) {
          addToLog(`Hint: Device type is ${targetDevice?.type || 'Unknown'} - research common ${targetDevice?.type?.toLowerCase() || 'device'} default passwords`, 'hint');
          addToLog(`💡 Analyze vulnerabilities and manufacturer patterns for clues`, 'hint');
        } else if (attempts === 2) {
          addToLog(`Strong hint: Check device vulnerabilities for specific password patterns`, 'hint');
          addToLog(`🔍 Consider manufacturer defaults or device-type specific credentials`, 'warning');
        } else if (attempts >= 3) {
          addToLog(`Final hint: Look for vulnerability-based password patterns in the intelligence section below`, 'warning');
          addToLog(`⚠️ Study the suggested passwords - they're generated based on real penetration testing practices`, 'warning');
        }
      }
      
      // Increase security monitoring after failed attempts
      setSecurityLevel(prev => prev + 25);
      
      if (attempts >= 4) {
        addToLog('⚠️ Warning: Next failed attempt will lock the account', 'warning');
      }
    }
  };

  const getStepIcon = (currentStep) => {
    switch(currentStep) {
      case 'setup': return '⚙️';
      case 'ready': return '🎯';
      case 'connecting': return '🔄';
      case 'authenticating': return '🔐';
      case 'success': return '✅';
      case 'failed': return '❌';
      default: return '📡';
    }
  };

  const getStatusColor = () => {
    if (status.includes('GRANTED') || status.includes('successful')) return 'success';
    if (status.includes('DENIED') || status.includes('failed') || status.includes('ERROR')) return 'error';
    if (status.includes('LOCKOUT')) return 'critical';
    return 'info';
  };

  const resetSecurityState = () => {
    setAccountLocked(false);
    setIpBlocked(false);
    setHoneypotTriggered(false);
    setSecurityLevel(0);
    setAttempts(0);
    setFailureReason('');
    addToLog('🔄 Security state reset - attempting fresh connection', 'info');
  };

  return (
    <div className="minigame ssh-enhanced">
      <h3>🔐 SSH ACCESS TERMINAL</h3>
      
      {/* Security Alert Panels */}
      {(accountLocked || ipBlocked || honeypotTriggered) && (
        <div className="security-alert">
          <h4>🚨 SECURITY BREACH DETECTED</h4>
          <div className="alert-details">
            {accountLocked && <p>🔒 Account has been locked due to failed attempts</p>}
            {ipBlocked && <p>🚫 IP address blocked by intrusion detection system</p>}
            {honeypotTriggered && <p>🍯 Honeypot trap activated - connection logged</p>}
            <div className="security-tips">
              <h5>💡 Security Evasion Tips:</h5>
              <ul>
                <li>Use proxy chains to mask your IP address</li>
                <li>Employ slower, stealthier attack methods</li>
                <li>Research targets before attempting access</li>
                <li>Use social engineering to gather valid credentials</li>
              </ul>
            </div>
            <button onClick={resetSecurityState} className="reset-security-btn">
              🔄 Reset Security State
            </button>
          </div>
        </div>
      )}

      {step === 'failed' && !accountLocked && !ipBlocked && !honeypotTriggered && (
        <div className="login-failure">
          <h4>❌ LOGIN FAILED</h4>
          <div className="failure-details">
            <p>{failureReason}</p>
            <div className="failure-stats">
              <div className="stat">
                <span className="stat-label">Failed Attempts:</span>
                <span className={`stat-value ${attempts >= 4 ? 'critical' : attempts >= 2 ? 'warning' : 'normal'}`}>
                  {attempts}/5
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Security Level:</span>
                <span className={`stat-value ${securityLevel > 70 ? 'critical' : securityLevel > 40 ? 'warning' : 'normal'}`}>
                  {securityLevel}%
                </span>
              </div>
            </div>
            <button onClick={() => setStep('setup')} className="retry-login-btn">
              🔄 Try Again
            </button>
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="instructions-panel">
          <div className="instructions-header">
            <h4>📋 How to Use SSH Access</h4>
            <button 
              onClick={() => setShowInstructions(false)}
              className="close-instructions"
            >
              ✕
            </button>
          </div>
          <div className="instructions-content">
            <div className="instruction-step">
              <span className="step-number">1</span>
              <span>First, run a network scan to discover vulnerable devices</span>
            </div>
            <div className="instruction-step">
              <span className="step-number">2</span>
              <span>Use command: ssh &lt;ip-address&gt; to target a device</span>
            </div>
            <div className="instruction-step">
              <span className="step-number">3</span>
              <span>Try common passwords: admin, root, password, 123456</span>
            </div>
            <div className="instruction-step">
              <span className="step-number">4</span>
              <span>Check device vulnerabilities for password hints</span>
            </div>
            <div className="instruction-step">
              <span className="step-number">5</span>
              <span>Successful login will extract encryption keys</span>
            </div>
          </div>
        </div>
      )}

      <div className="ssh-workspace">
        <div className="connection-status">
          <div className="status-header">
            <h4>{getStepIcon(step)} Connection Status</h4>
            <div className={`status-indicator ${step}`}>
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </div>
          </div>
          
          {/* Connection timeout display */}
          {timeRemaining !== null && (
            <div className="timeout-warning">
              <span className="timeout-label">⏱️ Connection Timeout:</span>
              <span className={`timeout-value ${timeRemaining < 10000 ? 'critical' : timeRemaining < 20000 ? 'warning' : 'normal'}`}>
                {Math.ceil(timeRemaining / 1000)}s
              </span>
            </div>
          )}
          
          <div className="target-summary">
            <div className="target-field">
              <span className="field-label">Target IP:</span>
              <span className="field-value">{ip || 'Not specified'}</span>
            </div>
            
            {targetDevice && (
              <>
                <div className="target-field">
                  <span className="field-label">Device Type:</span>
                  <span className="field-value">{targetDevice.type}</span>
                </div>
                <div className="target-field">
                  <span className="field-label">Manufacturer:</span>
                  <span className="field-value">{targetDevice.manufacturer}</span>
                </div>
                <div className="target-field">
                  <span className="field-label">SSH Service:</span>
                  <span className={`field-value ${targetDevice.services?.some(s => s.service === 'SSH') ? 'available' : 'unavailable'}`}>
                    {targetDevice.services?.some(s => s.service === 'SSH') ? '✅ Available' : '❌ Not detected'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Security monitoring display */}
        {securityLevel > 0 && (
          <div className="security-monitoring">
            <h4>🛡️ Security Monitoring</h4>
            <div className="security-level-bar">
              <div className="security-level-fill" style={{ width: `${Math.min(securityLevel, 100)}%` }}></div>
            </div>
            <div className="security-info">
              <span>Current Security Level: {securityLevel}%</span>
              {securityLevel > 70 && <span className="security-warning">⚠️ High Risk of Detection</span>}
            </div>
          </div>
        )}

        <div className="login-section">
          <h4>🔑 Authentication</h4>
          
          <div className="login-form">
            <div className="input-group">
              <label>👤 Username:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || step === 'success'}
                placeholder="Enter username (default: root)"
              />
            </div>
            
            <div className="input-group">
              <label>🔒 Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || step === 'success'}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
                placeholder="Enter password"
                autoFocus
              />
            </div>

            <div className="login-controls">
              <button 
                onClick={handleLogin}
                disabled={loading || step === 'success' || attempts >= maxLoginAttempts}
                className={`login-btn ${loading ? 'loading' : ''}`}
              >
                {loading ? (
                  <>
                    <span className="spinner">⟳</span>
                    {step === 'connecting' ? 'CONNECTING...' : 'AUTHENTICATING...'}
                  </>
                ) : (
                  '🚀 ATTEMPT LOGIN'
                )}
              </button>
              
              <div className="attempt-counter">
                <span>Attempts: </span>
                <span className={attempts >= maxLoginAttempts - 1 ? 'critical' : attempts >= 2 ? 'warning' : 'normal'}>
                  {attempts}/{maxLoginAttempts}
                </span>
              </div>
            </div>
          </div>

          {status && (
            <div className={`status-message ${getStatusColor()}`}>
              <span className="status-icon">
                {getStatusColor() === 'success' ? '✅' : 
                 getStatusColor() === 'error' ? '❌' : 
                 getStatusColor() === 'critical' ? '🚨' : 'ℹ️'}
              </span>
              {status}
            </div>
          )}
        </div>

        <div className="connection-log">
          <h4>📊 Connection Log</h4>
          <div className="log-container">
            {connectionLog.map((entry, index) => (
              <div key={index} className={`log-entry ${entry.type}`}>
                <span className="log-timestamp">[{entry.timestamp}]</span>
                <span className="log-message">{entry.message}</span>
              </div>
            ))}
            {connectionLog.length === 0 && (
              <div className="log-entry empty">
                No connection attempts yet
              </div>
            )}
          </div>
        </div>

        {targetDevice && targetDevice.vulnerabilities && targetDevice.vulnerabilities.length > 0 && (
          <div className="vulnerability-hints">
            <h4>🔍 Intelligence Gathered</h4>
            <div className="vulnerability-list">
              {targetDevice.vulnerabilities.map((vuln, index) => (
                <div key={index} className="vulnerability-item">
                  <span className="vuln-icon">🔓</span>
                  <span className="vuln-text">{vuln}</span>
                  {vuln.toLowerCase().includes('password') && (
                    <span className="vuln-hint">💡 Try common passwords</span>
                  )}
                  {vuln.toLowerCase().includes('default') && (
                    <span className="vuln-hint">💡 Default credentials likely</span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Show passwords from other minigames */}
            {gameState.crackedPasswords?.length > 0 && (
              <div className="intel-passwords">
                <h5>🧠 Previously Cracked Passwords</h5>
                <div className="password-suggestions">
                  {gameState.crackedPasswords
                    .filter(crack => {
                      // Show passwords that are relevant to this device
                      return !crack.deviceIp || 
                             crack.deviceIp === targetDevice.ip ||
                             (crack.target && crack.target.includes(targetDevice.type));
                    })
                    .slice(-5)
                    .map((crack, index) => (
                      <span 
                        key={index} 
                        className="password-chip intel"
                        onClick={() => setPassword(crack.password || crack)}
                        title={`Cracked from: ${crack.target} ${crack.deviceIp ? `(${crack.deviceIp})` : ''}`}
                      >
                        {(crack.password || crack)} 🧠
                        {crack.deviceIp === targetDevice.ip && ' ✓'}
                      </span>
                    ))}
                </div>
                {gameState.crackedPasswords.filter(crack => 
                  !crack.deviceIp || 
                  crack.deviceIp === targetDevice.ip ||
                  (crack.target && crack.target.includes(targetDevice.type))
                ).length === 0 && (
                  <p className="no-relevant-passwords">
                    💡 No cracked passwords found for this device type. Try cracking passwords for {targetDevice.type} devices first.
                  </p>
                )}
              </div>
            )}

            {/* Show phishing data */}
            {gameState.phishingData?.length > 0 && (
              <div className="intel-passwords">
                <h5>🎣 Phishing Credentials</h5>
                <div className="password-suggestions">
                  {gameState.phishingData.slice(-3).map((data, index) => (
                    <span 
                      key={index} 
                      className="password-chip phishing"
                      onClick={() => setPassword(data.password || data.credentials)}
                      title={`Phished from: ${data.target}`}
                    >
                      {data.password || data.credentials} 🎣
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="common-passwords">
              <span className="hint-label">Common passwords for {targetDevice.type} devices:</span>
              <div className="password-suggestions">
                {/* Enhanced device-specific suggestions based on cybersecurity best practices */}
                {targetDevice.type === 'Router' && (
                  <>
                    <span className="password-chip basic" onClick={() => setPassword('admin')}>admin</span>
                    <span className="password-chip basic" onClick={() => setPassword('password')}>password</span>
                    <span className="password-chip intermediate" onClick={() => setPassword('router123')}>router123</span>
                    <span className="password-chip advanced" onClick={() => setPassword('R0ut3r@dmin!')}>R0ut3r@dmin!</span>
                    <span className="password-chip" onClick={() => setPassword(targetDevice.manufacturer?.toLowerCase() || 'linksys')}>
                      {targetDevice.manufacturer?.toLowerCase() || 'linksys'}
                    </span>
                  </>
                )}
                
                {targetDevice.type === 'Server' && (
                  <>
                    <span className="password-chip basic" onClick={() => setPassword('root')}>root</span>
                    <span className="password-chip basic" onClick={() => setPassword('administrator')}>administrator</span>
                    <span className="password-chip intermediate" onClick={() => setPassword('server2024')}>server2024</span>
                    <span className="password-chip advanced" onClick={() => setPassword('S3rv3r@dmin!')}>S3rv3r@dmin!</span>
                    <span className="password-chip advanced" onClick={() => setPassword('R00t#P@ssw0rd')}>R00t#P@ssw0rd</span>
                  </>
                )}
                
                {targetDevice.type === 'Security Camera' && (
                  <>
                    <span className="password-chip basic" onClick={() => setPassword('admin')}>admin</span>
                    <span className="password-chip basic" onClick={() => setPassword('123456')}>123456</span>
                    <span className="password-chip intermediate" onClick={() => setPassword('camera123')}>camera123</span>
                    <span className="password-chip advanced" onClick={() => setPassword('C@mer@Admin!')}>C@mer@Admin!</span>
                    <span className="password-chip advanced" onClick={() => setPassword('Surv3ill@nce2024')}>Surv3ill@nce2024</span>
                  </>
                )}
                
                {targetDevice.type === 'Workstation' && (
                  <>
                    <span className="password-chip basic" onClick={() => setPassword('password')}>password</span>
                    <span className="password-chip basic" onClick={() => setPassword('welcome')}>welcome</span>
                    <span className="password-chip intermediate" onClick={() => setPassword('user123')}>user123</span>
                    <span className="password-chip advanced" onClick={() => setPassword('W0rkst@t1on!')}>W0rkst@t1on!</span>
                    <span className="password-chip" onClick={() => setPassword(targetDevice.os?.includes('Windows') ? 'Windows123' : 'linux')}>
                      {targetDevice.os?.includes('Windows') ? 'Windows123' : 'linux'}
                    </span>
                  </>
                )}
                
                {targetDevice.type === 'Printer' && (
                  <>
                    <span className="password-chip basic" onClick={() => setPassword('admin')}>admin</span>
                    <span className="password-chip basic" onClick={() => setPassword('print')}>print</span>
                    <span className="password-chip intermediate" onClick={() => setPassword('printer123')}>printer123</span>
                    <span className="password-chip advanced" onClick={() => setPassword('Pr1nt3r@dm1n')}>Pr1nt3r@dm1n</span>
                    <span className="password-chip" onClick={() => setPassword(targetDevice.manufacturer?.toLowerCase() || 'hp')}>
                      {targetDevice.manufacturer?.toLowerCase() || 'hp'}
                    </span>
                  </>
                )}
                
                {targetDevice.type === 'IoT Device' && (
                  <>
                    <span className="password-chip basic" onClick={() => setPassword('123456')}>123456</span>
                    <span className="password-chip basic" onClick={() => setPassword('default')}>default</span>
                    <span className="password-chip intermediate" onClick={() => setPassword('smart123')}>smart123</span>
                    <span className="password-chip advanced" onClick={() => setPassword('I0T_D3v1c3!')}>I0T_D3v1c3!</span>
                    <span className="password-chip advanced" onClick={() => setPassword('Sm@rt#H0m3')}>Sm@rt#H0m3</span>
                  </>
                )}
                
                {/* Generic common passwords used in penetration testing */}
                <span className="password-chip" onClick={() => setPassword('changeme')}>changeme</span>
                <span className="password-chip" onClick={() => setPassword('guest')}>guest</span>
                <span className="password-chip intermediate" onClick={() => setPassword('P@ssw0rd123')}>P@ssw0rd123</span>
                <span className="password-chip intermediate" onClick={() => setPassword('Admin2024#')}>Admin2024#</span>
                <span className="password-chip advanced" onClick={() => setPassword('Welcome@123')}>Welcome@123</span>
                <span className="password-chip" onClick={() => setPassword(targetDevice.ip.split('.').pop())}>
                  {targetDevice.ip.split('.').pop()}
                </span>
              </div>
              
              <div className="password-hint">
                💡 <strong>Educational Note:</strong> These include basic, intermediate, and advanced passwords commonly found in penetration testing. 
                Complex passwords use character substitution (@ for a, 3 for e, etc.) and special characters.
                <br/>
                🎯 <strong>Color coding:</strong> <span className="basic">Basic</span> | <span className="intermediate">Intermediate</span> | <span className="advanced">Advanced</span>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="ssh-success">
            <h4>✅ SSH ACCESS SUCCESSFUL</h4>
            <div className="success-details">
              <p>Administrative access gained to {targetDevice?.type || 'target device'}</p>
              <p>Encryption key extracted: {status.includes('SSH-KEY-') ? status.split('SSH-KEY-')[1]?.split(' ')[0] : 'KEY-GENERATED'}</p>
              <div className="success-actions">
                <button 
                  onClick={() => {
                    console.log('SSH Debug - Manual close button clicked');
                    if (onSSHComplete) {
                      onSSHComplete({
                        success: true,
                        ip: ip,
                        key: `SSH-KEY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                        target: targetDevice?.type || 'Unknown',
                        access: 'admin'
                      });
                    }
                  }} 
                  className="continue-btn"
                >
                  🚀 Continue Mission
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SshLogin;
