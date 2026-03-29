const fs = require('fs');

let code = fs.readFileSync('src/components/Panel.tsx', 'utf8');

// Remove Mute Button
code = code.replace(/<button\s*className=\{`btn-icon \$\{isMuted \? '' : 'text-blue-400 border-blue-400'\}`\}[\s\S]*?<\/button>/, '');

// Remove Mic Button
code = code.replace(/<button\s*className=\{`btn-icon \$\{isRecording \? 'recording' : ''\}`\}[\s\S]*?<\/button>/, '');

// Remove visualizer canvas
code = code.replace(/<canvas\s+ref=\{micCanvasRef\}[\s\S]*?><\/canvas>/, '');

// Remove Agent TTS configs
code = code.replace(/<div className="form-group full">\s*<label>Voice Profile<\/label>[\s\S]*?<\/select>\s*<\/div>/g, '');
code = code.replace(/<div className="form-group full">\s*<label>TTS Engine<\/label>[\s\S]*?<\/select>\s*<\/div>/g, '');

// Remove TTS Settings blocks
code = code.replace(/<div className="section-divider">\s*<h3 className="section-heading">🔊 Qwen3-TTS \(Local Voice\)<\/h3>\s*<\/div>[\s\S]*?(?=<div className="section-divider">\s*<h3 className="section-heading">🎙️ Cartesia AI \(Cloud Voice\)<\/h3>)/, '');
code = code.replace(/<div className="section-divider">\s*<h3 className="section-heading">🎙️ Cartesia AI \(Cloud Voice\)<\/h3>\s*<\/div>[\s\S]*?(?=<div className="section-divider">\s*<h3 className="section-heading">☁️ Gemini TTS \(Google Cloud\)<\/h3>)/, '');
code = code.replace(/<div className="section-divider">\s*<h3 className="section-heading">☁️ Gemini TTS \(Google Cloud\)<\/h3>\s*<\/div>[\s\S]*?(?=<div className="section-divider">\s*<h3 className="section-heading">🎤 TADA TTS \(Local — Hume AI\)<\/h3>)/, '');
code = code.replace(/<div className="section-divider">\s*<h3 className="section-heading">🎤 TADA TTS \(Local — Hume AI\)<\/h3>\s*<\/div>[\s\S]*?(?=<\/>\s*\)\s*:\s*agents\.length === 0 \?)/, '');

// Voicebox Settings
code = code.replace(/\)\s*:\s*activeEditIndex === -4 \?\s*\([\s\S]*?(?=\)\s*:\s*\(\s*<div className="form-grid">)/, ') : activeEditIndex === -4 ? ( <div className="no-agents-state"><UserX size={48} className="memory-empty-icon" /><h2 className="no-agents-heading">Nothing Here</h2></div> ');

// Agent voice indicators
code = code.replace(/<div className="agent-meta-item"\s*title="Voice[^>]*>\s*<Volume2[^>]*\/>[\s\S]*?<\/div>/g, '');

// Speaking indicators
code = code.replace(/speakingAgentName === agent\.name \? 'speaking' : ''/g, "''");
code = code.replace(/<div className="speaking-indicator">[\s\S]*?<\/div>/g, '');
code = code.replace(/<div className="agent-voice-name">[^<]*<\/div>/g, '');

// playVoicePreview and playTTS buttons
code = code.replace(/<button[^>]*onClick=\{[^}]*playVoicePreview[^}]*\}[^>]*>[\s\S]*?<\/button>/g, '');
code = code.replace(/<button[^>]*onClick=\{[^}]*playAudioPreview[^}]*\}[^>]*>[\s\S]*?<\/button>/g, '');
code = code.replace(/<button[^>]*onClick=\{[^}]*playTTS[^}]*\}[^>]*>[\s\S]*?<\/button>/g, '');

fs.writeFileSync('src/components/Panel.tsx', code, 'utf8');
