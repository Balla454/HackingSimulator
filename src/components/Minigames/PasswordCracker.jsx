import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Age-tier tuning: K-5 gets far more attempts/time and full hints up front,
// middle school is the original balanced experience, high school is tighter.
const TIER_SETTINGS = {
  k5: { attemptsMult: 2.5, timeMult: 2.5, maxDifficulty: 3, showAllHints: true },
  middle: { attemptsMult: 1, timeMult: 1, maxDifficulty: 5, showAllHints: false },
  high: { attemptsMult: 0.7, timeMult: 0.65, maxDifficulty: 5, showAllHints: false }
};

const PasswordCracker = ({ onComplete, onPasswordCrackComplete, onFailure, gameState }) => {
  const ageTier = gameState?.ageTier || 'middle';
  const isK5 = ageTier === 'k5';
  const tierSettings = TIER_SETTINGS[ageTier] || TIER_SETTINGS.middle;
  const [currentStep, setCurrentStep] = useState('target_selection');
  const [target, setTarget] = useState(null);
  const [attackMethod, setAttackMethod] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentGuess, setCurrentGuess] = useState('');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [results, setResults] = useState(null);
  const [foundChars, setFoundChars] = useState(new Set());
  const [manualGuess, setManualGuess] = useState('');
  const [hints, setHints] = useState([]);
  
  // Enhanced targets using information from other minigames
  const generateTargets = () => {
    // Generate consistent password using the same logic as SSH component
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

    const baseTargets = [
      { 
        id: 'basic_system',
        name: 'Basic System Account', 
        password: 'admin', 
        difficulty: 1, 
        icon: '🖥️',
        type: 'System Account',
        hints: ['Common admin account', 'Default credentials'],
        estimatedTime: '30 seconds',
        description: 'Standard administrative account with weak security'
      },
      { 
        id: 'employee_workstation',
        name: 'Employee Workstation', 
        password: 'password123', 
        difficulty: 2, 
        icon: '💻',
        type: 'User Account',
        hints: ['Contains numbers', 'Common pattern', 'Over 8 characters'],
        estimatedTime: '2-5 minutes',
        description: 'Typical employee account with predictable password patterns'
      },
      { 
        id: 'server_root',
        name: 'Server Root Access', 
        password: 'S3cur3P@ss!', 
        difficulty: 3, 
        icon: '🖲️',
        type: 'Root Account',
        hints: ['Mixed case', 'Special characters', 'Leetspeak used'],
        estimatedTime: '10-20 minutes',
        description: 'Server root account with moderate security measures'
      },
      { 
        id: 'database_admin',
        name: 'Database Administrator', 
        password: 'MyC0mpl3x!DB#2024', 
        difficulty: 4, 
        icon: '🗄️',
        type: 'Database Account',
        hints: ['Very long', 'Year reference', 'Database related'],
        estimatedTime: '30-60 minutes',
        description: 'High-privilege database account with complex password policy'
      },
      { 
        id: 'security_chief',
        name: 'Security Chief Account', 
        password: 'Qu@ntumEncryp7!0n#', 
        difficulty: 5, 
        icon: '🛡️',
        type: 'Security Account',
        hints: ['Extremely complex', 'Tech terminology', '18+ characters'],
        estimatedTime: '2+ hours',
        description: 'Maximum security account with enterprise-grade password policy'
      }
    ];

    // Add targets based on discovered devices
    const deviceTargets = gameState.scannedDevices?.map((device, index) => ({
      id: `device_${index}`,
      name: `${device.type} at ${device.ip}`,
      password: generateCorrectPassword(device), // Use same password generation as SSH
      difficulty: device.riskLevel === 'critical' ? 2 : device.riskLevel === 'high' ? 3 : 1,
      icon: '🌐',
      type: 'Network Device',
      hints: device.vulnerabilities || ['Unknown vulnerabilities'],
      estimatedTime: 'Variable',
      description: `Network device discovered during reconnaissance`,
      deviceData: device
    })) || [];

    const allTargets = [...baseTargets, ...deviceTargets];
    // Cap difficulty for younger players so passwords stay short and guessable
    return allTargets.filter(t => t.difficulty <= tierSettings.maxDifficulty);
  };

  const targets = generateTargets();

  const attackMethods = useMemo(() => [
    {
      id: 'brute-force',
      name: 'Brute Force Attack',
      k5Name: 'Try Everything',
      description: 'Systematically try all possible character combinations',
      k5Description: 'Keep trying different words until one works',
      icon: '💪',
      speed: 50,
      accuracy: 100,
      complexity: 'High CPU Usage',
      effectiveness: { 1: 95, 2: 80, 3: 60, 4: 30, 5: 10 },
      pros: ['Guaranteed success given time', 'Works on any password'],
      k5Pros: ['Will work on any password!', 'Always finds it eventually'],
      cons: ['Very slow for complex passwords', 'High resource usage'],
      k5Cons: ['Might take a long time', 'Uses lots of power'],
      estimatedTime: 'Minutes to hours'
    },
    {
      id: 'dictionary',
      name: 'Dictionary Attack',
      k5Name: 'Use Common Words',
      description: 'Use common passwords and known patterns',
      k5Description: 'Try words people use all the time',
      icon: '📚',
      speed: 200,
      accuracy: 70,
      complexity: 'Low CPU Usage',
      effectiveness: { 1: 90, 2: 85, 3: 50, 4: 20, 5: 5 },
      pros: ['Fast for common passwords', 'Low resource usage'],
      k5Pros: ['Super fast!', 'Doesn\'t use much power'],
      cons: ['Ineffective against complex passwords', 'Limited wordlist'],
      k5Cons: ['Won\'t work on tricky passwords', 'Need the right word list'],
      estimatedTime: 'Seconds to minutes'
    },
    {
      id: 'rainbow-table',
      name: 'Rainbow Table Lookup',
      k5Name: 'Look It Up',
      description: 'Use precomputed hash tables for instant cracking',
      k5Description: 'Look the password up in a big list',
      icon: '🌈',
      speed: 500,
      accuracy: 60,
      complexity: 'High Memory Usage',
      effectiveness: { 1: 80, 2: 70, 3: 40, 4: 15, 5: 5 },
      pros: ['Extremely fast when hash found', 'No computation needed'],
      k5Pros: ['Lightning fast!', 'No waiting'],
      cons: ['Requires pre-built tables', 'Storage intensive'],
      k5Cons: ['Need the right list', 'Uses lots of space'],
      estimatedTime: 'Instant to minutes'
    },
    {
      id: 'hybrid',
      name: 'Hybrid Attack',
      k5Name: 'Mix and Match',
      description: 'Combine dictionary words with common mutations',
      k5Description: 'Try words with small changes mixed in',
      icon: '🔄',
      speed: 150,
      accuracy: 80,
      complexity: 'Medium CPU Usage',
      effectiveness: { 1: 85, 2: 75, 3: 65, 4: 40, 5: 15 },
      pros: ['Good balance of speed and coverage', 'Catches common variations'],
      k5Pros: ['Good balance!', 'Catches smart password changes'],
      cons: ['May miss truly random passwords', 'Moderate resource usage'],
      k5Cons: ['Might miss random passwords', 'Needs some power'],
      estimatedTime: 'Minutes to hours'
    }
  ], []);

  // Character sets for brute force
  const charSets = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      1: '#4CAF50', // Easy - Green
      2: '#8BC34A', // Medium-Easy - Light Green  
      3: '#ffaa00', // Medium - Orange
      4: '#ff6b47', // Hard - Red-Orange
      5: '#ff3333'  // Very Hard - Red
    };
    return colors[difficulty] || '#666';
  };

  const getMethodEffectiveness = (method, targetDifficulty) => {
    return method.effectiveness[targetDifficulty] || 50;
  };

  // Define completeAttack early to avoid "use before define" errors
  const completeAttack = useCallback((success, password, attemptCount) => {
    setIsRunning(false);
    setProgress(prev => success ? 100 : prev);
    
    // Debug the password generation for this specific device
    if (target.deviceData) {
      console.log('PasswordCracker Debug - Target device:', target.deviceData);
      console.log('PasswordCracker Debug - Generated password for device:', password);
      console.log('PasswordCracker Debug - Device IP:', target.deviceData.ip);
      console.log('PasswordCracker Debug - Device type:', target.deviceData.type);
      console.log('PasswordCracker Debug - Device vulnerabilities:', target.deviceData.vulnerabilities);
    }
    
    const result = {
      success,
      target: target.name,
      password: password,
      method: attackMethods.find(m => m.id === attackMethod)?.name,
      deviceIp: target.deviceData?.ip,
      difficulty: target.difficulty,
      timeElapsed: timeElapsed.toFixed(1),
      attempts: attemptCount,
      timestamp: new Date().toISOString()
    };
    
    console.log('PasswordCracker Debug - Final result object:', result);
    
    setResults(result);
    setCurrentStep('results');
    
    if (success && onPasswordCrackComplete) {
      onPasswordCrackComplete(result);
    } else if (!success && onFailure) {
      // Call onFailure for failed password cracking attempts
      const failureReason = attemptCount >= 1000 ? 
        `Brute force timeout on ${target.name} after ${attemptCount} attempts` :
        `Password cracking failed on ${target.name} - insufficient attack effectiveness`;
      onFailure(failureReason);
    }
    
    setTimeout(() => {
      onComplete(success ? 
        `Password cracked! "${password}" found in ${attemptCount} attempts (${timeElapsed.toFixed(1)}s)` :
        `Attack failed. Password not found after ${attemptCount} attempts.`
      );
    }, 3000);
  }, [target, attackMethod, timeElapsed, onPasswordCrackComplete, onFailure, onComplete, attackMethods]);

  // Define generateRandomGuess early too
  const generateRandomGuess = useCallback(() => {
    const allChars = charSets.lowercase + charSets.uppercase + charSets.numbers + charSets.special;
    let guess = '';
    const targetLength = target.password.length;
    
    for (let i = 0; i < targetLength; i++) {
      if (foundChars.has(i)) {
        guess += target.password[i];
      } else {
        // Smart guessing based on position analysis
        if (Math.random() < 0.1) {
          guess += target.password[i]; // Occasionally find correct char
          setFoundChars(prev => new Set([...prev, i]));
        } else {
          guess += allChars[Math.floor(Math.random() * allChars.length)];
        }
      }
    }
    return guess;
  }, [target, foundChars, charSets.lowercase, charSets.uppercase, charSets.numbers, charSets.special]);

  // Enhanced attack simulation with realistic failure rates
  const performBruteForceStep = useCallback(() => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    // Calculate failure conditions based on target difficulty and method effectiveness
    const effectiveness = getMethodEffectiveness(attackMethods.find(m => m.id === 'brute-force'), target.difficulty);
    const maxAttempts = Math.floor((2000 / (effectiveness / 100)) * tierSettings.attemptsMult); // Harder targets need more attempts
    const timeLimit = target.difficulty * 30 * tierSettings.timeMult; // 30 seconds per difficulty level
    
    // Check for failure conditions
    if (newAttempts >= maxAttempts || timeElapsed >= timeLimit) {
      completeAttack(false, null, newAttempts);
      return;
    }
    
    const guess = generateRandomGuess();
    setCurrentGuess(guess);
    setProgress(Math.min((newAttempts / maxAttempts) * 100, 95));
    
    // Check for character matches to update foundChars
    const newFoundChars = new Set(foundChars);
    for (let i = 0; i < guess.length && i < target.password.length; i++) {
      if (guess[i] === target.password[i]) {
        newFoundChars.add(i);
      }
    }
    setFoundChars(newFoundChars);
    
    // Success condition with realistic probability
    if (guess === target.password || (Math.random() < (effectiveness / 100) * 0.01 && newAttempts > 50)) {
      completeAttack(true, target.password, newAttempts);
    }
  }, [attempts, target, timeElapsed, foundChars, completeAttack, generateRandomGuess, attackMethods]);

  const performDictionaryStep = useCallback(() => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    // Calculate failure conditions for dictionary attack
    const effectiveness = getMethodEffectiveness(attackMethods.find(m => m.id === 'dictionary'), target.difficulty);
    const maxAttempts = Math.floor((500 / (effectiveness / 100)) * tierSettings.attemptsMult); // Dictionary has fewer attempts
    const timeLimit = target.difficulty * 10 * tierSettings.timeMult; // Faster but more likely to fail on complex passwords
    
    // Check for failure conditions
    if (newAttempts >= maxAttempts || timeElapsed >= timeLimit) {
      completeAttack(false, null, newAttempts);
      return;
    }
    
    // Simulate dictionary lookup with word variations
    const commonPasswords = ['password', 'admin', '123456', 'password123', 'admin123', 'welcome', 'login', 'qwerty'];
    const guess = commonPasswords[newAttempts % commonPasswords.length] + (newAttempts > commonPasswords.length ? newAttempts : '');
    
    setCurrentGuess(guess);
    setProgress(Math.min((newAttempts / maxAttempts) * 100, 95));
    
    // Success condition - good for simple passwords, poor for complex ones
    if (guess === target.password || (Math.random() < (effectiveness / 100) * 0.05 && newAttempts > 20)) {
      completeAttack(true, target.password, newAttempts);
    }
  }, [attempts, target, timeElapsed, completeAttack, attackMethods]);

  const performRainbowStep = useCallback(() => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    // Calculate failure conditions for rainbow table attack
    const effectiveness = getMethodEffectiveness(attackMethods.find(m => m.id === 'rainbow-table'), target.difficulty);
    const maxAttempts = Math.floor((100 / (effectiveness / 100)) * tierSettings.attemptsMult); // Rainbow tables are fast but limited
    const timeLimit = target.difficulty * 5 * tierSettings.timeMult; // Very fast but fails quickly if hash not found
    
    // Check for failure conditions
    if (newAttempts >= maxAttempts || timeElapsed >= timeLimit) {
      completeAttack(false, null, newAttempts);
      return;
    }
    
    // Simulate hash table lookup - very fast but limited coverage
    const guess = generateRandomGuess();
    setCurrentGuess(`Looking up hash: ${guess.substring(0, 8)}...`);
    setProgress(Math.min((newAttempts / maxAttempts) * 100, 95));
    
    // Success condition - excellent for simple passwords, terrible for complex ones
    if (guess === target.password || (Math.random() < (effectiveness / 100) * 0.1 && newAttempts > 5)) {
      completeAttack(true, target.password, newAttempts);
    }
  }, [attempts, target, timeElapsed, completeAttack, generateRandomGuess, attackMethods]);

  const performHybridStep = useCallback(() => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    // Calculate failure conditions for hybrid attack
    const effectiveness = getMethodEffectiveness(attackMethods.find(m => m.id === 'hybrid'), target.difficulty);
    const maxAttempts = Math.floor((1000 / (effectiveness / 100)) * tierSettings.attemptsMult); // Balanced approach
    const timeLimit = target.difficulty * 20 * tierSettings.timeMult; // Moderate time limit
    
    // Check for failure conditions
    if (newAttempts >= maxAttempts || timeElapsed >= timeLimit) {
      completeAttack(false, null, newAttempts);
      return;
    }
    
    // Simulate hybrid attack - dictionary words with mutations
    const baseWords = ['password', 'admin', 'user', 'login', 'welcome'];
    const mutations = ['123', '!', '2024', '@', '$$'];
    const baseWord = baseWords[newAttempts % baseWords.length];
    const mutation = mutations[Math.floor(newAttempts / baseWords.length) % mutations.length];
    const guess = baseWord + mutation;
    
    setCurrentGuess(guess);
    setProgress(Math.min((newAttempts / maxAttempts) * 100, 95));
    
    // Success condition - good balance for most password types
    if (guess === target.password || (Math.random() < (effectiveness / 100) * 0.03 && newAttempts > 30)) {
      completeAttack(true, target.password, newAttempts);
    }
  }, [attempts, target, timeElapsed, completeAttack, attackMethods]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 0.3);
      
      try {
        switch (attackMethod) {
          case 'brute-force':
            performBruteForceStep();
            break;
          case 'dictionary':
            performDictionaryStep();
            break;
          case 'rainbow-table':
            performRainbowStep();
            break;
          case 'hybrid':
            performHybridStep();
            break;
          default:
            setIsRunning(false);
        }
      } catch (error) {
        console.error('Error in attack simulation:', error);
        setIsRunning(false);
        if (onFailure) {
          onFailure('Attack simulation error');
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isRunning, attackMethod, performBruteForceStep, performDictionaryStep, performRainbowStep, performHybridStep, onFailure]);

  const startAttack = () => {
    setCurrentStep('attack_phase');
    setIsRunning(true);
    setAttempts(0);
    setProgress(0);
    setTimeElapsed(0);
    setFoundChars(new Set());
  };

  const stopAttack = () => {
    setIsRunning(false);
  };

  const resetToTargetSelection = () => {
    setCurrentStep('target_selection');
    setTarget(null);
    setAttackMethod('');
    setIsRunning(false);
    setAttempts(0);
    setProgress(0);
    setTimeElapsed(0);
    setFoundChars(new Set());
    setResults(null);
  };

  const proceedToMethodSelection = () => {
    if (target) {
      setCurrentStep('method_selection');
    }
  };

  const handleManualGuess = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (manualGuess === target.password) {
      completeAttack(true, target.password, newAttempts);
    } else {
      // Provide character-by-character feedback
      const feedback = [];
      for (let i = 0; i < Math.max(manualGuess.length, target.password.length); i++) {
        if (i < manualGuess.length && i < target.password.length) {
          feedback.push(manualGuess[i] === target.password[i] ? '✓' : '✗');
        } else {
          feedback.push('?');
        }
      }
      setHints([...hints, `Attempt ${newAttempts}: ${feedback.join('')}`]);
    }
    setManualGuess('');
  };

  return (
    <div className={`password-cracker-enhanced${isK5 ? ' tier-k5' : ''}`}>
      {/* Header with Progress Steps */}
      <div className="pc-header-enhanced">
        <div className="mission-badge">
          <span className="mission-icon">🔓</span>
          <div className="mission-info">
            <h2>{isK5 ? '🔑 Guess the Password' : '💻 Password Cracking Operations'}</h2>
            <div className="mission-title">{isK5 ? 'Test a weak password' : 'Credential Access & Recovery'}</div>
            <div className="mission-scenario">{isK5 ? "Some passwords are easy to guess! Let's find out which ones." : 'Extract authentication credentials from target systems'}</div>
          </div>
        </div>
        
        {/* Progress Indicator */}
        <div className="progress-steps">
          <div className={`step ${currentStep === 'target_selection' ? 'active' : currentStep !== 'target_selection' ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Target</span>
          </div>
          <div className={`step ${currentStep === 'method_selection' ? 'active' : (currentStep === 'attack_phase' || currentStep === 'results') ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Method</span>
          </div>
          <div className={`step ${currentStep === 'attack_phase' ? 'active' : currentStep === 'results' ? 'completed' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Attack</span>
          </div>
          <div className={`step ${currentStep === 'results' ? 'active' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">Results</span>
          </div>
        </div>
      </div>

      {/* Step 1: Target Selection */}
      {currentStep === 'target_selection' && (
        <div className="step-content">
          <div className="step-header">
            <h3>{isK5 ? '🎯 Pick Something to Test' : '🎯 Select Password Target'}</h3>
            <p>{isK5 ? 'Click on an account below to try guessing its password.' : "Choose a system or account to attempt password cracking. Consider the security level and estimated crack time."}</p>
          </div>
          
          <div className="targets-enhanced-grid">
            {targets.map(tgt => {
              const isSelected = target?.id === tgt.id;
              
              return (
                <div 
                  key={tgt.id}
                  className={`target-card-enhanced ${isSelected ? 'selected' : ''}`}
                  onClick={() => setTarget(tgt)}
                  style={{ borderColor: isSelected ? getDifficultyColor(tgt.difficulty) : undefined }}
                >
                  <div className="target-avatar">{tgt.icon}</div>
                  <div className="target-info">
                    <h4>{tgt.name}</h4>
                    <div className="target-type" style={{ color: getDifficultyColor(tgt.difficulty) }}>
                      {tgt.type}
                    </div>
                    <div className="target-description">{tgt.description}</div>
                  </div>
                  
                  <div className="target-stats">
                    <div className="difficulty-rating">
                      <span className="stat-label">{isK5 ? 'How Tricky:' : 'Security Level:'}</span>
                      <div className="difficulty-display">
                        <div className="difficulty-stars">
                          {'🔒'.repeat(tgt.difficulty)}{'🔓'.repeat(5-tgt.difficulty)}
                        </div>
                        {!isK5 && (
                          <span className="difficulty-text" style={{ color: getDifficultyColor(tgt.difficulty) }}>
                            Level {tgt.difficulty}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="estimated-time">
                      <span className="stat-label">{isK5 ? 'Time to Guess:' : 'Est. Time:'}</span>
                      <span className="time-value">{tgt.estimatedTime}</span>
                    </div>
                  </div>

                  {isSelected && tgt.hints && (
                    <div className="target-details-preview">
                      <div className="hints-preview">
                        <strong>Intelligence Gathered:</strong>
                        <div className="hint-tags">
                          {tgt.hints.map((hint, index) => (
                            <span key={index} className="hint-tag">
                              {hint}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isSelected && (
                    <div className="selection-indicator">
                      ✓ SELECTED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {target && (
            <div className="continue-button-container">
              <button 
                className="continue-btn-enhanced"
                onClick={proceedToMethodSelection}
              >
                Select Attack Method →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Method Selection */}
      {currentStep === 'method_selection' && target && (
        <div className="step-content">
          <div className="step-header">
            <h3>{isK5 ? '⚔️ Pick a Way to Guess' : '⚔️ Choose Attack Method'}</h3>
            <p>{isK5 ? 'Different ways of guessing work better on different passwords. Pick one to try!' : "Select a password cracking technique. Consider the target's security level and your time constraints."}</p>
          </div>

          <div className="target-reminder">
            <span className="target-avatar-small">{target.icon}</span>
            <span>Target: <strong>{target.name}</strong> (Security Level {target.difficulty})</span>
            <button className="change-target-btn" onClick={resetToTargetSelection}>
              Change Target
            </button>
          </div>
          
          <div className="methods-enhanced-grid">
            {attackMethods.map(method => {
              const isSelected = attackMethod === method.id;
              const effectiveness = getMethodEffectiveness(method, target.difficulty);
              
              return (
                <div 
                  key={method.id}
                  className={`method-card-enhanced ${isSelected ? 'selected' : ''}`}
                  onClick={() => setAttackMethod(method.id)}
                >
                  <div className="method-header">
                    <div className="method-icon-large">{method.icon}</div>
                    <div className="method-title">
                      <h4>{isK5 ? method.k5Name : method.name}</h4>
                      {!isK5 && <div className="method-complexity">{method.complexity}</div>}
                    </div>
                  </div>

                  <p className="method-description">{isK5 ? method.k5Description : method.description}</p>
                  
                  <div className="method-stats">
                    <div className="effectiveness-bar">
                      <span className="stat-label">{isK5 ? 'How well it works:' : `Effectiveness vs Level ${target.difficulty}:`}</span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${effectiveness}%` }}
                        ></div>
                      </div>
                      <span className="percentage">{effectiveness}%</span>
                    </div>

                    {!isK5 && (
                      <div className="time-estimate">
                        <span className="stat-label">Time Estimate:</span>
                        <span className="time-value">{method.estimatedTime}</span>
                      </div>
                    )}
                  </div>

                  {(isK5 || !isK5) && (
                    <div className="method-pros-cons">
                      <div className="pros">
                        <strong>{isK5 ? '✓ Good:' : 'Advantages:'}</strong>
                        <ul>
                          {(isK5 ? method.k5Pros : method.pros).map((pro, index) => (
                            <li key={index}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="cons">
                        <strong>{isK5 ? '✗ Not so good:' : 'Limitations:'}</strong>
                        <ul>
                          {(isK5 ? method.k5Cons : method.cons).map((con, index) => (
                            <li key={index}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {isSelected && (
                    <div className="selection-indicator">
                      ✓ SELECTED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {attackMethod && (
            <div className="continue-button-container">
              <button 
                className="execute-btn-enhanced"
                onClick={startAttack}
              >
                🚀 Launch Attack
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Attack Phase */}
      {currentStep === 'attack_phase' && (
        <div className="attack-interface">
          <div className="attack-header">
            <div className="target-info-header">
              <span className="target-avatar-attack">{target.icon}</span>
              <div className="attack-title">
                <h3>{isK5 ? `🔍 Guessing: ${target.name}` : `⚔️ Active Attack: ${target.name}`}</h3>
                <div className="method-badge">{isK5 ? 'Using: ' : 'Method: '}{attackMethods.find(m => m.id === attackMethod)?.name}</div>
              </div>
            </div>
            
            <div className="attack-metrics">
              <div className="metric">
                <span className="metric-label">Progress</span>
                <div className="metric-bar progress">
                  <div className="metric-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="metric-value">{Math.round(progress)}%</span>
              </div>
              <div className="metric">
                <span className="metric-label">Attempts</span>
                <span className="metric-value">{attempts.toLocaleString()}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Time</span>
                <span className="metric-value">{timeElapsed.toFixed(1)}s</span>
              </div>
            </div>
          </div>

          <div className="attack-display">
            <div className="current-attempt">
              <h4>Current Attempt:</h4>
              <div className="guess-display">
                <code>{currentGuess}</code>
              </div>
            </div>

            {foundChars.size > 0 && (
              <div className="found-chars">
                <h4>Discovered Characters:</h4>
                <div className="char-positions">
                  {Array.from({ length: target.password.length }, (_, i) => (
                    <span 
                      key={i} 
                      className={`char-pos ${foundChars.has(i) ? 'found' : 'unknown'}`}
                    >
                      {foundChars.has(i) ? target.password[i] : '?'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="attack-controls">
              {isRunning ? (
                <button className="stop-btn" onClick={stopAttack}>
                  ⏹️ Stop Attack
                </button>
              ) : (
                <button className="resume-btn" onClick={() => setIsRunning(true)}>
                  ▶️ Resume Attack
                </button>
              )}
            </div>

            <div className="manual-guess-section">
              <h4>Manual Password Guess:</h4>
              <div className="manual-guess-controls">
                <input
                  type="text"
                  value={manualGuess}
                  onChange={(e) => setManualGuess(e.target.value)}
                  placeholder="Enter password guess..."
                  className="manual-guess-input"
                />
                <button 
                  className="guess-btn"
                  onClick={handleManualGuess}
                  disabled={!manualGuess.trim()}
                >
                  Try Guess
                </button>
              </div>
            </div>

            {hints.length > 0 && (
              <div className="hints-section">
                <h4>Feedback:</h4>
                <div className="hints-list">
                  {hints.slice(-5).map((hint, index) => (
                    <div key={index} className="hint-item">
                      {hint}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {currentStep === 'results' && results && (
        <div className="results-interface">
          <div className="results-header">
            <div className={`result-status-large ${results.success ? 'success' : 'failure'}`}>
              {results.success ? (isK5 ? '🔓 You Found It!' : '🔓 Password Cracked!') : (isK5 ? '🔒 No Luck This Time' : '🔒 Attack Failed')}
            </div>
            <div className="result-summary">
              {results.success ?
                (isK5 ? `Great job! The password was "${results.password}"` : `Successfully cracked password "${results.password}"`) :
                (isK5 ? "That one was too tricky - try a different one!" : 'Target password could not be determined')
              }
            </div>
          </div>

          <div className="results-analysis">
            <div className="analysis-section">
              <h4>{isK5 ? '📊 What Happened' : '📊 Attack Analysis'}</h4>
              <div className="analysis-grid">
                <div className="analysis-item">
                  <span className="analysis-label">Target:</span>
                  <span className="analysis-value">{results.target}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Method:</span>
                  <span className="analysis-value">{results.method}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Security Level:</span>
                  <span className="analysis-value">{'🔒'.repeat(results.difficulty)}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Total Attempts:</span>
                  <span className="analysis-value">{results.attempts.toLocaleString()}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Time Elapsed:</span>
                  <span className="analysis-value">{results.timeElapsed}s</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Attack Rate:</span>
                  <span className="analysis-value">{Math.round(results.attempts / parseFloat(results.timeElapsed))}/sec</span>
                </div>
              </div>
            </div>

            {results.success && (
              <div className="credentials-section">
                <h4>{isK5 ? '🔑 The Password' : '🔑 Extracted Credentials'}</h4>
                <div className="credential-card">
                  <div className="credential-item">
                    <span className="credential-label">Target:</span>
                    <span className="credential-value">{results.target}</span>
                  </div>
                  <div className="credential-item">
                    <span className="credential-label">Password:</span>
                    <span className="credential-value password-value">
                      <code>{results.password}</code>
                    </span>
                  </div>
                  {results.deviceIp && (
                    <div className="credential-item">
                      <span className="credential-label">Network Address:</span>
                      <span className="credential-value">{results.deviceIp}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="results-actions">
            <button 
              className="new-attack-btn"
              onClick={resetToTargetSelection}
            >
              🔄 New Attack
            </button>
            <button 
              className="complete-btn"
              onClick={() => onComplete(results.success ? 
                `Password cracked! "${results.password}" found in ${results.attempts} attempts (${results.timeElapsed}s)` :
                `Attack failed. Password not found after ${results.attempts} attempts.`
              )}
            >
              📋 Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordCracker;
