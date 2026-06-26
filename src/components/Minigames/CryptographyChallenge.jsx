import React, { useState, useEffect, useCallback, useMemo } from 'react';

// K-5: friendly "Solve the Code" challenges — no military/intelligence framing,
// just fun secret messages decoded with two simple kid-named tools.
const K5_CODE_CHALLENGES = [
  {
    id: 'k5_birthday',
    icon: '🎂',
    context: 'A secret birthday message from a friend',
    ciphertext: 'KDSSB ELUWKGDB',
    plaintext: 'HAPPY BIRTHDAY',
    cipherType: 'caesar'
  },
  {
    id: 'k5_hello',
    icon: '👋',
    context: 'A mixed-up greeting someone left for you',
    ciphertext: 'SVOOL DLIOW',
    plaintext: 'HELLO WORLD',
    cipherType: 'atbash'
  },
  {
    id: 'k5_treasure',
    icon: '🗺️',
    context: 'A treasure map clue to where to meet up',
    ciphertext: 'RJJY FY YMJ UFWP',
    plaintext: 'MEET AT THE PARK',
    cipherType: 'caesar'
  },
  {
    id: 'k5_detective',
    icon: '🕵️',
    context: 'A note slipped under your detective club door',
    ciphertext: 'JRRG MRE GHWHFWLYH',
    plaintext: 'GOOD JOB DETECTIVE',
    cipherType: 'caesar'
  },
  {
    id: 'k5_recess',
    icon: '🎮',
    context: 'A note passed during recess',
    ciphertext: 'TLLW TZNV',
    plaintext: 'GOOD GAME',
    cipherType: 'atbash'
  }
];

const shuffleCodes = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const getCodeRank = (solved, total) => {
  const pct = solved / total;
  if (pct >= 0.99) return '🏆 Master Code Breaker!';
  if (pct >= 0.5) return '🥈 Code Breaker';
  return '🥉 Code Cadet — keep practicing!';
};

// Gentle hints explaining *why* a tool fits, instead of just "try again" — named after the real ciphers
const K5_CIPHER_HINTS = {
  caesar: '🔄 Tip: this looks like a Caesar Cipher — each letter slides forward in the alphabet by the same amount. Try Shift Code!',
  atbash: '🪞 Tip: this looks like an Atbash Cipher — each letter swaps to its mirror opposite (A↔Z, B↔Y). Try Mirror Code!'
};

