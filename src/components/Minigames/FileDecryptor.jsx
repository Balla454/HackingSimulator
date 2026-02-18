import React, { useState } from 'react';

const FileDecryptor = ({ gameState, onDecryptComplete, addOutput }) => {
  const [encryptedFiles] = useState([
    { id: 1, name: 'financial_records.enc', type: 'Financial Data', key: 'BASE64_DECODE' },
    { id: 2, name: 'employee_data.enc', type: 'HR Records', key: 'CAESAR_SHIFT' },
    { id: 3, name: 'blueprints.enc', type: 'Product Designs', key: 'HEX_DECODE' },
    { id: 4, name: 'admin_config.enc', type: 'System Config', key: 'BINARY_DECODE' },
    { id: 5, name: 'network_logs.enc', type: 'Security Logs', key: 'MORSE_DECODE' },
    { id: 6, name: 'secrets.enc', type: 'Classified Data', key: 'ATBASH_CIPHER' },
    { id: 7, name: 'passwords.enc', type: 'Credential Store', key: 'CRYPTO_KEY' }
  ]);
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
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          addOutput(`Successfully decrypted ${selectedFile.name}!`);
          addOutput(`💎 Obtained: ${selectedFile.type} - ${selectedFile.name}`);
          onDecryptComplete(selectedFile);
          return 100;
        }
        return newProgress;
      });
    }, 100);
  };

  const availableKeys = getAllAvailableKeys();

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
