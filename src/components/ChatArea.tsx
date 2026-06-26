'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { streamChatCompletion, fetchModels, validateApiKey } from '../services/agentRouter';
import { exportChatAsMarkdown } from '../utils/export';
import { useSpeech } from '../hooks/useSpeech';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import MessageItem from './MessageItem';
import {
  Send, Square, Sparkles, Mic, Volume2, VolumeX, Columns, Info,
  ChevronDown, Moon, Sun, ArrowRight, RefreshCw, Download,
  AlertTriangle, Zap, Lock, MessageCircle, Code2, PenTool, Bug,
  Wand2, Cpu, Image, Palette, Search
} from 'lucide-react';
import { generateImage } from '../services/agentRouter';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default function ChatArea() {
  const {
    sessions, activeSessionId, selectedModel, comparisonMode, comparisonModels,
    apiKey, isValidated, systemPrompt, theme, isGenerating, voiceInputLanguage,
    voiceOutputEnabled, voiceOutputVoice, models, isLoadingModels,
    createSession, addMessage, updateMessage, updateUsageStats, setGenerating,
    setSelectedModel, setComparisonMode, setComparisonModels, setApiKey,
    setIsValidated, setModels, setIsLoadingModels, setTheme, setShowSettings,
    setShowModelInfo, setVoiceSettings
  } = useChatStore();

  const [input, setInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [comparisonPrompt, setComparisonPrompt] = useState('');
  const [comparisonOutputs, setComparisonOutputs] = useState<Record<string, {
    text: string; generating: boolean; speed: number; tokens: number; error: string | null;
  }>>({});
  // Image generation mode
  const [imageMode, setImageMode] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageSize, setImageSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [imageQuality, setImageQuality] = useState<'standard' | 'hd'>('standard');
  const [imageStyle, setImageStyle] = useState<'vivid' | 'natural'>('vivid');
  const [imageModel, setImageModel] = useState<'dall-e-3' | 'dall-e-2'>('dall-e-3');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const speech = useSpeech();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages?.length, isGenerating]);

  // Load models when key is validated
  const loadModels = useCallback(async (key: string) => {
    setIsLoadingModels(true);
    try {
      const list = await fetchModels(key);
      setModels(list);
    } catch (err: any) {
      setError(`Failed to load models: ${err.message || 'Unknown error'}`);
    }
    finally { setIsLoadingModels(false); }
  }, [setIsLoadingModels, setModels, setError]);

  useEffect(() => {
    if (apiKey && isValidated) {
      loadModels(apiKey);
    }
  }, [apiKey, isValidated, loadModels]);

  // Theme sync
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Ctrl/Cmd+K for new chat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); createSession(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [createSession]);

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
  };

  // ─── API Key Validation ───────────────────────────────────────
  const handleValidateKey = async () => {
    const trimmedKey = keyInput.trim();
    if (!trimmedKey) { setKeyError('Please enter your API key'); return; }
    setIsValidatingKey(true);
    setKeyError(null);
    setKeySuccess(false);
    try {
      const valid = await validateApiKey(trimmedKey);
      if (valid) {
        // Store key THEN mark validated (don't use setApiKey which resets validation)
        useChatStore.setState({ apiKey: trimmedKey, isValidated: true });
        setKeySuccess(true);
        loadModels(trimmedKey);
      }
    } catch (err: any) {
      setKeyError(err.message || 'Invalid API Key — please check and try again.');
      useChatStore.setState({ isValidated: false });
    } finally {
      setIsValidatingKey(false);
    }
  };

  // ─── Image Generation ──────────────────────────────────────
  const handleGenerateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt || isGeneratingImage || !apiKey || !isValidated) return;
    setIsGeneratingImage(true);
    setError(null);

    let sessionId = useChatStore.getState().activeSessionId;
    if (!sessionId) sessionId = createSession(selectedModel);

    // Add user message
    addMessage(sessionId, { role: 'user', content: `🎨 Generate image: ${prompt}` });
    // Add placeholder assistant message
    const assistantMsgId = addMessage(sessionId, {
      role: 'assistant', content: 'Generating your image…', modelUsed: imageModel, isImageGeneration: true
    });

    try {
      const result = await generateImage(apiKey, prompt, imageModel, imageSize, imageQuality, imageStyle);
      updateMessage(sessionId, assistantMsgId, {
        content: result.revisedPrompt || prompt,
        imageUrl: result.url,
        imagePrompt: prompt,
      });
      setImagePrompt('');
    } catch (err: any) {
      let msg = err.message || 'Image generation failed';
      if (msg.toLowerCase().includes('content-blocked') || msg.toLowerCase().includes('moderation') || msg.toLowerCase().includes('safety')) {
        msg = `The safety moderation system blocked this request (request id: ${msg.match(/request id: (\w+)/)?.[1] || 'unknown'}). Please check if your prompt contains words or concepts flagged by content safety guidelines (e.g. references to infants, sensitive topics, copywritten entities, etc.) and try editing your prompt.`;
      }
      setError(msg);
      updateMessage(sessionId, assistantMsgId, { content: `*Error: ${msg}*` });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // ─── Send Message ─────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || isGenerating || !apiKey || !isValidated) return;

    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    setError(null);

    // Create session if needed, get ID synchronously
    let sessionId = useChatStore.getState().activeSessionId;
    if (!sessionId) {
      sessionId = createSession(selectedModel);
    }

    // Add messages
    addMessage(sessionId, { role: 'user', content: textToSend });
    const assistantMsgId = addMessage(sessionId, {
      role: 'assistant', content: '', modelUsed: selectedModel
    });

    const controller = new AbortController();
    abortControllersRef.current[assistantMsgId] = controller;
    setGenerating(true, assistantMsgId);

    // Build message history from current store state (after adding user msg)
    const currentSession = useChatStore.getState().sessions.find(s => s.id === sessionId);
    // Only pass messages up to (not including) the new empty assistant message
    const historyMessages = currentSession
      ? currentSession.messages.filter(m => m.id !== assistantMsgId && m.role !== 'assistant' || m.content.length > 0)
        .slice(0, -1) // exclude the just-added user message placeholder that is last
      : [];

    // Actually we want all messages except the empty assistant message
    const messagesToSend = currentSession
      ? currentSession.messages.filter(m => m.id !== assistantMsgId)
      : [{ id: 'u', role: 'user' as const, content: textToSend, timestamp: Date.now() }];

    const activeSystemPrompt = currentSession?.systemPrompt || systemPrompt;
    let accumulatedText = '';

    await streamChatCompletion(
      apiKey,
      messagesToSend,
      selectedModel,
      activeSystemPrompt,
      {
        onChunk: (chunk) => {
          accumulatedText += chunk;
          updateMessage(sessionId!, assistantMsgId, { content: accumulatedText });
        },
        onDone: (fullText, usage) => {
          setGenerating(false);
          delete abortControllersRef.current[assistantMsgId];
          const pt = usage?.promptTokens || Math.ceil(messagesToSend.reduce((a, m) => a + m.content.length, 0) / 4);
          const ct = usage?.completionTokens || Math.ceil(fullText.length / 4);
          updateMessage(sessionId!, assistantMsgId, {
            tokenUsage: { promptTokens: pt, completionTokens: ct, totalTokens: pt + ct },
            modelUsed: selectedModel,
            content: fullText || accumulatedText
          });
          updateUsageStats(pt, ct, selectedModel);
          if (voiceOutputEnabled && fullText) {
            speech.speak(fullText, voiceOutputVoice, voiceInputLanguage);
          }
        },
        onError: (err) => {
          setGenerating(false);
          delete abortControllersRef.current[assistantMsgId];
          let errMsg = err.message || 'Generation failed';
          if (errMsg.toLowerCase().includes('content-blocked') || errMsg.toLowerCase().includes('moderation') || errMsg.toLowerCase().includes('safety')) {
            errMsg = `The safety moderation system blocked this request (request id: ${errMsg.match(/request id: (\w+)/)?.[1] || 'unknown'}). Please verify that your messages follow safety guidelines.`;
          }
          setError(errMsg);
          updateMessage(sessionId!, assistantMsgId, {
            content: accumulatedText || `*Error: ${errMsg}*`
          });
        }
      },
      controller.signal
    );
  }, [input, isGenerating, apiKey, isValidated, selectedModel, systemPrompt,
    createSession, addMessage, updateMessage, updateUsageStats, setGenerating,
    voiceOutputEnabled, voiceOutputVoice, voiceInputLanguage, speech]);

  // ─── Stop Generation ──────────────────────────────────────────
  const handleStop = () => {
    Object.values(abortControllersRef.current).forEach(c => c.abort());
    abortControllersRef.current = {};
    setGenerating(false);
  };

  // ─── Voice Input ──────────────────────────────────────────────
  const handleVoice = () => {
    if (speech.isListening) {
      speech.stopListening();
    } else {
      speech.startListening(voiceInputLanguage,
        (t) => setInput(prev => (prev + ' ' + t).trim()),
        (e) => alert(e)
      );
    }
  };

  // ─── Comparison Mode ──────────────────────────────────────────
  const handleCompare = async () => {
    if (!comparisonPrompt.trim() || !apiKey || !isValidated) return;
    if (comparisonModels.length === 0) { alert('Select at least one model'); return; }
    handleStop();
    const init: Record<string, any> = {};
    comparisonModels.forEach(m => { init[m] = { text: '', generating: true, speed: 0, tokens: 0, error: null }; });
    setComparisonOutputs(init);
    setGenerating(true);

    comparisonModels.forEach(async (modelId) => {
      const ctrl = new AbortController();
      abortControllersRef.current[modelId] = ctrl;
      let acc = '', tokenCount = 0;
      const t0 = Date.now();

      await streamChatCompletion(apiKey,
        [{ id: 'u', role: 'user', content: comparisonPrompt, timestamp: Date.now() }],
        modelId, systemPrompt, {
        onChunk: (chunk) => {
          acc += chunk;
          tokenCount += Math.ceil(chunk.length / 4) || 1;
          const speed = Math.round(tokenCount / Math.max((Date.now() - t0) / 1000, 0.1));
          setComparisonOutputs(p => ({ ...p, [modelId]: { ...p[modelId], text: acc, speed, tokens: tokenCount } }));
        },
        onDone: (fullText, usage) => {
          delete abortControllersRef.current[modelId];
          const pt = usage?.promptTokens || Math.ceil(comparisonPrompt.length / 4);
          const ct = usage?.completionTokens || Math.ceil(fullText.length / 4);
          updateUsageStats(pt, ct, modelId);
          setComparisonOutputs(p => ({ ...p, [modelId]: { ...p[modelId], generating: false, tokens: pt + ct } }));
          if (Object.keys(abortControllersRef.current).length === 0) setGenerating(false);
        },
        onError: (err) => {
          delete abortControllersRef.current[modelId];
          setComparisonOutputs(p => ({ ...p, [modelId]: { ...p[modelId], generating: false, error: err.message } }));
          if (Object.keys(abortControllersRef.current).length === 0) setGenerating(false);
        }
      }, ctrl.signal);
    });
  };

  // ─── Quick prompts ────────────────────────────────────────────
  const samplePrompts = [
    { title: 'Explain Concept', icon: <MessageCircle className="h-4 w-4" />, text: 'Explain quantum computing in simple terms for a 10-year-old.', color: '#6366f1' },
    { title: 'Refactor Code', icon: <Code2 className="h-4 w-4" />, text: 'Analyze this code for performance issues and refactor it with clean TypeScript:\n\n```js\n// Paste code here\n```', color: '#8b5cf6' },
    { title: 'Write Content', icon: <PenTool className="h-4 w-4" />, text: 'Write a compelling blog post intro about the future of AI in 2025.', color: '#a855f7' },
    { title: 'Debug Issue', icon: <Bug className="h-4 w-4" />, text: 'Help me systematically debug and fix a memory leak in a Next.js 15 application.', color: '#ec4899' },
  ];

  const filteredModels = models.filter(m =>
    m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
    (m.owned_by || '').toLowerCase().includes(modelSearch.toLowerCase())
  );

  // ─── Onboarding ───────────────────────────────────────────────
  const showOnboarding = !apiKey || !isValidated;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background 0.3s, color 0.3s' }}>

      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-1 pointer-events-none" />
      <div className="ambient-orb ambient-orb-2 pointer-events-none" />

      {/* ══════════ HEADER ══════════ */}
      <header className="sticky top-0 h-[68px] shrink-0 flex items-center justify-between px-6 md:px-8 z-30" style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>

        {/* Left: Spacer (Brand removed) */}
        <div className="flex items-center shrink-0 min-w-[60px]" />

        {/* Center: Model selector */}
        {!comparisonMode && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => { setShowModelDropdown(!showModelDropdown); setModelSearch(''); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold border transition-all active:scale-95 hover:border-[var(--accent)] shadow-sm hover:shadow"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <Cpu className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                <span className="font-mono max-w-[180px] truncate">{selectedModel}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} style={{ color: 'var(--text-tertiary)' }} />
              </button>

              {showModelDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowModelDropdown(false)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3.5 w-80 rounded-[24px] border p-3 z-50 flex flex-col max-h-[340px] animate-fade-in" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-xl)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)' }}>
                    <div className="relative mb-2 shrink-0">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search frontier models..."
                        value={modelSearch}
                        onChange={e => setModelSearch(e.target.value)}
                        className="input-field w-full text-xs pl-8 rounded-xl"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                      />
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                      {isLoadingModels ? (
                        <div className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          <RefreshCw className="h-5 w-5 mx-auto mb-2.5 animate-spin" style={{ color: 'var(--accent)' }} />
                          <span className="font-semibold tracking-tight">Fetching available models...</span>
                        </div>
                      ) : filteredModels.length === 0 ? (
                        <div className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>No matching models found</div>
                      ) : filteredModels.map(m => {
                        const isSelected = selectedModel === m.id;
                        let badgeColor = '#94a3b8';
                        let provider = 'AI';
                        if (m.id.toLowerCase().includes('gpt')) { badgeColor = '#10b981'; provider = 'OpenAI'; }
                        else if (m.id.toLowerCase().includes('claude')) { badgeColor = '#d97706'; provider = 'Anthropic'; }
                        else if (m.id.toLowerCase().includes('deepseek')) { badgeColor = '#0ea5e9'; provider = 'DeepSeek'; }
                        else if (m.id.toLowerCase().includes('gemini')) { badgeColor = '#8b5cf6'; provider = 'Google'; }
                        else if (m.id.toLowerCase().includes('llama')) { badgeColor = '#ec4899'; provider = 'Meta'; }

                        return (
                          <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelDropdown(false); }}
                            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono transition-all truncate flex items-center justify-between gap-2 hover:bg-[var(--bg-hover)]"
                            style={{ background: isSelected ? 'var(--accent-light)' : 'transparent', color: isSelected ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400 }}>
                            <div className="flex items-center gap-2 truncate">
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />}
                              <span className="truncate">{m.id}</span>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-sans font-semibold shrink-0" style={{ background: badgeColor + '15', color: badgeColor, border: `1px solid ${badgeColor}25` }}>
                              {provider}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setShowModelInfo(true)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-tertiary)' }} title="Model info">
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Facebook — shiny & prominent */}
          <a
            href="https://www.facebook.com/profile.php?id=61571220357480"
            target="_blank"
            rel="noopener noreferrer"
            className="fb-follow-btn"
          >
            <FacebookIcon className="h-3.5 w-3.5" />
            <span>Follow</span>
          </a>

          {/* Image mode (Locked) */}
          {isValidated && (
            <button
              onClick={() => alert('Image generation feature is coming soon!')}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', opacity: 0.65 }}
            >
              <Image className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Image</span>
            </button>
          )}

          {/* Compare (Locked) */}
          <button
            onClick={() => alert('Model comparison feature is coming soon!')}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', opacity: 0.65 }}
          >
            <Columns className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compare</span>
          </button>

          {/* Export */}
          {!comparisonMode && activeSession && activeSession.messages.length > 0 && (
            <button onClick={() => exportChatAsMarkdown(activeSession)} className="p-2 rounded-xl border transition-all" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }} title="Export chat">
              <Download className="h-4 w-4" />
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl border transition-all"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ══════════ MAIN AREA ══════════ */}
      {showOnboarding ? (
        /* ── ONBOARDING ── */
        <div className="flex-1 flex items-center justify-center p-6 relative z-10 overflow-y-auto">
          <div className="onboard-card w-full max-w-md p-8 space-y-6 animate-slide-up">
            {/* Logo + Title */}
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl mx-auto flex items-center justify-center animate-float" style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow)' }}>
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight gradient-text">Ryiys Hacker Claude Unlimited</h1>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Your private gateway to 50+ AI models. Enter your API key to begin.
                </p>
              </div>
            </div>

            {/* Features row */}
            <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-semibold">
              {[
                { icon: '🔒', label: 'Local Storage' },
                { icon: '⚡', label: '50+ Models' },
                { icon: '🌊', label: 'Streaming' },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <div className="text-lg mb-1">{f.icon}</div>
                  {f.label}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                API TOKEN
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={e => { setKeyInput(e.target.value); setKeyError(null); setKeySuccess(false); }}
                onKeyDown={e => e.key === 'Enter' && handleValidateKey()}
                placeholder="Enter your API key (sk-...)"
                className="input-field w-full font-mono text-sm"
                style={{ letterSpacing: keyInput ? '0.05em' : 'normal' }}
              />

              {keyError && (
                <div className="flex gap-2 items-start p-3 rounded-xl text-xs animate-fade-in" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--error)' }}>
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  {keyError}
                </div>
              )}

              {keySuccess && (
                <div className="flex gap-2 items-center p-3 rounded-xl text-xs animate-fade-in" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--success)' }}>
                  ✓ Key validated! Loading models...
                </div>
              )}

              <button
                onClick={handleValidateKey}
                disabled={isValidatingKey || !keyInput.trim()}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
              >
                {isValidatingKey ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Verifying Key...</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> Connect & Unlock</>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] pt-2" style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)' }}>
              <Lock className="h-3 w-3" />
              Your key never leaves your device. 100% private.
            </div>
          </div>
        </div>

      ) : comparisonMode ? (
        /* ── COMPARISON MODE ── */
        <div className="flex-1 overflow-y-auto p-4 md:p-6 z-10 relative space-y-4">
          <div className="glass-panel p-5 max-w-4xl mx-auto w-full space-y-4">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <span className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Columns className="h-4 w-4" style={{ color: 'var(--accent)' }} /> Select models:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(models.slice(0, 6).length ? models.slice(0, 6) : [{ id: 'gpt-4o-mini' }, { id: 'claude-3-5-sonnet' }, { id: 'deepseek-chat' }]).map((m: any) => {
                  const sel = comparisonModels.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => {
                      if (sel) setComparisonModels(comparisonModels.filter(x => x !== m.id));
                      else if (comparisonModels.length < 3) setComparisonModels([...comparisonModels, m.id]);
                      else alert('Max 3 models for comparison');
                    }} className="px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all"
                      style={{ background: sel ? 'var(--accent-light)' : 'transparent', borderColor: sel ? 'var(--accent)' : 'var(--border-color)', color: sel ? 'var(--accent)' : 'var(--text-tertiary)', fontWeight: sel ? 700 : 400 }}>
                      {m.id}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="relative">
              <textarea
                value={comparisonPrompt}
                onChange={e => setComparisonPrompt(e.target.value)}
                placeholder="Enter prompt to compare across all selected models..."
                className="input-field w-full min-h-[90px] resize-none pr-24"
              />
              <div className="absolute right-3 bottom-3">
                {isGenerating
                  ? <button onClick={handleStop} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <Square className="h-3.5 w-3.5" style={{ fill: 'currentColor' }} /> Stop
                  </button>
                  : <button onClick={handleCompare} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5">
                    Compare <Send className="h-3.5 w-3.5" />
                  </button>
                }
              </div>
            </div>
          </div>

          {Object.keys(comparisonOutputs).length > 0 ? (
            <div className={`grid gap-4 max-w-6xl mx-auto w-full ${comparisonModels.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
              {comparisonModels.map(modelId => {
                const out = comparisonOutputs[modelId] || { text: '', generating: false, speed: 0, tokens: 0, error: null };
                return (
                  <div key={modelId} className="glass-panel p-4 flex flex-col h-[440px]">
                    <div className="flex items-center justify-between pb-2 mb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{modelId}</span>
                      {out.generating && <div className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)', animation: 'pulseGlow 1.5s infinite' }} />}
                    </div>
                    <div className="flex-1 overflow-y-auto text-sm markdown-body">
                      {out.error ? <div className="text-xs p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', color: 'var(--error)' }}>{out.error}</div>
                        : out.text ? <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{out.text}</ReactMarkdown>
                          : <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>Waiting for response...</span>}
                    </div>
                    <div className="flex justify-between pt-3 mt-3 text-[10px] font-mono" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-tertiary)' }}>
                      <span>Speed: <b style={{ color: 'var(--text-primary)' }}>{out.speed}</b> t/s</span>
                      <span>~{out.tokens} tokens</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3 mt-4">
              {samplePrompts.map((p, i) => (
                <div key={i} onClick={() => setComparisonPrompt(p.text)} className="glass-panel p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] space-y-2">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: p.color + '15', color: p.color }}>{p.icon}</div>
                  <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{p.title}</div>
                  <div className="text-[10px] line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{p.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      ) : (
        /* ── STANDARD CHAT ── */
        <div className="flex-1 flex flex-col overflow-hidden z-10 relative">
          {/* Messages scrollable area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-[80px] pb-6 flex flex-col items-center">
            {!activeSession || activeSession.messages.length === 0 ? (
              /* Empty state */
              <div className="w-full max-w-2xl text-center py-32 space-y-4 animate-fade-in">
                <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>What can I help you with?</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Using <code className="font-mono text-xs px-2.5 py-0.5 rounded-md animate-pulse" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-light)' }}>{selectedModel}</code>
                </p>
              </div>
            ) : (
              <div className="w-full max-w-3xl space-y-6 pb-4">
                {activeSession.messages.map((msg, idx) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    sessionId={activeSession.id}
                    isLast={idx === activeSession.messages.length - 1}
                    onRegenerate={idx > 0 ? () => handleSend(activeSession.messages[idx - 1]?.content) : undefined}
                    speechState={{
                      isSpeaking: speech.isSpeaking,
                      speak: (txt, onEnd) => speech.speak(txt, voiceOutputVoice, voiceInputLanguage, onEnd),
                      stopSpeaking: speech.stopSpeaking
                    }}
                  />
                ))}
                {error && (
                  <div className="flex gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--error)' }}>
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ── Input Bar ── */}
          <div className="shrink-0 px-4 md:px-8 py-4 flex flex-col items-center" style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
            <div className="w-full max-w-3xl space-y-3">

              {/* ── CHAT INPUT ── */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaInput}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Message ${selectedModel}… (Enter ↵ to send, Shift+Enter for newline)`}
                  rows={1}
                  className="w-full bg-transparent text-sm border-0 focus:outline-none focus:ring-0 resize-none px-4 py-4"
                  style={{ color: 'var(--text-primary)', minHeight: '52px', maxHeight: '180px' }}
                />
                <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <div className="flex gap-1">
                    <button
                      onClick={handleVoice}
                      title={speech.isListening ? 'Listening…' : 'Voice input'}
                      className="p-2 rounded-xl transition-all"
                      style={{ background: speech.isListening ? 'rgba(239,68,68,0.1)' : 'transparent', color: speech.isListening ? 'var(--error)' : 'var(--text-tertiary)', border: speech.isListening ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent' }}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setVoiceSettings(voiceInputLanguage, !voiceOutputEnabled, voiceOutputVoice)}
                      title="Toggle read-aloud"
                      className="p-2 rounded-xl transition-all"
                      style={{ background: voiceOutputEnabled ? 'var(--accent-light)' : 'transparent', color: voiceOutputEnabled ? 'var(--accent)' : 'var(--text-tertiary)', border: voiceOutputEnabled ? '1px solid var(--accent-light)' : '1px solid transparent' }}
                    >
                      {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>
                      {input.length > 0 ? `${input.length} chars` : 'Shift+Enter for newline'}
                    </span>
                    {isGenerating ? (
                      <button
                        onClick={handleStop}
                        className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.25)' }}
                      >
                        <Square className="h-3.5 w-3.5" style={{ fill: 'currentColor' }} /> Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSend()}
                        disabled={!input.trim()}
                        className="btn-primary py-2 px-5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-bold"
                      >
                        <Send className="h-3.5 w-3.5" /> Send
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex gap-2 items-start p-3 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--error)' }}>
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