const CryptographyChallenge = ({ onCryptoComplete, addOutput, message, gameState }) => {
  const ageTier = gameState?.ageTier || 'middle';
  const isK5 = ageTier === 'k5';

  // K-5 simplified state
  const [k5Codes] = useState(() => shuffleCodes(K5_CODE_CHALLENGES));
  const [k5Index, setK5Index] = useState(0);
  const [k5Tries, setK5Tries] = useState(0);
  const [k5Solved, setK5Solved] = useState(false);
  const [k5Message, setK5Message] = useState('');
  const [k5Done, setK5Done] = useState(false);
  const [k5SolvedCount, setK5SolvedCount] = useState(0);
  const [k5ByteLine, setK5ByteLine] = useState("Hi, Detective! I'm Byte 🕵️. Someone left an encrypted message — let's crack the cipher together!");

  const k5Challenge = k5Codes[k5Index];

  const k5TryTool = (toolType) => {
    if (toolType === k5Challenge.cipherType) {
      setK5Solved(true);
      setK5SolvedCount(c => c + 1);
      setK5Message(`🎉 You cracked it! The secret message is: "${k5Challenge.plaintext}"`);
      setK5ByteLine(k5Tries === 0 ? 'Great decoding! 🎉 You\'re thinking like a real codebreaker.' : 'There it is! Mistakes are just part of cracking codes. 🌟');
      addOutput && addOutput(`✅ Code solved: ${k5Challenge.plaintext}`);
    } else {
      setK5Tries(t => t + 1);
      setK5Message(K5_CIPHER_HINTS[k5Challenge.cipherType] || "🤔 That tool didn't work this time — try the other one!");
      setK5ByteLine("That's okay — not every guess works the first time. Here's a clue:");
    }
  };

  const k5Next = () => {
    if (k5Index + 1 >= k5Codes.length) {
      setK5Done(true);
      setTimeout(() => {
        onCryptoComplete && onCryptoComplete(`✅ Solved ${k5SolvedCount} secret code(s)!`);
      }, 1200);
    } else {
      setK5Index(i => i + 1);
      setK5Solved(false);
      setK5Message('');
      setK5ByteLine('Next code — let\'s crack it! 🔍');
    }
  };

  const [currentStep, setCurrentStep] = useState('cipher_analysis');
  const [selectedCipher, setSelectedCipher] = useState('');
  const [decodedResult, setDecodedResult] = useState('');
  const [cryptoChallenge, setCryptoChallenge] = useState(null);
  const [analysisResults, setAnalysisResults] = useState({});
  const [manualKey, setManualKey] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [hints, setHints] = useState([]);
  const [decryptionProgress, setDecryptionProgress] = useState(0);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [targetMessage, setTargetMessage] = useState('');
  const [decryptionResults, setDecryptionResults] = useState(null);
  const [selectedDecryptionMethod, setSelectedDecryptionMethod] = useState('');
  const [cipherAnalysis, setCipherAnalysis] = useState(null);

  const cipherTypes = {
    'caesar': { 
      name: 'Caesar Cipher', 
      description: 'Shift each letter by a fixed number of positions in the alphabet',
      complexity: 1,
      icon: '🏛️',
      method: 'Brute Force (26 keys)',
      timeEstimate: '< 1 second',
      successRate: 95,
      tips: ['Look for common English words', 'Try shifts of 1-25', 'Most common shift is 13 (ROT13)']
    },
    'substitution': { 
      name: 'Substitution Cipher', 
      description: 'Replace each letter with another letter consistently',
      complexity: 3,
      icon: '🔄',
      method: 'Frequency Analysis',
      timeEstimate: '30-60 seconds',
      successRate: 75,
      tips: ['E is most common English letter', 'Look for repeated patterns', 'Single letters likely A or I']
    },
    'vigenere': { 
      name: 'Vigenère Cipher', 
      description: 'Polyalphabetic substitution cipher using a repeating keyword',
      complexity: 4,
      icon: '🗝️',
      method: 'Kasiski Analysis',
      timeEstimate: '2-5 minutes',
      successRate: 60,
      tips: ['Find repeating sequences', 'Calculate key length', 'Apply frequency analysis to each column']
    },
    'atbash': { 
      name: 'Atbash Cipher', 
      description: 'Simple substitution where A↔Z, B↔Y, etc.',
      complexity: 2,
      icon: '🪞',
      method: 'Direct Mapping',
      timeEstimate: '< 1 second',
      successRate: 100,
      tips: ['A becomes Z, B becomes Y', 'Symmetric cipher', 'No key required']
    },
    'base64': { 
      name: 'Base64 Encoding', 
      description: 'Binary-to-text encoding scheme using 64 characters',
      complexity: 1,
      icon: '📊',
      method: 'Standard Decoding',
      timeEstimate: '< 1 second',
      successRate: 100,
      tips: ['Uses A-Z, a-z, 0-9, +, /', 'Padding with = characters', 'Not encryption, just encoding']
    },
    'hex': { 
      name: 'Hexadecimal', 
      description: 'Base-16 number system representation',
      complexity: 1,
      icon: '🔢',
      method: 'Hex to ASCII',
      timeEstimate: '< 1 second',
      successRate: 100,
      tips: ['Uses 0-9 and A-F', 'Two hex digits per character', 'Common in programming']
    },
    'binary': { 
      name: 'Binary Code', 
      description: 'Base-2 number system using only 0s and 1s',
      complexity: 2,
      icon: '💾',
      method: 'Binary to ASCII',
      timeEstimate: '< 1 second',
      successRate: 100,
      tips: ['8 bits per character', 'Only 0s and 1s', 'Fundamental computer language']
    },
    'morse': { 
      name: 'Morse Code', 
      description: 'Telegraph encoding using dots and dashes',
      complexity: 2,
      icon: '📡',
      method: 'Morse Dictionary',
      timeEstimate: '< 1 second',
      successRate: 95,
      tips: ['Dots and dashes only', 'Letters separated by spaces', 'E = ., T = -']
    },
    'rsa': { 
      name: 'RSA Encryption', 
      description: 'Public-key cryptography using large prime numbers',
      complexity: 5,
      icon: '🔐',
      method: 'Key Factorization',
      timeEstimate: '10+ minutes',
      successRate: 30,
      tips: ['Requires private key', 'Based on prime factorization', 'Very secure when implemented correctly']
    }
  };

  // Enhanced cipher challenges with realistic analysis requirements
  const cipherChallenges = useMemo(() => [
    {
      id: 'caesar_basic',
      name: 'Caesar Cipher - Military Dispatch',
      difficulty: 1,
      type: 'substitution',
      icon: '🏛️',
      ciphertext: 'WKH HQHPB DWWDFNV DW GDZQ',
      plaintext: 'THE ENEMY ATTACKS AT DAWN',
      key: 3,
      context: 'Intercepted military communication',
      characteristics: {
        hasNumbers: false,
        hasSpaces: true,
        lengthPattern: 'Words preserved',
        frequency: 'Shifted letters',
        commonWords: 'DW = AT, WKH = THE'
      },
      weaknesses: ['Frequency analysis', 'Common word patterns', 'Limited key space'],
      bestMethods: ['frequency', 'bruteforce'],
      hints: ['Notice "WKH" appears twice', 'Short common words like "DW" are clues', 'Try small shift values'],
      description: 'Classic substitution cipher with fixed shift value'
    },
    {
      id: 'vigenere_intermediate',
      name: 'Vigenère Cipher - Diplomatic Cable',
      difficulty: 3,
      type: 'polyalphabetic',
      icon: '🏛️',
      ciphertext: 'LXFOPVEFRNHR SNWMR WGZO KTSG',
      plaintext: 'NEGOTIATIONS BREAK DOWN TONIGHT',
      key: 'CRYPTO',
      context: 'Encrypted diplomatic correspondence',
      characteristics: {
        hasNumbers: false,
        hasSpaces: true,
        lengthPattern: 'Words preserved',
        frequency: 'Flattened distribution',
        commonWords: 'Difficult to identify'
      },
      weaknesses: ['Kasiski examination', 'Index of coincidence', 'Key length analysis'],
      bestMethods: ['kasiski', 'dictionary'],
      hints: ['Letter frequencies are more evenly distributed', 'Look for repeated sequences', 'Key length affects pattern repetition'],
      description: 'Polyalphabetic cipher using a repeating keyword'
    },
    {
      id: 'playfair_advanced',
      name: 'Playfair Cipher - Intelligence Report',
      difficulty: 4,
      type: 'digraph',
      icon: '🕵️',
      ciphertext: 'GATLMZCLRQTX',
      plaintext: 'MEETATMIDNIGHT',
      key: 'MONARCHY',
      context: 'High-level intelligence communication',
      characteristics: {
        hasNumbers: false,
        hasSpaces: false,
        lengthPattern: 'Even length (digraphs)',
        frequency: 'Digraph patterns',
        commonWords: 'Heavily obscured'
      },
      weaknesses: ['Digraph frequency analysis', 'Known plaintext attacks', 'Grid reconstruction'],
      bestMethods: ['digraph', 'known_plaintext'],
      hints: ['Text is processed in pairs', 'No double letters in plaintext', 'Grid-based substitution'],
      description: 'Digraph substitution using a 5x5 key square'
    },
    {
      id: 'enigma_expert',
      name: 'Enigma Machine - WWII Intelligence',
      difficulty: 5,
      type: 'rotor',
      icon: '⚙️',
      ciphertext: 'NZCHABCDEFGH',
      plaintext: 'HELLOWORLD',
      key: 'B-III-II-I-01-01-AAA',
      context: 'World War II German military communication',
      characteristics: {
        hasNumbers: false,
        hasSpaces: false,
        lengthPattern: 'No double encryptions',
        frequency: 'Completely flattened',
        commonWords: 'Unrecognizable'
      },
      weaknesses: ['Crib attacks', 'Ring setting analysis', 'Bombe attacks'],
      bestMethods: ['crib', 'bombe'],
      hints: ['No letter encrypts to itself', 'Rotor positions change each letter', 'Reflector ensures reciprocal encryption'],
      description: 'Complex rotor machine with plugboard and reflector'
    }
  ], []);

  // Decryption methods with strategic choices
  const decryptionMethods = useMemo(() => [
    {
      id: 'frequency',
      name: 'Frequency Analysis',
      icon: '📊',
      description: 'Analyze letter frequency patterns to identify substitutions',
      complexity: 'Beginner',
      timeRequired: 'Fast',
      effectiveness: {
        substitution: 95,
        polyalphabetic: 30,
        digraph: 40,
        rotor: 10
      },
      bestFor: ['Caesar cipher', 'Simple substitution', 'Monoalphabetic ciphers'],
      process: 'Count letter frequencies and compare to English language patterns',
      limitations: 'Ineffective against polyalphabetic and modern ciphers'
    },
    {
      id: 'bruteforce',
      name: 'Brute Force Attack',
      icon: '💪',
      description: 'Try all possible keys systematically',
      complexity: 'Beginner',
      timeRequired: 'Variable',
      effectiveness: {
        substitution: 100,
        polyalphabetic: 20,
        digraph: 15,
        rotor: 5
      },
      bestFor: ['Small key spaces', 'Caesar cipher', 'Simple shift ciphers'],
      process: 'Systematically test every possible key combination',
      limitations: 'Computationally infeasible for large key spaces'
    },
    {
      id: 'kasiski',
      name: 'Kasiski Examination',
      icon: '🔍',
      description: 'Find repeated sequences to determine key length',
      complexity: 'Intermediate',
      timeRequired: 'Medium',
      effectiveness: {
        substitution: 10,
        polyalphabetic: 90,
        digraph: 25,
        rotor: 5
      },
      bestFor: ['Vigenère cipher', 'Polyalphabetic substitution', 'Keyword ciphers'],
      process: 'Locate repeated sequences and calculate distances to find key length',
      limitations: 'Requires sufficient text length and repeated sequences'
    },
    {
      id: 'digraph',
      name: 'Digraph Analysis',
      icon: '🔤',
      description: 'Analyze two-letter combinations and patterns',
      complexity: 'Advanced',
      timeRequired: 'Medium',
      effectiveness: {
        substitution: 20,
        polyalphabetic: 15,
        digraph: 85,
        rotor: 10
      },
      bestFor: ['Playfair cipher', 'Four-square cipher', 'Digraph substitution'],
      process: 'Analyze frequency of letter pairs and grid relationships',
      limitations: 'Specific to digraph-based encryption systems'
    },
    {
      id: 'dictionary',
      name: 'Dictionary Attack',
      icon: '📚',
      description: 'Use common words and phrases as potential keys',
      complexity: 'Intermediate',
      timeRequired: 'Fast',
      effectiveness: {
        substitution: 60,
        polyalphabetic: 70,
        digraph: 50,
        rotor: 20
      },
      bestFor: ['Keyword-based ciphers', 'Passphrase encryption', 'Common key words'],
      process: 'Test dictionary words and common phrases as encryption keys',
      limitations: 'Only works if key is a common word or phrase'
    },
    {
      id: 'known_plaintext',
      name: 'Known Plaintext Attack',
      icon: '🎯',
      description: 'Use known portions of plaintext to deduce the key',
      complexity: 'Advanced',
      timeRequired: 'Medium',
      effectiveness: {
        substitution: 85,
        polyalphabetic: 75,
        digraph: 90,
        rotor: 60
      },
      bestFor: ['When partial plaintext is known', 'Structured messages', 'Standard formats'],
      process: 'Align known plaintext with ciphertext to recover key material',
      limitations: 'Requires prior knowledge of message content'
    },
    {
      id: 'crib',
      name: 'Crib Attack',
      icon: '🧩',
      description: 'Use probable words or phrases (cribs) to break the cipher',
      complexity: 'Expert',
      timeRequired: 'Slow',
      effectiveness: {
        substitution: 70,
        polyalphabetic: 60,
        digraph: 80,
        rotor: 85
      },
      bestFor: ['Enigma machines', 'Rotor ciphers', 'Military communications'],
      process: 'Guess likely words in message and test against cipher mechanism',
      limitations: 'Requires good understanding of message context and cipher mechanics'
    },
    {
      id: 'bombe',
      name: 'Bombe Attack',
      icon: '⚙️',
      description: 'Systematic mechanical/computational attack on rotor machines',
      complexity: 'Expert',
      timeRequired: 'Very Slow',
      effectiveness: {
        substitution: 30,
        polyalphabetic: 25,
        digraph: 40,
        rotor: 95
      },
      bestFor: ['Enigma machines', 'Complex rotor systems', 'Wartime intelligence'],
      process: 'Use logical contradictions to eliminate impossible rotor settings',
      limitations: 'Computationally intensive, requires sophisticated analysis'
    }
  ], []);

  // Cipher analysis function
  const analyzeCipher = useCallback((challenge) => {
    const text = challenge.ciphertext;
    const analysis = {
      length: text.length,
      hasSpaces: /\s/.test(text),
      hasNumbers: /\d/.test(text),
      hasSpecialChars: /[^A-Za-z\s]/.test(text),
      repeatedSequences: [],
      letterFrequency: {},
      indexOfCoincidence: 0,
      potentialKeyLengths: [],
      recommendedMethods: []
    };

    // Letter frequency analysis
    const letters = text.replace(/[^A-Z]/g, '');
    letters.split('').forEach(letter => {
      analysis.letterFrequency[letter] = (analysis.letterFrequency[letter] || 0) + 1;
    });

    // Find repeated sequences (Kasiski examination prep)
    for (let len = 3; len <= Math.min(6, letters.length / 2); len++) {
      for (let i = 0; i <= letters.length - len; i++) {
        const sequence = letters.substring(i, i + len);
        const nextIndex = letters.indexOf(sequence, i + 1);
        if (nextIndex !== -1) {
          const distance = nextIndex - i;
          analysis.repeatedSequences.push({ sequence, distance, positions: [i, nextIndex] });
        }
      }
    }

    // Calculate Index of Coincidence
    if (letters.length > 1) {
      let ic = 0;
      Object.values(analysis.letterFrequency).forEach(freq => {
        ic += freq * (freq - 1);
      });
      analysis.indexOfCoincidence = ic / (letters.length * (letters.length - 1));
    }

    // Determine potential key lengths from repeated sequences
    analysis.repeatedSequences.forEach(seq => {
      for (let factor = 2; factor <= seq.distance; factor++) {
        if (seq.distance % factor === 0) {
          analysis.potentialKeyLengths.push(factor);
        }
      }
    });

    // Recommend methods based on analysis
    if (analysis.indexOfCoincidence > 0.065) {
      analysis.recommendedMethods.push('frequency', 'bruteforce');
    } else if (analysis.repeatedSequences.length > 0) {
      analysis.recommendedMethods.push('kasiski', 'dictionary');
    } else if (analysis.length % 2 === 0 && !analysis.hasSpaces) {
      analysis.recommendedMethods.push('digraph', 'known_plaintext');
    } else if (analysis.indexOfCoincidence < 0.045) {
      analysis.recommendedMethods.push('crib', 'bombe');
    }

    return analysis;
  }, []);

  // Method effectiveness calculator
  const getMethodEffectiveness = useCallback((method, cipherType) => {
    return decryptionMethods.find(m => m.id === method)?.effectiveness[cipherType] || 50;
  }, [decryptionMethods]);

  // Generate challenge on component mount
  useEffect(() => {
    if (!cryptoChallenge) {
      // Age-tier cap: K-5 stays on Caesar-style shifts (difficulty 1-2),
      // 6-8 goes up through Vigenere (difficulty <=3), 9-12 gets everything.
      const ageTier = gameState?.ageTier || 'middle';
      const maxDifficulty = ageTier === 'k5' ? 2 : ageTier === 'middle' ? 3 : 5;

      // Select challenge based on game progression and age-tier difficulty cap
      const availableChallenges = cipherChallenges.filter(c =>
        !gameState?.completedCrypto?.includes(c.id) && c.difficulty <= maxDifficulty
      );
      const challenge = availableChallenges[0] || cipherChallenges[0];
      setCryptoChallenge(challenge);

      // Perform initial analysis
      const analysis = analyzeCipher(challenge);
      setCipherAnalysis(analysis);
    }
  }, [cryptoChallenge, cipherChallenges, gameState, analyzeCipher]);

  // Enhanced decryption simulation
  const startDecryption = useCallback(() => {
    if (!selectedDecryptionMethod || !cryptoChallenge) return;

    setCurrentStep('decryption_process');
    setIsDecrypting(true);
    setDecryptionProgress(0);

    const method = decryptionMethods.find(m => m.id === selectedDecryptionMethod);
    const effectiveness = getMethodEffectiveness(selectedDecryptionMethod, cryptoChallenge.type);
    const baseTime = 5000; // 5 seconds base
    const timeMultiplier = {
      'Fast': 0.5,
      'Medium': 1.0,
      'Slow': 2.0,
      'Very Slow': 3.0
    }[method.timeRequired] || 1.0;

    const totalTime = baseTime * timeMultiplier;
    const updateInterval = totalTime / 100;

    const interval = setInterval(() => {
      setDecryptionProgress(prev => {
        const increment = Math.random() * 3 + 1;
        const newProgress = Math.min(prev + increment, 100);

        if (newProgress >= 100) {
          clearInterval(interval);
          setIsDecrypting(false);

          // Determine success based on effectiveness and some randomness
          const success = Math.random() * 100 < effectiveness;
          
          const result = {
            success,
            method: method.name,
            effectiveness,
            timeTaken: (totalTime / 1000).toFixed(1),
            decryptedText: success ? cryptoChallenge.plaintext : 'DECRYPTION FAILED',
            key: success ? cryptoChallenge.key : 'Unknown',
            attempts: attempts + 1
          };

          setDecryptionResults(result);
          setAttempts(prev => prev + 1);
          setCurrentStep('results');

          if (success && onCryptoComplete) {
            onCryptoComplete(`✅ Cipher broken! "${cryptoChallenge.plaintext}" decrypted using ${method.name} with key: ${cryptoChallenge.key}`);
          }
        }

        return newProgress;
      });
    }, updateInterval);

  }, [selectedDecryptionMethod, cryptoChallenge, decryptionMethods, getMethodEffectiveness, attempts, onCryptoComplete]);

  const getDifficultyColor = (complexity) => {
    const colors = {
      1: '#4CAF50', // Easy - Green
      2: '#8BC34A', // Medium-Easy - Light Green  
      3: '#ffaa00', // Medium - Orange
      4: '#ff6b47', // Hard - Red-Orange
      5: '#ff3333'  // Very Hard - Red
    };
    return colors[complexity] || '#666';
  };

  const encryptMessage = (plaintext, cipherType) => {
    switch(cipherType) {
      case 'caesar':
        const shift = Math.floor(Math.random() * 25) + 1;
        return plaintext.split('').map(char => {
          if (char.match(/[A-Z]/)) {
            return String.fromCharCode(((char.charCodeAt(0) - 65 + shift) % 26) + 65);
          }
          return char;
        }).join('');
        
      case 'atbash':
        return plaintext.split('').map(char => {
          if (char.match(/[A-Z]/)) {
            return String.fromCharCode(90 - (char.charCodeAt(0) - 65));
          }
          return char;
        }).join('');
        
      case 'base64':
        return btoa(plaintext);
        
      case 'hex':
        return plaintext.split('').map(char => 
          char.charCodeAt(0).toString(16).padStart(2, '0')
        ).join(' ').toUpperCase();
        
      case 'binary':
        return plaintext.split('').map(char => 
          char.charCodeAt(0).toString(2).padStart(8, '0')
        ).join(' ');
        
      case 'morse':
        const morseMap = {
          'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
          'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
          'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
          'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
          'Y': '-.--', 'Z': '--..', '_': '..--.-'
        };
        return plaintext.split('').map(char => morseMap[char] || char).join(' ');
        
      default:
        return plaintext;
    }
  };

  const analyzeMessage = (encryptedText) => {
    const analysis = {
      length: encryptedText.length,
      hasNumbers: /\d/.test(encryptedText),
      hasSpecialChars: /[^A-Za-z0-9\s]/.test(encryptedText),
      hasSpaces: /\s/.test(encryptedText),
      isUpperCase: encryptedText === encryptedText.toUpperCase(),
      possibleEncodings: [],
      confidence: {}
    };

    // Letter frequency analysis
    const letterFreq = {};
    const letters = encryptedText.replace(/[^A-Za-z]/g, '').toUpperCase();
    
    for (let letter of letters) {
      letterFreq[letter] = (letterFreq[letter] || 0) + 1;
    }
    
    const sortedFreq = Object.entries(letterFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    analysis.letterFrequency = sortedFreq;
    analysis.mostCommonLetter = sortedFreq[0] ? sortedFreq[0][0] : '';

    // Detect possible encodings with confidence levels
    if (/^[A-Fa-f0-9\s]+$/.test(encryptedText)) {
      analysis.possibleEncodings.push('hex');
      analysis.confidence.hex = 90;
    }
    if (/^[01\s]+$/.test(encryptedText)) {
      analysis.possibleEncodings.push('binary');
      analysis.confidence.binary = 95;
    }
    if (/^[A-Za-z0-9+/]*={0,2}$/.test(encryptedText)) {
      analysis.possibleEncodings.push('base64');
      analysis.confidence.base64 = 85;
    }
    if (/^[.\-\s]+$/.test(encryptedText)) {
      analysis.possibleEncodings.push('morse');
      analysis.confidence.morse = 95;
    }
    if (analysis.isUpperCase && !analysis.hasNumbers && !analysis.hasSpecialChars) {
      analysis.possibleEncodings.push('caesar', 'atbash', 'substitution');
      analysis.confidence.caesar = 70;
      analysis.confidence.atbash = 60;
      analysis.confidence.substitution = 50;
    }

    setAnalysisResults(analysis);
    generateHints(analysis);
  };

  const generateHints = (analysis) => {
    const newHints = [];
    
    if (analysis.possibleEncodings.includes('hex')) {
      newHints.push('Pattern suggests hexadecimal encoding (0-9, A-F)');
    }
    if (analysis.possibleEncodings.includes('binary')) {
      newHints.push('Only contains 0s and 1s - likely binary encoding');
    }
    if (analysis.possibleEncodings.includes('base64')) {
      newHints.push('Character set and padding suggest Base64 encoding');
    }
    if (analysis.possibleEncodings.includes('morse')) {
      newHints.push('Dots and dashes pattern indicates Morse code');
    }
    if (analysis.mostCommonLetter) {
      newHints.push(`Most frequent letter is ${analysis.mostCommonLetter} - in English, E is most common`);
    }
    if (analysis.length < 50) {
      newHints.push('Short message - simpler ciphers more likely');
    }
    
    setHints(newHints);
  };

  const attemptDecryption = async (cipherType, key = '') => {
    setIsDecrypting(true);
    setAttempts(attempts + 1);
    setCurrentStep('decryption');
    
    // Simulate decryption progress
    for (let i = 0; i <= 100; i += 10) {
      setDecryptionProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const result = decryptMessage(targetMessage, cipherType, key);
    
    const success = cryptoChallenge ? 
      result.toLowerCase().includes(cryptoChallenge.originalMessage.toLowerCase()) ||
      result === cryptoChallenge.originalMessage :
      result.length > 0 && /[a-zA-Z]/.test(result);
    
    setDecodedResult(result);
    setDecryptionResults({
      success,
      cipherType,
      result,
      key,
      attempts,
      timestamp: new Date().toISOString()
    });
    
    setIsDecrypting(false);
    setCurrentStep('results');
    
    setTimeout(() => {
      if (onCryptoComplete) {
        onCryptoComplete({
          success,
          cipher: cipherType,
          decodedMessage: result,
          originalMessage: cryptoChallenge?.originalMessage,
          attempts
        });
      }
    }, 2000);
  };

  const decryptMessage = (ciphertext, cipherType, key = '') => {
    try {
      switch(cipherType) {
        case 'caesar':
          // Try all possible shifts if no key provided
          if (!key) {
            for (let shift = 1; shift <= 25; shift++) {
              const attempt = ciphertext.split('').map(char => {
                if (char.match(/[A-Z]/)) {
                  return String.fromCharCode(((char.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
                }
                return char;
              }).join('');
              
              // Check if result looks like English
              if (attempt.includes('THE') || attempt.includes('AND') || attempt.includes('ATTACK')) {
                return attempt;
              }
            }
            return 'Unable to determine Caesar shift';
          }
          break;
          
        case 'atbash':
          return ciphertext.split('').map(char => {
            if (char.match(/[A-Z]/)) {
              return String.fromCharCode(90 - (char.charCodeAt(0) - 65));
            }
            return char;
          }).join('');
          
        case 'base64':
          try {
            return atob(ciphertext);
          } catch {
            return 'Invalid Base64 format';
          }
          
        case 'hex':
          try {
            return ciphertext.split(' ').map(hex => 
              String.fromCharCode(parseInt(hex, 16))
            ).join('');
          } catch {
            return 'Invalid hexadecimal format';
          }
          
        case 'binary':
          try {
            return ciphertext.split(' ').map(bin => 
              String.fromCharCode(parseInt(bin, 2))
            ).join('');
          } catch {
            return 'Invalid binary format';
          }
          
        case 'morse':
          const morseToChar = {
            '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
            '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
            '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
            '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
            '-.--': 'Y', '--..': 'Z', '..--.-': '_'
          };
          return ciphertext.split(' ').map(morse => morseToChar[morse] || morse).join('');
          
        default:
          return 'Cipher type not implemented';
      }
    } catch (error) {
      return `Decryption error: ${error.message}`;
    }
    
    return 'Decryption failed';
  };

  const resetToAnalysis = () => {
    setCurrentStep('analysis');
    setSelectedCipher('');
    setDecodedResult('');
    setDecryptionResults(null);
    setDecryptionProgress(0);
    setAttempts(0);
  };

  const proceedToCipherSelection = () => {
    setCurrentStep('cipher_selection');
  };

  if (isK5) {
    return (
      <div className="cryptography-challenge-enhanced tier-k5">
        <h3 className="k5-crypto-title">🧩 Cryptography: Solve the Code</h3>
        {k5Index === 0 && (
          <>
            <p className="k5-instructions">Someone left a secret message in code! Use the tools below to crack it. 🔍</p>
            <div className="k5-tip">🧠 Cyber Term: <strong>Encryption</strong> is scrambling a message into a secret code — like a secret language only you and a friend know. <strong>Decrypting</strong> is unscrambling it back. That's how computers keep your passwords safe!</div>
            <div className="k5-practice-banner">🎮 This is practice! It's totally okay to guess wrong — that's how we learn.</div>
          </>
        )}

        <div className="k5-byte-row">
          <div className="k5-byte-avatar">🕵️</div>
          <div className="k5-byte-bubble">{k5ByteLine}</div>
        </div>

        {!k5Done ? (
          <>
            <div className="k5-email-card">
              <div className="k5-email-row">{k5Challenge.icon} {k5Challenge.context}</div>
              <div className="k5-email-body"><code>{k5Challenge.ciphertext}</code></div>
            </div>

            {!k5Solved ? (
              <>
                <div className="k5-answer-buttons">
                  <button className="k5-safe-btn" onClick={() => k5TryTool('caesar')}>🔄 Try Shift Code (Caesar Cipher)</button>
                  <button className="k5-trick-btn" onClick={() => k5TryTool('atbash')}>🪞 Try Mirror Code (Atbash Cipher)</button>
                </div>
                {k5Message && <div className="k5-feedback info"><div className="k5-feedback-title">💡 Hint from Detective Byte</div><div className="k5-feedback-why">{k5Message}</div></div>}
                <div className="k5-progress">Tries so far: {k5Tries}</div>
              </>
            ) : (
              <div className="k5-feedback success">
                <div className="k5-feedback-title">🌟 Code Cracked!</div>
                <div className="k5-feedback-why">{k5Message}</div>
                <button className="k5-next-btn" onClick={k5Next}>
                  {k5Index + 1 >= k5Codes.length ? 'Finish' : 'Next Code ➡️'}
                </button>
              </div>
            )}

            <div className="k5-progress">Code {k5Index + 1} of {k5Codes.length}</div>
          </>
        ) : (
          <div className="k5-complete">
            <div className="k5-byte-row">
              <div className="k5-byte-avatar">🕵️</div>
              <div className="k5-byte-bubble">You cracked every code you tried — nice work, Detective! 🎉</div>
            </div>
            <div className="k5-complete-title">🎉 Great job, Code Breaker!</div>
            <div className="k5-complete-score">You solved {k5SolvedCount} of {k5Codes.length} secret codes!</div>
            <div className="k5-complete-rank">{getCodeRank(k5SolvedCount, k5Codes.length)}</div>
            <div className="k5-complete-tip">Codes help keep messages private — that's why grown-ups use them to protect passwords too.</div>
            <div className="k5-learned">📋 What You Learned: This is called <strong>ENCRYPTION</strong> — scrambling a message into a secret code, like a secret language only you and a friend know. Cybersecurity helpers use it to keep information safe from strangers.</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cryptography-challenge-enhanced">
      {/* Header with Progress Steps */}
      <div className="crypto-header-enhanced">
        <div className="mission-badge">
          <span className="mission-icon">🔐</span>
          <div className="mission-info">
            <h2>🧩 Cryptographic Analysis</h2>
            <div className="mission-title">Cipher Breaking & Intelligence Recovery</div>
            <div className="mission-scenario">Analyze and decrypt intercepted communications</div>
          </div>
        </div>
        
        {/* Progress Indicator */}
        <div className="progress-steps">
          <div className={`step ${currentStep === 'cipher_analysis' ? 'active' : currentStep !== 'cipher_analysis' ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Analysis</span>
          </div>
          <div className={`step ${currentStep === 'method_selection' ? 'active' : (currentStep === 'decryption_process' || currentStep === 'results') ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Method</span>
          </div>
          <div className={`step ${currentStep === 'decryption_process' ? 'active' : currentStep === 'results' ? 'completed' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Decrypt</span>
          </div>
          <div className={`step ${currentStep === 'results' ? 'active' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">Results</span>
          </div>
        </div>
      </div>

      {/* Step 1: Cipher Analysis */}
      {currentStep === 'cipher_analysis' && cryptoChallenge && cipherAnalysis && (
        <div className="step-content">
          <div className="step-header">
            <h3>🔍 Cipher Analysis & Intelligence Gathering</h3>
            <p>Analyze the intercepted message to determine the cipher type and best decryption approach.</p>
          </div>

          <div className="cipher-challenge-display">
            <div className="challenge-info">
              <div className="challenge-header">
                <span className="challenge-icon">{cryptoChallenge.icon}</span>
                <div className="challenge-details">
                  <h4>{cryptoChallenge.name}</h4>
                  <div className="challenge-context">Source: {cryptoChallenge.context}</div>
                  <div className="challenge-difficulty">
                    Difficulty: {'🔒'.repeat(cryptoChallenge.difficulty)}{'🔓'.repeat(5 - cryptoChallenge.difficulty)}
                  </div>
                </div>
              </div>
              
              <div className="cipher-text-display">
                <h5>📝 Intercepted Message:</h5>
                <div className="cipher-text">
                  <code>{cryptoChallenge.ciphertext}</code>
                </div>
              </div>
            </div>

            <div className="analysis-results">
              <h5>🔬 Automated Analysis Results</h5>
              
              <div className="analysis-grid">
                <div className="analysis-section">
                  <h6>📊 Basic Properties</h6>
                  <div className="analysis-items">
                    <div className="analysis-item">
                      <span className="item-label">Length:</span>
                      <span className="item-value">{cipherAnalysis.length} characters</span>
                    </div>
                    <div className="analysis-item">
                      <span className="item-label">Spaces:</span>
                      <span className="item-value">{cipherAnalysis.hasSpaces ? 'Present' : 'Removed'}</span>
                    </div>
                    <div className="analysis-item">
                      <span className="item-label">Numbers:</span>
                      <span className="item-value">{cipherAnalysis.hasNumbers ? 'Present' : 'None'}</span>
                    </div>
                    <div className="analysis-item">
                      <span className="item-label">Special Characters:</span>
                      <span className="item-value">{cipherAnalysis.hasSpecialChars ? 'Present' : 'None'}</span>
                    </div>
                  </div>
                </div>

                <div className="analysis-section">
                  <h6>🔤 Letter Frequency</h6>
                  <div className="frequency-display">
                    {Object.entries(cipherAnalysis.letterFrequency)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 6)
                      .map(([letter, freq]) => (
                        <div key={letter} className="freq-item">
                          <span className="freq-letter">{letter}</span>
                          <div className="freq-bar">
                            <div 
                              className="freq-fill" 
                              style={{ width: `${(freq / Math.max(...Object.values(cipherAnalysis.letterFrequency))) * 100}%` }}
                            ></div>
                          </div>
                          <span className="freq-count">{freq}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="analysis-section">
                  <h6>🔍 Pattern Analysis</h6>
                  <div className="pattern-items">
                    <div className="pattern-item">
                      <span className="pattern-label">Index of Coincidence:</span>
                      <span className="pattern-value">{cipherAnalysis.indexOfCoincidence.toFixed(4)}</span>
                    </div>
                    <div className="pattern-item">
                      <span className="pattern-label">Repeated Sequences:</span>
                      <span className="pattern-value">{cipherAnalysis.repeatedSequences.length}</span>
                    </div>
                    {cipherAnalysis.repeatedSequences.length > 0 && (
                      <div className="repeated-sequences">
                        {cipherAnalysis.repeatedSequences.slice(0, 3).map((seq, index) => (
                          <div key={index} className="sequence-item">
                            <code>{seq.sequence}</code> (distance: {seq.distance})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="cipher-characteristics">
                <h6>🎯 Cipher Characteristics</h6>
                <div className="characteristics-grid">
                  {Object.entries(cryptoChallenge.characteristics).map(([key, value]) => (
                    <div key={key} className="characteristic-item">
                      <span className="char-label">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                      <span className="char-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="preliminary-assessment">
                <h6>💡 Preliminary Assessment</h6>
                <div className="assessment-content">
                  <div className="cipher-weaknesses">
                    <strong>Known Weaknesses:</strong>
                    <div className="weakness-tags">
                      {cryptoChallenge.weaknesses.map((weakness, index) => (
                        <span key={index} className="weakness-tag">{weakness}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="recommended-methods">
                    <strong>Recommended Approaches:</strong>
                    <div className="method-tags">
                      {cipherAnalysis.recommendedMethods.map((method, index) => (
                        <span key={index} className="method-tag recommended">{method}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="analysis-hints">
                <h6>🔍 Analysis Hints</h6>
                <div className="hints-list">
                  {cryptoChallenge.hints.map((hint, index) => (
                    <div key={index} className="hint-item">
                      <span className="hint-icon">💡</span>
                      <span className="hint-text">{hint}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="continue-button-container">
            <button 
              className="continue-btn-enhanced"
              onClick={() => setCurrentStep('method_selection')}
            >
              Select Decryption Method →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Method Selection */}
      {currentStep === 'method_selection' && cryptoChallenge && (
        <div className="step-content">
          <div className="step-header">
            <h3>⚔️ Decryption Method Selection</h3>
            <p>Choose your cryptanalysis approach carefully. The effectiveness depends on matching the right method to the cipher type.</p>
          </div>

          <div className="cipher-reminder">
            <span className="cipher-avatar-small">{cryptoChallenge.icon}</span>
            <span>Target: <strong>{cryptoChallenge.name}</strong></span>
            <span className="cipher-type-badge">{cryptoChallenge.type.toUpperCase()}</span>
            <button className="change-cipher-btn" onClick={() => setCurrentStep('cipher_analysis')}>
              Re-analyze
            </button>
          </div>

          <div className="methods-enhanced-grid">
            {decryptionMethods.map(method => {
              const isSelected = selectedDecryptionMethod === method.id;
              const effectiveness = getMethodEffectiveness(method.id, cryptoChallenge.type);
              const isRecommended = cryptoChallenge.bestMethods.includes(method.id);
              
              return (
                <div 
                  key={method.id}
                  className={`method-card-enhanced ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
                  onClick={() => setSelectedDecryptionMethod(method.id)}
                >
                  <div className="method-header">
                    <div className="method-icon-large">{method.icon}</div>
                    <div className="method-title">
                      <h4>{method.name}</h4>
                      <div className="method-complexity">{method.complexity}</div>
                      {isRecommended && <div className="recommended-badge">⭐ RECOMMENDED</div>}
                    </div>
                  </div>
                  
                  <p className="method-description">{method.description}</p>
                  
                  <div className="method-stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Complexity:</span>
                      <span className="stat-value">{method.complexity}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Time Required:</span>
                      <span className="stat-value">{method.timeRequired}</span>
                    </div>
                  </div>

                  <div className="effectiveness-analysis">
                    <div className="effectiveness-bar">
                      <span className="analysis-label">Effectiveness vs {cryptoChallenge.type}:</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${effectiveness}%`,
                            backgroundColor: effectiveness > 70 ? '#4CAF50' : effectiveness > 50 ? '#FF9800' : '#f44336'
                          }}
                        ></div>
                      </div>
                      <span className="percentage">{effectiveness}%</span>
                    </div>
                  </div>
                  
                  <div className="method-details">
                    <div className="best-for">
                      <strong>Best For:</strong>
                      <ul>
                        {method.bestFor.map((use, index) => (
                          <li key={index}>{use}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="process-info">
                      <strong>Process:</strong>
                      <p>{method.process}</p>
                    </div>
                    
                    <div className="limitations">
                      <strong>Limitations:</strong>
                      <p>{method.limitations}</p>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="selection-indicator">✓ SELECTED</div>
                  )}
                </div>
              );
            })}
          </div>
          
          {selectedDecryptionMethod && (
            <div className="continue-button-container">
              <button 
                className="execute-btn-enhanced"
                onClick={startDecryption}
              >
                🚀 Begin Decryption
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Decryption Process */}
      {currentStep === 'decryption_process' && (
        <div className="decryption-interface">
          <div className="decryption-header">
            <div className="cipher-info-header">
              <span className="cipher-avatar-decrypt">{cryptoChallenge.icon}</span>
              <div className="decryption-title">
                <h3>🔓 Active Decryption: {cryptoChallenge.name}</h3>
                <div className="method-badge">Method: {decryptionMethods.find(m => m.id === selectedDecryptionMethod)?.name}</div>
              </div>
            </div>
            
            <div className="decryption-metrics">
              <div className="metric">
                <span className="metric-label">Progress</span>
                <div className="metric-bar progress">
                  <div className="metric-fill" style={{ width: `${decryptionProgress}%` }}></div>
                </div>
                <span className="metric-value">{Math.round(decryptionProgress)}%</span>
              </div>
              <div className="metric">
                <span className="metric-label">Attempts</span>
                <span className="metric-value">{attempts}</span>
              </div>
            </div>
          </div>

          <div className="decryption-display">
            <div className="cipher-analysis-active">
              <h4>Original Ciphertext:</h4>
              <div className="cipher-text-active">
                <code>{cryptoChallenge.ciphertext}</code>
              </div>
            </div>

            <div className="decryption-process-display">
              <h4>Decryption Process:</h4>
              <div className="process-steps">
                <div className="process-step active">
                  ⚙️ {decryptionMethods.find(m => m.id === selectedDecryptionMethod)?.process}
                </div>
                {isDecrypting && (
                  <div className="process-step active">
                    🔄 Analyzing patterns and testing keys...
                  </div>
                )}
              </div>
            </div>

            {decryptionProgress > 50 && (
              <div className="partial-results">
                <h4>Partial Analysis:</h4>
                <div className="partial-text">
                  <code>
                    {cryptoChallenge.plaintext.split('').map((char, index) => 
                      Math.random() < (decryptionProgress / 100) ? char : '?'
                    ).join('')}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {currentStep === 'results' && decryptionResults && (
        <div className="results-interface">
          <div className="results-header">
            <div className={`result-status-large ${decryptionResults.success ? 'success' : 'failure'}`}>
              {decryptionResults.success ? '🔓 Decryption Successful!' : '🔒 Decryption Failed'}
            </div>
            <div className="result-summary">
              {decryptionResults.success ? 
                'Intelligence successfully recovered from encrypted communication' :
                'Cipher remains unbroken - consider alternative approaches'
              }
            </div>
          </div>

          <div className="results-analysis">
            <div className="analysis-section">
              <h4>📊 Cryptanalysis Report</h4>
              <div className="analysis-grid">
                <div className="analysis-item">
                  <span className="analysis-label">Cipher Type:</span>
                  <span className="analysis-value">{cryptoChallenge.name}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Method Used:</span>
                  <span className="analysis-value">{decryptionResults.method}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Effectiveness:</span>
                  <span className="analysis-value">{decryptionResults.effectiveness}%</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Time Taken:</span>
                  <span className="analysis-value">{decryptionResults.timeTaken}s</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Attempts:</span>
                  <span className="analysis-value">{decryptionResults.attempts}</span>
                </div>
              </div>
            </div>

            {decryptionResults.success && (
              <div className="decrypted-intelligence">
                <h4>🔑 Recovered Intelligence</h4>
                <div className="intelligence-card">
                  <div className="intelligence-item">
                    <span className="intelligence-label">Plaintext Message:</span>
                    <div className="plaintext-display">
                      <code>{decryptionResults.decryptedText}</code>
                    </div>
                  </div>
                  <div className="intelligence-item">
                    <span className="intelligence-label">Encryption Key:</span>
                    <span className="key-value">
                      <code>{decryptionResults.key}</code>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="results-actions">
            <button 
              className="new-challenge-btn"
              onClick={() => {
                setCurrentStep('cipher_analysis');
                setCryptoChallenge(null);
                setDecryptionResults(null);
                setSelectedDecryptionMethod('');
              }}
            >
              🔄 New Challenge
            </button>
            <button 
              className="complete-btn"
              onClick={() => onCryptoComplete && onCryptoComplete(decryptionResults.success ? 
                `✅ Cipher broken! "${decryptionResults.decryptedText}" decrypted using ${decryptionResults.method}` :
                `❌ Decryption failed. Consider trying a different cryptanalysis method.`
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

export default CryptographyChallenge;
