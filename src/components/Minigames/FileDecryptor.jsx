import React, { useState } from 'react';

// Age-tier tuning: fewer files and simpler ciphers for younger players
const TIER_FILE_SETTINGS = {
  k5: { maxFiles: 3 },
  middle: { maxFiles: 5 },
  high: { maxFiles: 7 }
};

const ALL_ENCRYPTED_FILES = [
  { id: 1, name: 'financial_records.enc', type: 'Financial Data', key: 'BASE64_DECODE' },
  { id: 3, name: 'blueprints.enc', type: 'Product Designs', key: 'HEX_DECODE' },
  { id: 2, name: 'employee_data.enc', type: 'HR Records', key: 'CAESAR_SHIFT' },
  { id: 4, name: 'admin_config.enc', type: 'System Config', key: 'BINARY_DECODE' },
  { id: 5, name: 'network_logs.enc', type: 'Security Logs', key: 'MORSE_DECODE' },
  { id: 6, name: 'secrets.enc', type: 'Classified Data', key: 'ATBASH_CIPHER' },
  { id: 7, name: 'passwords.enc', type: 'Credential Store', key: 'CRYPTO_KEY' }
];

// K-5: friendly locked files — kids unlock with any key they've found, no scary themes
const K5_LOCKED_FILES = [
  { id: 1, name: 'my_diary.locked', type: 'Secret Diary', emoji: '📔' },
  { id: 2, name: 'game_save.locked', type: 'Saved Game', emoji: '🎮' },
  { id: 3, name: 'treasure_map.locked', type: 'Treasure Map', emoji: '🗺️' },
  { id: 4, name: 'pet_photos.locked', type: 'Pet Photo Album', emoji: '🐶' }
];

const getKeyRank = (unlocked, total) => {
  if (unlocked >= total) return '🏆 Vault Hero!';
  if (unlocked >= Math.ceil(total / 2)) return '🥈 Key Master';
  return '🥉 Key Apprentice';
};

