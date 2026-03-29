const { Project, SyntaxKind } = require('ts-morph');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/components/Panel.tsx');

// 1. Remove specific ImportDeclarations
const modulesToRemove = [
    '../lib/qwen-tts', '../lib/cartesia-tts', '../lib/gemini-tts', 
    '../lib/vibevoice-tts', '../lib/kokoro-tts', '../lib/supertonic-tts', 
    '../lib/tada-tts', '../lib/voicebox-tts', '../lib/cartesia-voices'
];

sourceFile.getImportDeclarations().forEach(imp => {
    const mod = imp.getModuleSpecifierValue();
    if (modulesToRemove.includes(mod)) {
        imp.remove();
    }
});

// Fix gemini import
const geminiImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === '../lib/gemini');
if (geminiImport) {
    const namedImports = geminiImport.getNamedImports();
    namedImports.forEach(ni => {
        if (ni.getName() === 'generateTTS') {
            ni.remove();
        }
    });
}

// 2. Remove Variables
const varsToRemove = [
    'GEMINI_VOICES', 'QWEN_VOICES', 'AGENT_DEFAULT_QWEN_VOICES', 
    'AGENT_DEFAULT_CARTESIA_VOICES', 'AGENT_SUPERTONIC_VOICES'
];
sourceFile.getVariableStatements().forEach(stmt => {
    stmt.getDeclarations().forEach(decl => {
        if (varsToRemove.includes(decl.getName())) {
            stmt.remove();
        }
    });
});

// 3. Update Agent Interface
const agentInterface = sourceFile.getInterface('Agent');
if (agentInterface) {
    const voiceProp = agentInterface.getProperty('voice');
    if (voiceProp) voiceProp.remove();
    const ttsProp = agentInterface.getProperty('ttsProvider');
    if (ttsProp) ttsProp.remove();
}

// Remove TTSQueueItem
const ttsQueueItem = sourceFile.getInterface('TTSQueueItem');
if (ttsQueueItem) ttsQueueItem.remove();


// 4. Update defaultAgents
const defaultAgentsVar = sourceFile.getVariableDeclaration('defaultAgents');
if (defaultAgentsVar) {
    const init = defaultAgentsVar.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
    if (init) {
        init.getElements().forEach(element => {
            if (element.getKind() === SyntaxKind.ObjectLiteralExpression) {
                element.getProperty('voice')?.remove();
                element.getProperty('ttsProvider')?.remove();
            }
        });
    }
}

