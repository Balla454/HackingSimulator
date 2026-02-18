import React, { useState } from 'react';

const PhishingSimulator = ({ onPhishingComplete, addOutput, target, gameState }) => {
  // Enhanced targets with intelligence integration
  const generateTargets = () => {
    const baseTargets = [
      { 
        id: 'ceo', 
        name: 'CEO Sarah Johnson', 
        email: 'sjohnson@company.com', 
        role: 'Executive',
        weakness: 'charity',
        difficulty: 3,
        profile: {
          interests: ['charity', 'golf', 'travel'],
          devices: ['iPhone', 'MacBook'],
          socialMedia: ['LinkedIn', 'Twitter']
        }
      },
      { 
        id: 'cto', 
        name: 'CTO Michael Chen', 
        email: 'mchen@company.com', 
        role: 'Technical',
        weakness: 'tech',
        difficulty: 4,
        profile: {
          interests: ['cybersecurity', 'AI', 'blockchain'],
          devices: ['Android', 'Linux Laptop'],
          socialMedia: ['GitHub', 'Stack Overflow']
        }
      },
      { 
        id: 'hr', 
        name: 'HR Director Lisa Wang', 
        email: 'lwang@company.com', 
        role: 'Administrative',
        weakness: 'urgent',
        difficulty: 2,
        profile: {
          interests: ['HR compliance', 'team building'],
          devices: ['iPhone', 'Windows PC'],
          socialMedia: ['LinkedIn', 'Facebook']
        }
      },
      {
        id: 'finance',
        name: 'CFO Robert Smith',
        email: 'rsmith@company.com',
        role: 'Financial',
        weakness: 'invoice',
        difficulty: 3,
        profile: {
          interests: ['finance', 'investments', 'regulation'],
          devices: ['BlackBerry', 'Windows PC'],
          socialMedia: ['LinkedIn']
        }
      }
    ];

    // Add targets based on social engineering intelligence
    if (gameState.socialIntel?.length > 0) {
      gameState.socialIntel.forEach((intel, index) => {
        baseTargets.push({
          id: `social_${index}`,
          name: intel.target || `Target ${index + 1}`,
          email: intel.email || `target${index + 1}@company.com`,
          role: 'Discovered',
          weakness: intel.weakness || 'generic',
          difficulty: 1,
          profile: intel.profile || { interests: ['unknown'] },
          intelligence: intel
        });
      });
    }

    return baseTargets;
  };

  const phishingTargets = generateTargets();
  
  const [selectedTarget, setSelectedTarget] = useState(
    phishingTargets.find(t => t.id === target) || phishingTargets[0]
  );
  const [emailType, setEmailType] = useState('');
  const [status, setStatus] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [campaignData, setCampaignData] = useState({
    emails: 0,
    clicks: 0,
    credentials: 0
  });
  const [useSocialIntel, setUseSocialIntel] = useState(false);

  // Enhanced email templates based on intelligence
  const getEmailTemplates = () => {
    const templates = [
      {
        id: 'donation',
        name: 'Charity Donation',
        success: 60,
        description: 'Appeal to charitable nature',
        targetWeakness: 'charity'
      },
      {
        id: 'security',
        name: 'Security Alert',
        success: 70,
        description: 'Create urgency about security breach',
        targetWeakness: 'tech'
      },
      {
        id: 'urgent',
        name: 'Urgent Action Required',
        success: 55,
        description: 'Create time pressure',
        targetWeakness: 'urgent'
      },
      {
        id: 'invoice',
        name: 'Invoice Payment',
        success: 50,
        description: 'Business transaction deception',
        targetWeakness: 'invoice'
      }
    ];

    // Add enhanced templates based on social intelligence
    if (gameState.socialIntel?.length > 0) {
      templates.push({
        id: 'personalized',
        name: 'Personalized Attack',
        success: 85,
        description: 'Use gathered personal information',
        targetWeakness: 'any'
      });
    }

    // Add templates based on compromised devices
    if (gameState.compromisedDevices?.length > 0) {
      templates.push({
        id: 'internal',
        name: 'Internal Communication',
        success: 80,
        description: 'Appear as internal company email',
        targetWeakness: 'any'
      });
    }

    return templates;
  };

  const emailTemplates = getEmailTemplates();
  const selectedTemplate = emailTemplates.find(t => t.id === emailType);
  
  const handleSend = () => {
    if (!emailType) {
      setStatus('Please select an email template');
      return;
    }

    setIsLaunching(true);
    setProgress(0);
    
    // Simulate phishing campaign
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsLaunching(false);
          
          // Calculate success based on template, target, and intelligence
          let successChance = selectedTemplate.success;
          
          // Bonus for matching weakness
          if (selectedTarget.weakness === selectedTemplate.targetWeakness || selectedTemplate.targetWeakness === 'any') {
            successChance += 20;
          }
          
          // Bonus for using social intelligence
          if (useSocialIntel && gameState.socialIntel?.length > 0) {
            successChance += 15;
          }
          
          // Penalty for high difficulty targets
          successChance -= (selectedTarget.difficulty - 1) * 10;
          
          successChance = Math.max(10, Math.min(95, successChance));
          
          if (Math.random() * 100 < successChance) {
            const credentials = {
              target: selectedTarget.name,
              email: selectedTarget.email,
              password: generatePassword(selectedTarget),
              role: selectedTarget.role,
              template: selectedTemplate.name,
              timestamp: new Date().toISOString(),
              intelligence: {
                profile: selectedTarget.profile,
                weakness: selectedTarget.weakness,
                difficulty: selectedTarget.difficulty
              },
              campaignData: {
                emailsSent: Math.floor(Math.random() * 50) + 10,
                clickRate: Math.floor(Math.random() * 30) + 5,
                credentialRate: Math.floor(Math.random() * 10) + 2
              }
            };

            setStatus('🎯 PHISHING SUCCESSFUL! Credentials harvested');
            addOutput(`Phishing campaign successful against ${selectedTarget.name}`);
            addOutput(`Harvested credentials: ${credentials.email}:${credentials.password}`);
            
            setCampaignData({
              emails: credentials.campaignData.emailsSent,
              clicks: Math.floor(credentials.campaignData.emailsSent * credentials.campaignData.clickRate / 100),
              credentials: Math.floor(credentials.campaignData.emailsSent * credentials.campaignData.credentialRate / 100)
            });
            
            setTimeout(() => {
              onPhishingComplete(credentials);
            }, 2000);
          } else {
            setStatus('❌ Phishing campaign failed - target was suspicious');
            addOutput(`Phishing attempt against ${selectedTarget.name} was unsuccessful`);
          }
        }
        return newProgress;
      });
    }, 300);
  };

  const generatePassword = (target) => {
    const patterns = [
      `${target.name.split(' ')[0]}123`,
      `${target.role}2024`,
      'Password123',
      `${target.profile.interests[0]}2024`,
      'Company123'
    ];
    return patterns[Math.floor(Math.random() * patterns.length)];
  };

  return (
    <div className="minigame phishing-enhanced">
      <h3>🎣 ADVANCED PHISHING SIMULATOR</h3>
      
      <div className="target-selection">
        <h4>🎯 Target Selection</h4>
        <div className="target-grid">
          {phishingTargets.map(target => (
            <div 
              key={target.id}
              className={`target-card ${selectedTarget.id === target.id ? 'selected' : ''}`}
              onClick={() => setSelectedTarget(target)}
            >
              <div className="target-header">
                <span className="target-name">{target.name}</span>
                <span className="target-role">{target.role}</span>
              </div>
              <div className="target-email">{target.email}</div>
              <div className="target-difficulty">
                Difficulty: {Array(target.difficulty).fill('⭐').join('')}
              </div>
              <div className="target-weakness">
                Weakness: <span className="weakness-tag">{target.weakness}</span>
              </div>
              {target.intelligence && (
                <div className="intel-badge">🧠 Intel Available</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="target-profile">
        <h4>📊 Target Profile: {selectedTarget.name}</h4>
        <div className="profile-details">
          <div className="profile-section">
            <h5>👤 Personal Info</h5>
            <div className="profile-grid">
              <span>Role:</span><span>{selectedTarget.role}</span>
              <span>Primary Weakness:</span><span>{selectedTarget.weakness}</span>
              <span>Security Awareness:</span><span>{selectedTarget.difficulty > 3 ? 'High' : selectedTarget.difficulty > 2 ? 'Medium' : 'Low'}</span>
            </div>
          </div>
          
          <div className="profile-section">
            <h5>💻 Digital Footprint</h5>
            <div className="interests">
              <strong>Interests:</strong> {selectedTarget.profile.interests.join(', ')}
            </div>
            <div className="devices">
              <strong>Devices:</strong> {selectedTarget.profile.devices?.join(', ') || 'Unknown'}
            </div>
            <div className="social">
              <strong>Social Media:</strong> {selectedTarget.profile.socialMedia?.join(', ') || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      <div className="email-templates">
        <h4>📧 Phishing Templates</h4>
        <div className="template-grid">
          {emailTemplates.map(template => (
            <div 
              key={template.id}
              className={`template-card ${emailType === template.id ? 'selected' : ''}`}
              onClick={() => setEmailType(template.id)}
            >
              <div className="template-name">{template.name}</div>
              <div className="template-success">Base Success: {template.success}%</div>
              <div className="template-description">{template.description}</div>
              {selectedTarget.weakness === template.targetWeakness && (
                <div className="weakness-match">✅ Targets weakness!</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {gameState.socialIntel?.length > 0 && (
        <div className="social-intel-boost">
          <label>
            <input 
              type="checkbox" 
              checked={useSocialIntel}
              onChange={(e) => setUseSocialIntel(e.target.checked)}
            />
            Use social engineering intelligence (+15% success rate)
          </label>
        </div>
      )}

      {isLaunching && (
        <div className="campaign-progress">
          <h4>🚀 Launching Phishing Campaign...</h4>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-text">{progress}%</div>
        </div>
      )}

      <button 
        onClick={handleSend}
        disabled={isLaunching || !emailType}
        className="launch-btn"
      >
        {isLaunching ? 'LAUNCHING CAMPAIGN...' : '🚀 LAUNCH PHISHING CAMPAIGN'}
      </button>
      
      {status && (
        <div className={`campaign-status ${status.includes('SUCCESSFUL') ? 'success' : 'error'}`}>
          {status}
        </div>
      )}

      {campaignData.emails > 0 && (
        <div className="campaign-results">
          <h4>📈 Campaign Results</h4>
          <div className="results-grid">
            <div className="result-item">
              <span className="result-label">Emails Sent:</span>
              <span className="result-value">{campaignData.emails}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Clicks:</span>
              <span className="result-value">{campaignData.clicks}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Credentials:</span>
              <span className="result-value">{campaignData.credentials}</span>
            </div>
          </div>
        </div>
      )}

      <div className="intelligence-summary">
        <h4>🧠 Available Intelligence</h4>
        <div className="intel-stats">
          <div className="stat">Social Intel: {gameState.socialIntel?.length || 0}</div>
          <div className="stat">Compromised Devices: {gameState.compromisedDevices?.length || 0}</div>
          <div className="stat">Previous Campaigns: {gameState.phishingData?.length || 0}</div>
        </div>
      </div>
    </div>
  );
};

export default PhishingSimulator;
