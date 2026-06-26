import React, { useState, useEffect } from 'react';
import Terminal from './components/Terminal';
import SOCLab from './components/SOCLab';
import BlackSignal from './components/BlackSignal';
import DevModeOverlay from './components/DevModeOverlay';
import HomeScreen from './components/HomeScreen';
import { AEGIS_TAGLINE, AEGIS_VAULT } from './data/aegisUniverse';
import './styles/terminal.css';
import './styles/soclab.css';
import './styles/blacksignal.css';
import './styles/vault-home.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingSubtext, setLoadingSubtext] = useState('');
  const [devModeOpen, setDevModeOpen] = useState(false);
  const [ageTier, setAgeTier] = useState(null);

  // Fix for 100vh issues in Electron/Linux
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${vh}px`);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    // Neutral, all-ages "spinning up the lab" flavor — the tier hasn't been
    // picked yet at this point, so nothing here should read as criminal/dark.
    const loadingStages = [
      {
        stage: 'Opening AEGIS VAULT...',
        subtext: 'Secure training archive — isolated simulations only',
        duration: 800
      },
      {
        stage: 'Mounting clearance wings...',
        subtext: 'Explorer · Analyst · Operations',
        duration: 600
      },
      {
        stage: 'Loading practice tools...',
        subtext: 'Scanner, cipher lab, SOC console',
        duration: 700
      },
      {
        stage: 'Spinning up training sectors...',
        subtext: 'TechCorp sim · Meridian Health assignment',
        duration: 900
      },
      {
        stage: 'Calibrating PIXEL...',
        subtext: 'Teacher → mentor → SOC interface',
        duration: 500
      },
      {
        stage: 'Vault doors unlocked.',
        subtext: AEGIS_TAGLINE,
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
            <h1 className="loading-title">⬡ {AEGIS_VAULT.name}</h1>
            <div className="loading-subtitle">{AEGIS_VAULT.subtitle}</div>
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
            <p>🧪 A safe, isolated lab - nothing here touches a real system</p>
          </div>
        </div>
        
        <div className="loading-background-effects">
          <div className="matrix-rain"></div>
          <div className="loading-scanlines"></div>
        </div>
      </div>
    );
  }

  if (!ageTier) {
    return <HomeScreen onSelect={setAgeTier} />;
  }

  if (ageTier === 'black-signal') {
    return (
      <>
        <BlackSignal onExit={() => setAgeTier(null)} />
        <DevModeOverlay isOpen={devModeOpen} onClose={() => setDevModeOpen(false)} />
      </>
    );
  }

  return (
    <>
      {ageTier === 'high' ? (
        <SOCLab />
      ) : (
        <div className="app">
          <Terminal ageTier={ageTier} />
        </div>
      )}
      <DevModeOverlay isOpen={devModeOpen} onClose={() => setDevModeOpen(false)} />
    </>
  );
}

export default App;
