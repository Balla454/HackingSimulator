import React, { useState } from 'react';

// Age-tier tuning: cap how hard a target can be, and give a success-chance bonus for K-5
const TIER_PHISHING_SETTINGS = {
  k5: { maxDifficulty: 2, successBonus: 20 },
  middle: { maxDifficulty: 4, successBonus: 0 },
  high: { maxDifficulty: 4, successBonus: -10 }
};

// K-5: defensive "Spot the Trick Email" content — kids learn to recognize fake emails, not send them
// Styled to look like a real inbox: display name, address, time, subject, body, plus a gentle
// hint (shown after a first wrong guess) and the full explanation (shown once solved or after a retry).
const K5_EMAILS = [
  {
    id: 1,
    name: 'Prize Team',
    from: 'pr1zes@free-giftz.com',
    time: '9:14 AM',
    subject: '🎉 YOU WON A FREE TABLET!!! Click NOW!!!',
    body: 'Congratulations!! Click this link right now and type your password to claim your free prize before it disappears!',
    isTrick: true,
    hint: '👀 Notice how it wants you to click FAST and type your password?',
    why: 'Real prizes never ask for your password, and this message tries to rush you. That\'s a trick!'
  },
  {
    id: 2,
    name: 'Mr. Rodriguez',
    from: 'teacher.mrodriguez@schoolmail.org',
    time: 'Yesterday',
    subject: 'Homework reminder for Friday',
    body: 'Hi class, just a reminder that your reading log is due Friday. See you in class!',
    isTrick: false,
    hint: '🤔 Does this sound like someone you actually know, with no scary requests?',
    why: 'This is from a real teacher email, has no scary urgency, and never asks for passwords. It\'s safe!'
  },
  {
    id: 3,
    name: 'Account Alert',
    from: 'support@yourbank-secure-alert.net',
    time: '11:52 PM',
    subject: 'URGENT: Your account will be LOCKED today',
    body: 'We detected a problem. Reply with your username and password immediately or your account will be deleted.',
    isTrick: true,
    hint: '⏰ Watch for scary words like "URGENT" and "LOCKED TODAY"...',
    why: 'Scary words like "URGENT" and asking for your password by email are big warning signs. That\'s a trick!'
  },
  {
    id: 4,
    name: 'Grandma Lucy',
    from: 'grandma.lucy@familymail.com',
    time: '4:30 PM',
    subject: 'Photos from the park!',
    body: 'Hi sweetie, here are some pictures from our walk yesterday. Love, Grandma',
    isTrick: false,
    hint: '🤝 A familiar name, nothing scary, no links to click...',
    why: 'A friendly message from someone you know, with no links to click or passwords asked. Safe!'
  },
  {
    id: 5,
    name: 'App Rewardz',
    from: 'admin@app-rewardz.biz',
    time: '2:05 PM',
    subject: 'Confirm your password to keep your account',
    body: 'Click here and enter your password so we can verify your account is still active.',
    isTrick: true,
    hint: '🔑 Would a real company ever ask you to "confirm" your password through a link?',
    why: 'Asking you to "confirm your password" by clicking a link is exactly what trick emails do. That\'s a trick!'
  },
  {
    id: 6,
    name: 'Free V-Bucks',
    from: 'freevbucks@robux-giveaway.net',
    time: '6:47 PM',
    subject: '🎮 FREE 10,000 V-Bucks — Login Now!',
    body: 'Login with your game username and password on our site to claim 10,000 free V-Bucks before your friends do!',
    isTrick: true,
    hint: '🎮 Would a real game company ask you to log in somewhere else to get free stuff?',
    why: 'No game company gives out free rewards if you log in on a different website. That\'s a trick to steal your account!'
  },
  {
    id: 7,
    name: 'Your Local Library',
    from: 'newsletter@yourlocallibrary.org',
    time: '8:00 AM',
    subject: '📚 Summer Reading Club starts Monday!',
    body: 'Join our Summer Reading Club! Read 5 books and earn a prize. No sign-up needed — just bring your library card.',
    isTrick: false,
    hint: '📚 No rushing, no password requests — just a normal update.',
    why: 'A normal newsletter with no rushing and no request for your password. Safe!'
  },
  {
    id: 8,
    name: 'Arnazon Orders',
    from: 'support@arnazon-orders.com',
    time: '1:18 PM',
    subject: 'Your order could not be delivered',
    body: 'Click here and enter your payment info to reschedule delivery of your package.',
    isTrick: true,
    hint: '🔍 Look very closely at the sender\'s name... is it spelled right?',
    why: 'Look closely at the sender — "arnazon" is spelled wrong! That\'s a fake company pretending to be real.'
  }
];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const getEmailRank = (score, total) => {
  const pct = score / total;
  if (pct >= 0.85) return '🥇 Email Detective Pro!';
  if (pct >= 0.5) return '🥈 Email Defender';
  return '🥉 Email Rookie — keep practicing!';
};

