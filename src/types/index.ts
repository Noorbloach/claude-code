export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelUsed?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  // Image generation
  imageUrl?: string;
  imagePrompt?: string;
  isImageGeneration?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export interface ModelInfo {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

export interface UsageStats {
  totalSessions: number;
  totalMessages: number;
  promptTokens: number;
  completionTokens: number;
  approximateCost: number; // calculated in USD
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: 'general' | 'coding' | 'writing' | 'analysis' | 'roleplay';
  prompt: string;
  description: string;
}

export interface AgentPreset {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string; // lucide icon name
  defaultModel?: string;
}
