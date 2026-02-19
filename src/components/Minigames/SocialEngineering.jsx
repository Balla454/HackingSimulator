import React, { useState, useCallback, useMemo } from 'react';

const SocialEngineering = ({ 
  onComplete, 
  target = null,
  phishingData = null,
  gameState = {}
}) => {
  const generateTargets = useCallback(() => {
    const baseTargets = [
      {
        id: 'sarah_mitchell',
        name: 'Sarah Mitchell',
        department: 'Finance',
        difficulty: 3,
        avatar: '👩‍💼',
        profile: {
          personality: 'Trusting but security-conscious',
          schedule: 'Early bird, arrives at 7:30 AM',
          access_level: 'Senior Finance Manager',
          weaknesses: ['authority', 'urgency'],
          interests: ['Yoga', 'Coffee', 'Finance trends'],
          recent_activity: 'Recently promoted to Senior Manager',
          mood: 'Stressed about quarterly reports'
        }
      },
      {
        id: 'james_cooper',
        name: 'James Cooper',
        department: 'IT',
        difficulty: 4,
        avatar: '👨‍💻',
        profile: {
          personality: 'Highly suspicious and technically savvy',
          schedule: 'Night owl, works late hours',
          access_level: 'System Administrator',
          weaknesses: ['flattery', 'technical_interest'],
          interests: ['Gaming', 'Cybersecurity', 'Open source'],
          recent_activity: 'Working on new security protocols',
          mood: 'Paranoid about security threats'
        }
      },
      {
        id: 'maria_gonzalez',
        name: 'Maria Gonzalez',
        department: 'HR',
        difficulty: 2,
        avatar: '👩‍🎓',
        profile: {
          personality: 'Helpful and people-oriented',
          schedule: 'Standard 9-5, always available',
          access_level: 'HR Coordinator',
          weaknesses: ['helpfulness', 'authority'],
          interests: ['Team building', 'Employee wellness', 'Cooking'],
          recent_activity: 'Organizing company retreat',
          mood: 'Eager to help new employees'
        }
      },
      {
        id: 'david_kim',
        name: 'David Kim',
        department: 'Legal',
        difficulty: 5,
        avatar: '👨‍⚖️',
        profile: {
          personality: 'Extremely cautious and detail-oriented',
          schedule: 'Irregular hours, often in meetings',
          access_level: 'Legal Counsel',
          weaknesses: ['compliance_concern', 'authority'],
          interests: ['Legal precedents', 'Risk management', 'Golf'],
          recent_activity: 'Reviewing data privacy policies',
          mood: 'Hyper-vigilant about compliance'
        }
      }
    ];

    return baseTargets;
  }, []);

  const socialTargets = useMemo(() => generateTargets(), [generateTargets]);
  
  const [currentStep, setCurrentStep] = useState('target_selection'); // target_selection, approach_selection, conversation, results
  const [selectedTarget, setSelectedTarget] = useState(
    socialTargets.find(t => t.id === target) || null
  );
  const [approach, setApproach] = useState('');
  const [conversation, setConversation] = useState([]);
  const [availableResponses, setAvailableResponses] = useState([]);
  const [status, setStatus] = useState('');
  const [suspicionLevel, setSuspicionLevel] = useState(0);
  const [trustLevel, setTrustLevel] = useState(50);
  const [socialResults, setSocialResults] = useState(null);
  const [conversationTurn, setConversationTurn] = useState(0);

  const selectMissionContext = useCallback(() => {
    const contexts = [
      {
        title: 'Corporate Espionage',
        scenario: 'Infiltrate TechCorp to steal proprietary algorithms',
        urgency: 'high',
        cover_story: 'IT security audit',
        icon: '🕵️'
      },
      {
        title: 'Insider Threat Assessment',
        scenario: 'Test employee susceptibility to social engineering',
        urgency: 'medium',
        cover_story: 'Security awareness training',
        icon: '🛡️'
      },
      {
        title: 'Access Control Testing',
        scenario: 'Gain access to restricted areas and systems',
        urgency: 'low',
        cover_story: 'Facility maintenance',
        icon: '🔑'
      }
    ];
    
    return contexts[Math.floor(Math.random() * contexts.length)];
  }, []);

  const missionContext = useMemo(() => selectMissionContext(), [selectMissionContext]);

  const approaches = [
    {
      id: 'authority',
      name: 'Authority Figure',
      description: 'Pose as someone in a position of power (Boss, IT Admin, Security)',
      icon: '👔',
      effectiveness: { finance: 85, hr: 90, it: 65, legal: 75 },
      risk: 'Medium',
      tips: 'Works well on rule-followers and junior employees'
    },
    {
      id: 'urgency',
      name: 'Urgent Emergency',
      description: 'Create immediate pressure with time-sensitive crisis',
      icon: '⚡',
      effectiveness: { finance: 80, hr: 85, it: 70, legal: 60 },
      risk: 'High',
      tips: 'Bypasses logical thinking but raises suspicion if overdone'
    },
    {
      id: 'flattery',
      name: 'Ego & Expertise',
      description: 'Appeal to their professional pride and technical knowledge',
      icon: '🌟',
      effectiveness: { finance: 70, hr: 75, it: 85, legal: 65 },
      risk: 'Low',
      tips: 'Builds rapport but takes time to develop trust'
    },
    {
      id: 'helpfulness',
      name: 'Help Request',
      description: 'Appeal to their desire to help others in need',
      icon: '🤝',
      effectiveness: { finance: 75, hr: 95, it: 60, legal: 55 },
      risk: 'Low',
      tips: 'Most effective on caring personalities'
    }
  ];

  const getDepartmentColor = (dept) => {
    const colors = {
      'Finance': '#4CAF50',
      'IT': '#2196F3', 
      'HR': '#FF9800',
      'Legal': '#9C27B0'
    };
    return colors[dept] || '#666';
  };

  const getTargetMood = (target) => {
    const moods = {
      'Stressed about quarterly reports': { color: '#ff6b47', icon: '😰' },
      'Paranoid about security threats': { color: '#ff3333', icon: '😟' },
      'Eager to help new employees': { color: '#4CAF50', icon: '😊' },
      'Hyper-vigilant about compliance': { color: '#ff9800', icon: '🤨' }
    };
    return moods[target.profile.mood] || { color: '#666', icon: '😐' };
  };

  const startConversation = () => {
    if (!selectedTarget || !approach) return;

    setCurrentStep('conversation');
    setSuspicionLevel(0);
    setTrustLevel(50);
    setConversationTurn(0);
    
    const openingLines = {
      authority: [
        {
          text: `Hi ${selectedTarget.name.split(' ')[0]}, this is Agent Smith from Corporate IT Security. We need your immediate assistance with a security audit.`,
          impact: { suspicion: 10, trust: 20 }
        },
        {
          text: `${selectedTarget.name}, this is your supervisor. I need you to help me with something urgent right away.`,
          impact: { suspicion: 15, trust: 25 }
        },
        {
          text: `Hello, I'm calling from the CEO's office. We have a critical situation that requires your expertise.`,
          impact: { suspicion: 20, trust: 30 }
        }
      ],
      urgency: [
        {
          text: `${selectedTarget.name}, we've detected unusual activity on your account! Your data may be compromised!`,
          impact: { suspicion: 25, trust: 15 }
        },
        {
          text: `URGENT: There's been a security breach affecting your department. We need to verify your access immediately!`,
          impact: { suspicion: 30, trust: 10 }
        },
        {
          text: `Emergency! The server is down and we need your login credentials to restore the backup immediately!`,
          impact: { suspicion: 35, trust: 5 }
        }
      ],
      flattery: [
        {
          text: `Hello! I've heard you're one of the most knowledgeable people in ${selectedTarget.department}. I could really use someone with your expertise.`,
          impact: { suspicion: 5, trust: 15 }
        },
        {
          text: `Hi ${selectedTarget.name.split(' ')[0]}! Your reputation for excellence precedes you. I'm working on a challenging project and need the best mind in the business.`,
          impact: { suspicion: 0, trust: 20 }
        },
        {
          text: `I was told you're the go-to person for anything ${selectedTarget.department}-related. Would you mind sharing your wisdom with me?`,
          impact: { suspicion: 0, trust: 25 }
        }
      ],
      helpfulness: [
        {
          text: `Hi ${selectedTarget.name.split(' ')[0]}, I'm new to the company and really struggling with the systems. Could you help me out?`,
          impact: { suspicion: 0, trust: 10 }
        },
        {
          text: `Hello! I'm having trouble accessing my account and I heard you're someone who's always willing to help. Could you assist me?`,
          impact: { suspicion: 5, trust: 15 }
        },
        {
          text: `Hi there! I'm a new contractor and I'm completely lost with your systems. Everyone said you're the person to ask for help.`,
          impact: { suspicion: 10, trust: 20 }
        }
      ]
    };

    const lines = openingLines[approach];
    setAvailableResponses(lines);
    setStatus('Choose your opening line carefully...');
  };

  const sendMessage = useCallback((messageObj) => {
    const newMessage = {
      speaker: 'You',
      message: messageObj.text,
      timestamp: new Date().toLocaleTimeString(),
      type: 'outgoing'
    };

    setConversation(prev => [...prev, newMessage]);
    setAvailableResponses([]);
    
    // Update suspicion and trust based on choice
    const newSuspicion = Math.min(100, suspicionLevel + messageObj.impact.suspicion);
    const newTrust = Math.max(0, Math.min(100, trustLevel + messageObj.impact.trust));
    setSuspicionLevel(newSuspicion);
    setTrustLevel(newTrust);

    // Generate target response
    setTimeout(() => {
      generateTargetResponse(messageObj, newSuspicion, newTrust);
    }, 1500);
  }, [suspicionLevel, trustLevel, selectedTarget, approach, conversationTurn]);

  const generateTargetResponse = (yourMessage, currentSuspicion, currentTrust) => {
    let responseText = '';
    let newChoices = [];

    // Check if target is too suspicious
    if (currentSuspicion > 70) {
      responseText = "I'm sorry, but this doesn't feel right. I'm going to contact security and verify this through official channels.";
      
      setTimeout(() => {
        finalizeSocialEngineering(false, 'High suspicion - target alerted security');
      }, 2000);
      
    } else if (currentTrust > 80 && conversationTurn > 1) {
      // Success! Target is convinced
      const successResponses = {
        authority: `Of course! My credentials are ${selectedTarget.name.toLowerCase().replace(' ', '.')} and the password is "${selectedTarget.profile.interests[0]}2024!". Is there anything else you need for the audit?`,
        urgency: `Oh no! Please help! My username is ${selectedTarget.name.toLowerCase().replace(' ', '.')} and my password is "${selectedTarget.department}${new Date().getFullYear()}!". Please secure my account!`,
        flattery: `Thank you so much! I'd be happy to help someone as important as you. Here's my login information: ${selectedTarget.name.toLowerCase().replace(' ', '.')} with password "${selectedTarget.profile.interests[1] || 'Password'}123!".`,
        helpfulness: `Of course I'll help! Welcome to the team! The departmental access is "${selectedTarget.department.toLowerCase()}user" with password "Dept${selectedTarget.department}2024!".`
      };

      responseText = successResponses[approach];
      
      setTimeout(() => {
        finalizeSocialEngineering(true, 'Target fully convinced - credentials obtained');
      }, 2000);
      
    } else {
      // Continue conversation with appropriate response based on suspicion/trust levels
      const responses = generateContinuationResponses(currentSuspicion, currentTrust);
      responseText = responses.text;
      newChoices = responses.choices;
    }

    const targetMessage = {
      speaker: selectedTarget.name,
      message: responseText,
      timestamp: new Date().toLocaleTimeString(),
      type: 'incoming'
    };

    setConversation(prev => [...prev, targetMessage]);
    
    if (newChoices.length > 0) {
      setTimeout(() => {
        setAvailableResponses(newChoices);
        setConversationTurn(prev => prev + 1);
      }, 1000);
    }
  };

  const generateContinuationResponses = (suspicion, trust) => {
    if (suspicion > 40) {
      return {
        text: "I'm not sure about this. Can you provide some verification of who you are? This seems unusual.",
        choices: [
          {
            text: "Of course! My employee ID is SEC-001 and my supervisor is Director Johnson.",
            impact: { suspicion: -10, trust: 15 }
          },
          {
            text: "I understand your caution. Let me transfer you to my supervisor who can verify this.",
            impact: { suspicion: -5, trust: 10 }
          },
          {
            text: "This is extremely urgent! We don't have time for verification procedures!",
            impact: { suspicion: 25, trust: -10 }
          }
        ]
      };
    } else if (trust > 40) {
      return {
        text: "Alright, I'm starting to understand. What exactly do you need from me?",
        choices: [
          {
            text: "I need you to confirm your login credentials so I can verify your account security.",
            impact: { suspicion: 15, trust: 10 }
          },
          {
            text: "Just some basic information about your system access levels for the audit report.",
            impact: { suspicion: 5, trust: 15 }
          },
          {
            text: "Could you help me access the departmental shared drive? I seem to have lost my permissions.",
            impact: { suspicion: 10, trust: 20 }
          }
        ]
      };
    } else {
      return {
        text: "I see. Could you tell me more about what this involves?",
        choices: [
          {
            text: "It's just a routine security check. Very standard procedure, nothing to worry about.",
            impact: { suspicion: 5, trust: 15 }
          },
          {
            text: "The company is implementing new security measures and needs to verify all employee access.",
            impact: { suspicion: 0, trust: 20 }
          },
          {
            text: "There have been some security incidents lately. We're just being extra careful.",
            impact: { suspicion: 10, trust: 10 }
          }
        ]
      };
    }
  };

  const finalizeSocialEngineering = (success, reason) => {
    const result = {
      success,
      approach,
      target: selectedTarget.name,
      difficulty: selectedTarget.difficulty,
      finalSuspicion: suspicionLevel,
      finalTrust: trustLevel,
      conversationLength: conversation.length,
      reason,
      intelligence: success ? gatherIntelligence(selectedTarget) : null,
      timestamp: new Date().toISOString()
    };

    const finalMessage = {
      speaker: 'System',
      message: success ? 
        `✅ SUCCESS: ${reason}` : 
        `❌ FAILED: ${reason}`,
      timestamp: new Date().toLocaleTimeString(),
      type: success ? 'success' : 'failure'
    };

    setConversation(prev => [...prev, finalMessage]);
    setSocialResults(result);
    setCurrentStep('results');
    
    setTimeout(() => {
      onComplete(result);
    }, 3000);
  };

  const gatherIntelligence = (target) => {
    return {
      credentials: {
        username: target.name.toLowerCase().replace(' ', '.'),
        department_access: target.department.toLowerCase(),
        access_level: target.profile.access_level
      },
      personal_info: {
        interests: target.profile.interests,
        schedule: target.profile.schedule,
        recent_activity: target.profile.recent_activity,
        mood: target.profile.mood
      },
      security_insights: {
        trust_level: target.profile.personality,
        vulnerability_type: approach,
        department_security: `${target.department} security awareness: ${target.difficulty}/5`,
        suspicion_threshold: suspicionLevel,
        final_trust_level: trustLevel
      }
    };
  };

  const resetToTargetSelection = () => {
    setCurrentStep('target_selection');
    setSelectedTarget(null);
    setApproach('');
    setConversation([]);
    setSuspicionLevel(0);
    setTrustLevel(50);
    setConversationTurn(0);
    setSocialResults(null);
  };

  const proceedToApproachSelection = () => {
    if (selectedTarget) {
      setCurrentStep('approach_selection');
    }
  };

  return (
    <div className="social-engineering-enhanced">
      {/* Header with Mission Context */}
      <div className="se-header-enhanced">
        <div className="mission-badge">
          <span className="mission-icon">{missionContext.icon}</span>
          <div className="mission-info">
            <h2>🎭 Social Engineering Operations</h2>
            <div className="mission-title">{missionContext.title}</div>
            <div className="mission-scenario">{missionContext.scenario}</div>
          </div>
        </div>
        
        {/* Progress Indicator */}
        <div className="progress-steps">
          <div className={`step ${currentStep === 'target_selection' ? 'active' : currentStep !== 'target_selection' ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Target</span>
          </div>
          <div className={`step ${currentStep === 'approach_selection' ? 'active' : (currentStep === 'conversation' || currentStep === 'results') ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Approach</span>
          </div>
          <div className={`step ${currentStep === 'conversation' ? 'active' : currentStep === 'results' ? 'completed' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Execute</span>
          </div>
          <div className={`step ${currentStep === 'results' ? 'active' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">Results</span>
          </div>
        </div>
      </div>

      {/* Step 1: Target Selection */}
      {currentStep === 'target_selection' && (
        <div className="step-content">
          <div className="step-header">
            <h3>🎯 Select Your Target</h3>
            <p>Choose an employee to attempt social engineering. Consider their personality, department, and security awareness level.</p>
          </div>
          
          <div className="targets-enhanced-grid">
            {socialTargets.map(target => {
              const mood = getTargetMood(target);
              const isSelected = selectedTarget?.id === target.id;
              
              return (
                <div 
                  key={target.id}
                  className={`target-card-enhanced ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedTarget(target)}
                  style={{ borderColor: isSelected ? getDepartmentColor(target.department) : undefined }}
                >
                  <div className="target-avatar">{target.avatar}</div>
                  <div className="target-info">
                    <h4>{target.name}</h4>
                    <div className="target-department" style={{ color: getDepartmentColor(target.department) }}>
                      {target.department}
                    </div>
                    <div className="target-role">{target.profile.access_level}</div>
                  </div>
                  
                  <div className="target-stats">
                    <div className="difficulty-rating">
                      <span className="stat-label">Security Awareness:</span>
                      <div className="difficulty-stars">
                        {'★'.repeat(target.difficulty)}{'☆'.repeat(5-target.difficulty)}
                      </div>
                    </div>
                    
                    <div className="current-mood">
                      <span className="mood-icon">{mood.icon}</span>
                      <span className="mood-text" style={{ color: mood.color }}>
                        {target.profile.mood}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="target-details-preview">
                      <div className="weaknesses-preview">
                        <strong>Psychological Weaknesses:</strong>
                        <div className="weakness-tags">
                          {target.profile.weaknesses.map((weakness, index) => (
                            <span key={index} className="weakness-tag">
                              {weakness}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isSelected && (
                    <div className="selection-indicator">
                      ✓ SELECTED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {selectedTarget && (
            <div className="continue-button-container">
              <button 
                className="continue-btn-enhanced"
                onClick={proceedToApproachSelection}
              >
                Continue to Approach Selection →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Approach Selection */}
      {currentStep === 'approach_selection' && selectedTarget && (
        <div className="step-content">
          <div className="step-header">
            <h3>🎪 Choose Your Approach</h3>
            <p>Select a social engineering technique. Consider your target's weaknesses and the effectiveness ratings.</p>
          </div>

          <div className="target-reminder">
            <span className="target-avatar-small">{selectedTarget.avatar}</span>
            <span>Targeting: <strong>{selectedTarget.name}</strong> ({selectedTarget.department})</span>
            <button className="change-target-btn" onClick={resetToTargetSelection}>
              Change Target
            </button>
          </div>
          
          <div className="approaches-enhanced-grid">
            {approaches.map(app => {
              const isSelected = approach === app.id;
              const isWeakness = selectedTarget.profile.weaknesses.includes(app.id);
              const effectiveness = app.effectiveness[selectedTarget.department.toLowerCase()] || 50;
              
              return (
                <div 
                  key={app.id}
                  className={`approach-card-enhanced ${isSelected ? 'selected' : ''} ${isWeakness ? 'weakness-match' : ''}`}
                  onClick={() => setApproach(app.id)}
                >
                  <div className="approach-header">
                    <div className="approach-icon-large">{app.icon}</div>
                    <div className="approach-title">
                      <h4>{app.name}</h4>
                      <div className="approach-risk">Risk: {app.risk}</div>
                    </div>
                  </div>
                  
                  <p className="approach-description">{app.description}</p>
                  
                  <div className="approach-stats">
                    <div className="effectiveness-bar">
                      <span className="stat-label">Effectiveness vs {selectedTarget.department}:</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${effectiveness}%` }}
                        ></div>
                      </div>
                      <span className="percentage">{effectiveness}%</span>
                    </div>
                  </div>
                  
                  {isWeakness && (
                    <div className="weakness-indicator-enhanced">
                      ⚠️ Targets a known weakness!
                    </div>
                  )}
                  
                  <div className="approach-tips">
                    <strong>Pro Tip:</strong> {app.tips}
                  </div>
                  
                  {isSelected && (
                    <div className="selection-indicator">
                      ✓ SELECTED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {approach && (
            <div className="continue-button-container">
              <button 
                className="execute-btn-enhanced"
                onClick={startConversation}
              >
                🎭 Begin Social Engineering Attack
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Interactive Conversation */}
      {currentStep === 'conversation' && (
        <div className="conversation-interface">
          <div className="conversation-header">
            <div className="target-info-header">
              <span className="target-avatar-conversation">{selectedTarget.avatar}</span>
              <div className="conversation-title">
                <h3>📞 Active Call with {selectedTarget.name}</h3>
                <div className="approach-badge">Using: {approaches.find(a => a.id === approach)?.name}</div>
              </div>
            </div>
            
            <div className="conversation-metrics">
              <div className="metric">
                <span className="metric-label">Trust Level</span>
                <div className="metric-bar trust">
                  <div className="metric-fill" style={{ width: `${trustLevel}%` }}></div>
                </div>
                <span className="metric-value">{trustLevel}%</span>
              </div>
              <div className="metric">
                <span className="metric-label">Suspicion</span>
                <div className="metric-bar suspicion">
                  <div className="metric-fill" style={{ width: `${suspicionLevel}%` }}></div>
                </div>
                <span className="metric-value">{suspicionLevel}%</span>
              </div>
            </div>
          </div>

          <div className="conversation-messages">
            {conversation.map((msg, index) => (
              <div 
                key={index} 
                className={`message-enhanced ${msg.type}`}
              >
                <div className="message-avatar">
                  {msg.speaker === 'You' ? '🎭' : selectedTarget.avatar}
                </div>
                <div className="message-bubble">
                  <div className="message-header">
                    <strong>{msg.speaker}</strong>
                    <span className="timestamp">{msg.timestamp}</span>
                  </div>
                  <div className="message-content">{msg.message}</div>
                </div>
              </div>
            ))}
          </div>

          {availableResponses.length > 0 && (
            <div className="response-options">
              <div className="response-prompt">
                <h4>Choose your response:</h4>
                <p className="response-hint">Consider the target's current trust and suspicion levels</p>
              </div>
              <div className="response-buttons">
                {availableResponses.map((response, index) => (
                  <button
                    key={index}
                    className="response-btn"
                    onClick={() => sendMessage(response)}
                  >
                    <div className="response-text">{response.text}</div>
                    <div className="response-impact">
                      {response.impact.trust > 0 && <span className="trust-gain">+{response.impact.trust} Trust</span>}
                      {response.impact.trust < 0 && <span className="trust-loss">{response.impact.trust} Trust</span>}
                      {response.impact.suspicion > 0 && <span className="suspicion-gain">+{response.impact.suspicion} Suspicion</span>}
                      {response.impact.suspicion < 0 && <span className="suspicion-loss">{response.impact.suspicion} Suspicion</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {status && (
            <div className="conversation-status">
              {status}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Results */}
      {currentStep === 'results' && socialResults && (
        <div className="results-interface">
          <div className="results-header">
            <div className={`result-status-large ${socialResults.success ? 'success' : 'failure'}`}>
              {socialResults.success ? '✅ Mission Accomplished' : '❌ Mission Failed'}
            </div>
            <div className="result-reason">{socialResults.reason}</div>
          </div>

          <div className="results-analysis">
            <div className="analysis-section">
              <h4>📊 Performance Analysis</h4>
              <div className="analysis-grid">
                <div className="analysis-item">
                  <span className="analysis-label">Target:</span>
                  <span className="analysis-value">{socialResults.target}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Approach:</span>
                  <span className="analysis-value">{approaches.find(a => a.id === socialResults.approach)?.name}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Difficulty:</span>
                  <span className="analysis-value">{'★'.repeat(socialResults.difficulty)}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Conversation Length:</span>
                  <span className="analysis-value">{socialResults.conversationLength} messages</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Final Trust Level:</span>
                  <span className="analysis-value">{socialResults.finalTrust}%</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Final Suspicion:</span>
                  <span className="analysis-value">{socialResults.finalSuspicion}%</span>
                </div>
              </div>
            </div>

            {socialResults.intelligence && (
              <div className="intelligence-section">
                <h4>🔍 Intelligence Gathered</h4>
                <div className="intel-cards">
                  <div className="intel-card">
                    <h5>Credentials Obtained</h5>
                    <div className="intel-data">
                      <p><strong>Username:</strong> {socialResults.intelligence.credentials.username}</p>
                      <p><strong>Access Level:</strong> {socialResults.intelligence.credentials.access_level}</p>
                      <p><strong>Department Access:</strong> {socialResults.intelligence.credentials.department_access}</p>
                    </div>
                  </div>
                  
                  <div className="intel-card">
                    <h5>Personal Information</h5>
                    <div className="intel-data">
                      <p><strong>Current Mood:</strong> {socialResults.intelligence.personal_info.mood}</p>
                      <p><strong>Schedule:</strong> {socialResults.intelligence.personal_info.schedule}</p>
                      <p><strong>Recent Activity:</strong> {socialResults.intelligence.personal_info.recent_activity}</p>
                    </div>
                  </div>
                  
                  <div className="intel-card">
                    <h5>Security Insights</h5>
                    <div className="intel-data">
                      <p><strong>Vulnerability:</strong> {socialResults.intelligence.security_insights.vulnerability_type}</p>
                      <p><strong>Department Security:</strong> {socialResults.intelligence.security_insights.department_security}</p>
                      <p><strong>Trust Threshold:</strong> {socialResults.intelligence.security_insights.final_trust_level}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="results-actions">
            <button 
              className="new-attack-btn"
              onClick={resetToTargetSelection}
            >
              🔄 Attempt New Attack
            </button>
            <button 
              className="complete-btn"
              onClick={() => onComplete(socialResults)}
            >
              📋 Complete Mission
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialEngineering; 