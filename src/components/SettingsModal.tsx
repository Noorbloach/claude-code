'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { validateApiKey } from '../services/agentRouter';
import { useSpeech } from '../hooks/useSpeech';
import { 
  X, 
  Key, 
  Settings, 
  Coins, 
  Sparkles, 
  Trash2, 
  Volume2, 
  Languages, 
  Check, 
  Code, 
  PenTool, 
  BarChart, 
  BookOpen, 
  Moon, 
  Sun,
  Laptop
} from 'lucide-react';
import { AgentPreset } from '../types';

export default function SettingsModal() {
  const {
    apiKey,
    isValidated,
    systemPrompt,
    theme,
    usageStats,
    voiceInputLanguage,
    voiceOutputEnabled,
    voiceOutputVoice,
    showSettings,
    setApiKey,
    setIsValidated,
    setSystemPrompt,
    setTheme,
    resetUsageStats,
    setVoiceSettings,
    setShowSettings,
    applyPreset
  } = useChatStore();

  const speech = useSpeech();
  const [localKey, setLocalKey] = useState(apiKey);
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [isValidating, setIsValidating] = useState(false);
  const [valMessage, setValMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (showSettings) {
      setLocalKey(apiKey);
      setLocalPrompt(systemPrompt);
      setValMessage(null);
    }
  }, [showSettings, apiKey, systemPrompt]);

  if (!showSettings) return null;

  const handleValidate = async () => {
    if (!localKey.trim()) {
      setValMessage({ text: 'Please enter a key', isError: true });
      return;
    }
    setIsValidating(true);
    setValMessage(null);
    try {
      const ok = await validateApiKey(localKey.trim());
      if (ok) {
        setApiKey(localKey.trim());
        setIsValidated(true);
        setValMessage({ text: 'API key successfully validated and saved.', isError: false });
      }
    } catch (err: any) {
      setValMessage({ text: err.message || 'Validation failed. Please check the key.', isError: true });
      setIsValidated(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSavePrompt = () => {
    setSystemPrompt(localPrompt.trim());
    alert('Global system prompt updated.');
  };

  const presets: AgentPreset[] = [
    {
      id: 'coder',
      name: 'Senior Programmer',
      description: 'An elite software engineer expert in clean code, unit testing, and architecture.',
      systemPrompt: 'You are an elite, senior software engineer and technical architect. Analyze requests deeply and output extremely clean, modular, and optimized code. Provide inline comments, explanatory summaries of your designs, and follow standard architectural guidelines like DRY, SOLID, and separation of concerns.',
      icon: 'Code',
      defaultModel: 'deepseek-coder'
    },
    {
      id: 'writer',
      name: 'Creative Writer',
      description: 'A novelist and editor focused on vivid details, structural flow, and style.',
      systemPrompt: 'You are a professional novelist, essayist, and creative writer. Use evocative vocabulary, rich literary structures, and focus on details. Help the user brainstorm plots, write stories, draft essays, or critique articles with constructive style feedback.',
      icon: 'PenTool',
      defaultModel: 'claude-3-5-sonnet'
    },
    {
      id: 'analyst',
      name: 'Data Scientist',
      description: 'An analyst focused on statistical modeling, math, and logical deductions.',
      systemPrompt: 'You are a senior data scientist and mathematical researcher. Help the user outline statistical models, write complex SQL queries, analyze data sets, explain machine learning algorithms, and derive logical conclusions from structured tables.',
      icon: 'BarChart',
      defaultModel: 'gpt-4o'
    },
    {
      id: 'tutor',
      name: 'Language Coach',
      description: 'A patient language tutor that explains grammar, idioms, and translations.',
      systemPrompt: 'You are an empathetic, patient, and highly skilled multilingual language coach. Help the user learn vocabulary, explain grammatical concepts, translate text between languages while explaining nuance, and compose natural dialogue in their target language.',
      icon: 'BookOpen',
      defaultModel: 'gemini-1.5-flash'
    }
  ];

  const handlePresetClick = (preset: AgentPreset) => {
    const sessionId = applyPreset(preset);
    setShowSettings(false);
  };

  const renderPresetIcon = (iconName: string) => {
    const iconStyle = { color: 'var(--accent)' };
    switch (iconName) {
      case 'Code': return <Code className="h-5 w-5" style={{ color: '#6366f1' }} />;
      case 'PenTool': return <PenTool className="h-5 w-5" style={{ color: '#ec4899' }} />;
      case 'BarChart': return <BarChart className="h-5 w-5" style={{ color: '#10b981' }} />;
      case 'BookOpen': return <BookOpen className="h-5 w-5" style={{ color: '#f59e0b' }} />;
      default: return <Sparkles className="h-5 w-5" style={iconStyle} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={() => setShowSettings(false)}
        className="fixed inset-0"
        style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-3xl h-[600px] rounded-2xl overflow-hidden flex flex-col z-10 animate-slide-up"
        style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--text-primary)'
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <h2 className="font-bold text-lg">Settings</h2>
          </div>
          <button 
            onClick={() => setShowSettings(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left: Stats */}
          <div className="w-full md:w-56 p-4 space-y-4 overflow-y-auto shrink-0" style={{ borderRight: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Coins className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} /> Usage Stats
              </h3>
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  ['Sessions', usageStats.totalSessions],
                  ['Messages', usageStats.totalMessages],
                  ['Prompt Tokens', usageStats.promptTokens.toLocaleString()],
                  ['Comp. Tokens', usageStats.completionTokens.toLocaleString()],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between">
                    <span style={{ color: 'var(--text-tertiary)' }}>{label}:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{val}</span>
                  </div>
                ))}
                <div className="pt-1.5 mt-1.5 flex justify-between font-bold" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--accent)' }}>
                  <span>Cost (Est):</span>
                  <span>${usageStats.approximateCost.toFixed(5)}</span>
                </div>
              </div>
              <button
                onClick={() => { if (confirm('Reset usage statistics?')) resetUsageStats(); }}
                className="w-full py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                style={{ background: 'rgba(239,68,68,0.06)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <Trash2 className="h-3 w-3" /> Reset Stats
              </button>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* API Key */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Key className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                API Key
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Setup your API token to start chatting.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter API Key (sk-...)"
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  className="input-field flex-1 font-mono text-xs"
                />
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="btn-primary text-xs py-2.5 px-4"
                >
                  {isValidating ? 'Checking...' : 'Verify'}
                </button>
              </div>
              {valMessage && (
                <div className="p-2.5 rounded-xl text-xs" style={{
                  background: valMessage.isError ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                  border: `1px solid ${valMessage.isError ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`,
                  color: valMessage.isError ? 'var(--error)' : 'var(--success)'
                }}>
                  {valMessage.text}
                </div>
              )}
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                System Prompt
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Default personality for new conversations.
              </p>
              <textarea
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
                className="input-field w-full min-h-[80px] text-xs resize-none"
              />
              <button onClick={handleSavePrompt} className="btn-ghost text-xs">
                Save Prompt
              </button>
            </div>

            {/* Voice Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Volume2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                Voice Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <Languages className="h-3.5 w-3.5" /> Language
                  </label>
                  <select
                    value={voiceInputLanguage}
                    onChange={(e) => setVoiceSettings(e.target.value, voiceOutputEnabled, voiceOutputVoice)}
                    className="input-field w-full text-xs"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="zh-CN">Chinese (Simplified)</option>
                    <option value="fr-FR">French</option>
                    <option value="es-ES">Spanish</option>
                    <option value="de-DE">German</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <Volume2 className="h-3.5 w-3.5" /> Voice
                  </label>
                  <select
                    value={voiceOutputVoice}
                    onChange={(e) => setVoiceSettings(voiceInputLanguage, voiceOutputEnabled, e.target.value)}
                    className="input-field w-full text-xs"
                  >
                    <option value="">Default System Voice</option>
                    {speech.voices.map((v, idx) => (
                      <option key={idx} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Agent Presets */}
            <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                Agent Presets
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Quick-launch a chat with optimized instructions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className="p-4 rounded-xl text-left transition-all flex gap-3 group active:scale-[0.98]"
                    style={{ 
                      background: 'var(--bg-tertiary)', 
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      {renderPresetIcon(preset.icon)}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold">{preset.name}</h4>
                      <p className="text-[10px] line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{preset.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