const PhishingSimulator = ({ onPhishingComplete, addOutput, target, gameState }) => {
  const ageTier = gameState?.ageTier || 'middle';
  const isK5 = ageTier === 'k5';
  const phishingTierSettings = TIER_PHISHING_SETTINGS[ageTier] || TIER_PHISHING_SETTINGS.middle;

  // K-5 defensive minigame state
  const [k5Emails] = useState(() => shuffle(K5_EMAILS));
  const [k5Index, setK5Index] = useState(0);
  const [k5Score, setK5Score] = useState(0);
  const [k5Attempts, setK5Attempts] = useState(0);
  const [k5Feedback, setK5Feedback] = useState(null); // { stage: 'hint'|'correct'|'reveal', text }
  const [k5Done, setK5Done] = useState(false);
  const [k5ByteLine, setK5ByteLine] = useState("Hi, I'm Detective Byte! 🕵️ Let's check this inbox for phishing — emails that try to trick you like bait on a hook.");

  const k5Answer = (saidTrick) => {
    const email = k5Emails[k5Index];
    const correct = saidTrick === email.isTrick;
    if (correct) {
      if (k5Attempts === 0) setK5Score(s => s + 1);
      setK5Feedback({ stage: 'correct', text: email.why });
      setK5ByteLine(k5Attempts === 0 ? 'Nice catch! 🎉 You spotted it just like a real cyber detective.' : "You got there! That's exactly how mistakes turn into learning. 🌟");
      addOutput && addOutput(`✅ Spotted it! ${email.subject}`);
    } else if (k5Attempts === 0) {
      setK5Attempts(1);
      setK5Feedback({ stage: 'hint', text: email.hint });
      setK5ByteLine("Hmm, not quite — but that's okay! Mistakes help us learn. Here's a clue:");
      addOutput && addOutput('🔎 Take another look — Detective Byte left you a clue.');
    } else {
      setK5Feedback({ stage: 'reveal', text: email.why });
      setK5ByteLine("No worries — now you know for next time! Here's what was really going on:");
      addOutput && addOutput('📚 Good try — here\'s the clue you can use next time.');
    }
  };

  const k5TryAgain = () => {
    setK5Feedback(null);
    setK5ByteLine('Take your time — look at the sender and the words they use. 🔍');
  };

  const k5Next = () => {
    setK5Feedback(null);
    setK5Attempts(0);
    if (k5Index + 1 >= k5Emails.length) {
      setK5Done(true);
      const result = { target: 'Inbox Practice', spotted: k5Score, total: k5Emails.length, ageTier: 'k5' };
      setTimeout(() => onPhishingComplete(result), 1200);
    } else {
      setK5Index(i => i + 1);
      setK5ByteLine('Next one — take a look! 📬');
    }
  };

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

    return baseTargets.filter(t => t.difficulty <= phishingTierSettings.maxDifficulty);
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
        const newProgress = prev + 20;
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
          
          // Penalty for high difficulty targets, adjusted by age tier
          successChance -= (selectedTarget.difficulty - 1) * 10;
          successChance += phishingTierSettings.successBonus;
          successChance = Math.max(5, Math.min(successChance, 95));
          
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
    }, 600);
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

  if (isK5) {
    const email = k5Emails[k5Index];
    return (
      <div className="minigame phishing-enhanced tier-k5">
        <h3>🎣 Phishing: Spot the Trick Email</h3>
        {k5Index === 0 && (
          <>
            <p className="k5-instructions">Read the email below. Is it safe, or is it a trick? 🤔</p>
            <div className="k5-tip">🧠 Cyber Term: <strong>Phishing</strong> is when someone sends a fake message to "hook" you into sharing private info — just like a fisherman uses bait to catch a fish. Real friends and companies never rush you or ask for your password!</div>
            <div className="k5-practice-banner">🎮 This is practice! It's totally okay to guess wrong — that's how we learn.</div>
          </>
        )}

        <div className="k5-byte-row">
          <div className="k5-byte-avatar">🕵️</div>
          <div className="k5-byte-bubble">{k5ByteLine}</div>
        </div>

        {!k5Done ? (
          <>
            <div className="k5-inbox-bar">📧 Inbox</div>
            <div className="k5-email-card k5-email-realistic">
              <div className="k5-email-avatar">{email.name.charAt(0)}</div>
              <div className="k5-email-content">
                <div className="k5-email-toprow">
                  <span className="k5-email-name">{email.name}</span>
                  <span className="k5-email-time">{email.time}</span>
                </div>
                <div className="k5-email-address">{email.from}</div>
                <div className="k5-email-subject">{email.subject}</div>
                <div className="k5-email-body">{email.body}</div>
              </div>
            </div>

            {!k5Feedback ? (
              <div className="k5-answer-buttons">
                <button className="k5-safe-btn" onClick={() => k5Answer(false)}>✅ Looks Safe</button>
                <button className="k5-trick-btn" onClick={() => k5Answer(true)}>🚩 It's a Trick!</button>
              </div>
            ) : k5Feedback.stage === 'hint' ? (
              <div className="k5-feedback info">
                <div className="k5-feedback-title">💡 Hint from Detective Byte</div>
                <div className="k5-feedback-why">{k5Feedback.text}</div>
                <button className="k5-next-btn" onClick={k5TryAgain}>🔁 Try Again</button>
              </div>
            ) : (
              <div className={`k5-feedback ${k5Feedback.stage === 'correct' ? 'success' : 'info'}`}>
                <div className="k5-feedback-title">{k5Feedback.stage === 'correct' ? '🌟 You got it!' : '📚 Here\'s what was going on'}</div>
                <div className="k5-feedback-why">{k5Feedback.text}</div>
                <button className="k5-next-btn" onClick={k5Next}>
                  {k5Index + 1 >= k5Emails.length ? 'See My Score' : 'Next Email ➡️'}
                </button>
              </div>
            )}

            <div className="k5-progress">Email {k5Index + 1} of {k5Emails.length}</div>
          </>
        ) : (
          <div className="k5-complete">
            <div className="k5-byte-row">
              <div className="k5-byte-avatar">🕵️</div>
              <div className="k5-byte-bubble">Way to go, Detective! I knew you could do it. 🎉</div>
            </div>
            <div className="k5-complete-title">🎉 Great job, Email Detective!</div>
            <div className="k5-complete-score">You spotted {k5Score} out of {k5Emails.length} correctly!</div>
            <div className="k5-complete-rank">{getEmailRank(k5Score, k5Emails.length)}</div>
            <div className="k5-complete-tip">Remember: never share your password, and watch out for scary or rushed messages.</div>
            <div className="k5-learned">📋 What You Learned: This is called <strong>PHISHING</strong> — when someone uses a fake message as bait to "hook" your password, just like a fisherman uses bait to catch a fish. Cybersecurity helpers always stop and check before clicking!</div>
          </div>
        )}
      </div>
    );
  }

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
