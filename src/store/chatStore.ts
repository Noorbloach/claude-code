import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ChatSession, Message, ModelInfo, UsageStats, AgentPreset } from '../types';

// Constants for approximate costs per 1,000,000 tokens (in USD)
const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  'claude-3-5-sonnet': { prompt: 3.0, completion: 15.0 },
  'claude-3-5-haiku': { prompt: 0.8, completion: 4.0 },
  'claude-3-opus': { prompt: 15.0, completion: 75.0 },
  'gpt-4o': { prompt: 2.5, completion: 10.0 },
  'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
  'deepseek-chat': { prompt: 0.14, completion: 0.28 },
  'deepseek-coder': { prompt: 0.14, completion: 0.28 },
  'gemini-1.5-pro': { prompt: 1.25, completion: 5.0 },
  'gemini-1.5-flash': { prompt: 0.075, completion: 0.3 },
  'llama-3': { prompt: 0.2, completion: 0.2 },
};

function estimateCost(modelId: string, promptTokens: number, completionTokens: number): number {
  const modelKey = Object.keys(MODEL_PRICING).find(key => modelId.toLowerCase().includes(key));
  const pricing = modelKey ? MODEL_PRICING[modelKey] : { prompt: 0.5, completion: 1.5 }; // default fallback
  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  return promptCost + completionCost;
}

interface ChatState {
  // Persistent State
  apiKey: string;
  isValidated: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  selectedModel: string;
  comparisonMode: boolean;
  comparisonModels: string[];
  systemPrompt: string;
  usageStats: UsageStats;
  theme: 'light' | 'dark';
  voiceInputLanguage: string;
  voiceOutputEnabled: boolean;
  voiceOutputVoice: string;

  // Transient State
  models: ModelInfo[];
  isLoadingModels: boolean;
  isGenerating: boolean;
  generatingMessageId: string | null;
  searchQuery: string;
  sidebarOpen: boolean;
  showSettings: boolean;
  showPromptLibrary: boolean;
  showModelInfo: boolean;
  error: string | null;

  // Actions
  setApiKey: (key: string) => void;
  setIsValidated: (valid: boolean) => void;
  setModels: (models: ModelInfo[]) => void;
  setIsLoadingModels: (loading: boolean) => void;
  setSelectedModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSearchQuery: (query: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowPromptLibrary: (show: boolean) => void;
  setShowModelInfo: (show: boolean) => void;
  setComparisonMode: (enabled: boolean) => void;
  setComparisonModels: (models: string[]) => void;
  setGenerating: (isGenerating: boolean, messageId?: string | null) => void;
  setError: (error: string | null) => void;

  // Chat Actions
  createSession: (model?: string, title?: string, systemPrompt?: string) => string;
  deleteSession: (id: string) => void;
  clearAllSessions: () => void;
  setActiveSessionId: (id: string | null) => void;
  updateSessionTitle: (id: string, title: string) => void;
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  truncateMessagesAfter: (sessionId: string, messageId: string) => void;
  updateUsageStats: (promptTokens: number, completionTokens: number, modelId: string) => void;
  resetUsageStats: () => void;
  importSessions: (sessions: ChatSession[]) => void;
  setVoiceSettings: (language: string, enabled: boolean, voiceName: string) => void;
  applyPreset: (preset: AgentPreset) => string;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Persistent State Initial Values
      apiKey: '',
      isValidated: false,
      sessions: [],
      activeSessionId: null,
      selectedModel: 'gpt-4o-mini',
      comparisonMode: false,
      comparisonModels: ['gpt-4o-mini', 'claude-3-5-sonnet'],
      systemPrompt: '',
      usageStats: {
        totalSessions: 0,
        totalMessages: 0,
        promptTokens: 0,
        completionTokens: 0,
        approximateCost: 0.0,
      },
      theme: 'dark',
      voiceInputLanguage: 'en-US',
      voiceOutputEnabled: false,
      voiceOutputVoice: '',

      // Transient State Initial Values
      models: [],
      isLoadingModels: false,
      isGenerating: false,
      generatingMessageId: null,
      searchQuery: '',
      sidebarOpen: false,
      showSettings: false,
      showPromptLibrary: false,
      showModelInfo: false,
      error: null,

      // Actions
      setApiKey: (apiKey) => set({ apiKey }),
      setIsValidated: (isValidated) => set({ isValidated }),
      setModels: (models) => {
        const nextState: Partial<ChatState> = { models };
        // If the selected model is not in the models list, pick a sensible default if models is not empty
        if (models.length > 0) {
          const currentSelected = get().selectedModel;
          const exists = models.some(m => m.id === currentSelected);
          if (!exists) {
            // Pick deepseek, claude-3-5-sonnet, or the first model
            const preferred = models.find(m => m.id.includes('gpt-4o-mini') || m.id.includes('claude-3-5-sonnet') || m.id.includes('deepseek-chat'));
            nextState.selectedModel = preferred ? preferred.id : models[0].id;
          }
        }
        set(nextState);
      },
      setIsLoadingModels: (isLoadingModels) => set({ isLoadingModels }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      setTheme: (theme) => set({ theme }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setShowSettings: (showSettings) => set({ showSettings }),
      setShowPromptLibrary: (showPromptLibrary) => set({ showPromptLibrary }),
      setShowModelInfo: (showModelInfo) => set({ showModelInfo }),
      setComparisonMode: (comparisonMode) => set({ comparisonMode }),
      setComparisonModels: (comparisonModels) => set({ comparisonModels }),
      setGenerating: (isGenerating, generatingMessageId = null) => set({ isGenerating, generatingMessageId }),
      setError: (error) => set({ error }),

      // Chat Actions
      createSession: (model, title, systemPrompt) => {
        const id = crypto.randomUUID();
        const newSession: ChatSession = {
          id,
          title: title || 'New Conversation',
          messages: [],
          model: model || get().selectedModel,
          systemPrompt: systemPrompt !== undefined ? systemPrompt : get().systemPrompt,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id,
          usageStats: {
            ...state.usageStats,
            totalSessions: state.usageStats.totalSessions + 1,
          },
        }));

        return id;
      },

      deleteSession: (id) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== id);
          let newActiveId = state.activeSessionId;
          
