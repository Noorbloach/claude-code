'use client';

import React from 'react';
import { useChatStore } from '../store/chatStore';
import { X, Info, Shield, Zap, Sparkles, Brain, Cpu } from 'lucide-react';

interface ModelDetails {
  name: string;
  provider: string;
  contextLimit: string;
  pricing: string;
  description: string;
  logic: number;
  coding: number;
  speed: number;
  creativity: number;
  strengths: string[];
}

const MODEL_REGISTRY: Record<string, ModelDetails> = {
  'claude-3-5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextLimit: '200,000 tokens',
    pricing: '$3.00 / $15.00 per M tokens',
    description: 'Anthropic\'s state-of-the-art model setting industry benchmarks for graduate-level reasoning, undergraduate-level knowledge, and coding proficiency.',
    logic: 96, coding: 98, speed: 80, creativity: 92,
    strengths: ['Sophisticated coding & refactoring', 'Complex multi-step reasoning', 'High-accuracy parsing', 'Humane, natural tone']
  },
  'claude-3-5-haiku': {
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    contextLimit: '200,000 tokens',
    pricing: '$0.80 / $4.00 per M tokens',
    description: 'Anthropic\'s fastest, most efficient model. Offers remarkable intelligence at a fraction of the cost.',
    logic: 84, coding: 82, speed: 98, creativity: 80,
    strengths: ['Sub-second response speeds', 'Text classification', 'Ultra-cost-efficient', 'Large-context scanning']
  },
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextLimit: '128,000 tokens',
    pricing: '$2.50 / $10.00 per M tokens',
    description: 'OpenAI\'s flagship multimodal model. High intelligence, natively conversational, and balanced across tasks.',
    logic: 94, coding: 92, speed: 85, creativity: 90,
    strengths: ['Natively multimodal', 'Excellent JSON outputs', 'Responsive conversational flow', 'Great translation']
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    contextLimit: '128,000 tokens',
    pricing: '$0.15 / $0.60 per M tokens',
    description: 'OpenAI\'s cost-efficient small model. Perfect for lightweight tasks at competitive pricing.',
    logic: 80, coding: 78, speed: 95, creativity: 78,
    strengths: ['Extremely cheap', 'Extremely fast', 'Great for simple queries', 'Lightweight tasks']
  },
  'deepseek-chat': {
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    contextLimit: '64,000 tokens',
    pricing: '$0.14 / $0.28 per M tokens',
    description: 'A powerful mixture-of-experts model optimized for general conversation and creative writing.',
    logic: 90, coding: 85, speed: 90, creativity: 88,
    strengths: ['Extremely low price', 'Excellent bilingual support', 'Vast knowledge base', 'Fast streaming']
  },
  'deepseek-coder': {
    name: 'DeepSeek Coder V2',
    provider: 'DeepSeek',
    contextLimit: '64,000 tokens',
    pricing: '$0.14 / $0.28 per M tokens',
    description: 'DeepSeek\'s specialized coding model, rivaling top commercial models on code generation.',
    logic: 93, coding: 96, speed: 88, creativity: 70,
    strengths: ['Elite math & logic', 'Repository-level edits', 'Affordable pricing', 'High syntactic compliance']
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    contextLimit: '2,000,000 tokens',
    pricing: '$1.25 / $5.00 per M tokens',
    description: 'Google\'s premium model featuring a massive 2M token context window for deep analysis.',
    logic: 92, coding: 90, speed: 75, creativity: 88,
    strengths: ['Massive 2M token context', 'Video/audio processing', 'Deep codebase audits', 'Advanced logic']
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    contextLimit: '1,000,000 tokens',
    pricing: '$0.075 / $0.30 per M tokens',
    description: 'Google\'s high-speed lightweight model with a large 1M token context window.',
    logic: 82, coding: 80, speed: 96, creativity: 80,
    strengths: ['1M token context', 'Very affordable', 'Ultra-fast summarization', 'Parallel execution']
  }
};

export default function ModelInfoModal() {
  const { selectedModel, showModelInfo, setShowModelInfo } = useChatStore();

  if (!showModelInfo) return null;

  const getDetails = (modelId: string): ModelDetails => {
    const key = Object.keys(MODEL_REGISTRY).find(k => modelId.toLowerCase().includes(k));
    if (key) return MODEL_REGISTRY[key];
    return {
      name: modelId,
      provider: 'Hacker Router Provider',
      contextLimit: '128,000 tokens (Est.)',
      pricing: 'Varies by provider',
      description: `A dynamic model loaded via Hacker Router API (${modelId}).`,
      logic: 80, coding: 80, speed: 85, creativity: 80,
      strengths: ['Dynamic discovery', 'Hacker Router integrated', 'OpenAI compatible']
    };
  };

  const info = getDetails(selectedModel);

  const barColors: Record<string, string> = {
    'Logic': '#6366f1',
    'Coding': '#10b981',
    'Speed': '#f59e0b',
    'Creativity': '#ec4899'
  };

  const renderStatBar = (label: string, value: number) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, background: barColors[label] || 'var(--accent)' }}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={() => setShowModelInfo(false)} className="fixed inset-0" style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }} />

      <div 
        className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col z-10 animate-slide-up"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', color: 'var(--text-primary)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <h2 className="font-bold text-base">Model Information</h2>
          </div>
          <button onClick={() => setShowModelInfo(false)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[500px]">
          {/* Title */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)', border: '1px solid var(--border-color)' }}>
              <Cpu className="h-6 w-6" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">{info.name}</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Provider: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{info.provider}</span>
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{info.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl text-xs font-mono" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Context</span>
              <strong className="block" style={{ color: 'var(--text-primary)' }}>{info.contextLimit}</strong>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Price (In/Out)</span>
              <strong className="block" style={{ color: 'var(--accent)' }}>{info.pricing}</strong>
            </div>
          </div>

          {/* Performance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Brain className="h-4 w-4" style={{ color: 'var(--accent)' }} /> Performance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              {renderStatBar('Logic', info.logic)}
              {renderStatBar('Coding', info.coding)}
              {renderStatBar('Speed', info.speed)}
              {renderStatBar('Creativity', info.creativity)}
            </div>
          </div>

          {/* Strengths */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Zap className="h-4 w-4" style={{ color: 'var(--accent)' }} /> Best For
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              {info.strengths.map((str, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
