const fs = require('fs');

let lines = fs.readFileSync('src/components/Panel.tsx', 'utf8').split('\n');
let out = [];

let skipLevel = 0;
let skipTag = '';

// Helper to count tag balance in a line
function countTags(line, tag) {
    const open = (line.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (line.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    // Self-closing like <div />
    const selfClose = (line.match(new RegExp(`<${tag}[^>]*/>`, 'g')) || []).length;
    return open - close - selfClose;
}

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (skipLevel > 0) {
        skipLevel += countTags(line, skipTag);
        if (skipLevel <= 0) {
            skipLevel = 0;
            skipTag = '';
        }
        continue;
    }

    // Skip specific buttons
    if (line.includes('<button') && (
        line.includes('playAudioPreview') ||
        line.includes('playVoicePreview') ||
        line.includes('playTTS') ||
        line.includes('toggleMic') ||
        line.includes('checkCartesiaKey') ||
        line.includes('checkGeminiKey') ||
        line.includes('checkTadaHealth') ||
        line.includes('checkVoiceboxHealth')
    )) {
        skipTag = 'button';
        skipLevel = countTags(line, skipTag);
        if (skipLevel <= 0) { skipLevel = 0; skipTag = ''; }
        continue;
    }

    // Skip Qwen test button (multi-line)
    if (line.includes('onClick={async () => {') && lines[i+1] && lines[i+1].includes('setQwenTtsStatus(\'unknown\');')) {
        skipTag = 'button';
        skipLevel = countTags('<button', skipTag) + countTags(line, skipTag);
        continue;
    }

    // Skip specific div blocks
    if (line.includes('<div') && (
        line.includes('className="form-group full"') ||
        line.includes('className="section-divider"') ||
        line.includes('className={`status-dot') ||
        line.includes('className="agent-meta-item"')
    )) {
        // Look ahead a few lines to see if it's a TTS block
        let lookahead = line;
        for (let j = 1; j < 25 && (i+j) < lines.length; j++) {
            lookahead += ' ' + lines[i+j];
        }

        if (
            lookahead.includes('Voice Profile') ||
            lookahead.includes('TTS Engine') ||
            lookahead.includes('Qwen3-TTS') ||
            lookahead.includes('Qwen3-TTS Server URL') ||
            lookahead.includes('QWEN_VOICES') ||
            lookahead.includes('Cartesia AI') ||
            lookahead.includes('Cartesia API Key') ||
            lookahead.includes('cartesiaStatus') ||
            lookahead.includes('Gemini TTS') ||
            lookahead.includes('Gemini API Key') ||
            lookahead.includes('geminiTtsStatus') ||
            lookahead.includes('TADA TTS') ||
            lookahead.includes('TADA Server URL') ||
            lookahead.includes('TADA_VOICES') ||
            lookahead.includes('Voicebox Server URL') ||
            lookahead.includes('Voicebox Backend Healthy') ||
            lookahead.includes('voiceboxMeta') ||
            lookahead.includes('voiceboxHistory') ||
            lookahead.includes('SUPERTONIC_VOICES') ||
            lookahead.includes('KOKORO_VOICES') ||
            lookahead.includes('CARTESIA_VOICES') ||
            lookahead.includes('GEMINI_TTS_VOICES') ||
            lookahead.includes('voiceboxProfiles') ||
            lookahead.includes('title="Voice"')
        ) {
            skipTag = 'div';
            skipLevel = countTags(line, skipTag);
            if (skipLevel <= 0) { skipLevel = 0; skipTag = ''; }
            continue;
        }
    }

    // Also remove the "Prebuilt Voices" or "Connection Status" labels if they got detached
    if (line.includes('<label>Prebuilt Voices</label>') || 
        line.includes('<label>Connection Status</label>') ||
        line.includes('<label>Available Voices</label>') ||
        line.includes('<strong>Automatic Profile Sync:</strong>')) {
        continue; // They are inside a form-group full, but if they matched, skip line
    }

    // Clean up inline occurrences
    line = line.replace(/isSpeaking=\{isSpeaking\}/g, '');
    line = line.replace(/const isSpeaking = speakingAgentName === a\.name;/g, '');
    line = line.replace(/className=\{`agent-preview-card \$\{isSpeaking \? 'speaking' : ''\}`\}/g, 'className="agent-preview-card"');
    line = line.replace(/className=\{`agent-avatar-wrapper \$\{isSpeaking \? 'speaking' : ''\}`\}/g, 'className="agent-avatar-wrapper"');
    
    // Remove the whole Voicebox block inside the form-grid conditional
    if (line.includes(') : activeEditIndex === -4 ? (')) {
        out.push(') : activeEditIndex === -4 ? ( <div className="no-agents-state"><UserX size={48} className="memory-empty-icon" /><h2 className="no-agents-heading">Nothing Here</h2></div> ');
        // skip until ) :
        skipTag = 'conditional_hack';
        continue;
    }
    if (skipTag === 'conditional_hack') {
        if (line.includes(') :') && !line.includes('activeEditIndex === -4')) {
            skipTag = '';
            // keep evaluating this line
        } else {
            continue;
        }
    }

    out.push(line);
}

// final regex cleanups just in case
let finalCode = out.join('\n');
finalCode = finalCode.replace(/<span[^>]*>\{voiceboxStatus[^}]*\}<\/span>/g, '');
finalCode = finalCode.replace(/<div className=\{`status-dot \$\{voiceboxStatus\}`\}><\/div>/g, '');
finalCode = finalCode.replace(/<div className=\{`status-dot \$\{qwenTtsStatus\}`\}><\/div>/g, '');
finalCode = finalCode.replace(/<div className=\{`status-dot \$\{cartesiaStatus\}`\}><\/div>/g, '');
finalCode = finalCode.replace(/<div className=\{`status-dot \$\{geminiTtsStatus\}`\}><\/div>/g, '');
finalCode = finalCode.replace(/<div className=\{`status-dot \$\{tadaTtsStatus\}`\}><\/div>/g, '');

fs.writeFileSync('src/components/Panel.tsx', finalCode, 'utf8');
