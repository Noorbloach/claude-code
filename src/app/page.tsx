'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import SettingsModal from '../components/SettingsModal';
import ModelInfoModal from '../components/ModelInfoModal';
import PromptLibrary from '../components/PromptLibrary';
import { useChatStore } from '../store/chatStore';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch and cleanup old default system prompt
  useEffect(() => {
    setMounted(true);

    const oldPrompt = "You are a helpful, extremely intelligent AI coding and general assistant, trained by Google DeepMind and running via Ryiys Hacker Unlimited. Reply in beautifully structured markdown, using code blocks with appropriate syntax highlighting when answering technical questions.";
    const state = useChatStore.getState();
    const updates: any = {};
    let shouldUpdate = false;

    if (state.systemPrompt === oldPrompt) {
      updates.systemPrompt = '';
      shouldUpdate = true;
    }

    const cleanedSessions = state.sessions.map(s => {
      if (s.systemPrompt === oldPrompt) {
        shouldUpdate = true;
        return { ...s, systemPrompt: '' };
      }
      return s;
    });

    if (shouldUpdate) {
      updates.sessions = cleanedSessions;
      useChatStore.setState(updates);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          {/* Premium loading spinner */}
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-14 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <div className="absolute h-7 w-7 rounded-full bg-indigo-500/10 animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-white tracking-tight">
              Ryiys Hacker Claude Unlimited
            </span>
            <span className="text-[11px] text-gray-500 font-mono tracking-wider">
              Initializing secure workspace...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden select-none" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background 0.4s, color 0.4s' }}>
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Chat Area */}
      <ChatArea />

      {/* Global Modals */}
      <SettingsModal />
      <ModelInfoModal />
      <PromptLibrary />
    </div>
  );
}
