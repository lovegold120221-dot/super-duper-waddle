const fs = require('fs');

let code = fs.readFileSync('src/components/Panel.tsx', 'utf8');

// 1. Remove stopAllTTS() calls
code = code.replace(/^\s*stopAllTTS\(\);\s*$/gm, '');

// 2. Remove defaultAgents voice and ttsProvider
code = code.replace(/,\s*voice:\s*"[^"]+",\s*ttsProvider:\s*"[^"]+"/g, '');

// 3. Remove speakingAgentName condition in messages map
// The block looks like: {speakingAgentName === msg.sender && messages[messages.length - 1]?.id === msg.id && ( ... )}
code = code.replace(/\{speakingAgentName === msg\.sender && messages\[messages\.length - 1\]\?\.id === msg\.id && \([\s\S]*?<\/div>\s*\)\}/g, '');

// 4. Remove Mic button and visualizer logic
// It starts with `<button className={`mic-btn ${isRecording` and ends with `</button>` and `<canvas ref={micCanvasRef}`
code = code.replace(/<button\s+onClick=\{toggleMic\}[\s\S]*?<\/button>\s*<canvas\s+ref=\{micCanvasRef\}[\s\S]*?><\/canvas>/, '');

// 5. Remove isSpeaking references in AgentAvatars map
code = code.replace(/const isSpeaking = speakingAgentName === a\.name;/g, '');
code = code.replace(/isSpeaking=\{isSpeaking\}/g, '');
code = code.replace(/className=\{`agent-preview-card \$\{isSpeaking \? 'speaking' : ''\}`\}/g, 'className="agent-preview-card"');
code = code.replace(/className=\{`agent-avatar-wrapper \$\{isSpeaking \? 'speaking' : ''\}`\}/g, 'className="agent-avatar-wrapper"');

// 6. Remove Voice Profile select and play preview button
// The block starts with `<div className="form-group full"> <label>Voice Profile</label>`
code = code.replace(/<div className="form-group full">\s*<label>Voice Profile<\/label>[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div className="danger-zone">)/g, '');

// Let's refine the agent edit TTS block removal:
// It starts with `<div className="form-group full">` for `TTS Engine`
code = code.replace(/<div className="form-group full">\s*<label>TTS Engine<\/label>[\s\S]*?(?=<div className="danger-zone">)/g, '');

// 7. Remove Voicebox Settings (port 17493)
// It starts with `) : activeEditIndex === -4 ? (` and goes until the end of that conditional branch.
code = code.replace(/\)\s*:\s*activeEditIndex === -4 \?\s*\([\s\S]*?(?=\)\s*:\s*\(\s*<div className="form-grid">)/g, ') : activeEditIndex === -4 ? ( <div className="no-agents-state"><UserX size={48} className="memory-empty-icon" /><h2 className="no-agents-heading">Nothing Here</h2></div> ');

// 8. Remove `playVoicePreview`, `generateSupertonicTTS`, etc...
code = code.replace(/<button[^>]*onClick=\{[^}]*(playVoicePreview|playAudioPreview|playTTS)[^}]*\}[^>]*>[\s\S]*?<\/button>/g, '');
code = code.replace(/<button[^>]*onClick=\{[^}]*generateSupertonicTTS[^}]*\}[^>]*>[\s\S]*?<\/button>/g, '');

// 9. Remove any left-over agent meta volume item
code = code.replace(/<div className="agent-meta-item"\s*title="Voice[\s\S]*?<\/div>/g, '');

fs.writeFileSync('src/components/Panel.tsx', code, 'utf8');
