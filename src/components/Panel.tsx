import React, { useState, useRef, useEffect } from 'react';
import { generatePanelDiscussion, generateTTS } from '../lib/gemini';
import { Hexagon, SlidersHorizontal, Mic, Send, AudioLines, X, UserPlus, Trash2, Image as ImageIcon, Cpu, User, Star, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const dummyImages = [
  "https://freepngimg.com/thumb/man/22654-6-man-thumb.png",       // Suit Man
  "https://freepngimg.com/thumb/woman/13735-4-woman-suit-png-image-thumb.png", // Suit Woman
  "https://freepngimg.com/thumb/man/10-man-png-image-thumb.png",       // Casual Man
  "https://freepngimg.com/thumb/business_woman/1-2-business-woman-png-hd-thumb.png", // Business Woman
  "https://freepngimg.com/thumb/man/33-man-png-image-thumb.png",        // Older Man
  "https://freepngimg.com/thumb/robot/2-2-robot-transparent.png"
];

const defaultAgents = [
  { id: 0, name: "Nexus", role: "Manager", hex: "#3b82f6", img: dummyImages[0], score: 100 },
  { id: 1, name: "Atlas", role: "Product Strategist", hex: "#ef4444", img: dummyImages[1], score: 100 },
  { id: 2, name: "Veda", role: "System Architect", hex: "#10b981", img: dummyImages[2], score: 100 },
  { id: 3, name: "Echo", role: "Execution Engineer", hex: "#a855f7", img: dummyImages[3], score: 100 },
  { id: 4, name: "Nova", role: "UX Specialist", hex: "#f59e0b", img: dummyImages[4], score: 100 },
  { id: 5, name: "Cipher", role: "Reality Checker", hex: "#06b6d4", img: dummyImages[5], score: 100 }
];

interface Message {
  id: string;
  sender: string;
  text: string;
  type: 'system-msg' | 'agent-message' | 'user-message';
  colorHex?: string;
  isFinalPlan?: boolean;
}

export default function Panel() {
  const [agents, setAgents] = useState(defaultAgents);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'System',
      text: '<b>System Initialized.</b><br>Awaiting Commander\'s initial prompt/task. Use the text box or microphone to begin.',
      type: 'system-msg'
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showMemoryBoard, setShowMemoryBoard] = useState(false);
  const [memoryBoardContent, setMemoryBoardContent] = useState('');
  const [activeEditIndex, setActiveEditIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamingText]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRec();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setInput(text);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition API is not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const userMsg = (overrideInput || input).trim();
    if (!userMsg || isProcessing) return;

    if (!overrideInput) setInput('');
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'Commander',
      text: userMsg,
      type: 'user-message'
    }]);

    setIsProcessing(true);
    setActiveAgentName(null);
    setCurrentStreamingText('');
    setMemoryBoardContent('');

    abortControllerRef.current = new AbortController();

    try {
      let buffer = "";
      let isFinalPlanMode = false;
      let currentFinalPlan = "";
      let currentSpeaker = "";
      let currentMessageText = "";

      for await (const chunk of generatePanelDiscussion(userMsg, agents, {}, abortControllerRef.current.signal)) {
        if (abortControllerRef.current.signal.aborted) {
          break;
        }
        buffer += chunk;
        let lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === '### FINAL_PLAN ###') {
            isFinalPlanMode = true;
            if (currentSpeaker && currentMessageText) {
              commitMessage(currentSpeaker, currentMessageText);
              currentSpeaker = "";
              currentMessageText = "";
              setCurrentStreamingText('');
            }
            continue;
          }

          if (isFinalPlanMode) {
            currentFinalPlan += line + '\n';
            
            // Extract Memory Board
            const memoryBoardMatch = currentFinalPlan.match(/SECTION 6 — SHARED MEMORY BOARD\n([\s\S]*)/i);
            if (memoryBoardMatch) {
              setMemoryBoardContent(memoryBoardMatch[1]);
              // Remove memory board from the final plan message so it doesn't show twice
              const planWithoutMemory = currentFinalPlan.replace(/SECTION 6 — SHARED MEMORY BOARD\n[\s\S]*/i, '');
              updateFinalPlanMessage(planWithoutMemory);
            } else {
              updateFinalPlanMessage(currentFinalPlan);
            }
          } else {
            const match = line.match(/^(?:\*\*|)?\[(.*?)\](?:\*\*|)?:\s*(.*)/);
            if (match) {
              if (currentSpeaker && currentMessageText) {
                commitMessage(currentSpeaker, currentMessageText);
              }
              currentSpeaker = match[1].replace(/\*\*/g, '').trim();
              currentMessageText = match[2] + '\n';
              setActiveAgentName(currentSpeaker);
              setCurrentStreamingText(currentMessageText);
            } else if (currentSpeaker) {
              currentMessageText += line + '\n';
              setCurrentStreamingText(currentMessageText);
            }
          }
        }
      }

      if (buffer.trim()) {
        if (isFinalPlanMode) {
          currentFinalPlan += buffer;
          const memoryBoardMatch = currentFinalPlan.match(/SECTION 6 — SHARED MEMORY BOARD\n([\s\S]*)/i);
          if (memoryBoardMatch) {
            setMemoryBoardContent(memoryBoardMatch[1]);
            const planWithoutMemory = currentFinalPlan.replace(/SECTION 6 — SHARED MEMORY BOARD\n[\s\S]*/i, '');
            updateFinalPlanMessage(planWithoutMemory);
          } else {
            updateFinalPlanMessage(currentFinalPlan);
          }
        } else if (currentSpeaker) {
          currentMessageText += buffer;
          commitMessage(currentSpeaker, currentMessageText);
        }
      } else if (currentSpeaker && currentMessageText) {
         commitMessage(currentSpeaker, currentMessageText);
      }

    } catch (error) {
      console.error("Error generating discussion:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: 'Error generating discussion. Please try again.',
        type: 'system-msg'
      }]);
    } finally {
      setIsProcessing(false);
      setActiveAgentName(null);
      setCurrentStreamingText('');
    }
  };

  const commitMessage = (speaker: string, text: string) => {
    const agent = agents.find(a => a.name === speaker);
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      sender: speaker,
      text: text.trim(),
      type: 'agent-message',
      colorHex: agent?.hex || '#ffffff'
    }]);
  };

  const updateFinalPlanMessage = (text: string) => {
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.isFinalPlan) {
        return [...prev.slice(0, -1), { ...lastMsg, text }];
      } else {
        return [...prev, {
          id: 'final-plan-' + Date.now(),
          sender: 'System',
          text,
          type: 'system-msg',
          isFinalPlan: true
        }];
      }
    });
  };

  const handleInterrupt = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setActiveAgentName(null);
    setCurrentStreamingText('');
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'System',
      text: 'Discussion interrupted by Commander.',
      type: 'system-msg'
    }]);
  };

  const rewardAgent = (idx: number) => {
    const newAgents = [...agents];
    newAgents[idx].score += 20;
    setAgents(newAgents);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'System',
      text: `Positive reinforcement: +20 Power to <b style="color:${newAgents[idx].hex}">${newAgents[idx].name}</b>.`,
      type: 'system-msg'
    }]);
  };

  const playTTS = async (text: string) => {
    const url = await generateTTS(text);
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  };

  const activeAgent = agents.find(a => a.name === activeAgentName);

  return (
    <>
      <header>
        <div className="logo"><Hexagon /><span>STRATEGY NEXUS</span></div>
        <div className="flex items-center gap-4">
          <button 
            className={`btn-icon ${memoryBoardContent ? 'text-blue-400 border-blue-400' : ''}`} 
            onClick={() => setShowMemoryBoard(!showMemoryBoard)} 
            title="Shared Memory Board"
          >
            <AudioLines size={18} />
          </button>
          <button className="btn-icon" onClick={() => setShowSettings(true)} title="System Settings">
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </header>

      <main id="main-layout">
        <div id="avatar-section">
          <div id="avatar-container">
            {agents.map((a, i) => {
              const isActive = activeAgentName === a.name;
              return (
                <div key={a.id} className={`agent-slot ${isActive ? 'active' : ''}`} style={{ '--agent-color': a.hex } as any}>
                  <button className="star-btn" onClick={() => rewardAgent(i)} title="Reward Idea">
                    <Star size={14} fill="currentColor" />
                  </button>
                  <div className="avatar-frame">
                    <img src={a.img} className="agent-img" alt={a.name} />
                  </div>
                  <div className="visualizer">
                    <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
                  </div>
                  <div className="agent-info">
                    <div className="agent-name" style={{ color: a.hex }}>{a.name}</div>
                    <div className="status-text">{isActive ? 'Speaking...' : 'Standby'}</div>
                    <div className="score-badge">PWR: <span>{a.score}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div id="chat-section">
          <div id="chat-window">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.type}`}>
                {msg.type === 'agent-message' && (
                  <div className="agent-msg-name" style={{ color: msg.colorHex }}>
                    <Cpu size={14} /> {msg.sender}
                  </div>
                )}
                {msg.type === 'user-message' && (
                  <div className="agent-msg-name" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <User size={14} /> COMMANDER
                  </div>
                )}
                
                {msg.isFinalPlan ? (
                  <div className="markdown-body text-left w-full">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                      <h3 className="text-xl font-bold text-white m-0">Final Project Plan</h3>
                      <button onClick={() => playTTS(msg.text)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors" title="Read Aloud">
                        <Volume2 size={16} />
                      </button>
                    </div>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                    {!isProcessing && messages[messages.length - 1].id === msg.id && (
                      <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
                        <button 
                          onClick={() => handleSend("I approve the plan. Let's proceed to execution.")}
                          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        >
                          Approve Plan
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                )}
              </div>
            ))}

            {activeAgentName && currentStreamingText && (
              <div className="message agent-message">
                <div className="agent-msg-name" style={{ color: activeAgent?.hex || '#ffffff' }}>
                  <Cpu size={14} /> {activeAgentName}
                </div>
                <div dangerouslySetInnerHTML={{ __html: currentStreamingText }} />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div id="controls-wrapper">
            <div id="controls">
              <button id="mic-btn" className={`control-btn mic-btn ${isRecording ? 'recording' : ''}`} onClick={toggleMic} title="Voice to Text">
                <Mic />
              </button>
              
              <div className="input-group">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isProcessing ? "Agents are deliberating..." : "Give the initial task or strategic prompt..."}
                  disabled={isProcessing}
                />
              </div>

              <button id="send-btn" className="control-btn send-btn" onClick={() => handleSend()} title="Send Prompt" disabled={isProcessing || !input.trim()}>
                <Send />
              </button>

              <button id="interrupt-btn" className={`control-btn interrupt-btn ${isProcessing ? 'enabled' : ''}`} onClick={handleInterrupt} title="Interrupt Agents" disabled={!isProcessing}>
                <AudioLines />
                <span style={{ fontSize: '0.85rem' }}>HALT</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {showMemoryBoard && (
        <div id="memory-board-modal" style={{ display: 'flex', opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex justify-center items-center">
          <div className="modal-content bg-[#14141c] border border-white/10 shadow-2xl w-[95%] max-w-3xl h-[80vh] rounded-2xl flex flex-col overflow-hidden">
            <div className="settings-header p-6 border-b border-white/10 flex justify-between items-center bg-black/30">
              <div>
                <h2 className="text-2xl font-light tracking-tight">Shared Memory Board</h2>
                <p className="text-gray-400 text-sm mt-1">Facts, assumptions, conflicts, decisions, and open questions.</p>
              </div>
              <button onClick={() => setShowMemoryBoard(false)} className="btn-icon"><X /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 markdown-body">
              {memoryBoardContent ? (
                <ReactMarkdown>{memoryBoardContent}</ReactMarkdown>
              ) : (
                <div className="text-center text-gray-500 mt-20">
                  <AudioLines size={48} className="mx-auto mb-4 opacity-20" />
                  <p>The memory board is empty.</p>
                  <p className="text-sm mt-2">It will be populated at the end of the panel discussion.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div id="settings-modal" style={{ display: 'flex', opacity: 1 }}>
          <div className="modal-content" style={{ transform: 'scale(1)' }}>
            <div className="settings-sidebar">
              <div className="settings-sidebar-header">Neural Nodes</div>
              <div className="sidebar-scroll">
                {agents.map((a, i) => (
                  <div key={a.id} className={`agent-tab ${i === activeEditIndex ? 'active' : ''}`} onClick={() => setActiveEditIndex(i)}>
                    <div className="tab-color-dot" style={{ color: a.hex, background: a.hex }}></div>
                    {a.name}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="settings-body">
              <div className="settings-header">
                <div>
                  <h2>Configure Agent</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>Fine-tune persona, visuals, and directives.</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="btn-icon"><X /></button>
              </div>

              {agents[activeEditIndex] && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Identity (Name)</label>
                    <input type="text" className="custom-input" value={agents[activeEditIndex].name} onChange={(e) => {
                      const newAgents = [...agents];
                      newAgents[activeEditIndex].name = e.target.value;
                      setAgents(newAgents);
                    }} />
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <input type="text" className="custom-input" value={agents[activeEditIndex].role} onChange={(e) => {
                      const newAgents = [...agents];
                      newAgents[activeEditIndex].role = e.target.value;
                      setAgents(newAgents);
                    }} />
                  </div>

                  <div className="form-group full">
                    <label>Color Hex</label>
                    <input type="text" className="custom-input" value={agents[activeEditIndex].hex} onChange={(e) => {
                      const newAgents = [...agents];
                      newAgents[activeEditIndex].hex = e.target.value;
                      setAgents(newAgents);
                    }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
