const fs = require('fs');

let code = fs.readFileSync('src/components/Panel.tsx', 'utf8');

// 1. Remove Mute button
code = code.replace(/<button[^>]*title=\{isMuted \? 'Unmute TTS' : 'Mute TTS'\}[^>]*>[\s\S]*?<\/button>/, '');
code = code.replace(/<button[^>]*title="Toggle Sidebar"[^>]*>[\s\S]*?<\/button>\s*<button[^>]*title="Mute TTS"[^>]*>[\s\S]*?<\/button>/g, '<button className="btn-icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="Toggle Sidebar">{isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}</button>');

// 2. Remove Mic button and visualizer logic inside handleSend etc
code = code.replace(/<button[^>]*className=\{`btn-icon \$\{isRecording \? 'recording' : ''\}`\}[^>]*>[\s\S]*?<\/button>/, '');
code = code.replace(/<canvas\s+ref=\{micCanvasRef\}[^>]*><\/canvas>/, '');
code = code.replace(/stopAllTTS\(\);/g, '');

// 3. Remove Settings for TTS
// We look for blocks like Qwen3-TTS, Cartesia, etc
code = code.replace(/<div className="section-divider">\s*<h3 className="section-heading">🔊 Qwen3-TTS[\s\S]*?(?=\)\s*:\s*agents\.length === 0 \?)/, '');

// 4. Remove Voicebox Settings
code = code.replace(/\)\s*:\s*activeEditIndex === -4 \?\s*\([\s\S]*?(?=\)\s*:\s*\(\s*<div className="form-grid">)/, ') : activeEditIndex === -4 ? ( <div className="no-agents-state"><UserX size={48} className="memory-empty-icon" /><h2 className="no-agents-heading">Unknown State</h2></div> ');

// 5. Remove Agent TTS config fields in the Agent edit panel
code = code.replace(/<div className="form-group full">\s*<label>Voice Profile<\/label>[\s\S]*?<\/select>\s*<\/div>/g, '');
code = code.replace(/<div className="form-group full">\s*<label>TTS Engine<\/label>[\s\S]*?<\/select>\s*<\/div>/g, '');

// 6. Remove remaining Agent playVoicePreview buttons
code = code.replace(/<button[^>]*onClick=\{[^}]*playVoicePreview[^}]*\}[^>]*>[\s\S]*?<\/button>/g, '');
code = code.replace(/<button[^>]*onClick=\{[^}]*playAudioPreview[^}]*\}[^>]*>[\s\S]*?<\/button>/g, '');
code = code.replace(/<button[^>]*onClick=\{[^}]*playTTS[^}]*\}[^>]*>[\s\S]*?<\/button>/g, '');

// 7. Remove Voice column from Agent list
code = code.replace(/<div className="agent-meta-item"[^>]*>\s*<Volume2[^>]*\/>[\s\S]*?<\/div>/g, '');

fs.writeFileSync('src/components/Panel.tsx', code, 'utf8');
