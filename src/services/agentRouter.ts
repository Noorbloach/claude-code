import { Message, ModelInfo } from '../types';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use the configured public environment variable
    return process.env.NEXT_PUBLIC_API_URL || '/api/agentrouter';
  }
  return process.env.NEXT_PUBLIC_API_URL || '/api/agentrouter';
};

const BASE_URL = getBaseUrl();

const getEndpoint = (path: string) => {
  if (BASE_URL.includes('?')) {
    // If BASE_URL already has query params (like proxy.php?path=), append path without leading slash
    return `${BASE_URL}${path.replace(/^\//, '')}`;
  }
  return `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export class AgentRouterError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AgentRouterError';
    this.status = status;
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (apiKey === 'sk-dummy' || apiKey === 'dummy') {
    return true;
  }
  if (!apiKey) {
    throw new AgentRouterError('API key is required');
  }

  try {
    const response = await fetch(getEndpoint('/models'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new AgentRouterError(
        errBody.error?.message || `Failed to validate API key. Status: ${response.status}`,
        response.status
      );
    }

    return true;
  } catch (error: any) {
    if (error instanceof AgentRouterError) throw error;
    throw new AgentRouterError(error.message || 'Network error occurred while validating API key');
  }
}

export async function fetchModels(apiKey: string): Promise<ModelInfo[]> {
  if (apiKey === 'sk-dummy' || apiKey === 'dummy') {
    return [
      { id: 'claude-opus-4-6', owned_by: 'anthropic', object: 'model' },
      { id: 'claude-opus-4-7', owned_by: 'anthropic', object: 'model' },
      { id: 'claude-opus-4-8', owned_by: 'anthropic', object: 'model' },
      { id: 'glm-5.2', owned_by: 'google', object: 'model' },
      { id: 'gpt-5.5', owned_by: 'openai', object: 'model' },
    ];
  }
  try {
    const response = await fetch(getEndpoint('/models'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new AgentRouterError(
        errBody.error?.message || `Failed to fetch models. Status: ${response.status}`,
        response.status
      );
    }

    const data = await response.json();
    if (data && Array.isArray(data.data)) {
      // Sort models alphabetically for clean drop-down lists
      return (data.data as ModelInfo[]).sort((a, b) => a.id.localeCompare(b.id));
    }
    return [];
  } catch (error: any) {
    if (error instanceof AgentRouterError) throw error;
    throw new AgentRouterError(error.message || 'Failed to connect to AgentRouter');
  }
}

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string, usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => void;
  onError: (error: Error) => void;
}

export async function streamChatCompletion(
  apiKey: string,
  messages: Message[],
  model: string,
  systemPrompt: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const formattedMessages = [];

    // Add system prompt as a system message if provided
    if (systemPrompt.trim()) {
      formattedMessages.push({
        role: 'system',
        content: systemPrompt.trim(),
      });
    }

    // Append conversation history
    messages.forEach((msg) => {
      formattedMessages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    const response = await fetch(getEndpoint('/chat/completions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        stream_options: {
          include_usage: true, // returns usage stats in the second to last chunk in OpenAI spec
        },
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new AgentRouterError(
        errBody.error?.message || `Chat API error. Status: ${response.status}`,
        response.status
      );
    }

    if (!response.body) {
      throw new AgentRouterError('Response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Save the last incomplete line back to the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine) continue;
        if (!cleanedLine.startsWith('data:')) continue;

        const dataStr = cleanedLine.substring(5).trim();
        if (dataStr === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(dataStr);

          // Check choice delta content
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            callbacks.onChunk(content);
          }

          // Capture usage statistics if returned by stream_options
          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens,
              completionTokens: parsed.usage.completion_tokens,
              totalTokens: parsed.usage.total_tokens,
            };
          }
        } catch (e) {
          // Ignore parsing errors for malformed stream lines
        }
      }
    }

    // Process any remaining bytes in the buffer
    if (buffer.trim()) {
      const cleanedLine = buffer.trim();
      if (cleanedLine.startsWith('data:')) {
        const dataStr = cleanedLine.substring(5).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              callbacks.onChunk(content);
            }
            if (parsed.usage) {
              usage = {
                promptTokens: parsed.usage.prompt_tokens,
                completionTokens: parsed.usage.completion_tokens,
                totalTokens: parsed.usage.total_tokens,
              };
            }
          } catch (e) { }
        }
      }
    }

    callbacks.onDone(fullText, usage);
  } catch (error: any) {
    if (signal?.aborted) {
      // Don't trigger error callback if user deliberately aborted the completion
      return;
    }
    callbacks.onError(error instanceof Error ? error : new Error(error?.message || 'Error occurred during streaming'));
  }
}

export async function generateImage(
  apiKey: string,
  prompt: string,
  model: string = 'dall-e-3',
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
  quality: 'standard' | 'hd' = 'standard',
  style: 'vivid' | 'natural' = 'vivid',
): Promise<{ url: string; revisedPrompt?: string }> {
  const response = await fetch(getEndpoint('/images/generations'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      quality,
      style,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new AgentRouterError(
      errBody?.error?.message || `Image generation failed. Status: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  const item = data?.data?.[0];
  if (!item?.url) throw new AgentRouterError('No image URL returned from server');
  return { url: item.url, revisedPrompt: item.revised_prompt };
}
