import React, { useMemo } from 'react';
import { getBlackSignalEnding } from '../data/blackSignalProgress';
import { BLACK_SIGNAL_HOME, PIXEL } from '../data/aegisUniverse';
import { ENDINGS } from '../data/blackSignalScenario';
import '../styles/blacksignal.css';

const BlackSignalHome = ({ onEnter, onVault }) => {
  const endingId = useMemo(() => getBlackSignalEnding(), []);
  const ending = endingId ? ENDINGS[endingId] : null;

  return (
    <div className="bs-home">
      <div className="bs-home-noise" aria-hidden="true" />
      <div className="bs-home-radar" aria-hidden="true">
        <span className="bs-home-radar-sweep" />
        <span className="bs-home-radar-ring bs-home-radar-ring-1" />
        <span className="bs-home-radar-ring bs-home-radar-ring-2" />
        <span className="bs-home-radar-ring bs-home-radar-ring-3" />
      </div>

      <div className="bs-home-inner">
        <header className="bs-home-header">
          <span className="bs-home-channel">SECURE CHANNEL · AV-BS-00</span>
          <div className="bs-home-title-block">
            <span className="bs-home-sigil">⚫</span>
            <h1 className="bs-home-title">{BLACK_SIGNAL_HOME.title}</h1>
          </div>
          <p className="bs-home-subtitle">{BLACK_SIGNAL_HOME.subtitle}</p>
          <p className="bs-home-tagline">{BLACK_SIGNAL_HOME.tagline}</p>
        </header>

        <div className="bs-home-briefing">
          <p>{BLACK_SIGNAL_HOME.briefing}</p>
          <p className="bs-home-pixel">{PIXEL.observer('Observation mode engaged. No training wheels.')}</p>
        </div>

        <div className="bs-home-phases" aria-label="Operation phases">
          {BLACK_SIGNAL_HOME.phases.map((phase, i) => (
            <div key={phase} className="bs-home-phase">
              <span className="bs-home-phase-num">{i + 1}</span>
              <span className="bs-home-phase-name">{phase}</span>
            </div>
          ))}
        </div>

        {ending && (
          <div className="bs-home-ending-badge" role="status">
            <span>{ending.icon}</span>
            <div>
              <strong>Last route: {ending.title}</strong>
              <span>{ending.subtitle}</span>
            </div>
          </div>
        )}

        <div className="bs-home-actions">
          <button type="button" className="bs-home-enter" onClick={onEnter}>
            <span className="bs-home-enter-glow" aria-hidden="true" />
            {BLACK_SIGNAL_HOME.enterLabel}
          </button>
          <button type="button" className="bs-home-vault-link" onClick={onVault}>
            ◈ {BLACK_SIGNAL_HOME.vaultLink}
          </button>
        </div>

        <footer className="bs-home-footer">
          <span>THE GHOST · SENTINEL · 5 endings + 1 secret</span>
        </footer>
      </div>
    </div>
  );
};

export default BlackSignalHome;