// 5. Inside Panel component: states, refs, effects, functions
const panelFunction = sourceFile.getFunction('Panel');
if (panelFunction) {
    const statesAndRefs = [
        'qwenTtsUrl', 'qwenTtsStatus', 'cartesiaApiKey', 'cartesiaStatus',
        'geminiTtsStatus', 'vibevoiceTtsStatus', 'tadaTtsUrl', 'tadaTtsStatus',
        'voiceboxStatus', 'voiceboxProfiles', 'voiceboxMeta', 'voiceboxHistory',
        'speakingAgentName', 'isMuted', 'isMutedRef', 'ttsQueueRef', 
        'ttsPlayingRef', 'audioUnlockedRef', 'qwenTtsUrlRef', 'tadaTtsUrlRef', 
        'voiceboxProfilesRef', 'currentAudioRef', 'audioContextRef', 'analyserRef',
        'animFrameRef', 'micCanvasRef', 'micStreamRef', 'micAnalyserRef', 
        'micAnimRef', 'micAudioCtxRef', 'isRecording', 'recognitionRef', 
        'initialInputRef', 'cartesiaApiKeyRef'
    ];

    panelFunction.getVariableStatements().forEach(stmt => {
        stmt.getDeclarations().forEach(decl => {
            let name = '';
            if (decl.getNameNode().getKind() === SyntaxKind.ArrayBindingPattern) {
                // [state, setState]
                name = decl.getNameNode().getElements()[0].getText();
            } else {
                name = decl.getName();
            }
            if (statesAndRefs.includes(name)) {
                stmt.remove();
            }
        });
    });

    // Remove UseEffects containing specific calls
    panelFunction.getStatements().forEach(stmt => {
        if (stmt.getKind() === SyntaxKind.ExpressionStatement) {
            const expr = stmt.getExpression();
            if (expr.getKind() === SyntaxKind.CallExpression) {
                const callExpr = expr;
                if (callExpr.getExpression().getText() === 'useEffect') {
                    const text = callExpr.getText();
                    if (
                        text.includes('preloadSupertonic') ||
                        text.includes('initAudioContext') ||
                        text.includes('qwenTtsUrlRef.current') ||
                        text.includes('tadaTtsUrlRef.current') ||
                        text.includes('cartesiaApiKeyRef.current') ||
                        text.includes('voiceboxProfilesRef.current') ||
                        text.includes('fetchVoiceboxProfiles') ||
                        text.includes('webkitSpeechRecognition') ||
                        text.includes('currentAudioRef.current.pause')
                    ) {
                        stmt.remove();
                    }
                }
            }
        }
    });

    // Remove TTS functions
    const funcsToRemove = [
        'stopMicVisualizer', 'startMicVisualizer', 'toggleMic',
        'enqueueTTS', 'drainTTSQueue', 'stopAllTTS', 'playAudioPreview', 
        'playVoicePreview', 'playTTS'
    ];
    panelFunction.getVariableStatements().forEach(stmt => {
        stmt.getDeclarations().forEach(decl => {
            if (funcsToRemove.includes(decl.getName())) {
                stmt.remove();
            }
        });
    });

    // Clean up saveCurrentSettings (remove TTS fields)
    const saveCurrentSettingsVar = panelFunction.getVariableDeclaration('saveCurrentSettings');
    if (saveCurrentSettingsVar) {
        const arrowFunc = saveCurrentSettingsVar.getInitializerIfKind(SyntaxKind.ArrowFunction);
        if (arrowFunc) {
            arrowFunc.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression).forEach(obj => {
                obj.getProperty('qwen_tts_url')?.remove();
                obj.getProperty('cartesia_api_key')?.remove();
                obj.getProperty('is_muted')?.remove();
                obj.getProperty('auto_start_tts')?.remove();
            });
        }
    }

    // Clean up loadUserSettings
    const loadUserSettingsVar = panelFunction.getVariableDeclaration('loadUserSettings');
    if (loadUserSettingsVar) {
        const arrowFunc = loadUserSettingsVar.getInitializerIfKind(SyntaxKind.ArrowFunction);
        if (arrowFunc) {
            arrowFunc.getDescendantsOfKind(SyntaxKind.ExpressionStatement).forEach(exprStmt => {
                const text = exprStmt.getText();
                if (text.includes('setQwenTtsUrl') || text.includes('setCartesiaApiKey') || text.includes('setIsMuted')) {
                    exprStmt.remove();
                }
            });
        }
    }

    // Replace `stopAllTTS();` calls with nothing inside handleSend, createNewDiscussion, loadDiscussion
    const methods = ['handleSend', 'createNewDiscussion', 'loadDiscussion'];
    methods.forEach(m => {
        const decl = panelFunction.getVariableDeclaration(m);
        if (decl) {
            const func = decl.getInitializerIfKind(SyntaxKind.ArrowFunction);
            if (func) {
                func.getStatements().forEach(stmt => {
                    const text = stmt.getText();
                    if (text.includes('stopAllTTS();')) {
                        stmt.remove();
                    }
                });
            }
        }
    });

    // Inside handleSend, remove ttsQueueRef logic and audio unlock
    const handleSendVar = panelFunction.getVariableDeclaration('handleSend');
    if (handleSendVar) {
        const func = handleSendVar.getInitializerIfKind(SyntaxKind.ArrowFunction);
        if (func) {
            func.getStatements().forEach(stmt => {
                const text = stmt.getText();
                if (
                    text.includes('ttsQueueRef.current') ||
                    text.includes('ttsPlayingRef.current') ||
                    text.includes('audioContextRef.current') ||
                    text.includes('enqueueTTS(') ||
                    text.includes('drainTTSQueue()')
                ) {
                    stmt.remove();
                }
            });
        }
    }
}

sourceFile.saveSync();
console.log('Cleanup complete');