          if (state.activeSessionId === id) {
            newActiveId = newSessions.length > 0 ? newSessions[0].id : null;
          }
          
          return {
            sessions: newSessions,
            activeSessionId: newActiveId,
          };
        });
      },

      clearAllSessions: () => {
        set({
          sessions: [],
          activeSessionId: null,
        });
      },

      setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

      updateSessionTitle: (id, title) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, title, updatedAt: Date.now() } : s
          ),
        }));
      },

      addMessage: (sessionId, messageData) => {
        const messageId = crypto.randomUUID();
        const timestamp = Date.now();
        const newMessage: Message = {
          ...messageData,
          id: messageId,
          timestamp,
        };

        set((state) => {
          const updatedSessions = state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            
            // Auto-generate title if it was the default and this is the first user message
            let newTitle = s.title;
            if (s.messages.length === 0 && messageData.role === 'user') {
              const words = messageData.content.split(' ');
              newTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
            }

            return {
              ...s,
              title: newTitle,
              messages: [...s.messages, newMessage],
              updatedAt: timestamp,
            };
          });

          return {
            sessions: updatedSessions,
            usageStats: {
              ...state.usageStats,
              totalMessages: state.usageStats.totalMessages + 1,
            },
          };
        });

        return messageId;
      },

      updateMessage: (sessionId, messageId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteMessage: (sessionId, messageId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              messages: s.messages.filter((m) => m.id !== messageId),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      truncateMessagesAfter: (sessionId, messageId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const index = s.messages.findIndex((m) => m.id === messageId);
            if (index === -1) return s;
            
            // Keep everything up to (and including) the selected message index
            return {
              ...s,
              messages: s.messages.slice(0, index + 1),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      updateUsageStats: (promptTokens, completionTokens, modelId) => {
        const cost = estimateCost(modelId, promptTokens, completionTokens);
        set((state) => ({
          usageStats: {
            ...state.usageStats,
            promptTokens: state.usageStats.promptTokens + promptTokens,
            completionTokens: state.usageStats.completionTokens + completionTokens,
            approximateCost: state.usageStats.approximateCost + cost,
          },
        }));
      },

      resetUsageStats: () => {
        set((state) => ({
          usageStats: {
            totalSessions: state.sessions.length,
            totalMessages: state.sessions.reduce((acc, s) => acc + s.messages.length, 0),
            promptTokens: 0,
            completionTokens: 0,
            approximateCost: 0.0,
          },
        }));
      },

      importSessions: (importedSessions) => {
        set((state) => {
          // Merge imported sessions, avoiding duplicates by ID
          const existingIds = new Set(state.sessions.map((s) => s.id));
          const newSessions = [...state.sessions];
          
          importedSessions.forEach((session) => {
            if (!existingIds.has(session.id)) {
              newSessions.push(session);
            }
          });

          // Sort by updatedAt descending
          newSessions.sort((a, b) => b.updatedAt - a.updatedAt);

          return {
            sessions: newSessions,
            activeSessionId: newSessions.length > 0 ? newSessions[0].id : state.activeSessionId,
            usageStats: {
              ...state.usageStats,
              totalSessions: newSessions.length,
              totalMessages: newSessions.reduce((acc, s) => acc + s.messages.length, 0),
            },
          };
        });
      },

      setVoiceSettings: (voiceInputLanguage, voiceOutputEnabled, voiceOutputVoice) => {
        set({ voiceInputLanguage, voiceOutputEnabled, voiceOutputVoice });
      },

      applyPreset: (preset) => {
        const model = preset.defaultModel || get().selectedModel;
        const sessionId = get().createSession(model, `Preset: ${preset.name}`, preset.systemPrompt);
        return sessionId;
      },
    }),
    {
      name: 'agentrouter-chat-settings',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version: number) => {
        // v1 → v2: clear old fake model names that don't exist on agentrouter.org
        const FAKE_MODELS = ['glm-5.2', 'gpt-5.5', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8'];
        if (version < 2 && persistedState) {
          if (FAKE_MODELS.includes(persistedState.selectedModel)) {
            persistedState.selectedModel = 'gpt-4o';
          }
          // Also clear cached models list so it gets re-fetched from the API
          persistedState.models = [];
        }
        return persistedState;
      },
      // List the states we want to persist (exclude transient states)
      partialize: (state) => ({
        apiKey: state.apiKey,
        isValidated: state.isValidated,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        selectedModel: state.selectedModel,
        comparisonMode: state.comparisonMode,
        comparisonModels: state.comparisonModels,
        systemPrompt: state.systemPrompt,
        usageStats: state.usageStats,
        theme: state.theme,
        voiceInputLanguage: state.voiceInputLanguage,
        voiceOutputEnabled: state.voiceOutputEnabled,
        voiceOutputVoice: state.voiceOutputVoice,
      }),
    }
  )
);
