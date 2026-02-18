import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'hackingSim_scoreCommand';
const DEFAULT_COMMAND = 'curl -X POST -H "Content-Type: application/json" -d \'{"score": $score}\' http://174.110.6.31:5002/submit';

export function getScoreCommand() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_COMMAND;
  } catch {
    return DEFAULT_COMMAND;
  }
}

export function buildScoreCommand(score) {
  const template = getScoreCommand();
  return template.replace(/\$score/g, String(score));
}

const DevModeOverlay = ({ isOpen, onClose }) => {
  const [command, setCommand] = useState('');
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCommand(getScoreCommand());
      setSaved(false);
      setTestResult(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, command);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save command:', e);
    }
  };

  const handleReset = () => {
    setCommand(DEFAULT_COMMAND);
    localStorage.setItem(STORAGE_KEY, DEFAULT_COMMAND);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const testCmd = command.replace(/\$score/g, '0');
      // Use Electron IPC if available, otherwise show the resolved command
      if (window.electronAPI) {
        const result = await window.electronAPI.executeCommand(testCmd);
        setTestResult(result);
      } else {
        setTestResult({ success: true, stdout: `[Preview] Would execute:\n${testCmd}`, stderr: '' });
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message, stdout: '', stderr: '' });
    }
    setTesting(false);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.headerIcon}>⚙️</span>
          <h2 style={styles.title}>DEV MODE — Score Submission Config</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          <label style={styles.label}>
            Score Submission Command
            <span style={styles.hint}> — use <code style={styles.code}>$score</code> as the score variable</span>
          </label>
          <textarea
            style={styles.textarea}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            spellCheck={false}
            rows={4}
          />

          <div style={styles.preview}>
            <span style={styles.previewLabel}>Preview (score=10):</span>
            <div style={styles.previewCmd}>{command.replace(/\$score/g, '10')}</div>
          </div>

          <div style={styles.actions}>
            <button style={styles.btnSave} onClick={handleSave}>
              {saved ? '✓ Saved!' : '💾 Save'}
            </button>
            <button style={styles.btnTest} onClick={handleTest} disabled={testing}>
              {testing ? '⏳ Testing...' : '🧪 Test (score=0)'}
            </button>
            <button style={styles.btnReset} onClick={handleReset}>
              ↺ Reset Default
            </button>
          </div>

          {testResult && (
            <div style={{
              ...styles.result,
              borderColor: testResult.success ? '#00ff41' : '#ff4444'
            }}>
              <div style={{ color: testResult.success ? '#00ff41' : '#ff4444', fontWeight: 'bold', marginBottom: 4 }}>
                {testResult.success ? '✅ Command executed' : '❌ Command failed'}
              </div>
              {testResult.stdout && <pre style={styles.pre}>{testResult.stdout}</pre>}
              {testResult.stderr && <pre style={{ ...styles.pre, color: '#ff8800' }}>{testResult.stderr}</pre>}
              {testResult.error && <pre style={{ ...styles.pre, color: '#ff4444' }}>{testResult.error}</pre>}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <span style={styles.footerText}>Shift + Ctrl + | to toggle</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: '#0a0a0a',
    border: '1px solid #00ff41',
    borderRadius: 8,
    width: '90%',
    maxWidth: 700,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 0 30px rgba(0, 255, 65, 0.2)',
    fontFamily: '"Courier New", monospace',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1a3a1a',
    backgroundColor: '#0d1a0d',
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    color: '#00ff41',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    margin: 0,
    fontFamily: '"Courier New", monospace',
  },
  closeBtn: {
    background: 'none',
    border: '1px solid #333',
    color: '#888',
    fontSize: 16,
    cursor: 'pointer',
    padding: '2px 8px',
    borderRadius: 4,
  },
  body: {
    padding: 16,
  },
  label: {
    color: '#00cc33',
    fontSize: 12,
    fontWeight: 'bold',
    display: 'block',
    marginBottom: 8,
  },
  hint: {
    color: '#666',
    fontWeight: 'normal',
  },
  code: {
    backgroundColor: '#1a1a2e',
    color: '#00ff41',
    padding: '1px 5px',
    borderRadius: 3,
    fontSize: 12,
  },
  textarea: {
    width: '100%',
    backgroundColor: '#0d0d0d',
    color: '#00ff41',
    border: '1px solid #1a3a1a',
    borderRadius: 4,
    padding: 10,
    fontFamily: '"Courier New", monospace',
    fontSize: 13,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: 1.5,
  },
  preview: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#0d0d1a',
    borderRadius: 4,
    border: '1px solid #1a1a3a',
  },
  previewLabel: {
    color: '#6666cc',
    fontSize: 11,
    fontWeight: 'bold',
  },
  previewCmd: {
    color: '#8888ff',
    fontSize: 12,
    marginTop: 4,
    wordBreak: 'break-all',
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  btnSave: {
    backgroundColor: '#003300',
    color: '#00ff41',
    border: '1px solid #00ff41',
    padding: '8px 18px',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: 13,
    fontWeight: 'bold',
  },
  btnTest: {
    backgroundColor: '#1a1a00',
    color: '#ffcc00',
    border: '1px solid #ffcc00',
    padding: '8px 18px',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: 13,
  },
  btnReset: {
    backgroundColor: '#1a0000',
    color: '#ff6666',
    border: '1px solid #ff6666',
    padding: '8px 18px',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: 13,
  },
  result: {
    marginTop: 14,
    padding: 10,
    border: '1px solid',
    borderRadius: 4,
    backgroundColor: '#050505',
  },
  pre: {
    margin: 0,
    fontSize: 11,
    color: '#aaa',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: 150,
    overflow: 'auto',
  },
  footer: {
    padding: '8px 16px',
    borderTop: '1px solid #1a3a1a',
    textAlign: 'center',
  },
  footerText: {
    color: '#444',
    fontSize: 11,
  },
};

export default DevModeOverlay;