const FileDecryptor = ({ gameState, onDecryptComplete, addOutput }) => {
  const ageTier = gameState?.ageTier || 'middle';
  const isK5 = ageTier === 'k5';
  const fileTierSettings = TIER_FILE_SETTINGS[ageTier] || TIER_FILE_SETTINGS.middle;
  const [encryptedFiles] = useState(
    ALL_ENCRYPTED_FILES.slice(0, fileTierSettings.maxFiles)
  );

  // K-5 simplified state
  const [k5File, setK5File] = useState(null);
  const [k5Unlocked, setK5Unlocked] = useState(false);
  const [k5Key, setK5Key] = useState(null);
  const [k5UnlockedIds, setK5UnlockedIds] = useState([]);
  const [k5SessionDone, setK5SessionDone] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [decryptionKey, setDecryptionKey] = useState('');
  const [progress, setProgress] = useState(0);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionFailed, setDecryptionFailed] = useState(false);
  
  // Get all available keys from different sources
  const getAllAvailableKeys = () => {
    const keys = [];
    
    // SSH keys
    if (gameState.sshKeys?.length > 0) {
      keys.push(...gameState.sshKeys.map(key => ({ source: 'SSH', key, icon: '🔐' })));
    }
    
    // Crypto keys
    if (gameState.cryptoKeys?.length > 0) {
      keys.push(...gameState.cryptoKeys.map(key => ({ source: 'Crypto', key, icon: '🔑' })));
    }
    
    // Cracked passwords
    if (gameState.crackedPasswords?.length > 0) {
      keys.push(...gameState.crackedPasswords.map(crack => ({ 
        source: 'Password Crack', 
        key: crack.password, 
        icon: '🔓',
        target: crack.target
      })));
    }
    
    // Phishing data
    if (gameState.phishingData?.length > 0) {
      keys.push(...gameState.phishingData.map(data => ({ 
        source: 'Phishing', 
        key: data.password || data.credentials, 
        icon: '🎣',
        target: data.target
      })));
    }
    
    return keys;
  };
  
  const startDecryption = () => {
    // More flexible key matching
    const isKeyMatch = (inputKey, fileKey) => {
      // Exact match
      if (inputKey === fileKey) return true;
      
      // Case insensitive match
      if (inputKey.toLowerCase() === fileKey.toLowerCase()) return true;
      
      // Partial match for crypto keys (e.g., "BASE64" matches "BASE64_DECODE")
      if (inputKey.includes(fileKey) || fileKey.includes(inputKey)) return true;
      
      // Common crypto variations
      const variations = {
        'BASE64': ['BASE64_DECODE', 'base64'],
        'CAESAR': ['CAESAR_SHIFT', 'caesar'],
        'HEX': ['HEX_DECODE', 'hex'],
        'BINARY': ['BINARY_DECODE', 'binary'],
        'MORSE': ['MORSE_DECODE', 'morse'],
        'ATBASH': ['ATBASH_CIPHER', 'atbash']
      };
      
      for (const [key, vars] of Object.entries(variations)) {
        if ((inputKey.includes(key) || key.includes(inputKey)) && 
            (vars.includes(fileKey) || fileKey.includes(key))) {
          return true;
        }
      }
      
      return false;
    };
    
    if (!isKeyMatch(decryptionKey, selectedFile.key)) {
      setDecryptionFailed(true);
      addOutput(`Decryption failed for ${selectedFile.name}!`, 'error');
      addOutput(`Required key: ${selectedFile.key}`, 'warning');
      addOutput(`Your input: ${decryptionKey}`, 'warning');
      
      // Show available keys hint
      const availableKeys = getAllAvailableKeys();
      if (availableKeys.length > 0) {
        addOutput('💡 Available keys:', 'info');
        availableKeys.forEach(keyData => {
          addOutput(`   ${keyData.icon} ${keyData.key} (from ${keyData.source})`, 'info');
        });
      } else {
        addOutput('💡 No decryption keys available. Use crypto tool to obtain keys.', 'info');
      }
      return;
    }
    
    setIsDecrypting(true);
    setDecryptionFailed(false);
    addOutput(`Starting decryption of ${selectedFile.name}...`);
    addOutput(`Using key: ${decryptionKey}`);
    
    // Simulate decryption progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 20;
        if (newProgress >= 100) {
          clearInterval(interval);
          addOutput(`Successfully decrypted ${selectedFile.name}!`);
          addOutput(`💎 Obtained: ${selectedFile.type} - ${selectedFile.name}`);
          onDecryptComplete(selectedFile);
          return 100;
        }
        return newProgress;
      });
    }, 400);
  };

  const availableKeys = getAllAvailableKeys();

  if (isK5) {
    const k5UseKey = (keyData) => {
      setK5Key(keyData);
      setK5Unlocked(true);
      setK5UnlockedIds(ids => [...ids, k5File.id]);
      addOutput && addOutput(`🔑 Unlocked ${k5File.name} with ${keyData.key}!`);
    };

    const k5RemainingFiles = K5_LOCKED_FILES.filter(f => !k5UnlockedIds.includes(f.id));

    const k5TryAnother = () => {
      setK5File(null);
      setK5Unlocked(false);
      setK5Key(null);
    };

    const k5Finish = () => {
      setK5SessionDone(true);
      setTimeout(() => {
        onDecryptComplete({ name: k5File.name, type: k5File.type, unlocked: k5UnlockedIds.length });
      }, 1200);
    };

    if (k5SessionDone) {
      return (
        <div className="minigame tier-k5">
          <div className="k5-complete">
            <div className="k5-byte-row">
              <div className="k5-byte-avatar">🕵️</div>
              <div className="k5-byte-bubble">Every lock you tried, you opened — well done, Detective! 🎉</div>
            </div>
            <div className="k5-complete-title">🎉 Great job, Key Detective!</div>
            <div className="k5-complete-score">You unlocked {k5UnlockedIds.length} of {K5_LOCKED_FILES.length} files!</div>
            <div className="k5-complete-rank">{getKeyRank(k5UnlockedIds.length, K5_LOCKED_FILES.length)}</div>
            <div className="k5-complete-tip">Keys should always stay private — only use them to unlock your own stuff.</div>
            <div className="k5-learned">📋 What You Learned: This is called <strong>DECRYPTION</strong> — using the right key to unlock protected information, just like a house key opens your own front door (and only your front door).</div>
          </div>
        </div>
      );
    }

    return (
      <div className="minigame tier-k5">
        <h3 className="k5-crypto-title">🔑 Decryption: Unlock the File</h3>
        {k5UnlockedIds.length === 0 && !k5File && (
          <>
            <p className="k5-instructions">Pick a locked file, then use one of your keys to open it safely. 🔓</p>
            <div className="k5-tip">🧠 Cyber Term: <strong>Decryption</strong> means using the right key to unlock scrambled (encrypted) information — like using your own house key, not a stranger's. Keys and passwords should only ever open things that are yours!</div>
            <div className="k5-practice-banner">🎮 This is practice! It's totally okay to try a key that doesn't fit — that's how we learn.</div>
          </>
        )}

        <div className="k5-byte-row">
          <div className="k5-byte-avatar">🕵️</div>
          <div className="k5-byte-bubble">{!k5File ? "Pick a locked file and let's see what's inside! 🔒" : !k5Unlocked ? 'Try one of your keys — see which one fits!' : 'Nice unlock! 🌟'}</div>
        </div>

        {!k5File ? (
          <>
            <div className="k5-file-grid">
              {k5RemainingFiles.map(file => (
                <div key={file.id} className="k5-email-card k5-file-card k5-locked-card" onClick={() => setK5File(file)}>
                  <div className="k5-lock-badge">🔒</div>
                  <div className="k5-email-row">{file.emoji} <strong>{file.name}</strong></div>
                  <div className="k5-email-body">{file.type}</div>
                </div>
              ))}
            </div>
            {k5UnlockedIds.length > 0 && (
              <div className="k5-answer-buttons">
                <button className="k5-next-btn" onClick={k5Finish}>🏁 I'm Done — See My Rank</button>
              </div>
            )}
          </>
        ) : !k5Unlocked ? (
          <>
            <div className="k5-email-card">
              <div className="k5-email-row">{k5File.emoji} <strong>{k5File.name}</strong></div>
              <div className="k5-email-body">{k5File.type} — locked!</div>
            </div>
            {availableKeys.length > 0 ? (
              <>
                <p className="k5-instructions">Choose a key to try:</p>
                <div className="k5-answer-buttons">
                  {availableKeys.map((keyData, index) => (
                    <button key={index} className="k5-safe-btn" onClick={() => k5UseKey(keyData)}>
                      {keyData.icon} {keyData.key}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="k5-feedback info">
                <div className="k5-feedback-why">You don't have any keys yet! Go solve a code or crack a password to find one. 🔍</div>
              </div>
            )}
            <div className="k5-answer-buttons">
              <button className="k5-next-btn" onClick={() => setK5File(null)}>⬅️ Back to Files</button>
            </div>
          </>
        ) : (
          <div className="k5-feedback success">
            <div className="k5-feedback-title">🌟 File Unlocked!</div>
            <div className="k5-feedback-why">You opened {k5File.name} using the {k5Key?.key} key!</div>
            <div className="k5-answer-buttons">
              {k5RemainingFiles.length > 0 ? (
                <button className="k5-next-btn" onClick={k5TryAnother}>🔓 Unlock Another File</button>
              ) : null}
              <button className="k5-next-btn" onClick={k5Finish}>🏁 I'm Done — See My Rank</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="minigame">
      <h3>FILE DECRYPTOR</h3>
      
      {!selectedFile ? (
        <>
          <p>Encrypted files detected:</p>
          <div className="file-list">
            {encryptedFiles.map(file => (
              <div 
                key={file.id} 
                className="file"
                onClick={() => setSelectedFile(file)}
              >
                <div className="file-name">{file.name}</div>
                <div className="file-type">Type: {file.type}</div>
              </div>
            ))}
          </div>
          <p>Select a file to decrypt</p>
        </>
      ) : isDecrypting ? (
        <>
          <p>Decrypting {selectedFile.name}...</p>
          <div className="decryption-progress">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            <div className="progress-text">{progress}%</div>
          </div>
          {progress === 100 && (
            <div className="success">[✓] Decryption successful! File contents recovered</div>
          )}
        </>
      ) : (
        <>
          <p>Selected file: {selectedFile.name}</p>
          <p>File type: {selectedFile.type}</p>
          
          {availableKeys.length > 0 && (
            <div className="intelligence-keys">
              <h4>🧠 Available Decryption Keys</h4>
              <div className="keys-by-source">
                {['SSH', 'Crypto', 'Password Crack', 'Phishing'].map(source => {
                  const sourceKeys = availableKeys.filter(k => k.source === source);
                  if (sourceKeys.length === 0) return null;
                  
                  return (
                    <div key={source} className="key-source-group">
                      <h5>{sourceKeys[0].icon} {source} Keys</h5>
                      <div className="key-list">
                        {sourceKeys.map((keyData, index) => (
                          <div 
                            key={index} 
                            className="key-item enhanced"
                            onClick={() => setDecryptionKey(keyData.key)}
                            title={keyData.target ? `From: ${keyData.target}` : `Source: ${keyData.source}`}
                          >
                            <span className="key-icon">{keyData.icon}</span>
                            <span className="key-value">{keyData.key}</span>
                            {keyData.target && (
                              <span className="key-source">({keyData.target})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {availableKeys.length === 0 && (
            <div className="no-keys-warning">
              <h4>⚠️ No Decryption Keys Available</h4>
              <p>You need to gather keys from other hacking activities:</p>
              <ul>
                <li>🔐 Use SSH to access compromised devices</li>
                <li>🔑 Solve cryptography challenges</li>
                <li>🔓 Crack passwords from target systems</li>
                <li>🎣 Obtain credentials through phishing</li>
              </ul>
            </div>
          )}
          
          <div className="manual-key-input">
            <p>Or enter decryption key manually:</p>
            <input
              type="password"
              value={decryptionKey}
              onChange={(e) => setDecryptionKey(e.target.value)}
              placeholder="Enter decryption key"
              autoFocus
            />
          </div>
          
          {/* Debug section to show available crypto keys */}
          {gameState.cryptoKeys && gameState.cryptoKeys.length > 0 && (
            <div className="debug-keys">
              <h5>🔍 Available Decryption Keys:</h5>
              <div className="debug-key-list">
                {gameState.cryptoKeys.map((key, index) => (
                  <div key={index} className="debug-key-item">
                    <span>{key}</span>
                    <button 
                      className="use-key-button"
                      onClick={() => {
                        setDecryptionKey(key);
                        setSelectedFile(null); // Reset file selection to show all files
                      }}
                    >
                      Use Key
                    </button>
                  </div>
                ))}
              </div>
              <p style={{ color: '#ffaa00', fontSize: '0.9rem', marginTop: '10px' }}>
                💡 Tip: Each key works with specific file types. Try different keys with different files!
              </p>
              <p style={{ color: '#00ff41', fontSize: '0.9rem' }}>
                🎯 Key → File examples: BASE64_DECODE → financial_records.enc, CAESAR_SHIFT → employee_data.enc
              </p>
            </div>
          )}
          
          {gameState.cryptoKeys && gameState.cryptoKeys.length === 0 && (
            <div className="debug-keys" style={{ background: 'rgba(255, 100, 100, 0.1)', borderColor: 'rgba(255, 100, 100, 0.3)' }}>
              <h5>❌ No Decryption Keys Available</h5>
              <p style={{ color: '#ff6666' }}>
                You need to run the <strong>crypto</strong> command first to obtain decryption keys!
              </p>
              <p style={{ color: '#ffaa00', fontSize: '0.9rem' }}>
                Complete cryptography challenges to unlock file decryption capabilities.
              </p>
            </div>
          )}
          
          {decryptionFailed && (
            <div className="error">[!] Invalid key! Decryption failed</div>
          )}
          
          <div className="button-group">
            <button onClick={() => setSelectedFile(null)}>BACK</button>
            <button onClick={startDecryption} disabled={!decryptionKey}>DECRYPT</button>
          </div>
          
          <div className="command-help">
            <h4>How to get keys:</h4>
            <div className="command-item">1. Run 'scan' to find vulnerable devices</div>
            <div className="command-item">2. Use 'ssh &lt;ip&gt;' to access devices</div>
            <div className="command-item">3. Find decryption keys through SSH access</div>
          </div>
        </>
      )}
    </div>
  );
};

export default FileDecryptor;
