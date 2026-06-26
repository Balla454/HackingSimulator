import React from 'react';
import { AEGIS_TIERS, AEGIS_VAULT, AEGIS_TAGLINE } from '../data/aegisUniverse';
import '../styles/vault-home.css';

const VaultHome = ({ onSelect, blackUnlocked, onBlackSignal, onSigilSecretClick }) => {
  return (
    <div className="vault-home">
      <div className="vault-home-grid" aria-hidden="true" />
      <div className="vault-home-scan" aria-hidden="true" />

      <div className="vault-home-inner">
        <header className="vault-header">
          <div
            className="vault-sigil"
            aria-hidden="true"
            onClick={!blackUnlocked ? onSigilSecretClick : undefined}
            role="presentation"
          >
            <span className="vault-sigil-ring" />
            <span className="vault-sigil-core">⬡</span>
          </div>
          <div className="vault-header-text">
            <p className="vault-codename">{AEGIS_VAULT.codename}</p>
            <h1 className="vault-title">{AEGIS_VAULT.name}</h1>
            <p className="vault-subtitle">{AEGIS_VAULT.subtitle}</p>
          </div>
        </header>

        <p className="vault-tagline">{AEGIS_TAGLINE}</p>
        <p className="vault-note">{AEGIS_VAULT.note}</p>

        <div className="vault-pipeline" aria-label="Training clearance pipeline">
          {AEGIS_TIERS.map((tier, i) => (
            <React.Fragment key={tier.id}>
              {i > 0 && <span className="vault-pipeline-connector" aria-hidden="true" />}
              <div className="vault-pipeline-node" style={{ '--node-color': tier.color }}>
                <span className="vault-pipeline-level">{tier.wingLabel}</span>
                <span className="vault-pipeline-name">{tier.role}</span>
              </div>
            </React.Fragment>
          ))}
          {blackUnlocked && (
            <>
              <span className="vault-pipeline-connector vault-pipeline-connector-classified" aria-hidden="true" />
              <button type="button" className="vault-pipeline-node vault-pipeline-node-classified" onClick={onBlackSignal}>
                <span className="vault-pipeline-level">Beyond Vault</span>
                <span className="vault-pipeline-name">BLACK SIGNAL</span>
              </button>
            </>
          )}
        </div>

        <div className="vault-modules">
          {AEGIS_TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              className="vault-module"
              style={{ '--module-color': tier.color }}
              onClick={() => onSelect(tier.id)}
            >
              <div className="vault-module-top">
                <span className="vault-module-badge">{tier.badge}</span>
                <span className="vault-module-wing">{tier.wingLabel}</span>
              </div>
              <h2 className="vault-module-name">{tier.name}</h2>
              <p className="vault-module-role">{tier.role}</p>
              <div className="vault-module-thinking">
                <span>{tier.question}</span>
                <span>{tier.thinking}</span>
              </div>
              {tier.preview && <p className="vault-module-preview">{tier.preview}</p>}
              <p className="vault-module-blurb">{tier.blurb}</p>
              <ul className="vault-module-tags">
                {tier.tags.map(tag => <li key={tag}>{tag}</li>)}
              </ul>
              <span className="vault-module-cta">Unlock simulation →</span>
            </button>
          ))}
        </div>

        <footer className="vault-footer">
          {blackUnlocked && (
            <button type="button" className="vault-footer-link vault-footer-link-signal" onClick={onBlackSignal}>
              ⚫ Return to BLACK SIGNAL Command
            </button>
          )}
          <p className="vault-footer-hint">
            Change tier in-game with <code>difficulty</code> · 🧪 Isolated simulations only
          </p>
        </footer>
      </div>

      <div className="loading-background-effects">
        <div className="matrix-rain" />
        <div className="loading-scanlines" />
      </div>
    </div>
  );
};

export default VaultHome;
