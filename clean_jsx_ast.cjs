const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/components/Panel.tsx');

const toRemove = [];

sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement).forEach(element => {
    try {
        const text = element.getText();
        const tagName = element.getOpeningElement().getTagNameNode().getText();
        
        // Remove Buttons
        if (tagName === 'button' && (
            text.includes('isMuted') || 
            text.includes('isRecording') || 
            text.includes('toggleMic') ||
            text.includes('playAudioPreview') ||
            text.includes('playVoicePreview') ||
            text.includes('playTTS')
        )) {
            toRemove.push(element);
        }

        // Remove divs with specific classes/contents
        if (tagName === 'div') {
            const classNameAttr = element.getOpeningElement().getAttribute('className');
            if (classNameAttr && classNameAttr.getText().includes('agent-meta-item')) {
                if (text.includes('Volume2') || text.includes('title="Voice"')) {
                    toRemove.push(element);
                }
            }
            if (classNameAttr && classNameAttr.getText().includes('form-group full')) {
                if (text.includes('Voice Profile') || text.includes('TTS Engine') || text.includes('Qwen3-TTS') || text.includes('voiceboxStatus')) {
                    toRemove.push(element);
                }
            }
            if (classNameAttr && classNameAttr.getText().includes('section-divider')) {
                if (text.includes('Qwen3-TTS') || text.includes('Cartesia AI') || text.includes('Gemini TTS') || text.includes('TADA TTS')) {
                    toRemove.push(element);
                }
            }
            if (classNameAttr && classNameAttr.getText().includes('speaking-indicator')) {
                toRemove.push(element);
            }
            if (classNameAttr && classNameAttr.getText().includes('agent-voice-name')) {
                toRemove.push(element);
            }
            // Remove the whole Voicebox block inside the form-grid
            if (text.includes('Voicebox Server URL') && classNameAttr && classNameAttr.getText().includes('form-grid')) {
                // Actually the voicebox block is inside a conditional, let's target form-groups instead.
            }
        }
    } catch (e) {}
});

sourceFile.getDescendantsOfKind(SyntaxKind.JsxExpression).forEach(expr => {
    try {
        const text = expr.getText();
        if (text.includes('speakingAgentName === msg.sender')) {
            toRemove.push(expr);
        }
        if (text.includes('isMuted ?')) {
            toRemove.push(expr);
        }
        if (text.includes('isRecording ?')) {
            toRemove.push(expr);
        }
    } catch (e) {}
});

// Canvas
sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).forEach(el => {
    try {
        if (el.getTagNameNode().getText() === 'canvas' && el.getText().includes('micCanvasRef')) {
            toRemove.push(el);
        }
    } catch (e) {}
});

// Sort by length descending, so we remove the outermost elements first
toRemove.sort((a, b) => b.getText().length - a.getText().length);

// Actually, to avoid overlapping removals, if node A contains node B, removing A first means B will be forgotten.
// We just catch the InvalidOperationError and ignore it.
toRemove.forEach(node => {
    try {
        if (!node.wasForgotten()) {
            node.replaceWithText('');
        }
    } catch (e) {}
});

sourceFile.saveSync();

// Now some targeted string replacements for remaining TTS logic
let code = fs.readFileSync('src/components/Panel.tsx', 'utf8');

code = code.replace(/^\s*stopAllTTS\(\);\s*$/gm, '');

// Clean defaultAgents
code = code.replace(/,\s*voice:\s*"[^"]+",\s*ttsProvider:\s*"[^"]+"/g, '');

// Clean the entire TTS settings section by regex from `Qwen3-TTS` down to the next branch
code = code.replace(/<div className="section-divider">\s*<h3 className="section-heading">🔊 Qwen3-TTS[\s\S]*?(?=<\/>\s*\)\s*:\s*agents\.length === 0 \?)/, '');

// Voicebox settings
code = code.replace(/\)\s*:\s*activeEditIndex === -4 \?\s*\([\s\S]*?(?=\)\s*:\s*\(\s*<div className="form-grid">)/, ') : activeEditIndex === -4 ? ( <div className="no-agents-state"><UserX size={48} className="memory-empty-icon" /><h2 className="no-agents-heading">Nothing Here</h2></div> ');

// Agent Settings specific forms
code = code.replace(/<div className="form-group full">\s*<label>Voice Profile<\/label>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '</div>');
code = code.replace(/<div className="form-group full">\s*<label>TTS Engine<\/label>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '</div>');

code = code.replace(/const isSpeaking = speakingAgentName === a\.name;/g, '');
code = code.replace(/isSpeaking=\{isSpeaking\}/g, '');
code = code.replace(/className=\{`agent-preview-card \$\{isSpeaking \? 'speaking' : ''\}`\}/g, 'className="agent-preview-card"');
code = code.replace(/className=\{`agent-avatar-wrapper \$\{isSpeaking \? 'speaking' : ''\}`\}/g, 'className="agent-avatar-wrapper"');

fs.writeFileSync('src/components/Panel.tsx', code, 'utf8');
