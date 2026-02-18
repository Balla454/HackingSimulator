import React, { useState, useEffect } from 'react';
import Terminal from './components/Terminal';
import DevModeOverlay from './components/DevModeOverlay';
import './styles/terminal.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingSubtext, setLoadingSubtext] = useState('');
  const [devModeOpen, setDevModeOpen] = useState(false);

  // Keyboard shortcut: Shift+Ctrl+| to toggle dev mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Shift+Ctrl+| (pipe is the key with code Backslash when shifted)
      if (e.shiftKey && e.ctrlKey && (e.key === '|' || e.code === 'Backslash')) {
        e.preventDefault();
        setDevModeOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enhanced loading sequence with more detailed feedback
  useEffect(() => {
    const loadingStages = [
      { 
        stage: 'Initializing quantum encryption protocols...', 
        subtext: 'Establishing secure quantum tunneling',
        duration: 800 
      },
      { 
        stage: 'Connecting to shadow network relays...', 
        subtext: 'Routing through 7 proxy layers',
        duration: 600 
      },
      { 
        stage: 'Masking digital fingerprint...', 
        subtext: 'Spoofing MAC addresses and browser signatures',
        duration: 700 
      },
      { 
        stage: 'Loading exploit frameworks...', 
        subtext: 'Compiling custom attack vectors',
        duration: 900 
      },
      { 
        stage: 'Bypassing corporate firewalls...', 
        subtext: 'Testing intrusion detection evasion',
        duration: 500 
      },
      { 
        stage: 'Establishing encrypted communications...', 
        subtext: 'Securing command and control channels',
        duration: 400 
      },
      { 
        stage: 'Granting shadow access...', 
        subtext: 'Welcome to the underground, operative',
        duration: 600 
      }
    ];

    let currentStage = 0;
    let progress = 0;

    const loadingInterval = setInterval(() => {
      if (currentStage < loadingStages.length) {
        const stage = loadingStages[currentStage];
        setLoadingStage(stage.stage);
        setLoadingSubtext(stage.subtext);
        
        const stageProgress = 100 / loadingStages.length;
        progress += stageProgress;
        setLoadingProgress(Math.min(progress, 100));
        
        setTimeout(() => {
          currentStage++;
          if (currentStage >= loadingStages.length) {
            setTimeout(() => {
              setLoading(false);
            }, 500);
          }
        }, stage.duration);
      }
    }, 100);

    return () => clearInterval(loadingInterval);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-header">
            <h1 className="loading-title">🔒 SHADOW NETWORK ACCESS</h1>
            <div className="loading-subtitle">Cybersecurity Training Simulator</div>
          </div>
          
          <div className="loading-progress-container">
            <div className="loading-progress-bar">
              <div 
                className="loading-progress-fill" 
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="loading-percentage">{Math.round(loadingProgress)}%</div>
          </div>
          
          <div className="loading-status">
            <div className="loading-stage">{loadingStage}</div>
            <div className="loading-subtext">{loadingSubtext}</div>
          </div>
          
          <div className="loading-disclaimer">
            <p>🎓 Educational cybersecurity simulation</p>
            <p>⚖️ For learning purposes only - Practice ethical hacking</p>
          </div>
        </div>
        
        <div className="loading-background-effects">
          <div className="matrix-rain"></div>
          <div className="loading-scanlines"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Terminal />
      <DevModeOverlay isOpen={devModeOpen} onClose={() => setDevModeOpen(false)} />
    </div>
  );
}

export default App;
