import { ChatSession } from '../types';

/**
 * Trigger browser file download
 */
function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a timestamp to a readable locale string
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Export a single chat session to plain text format
 */
export function exportChatAsTxt(session: ChatSession) {
  let content = `=========================================\n`;
  content += `CHAT SESSION: ${session.title}\n`;
  content += `Created: ${formatTimestamp(session.createdAt)}\n`;
  content += `Model: ${session.model}\n`;
  content += `System Prompt: ${session.systemPrompt || 'None'}\n`;
  content += `=========================================\n\n`;

  session.messages.forEach((msg, idx) => {
    const roleName = msg.role === 'user' ? 'USER' : msg.role === 'assistant' ? 'ASSISTANT' : 'SYSTEM';
    const timestampStr = formatTimestamp(msg.timestamp);
    
    content += `[${idx + 1}] [${roleName}] (${timestampStr})\n`;
    if (msg.role === 'assistant' && msg.modelUsed) {
      content += `Model Used: ${msg.modelUsed}\n`;
    }
    content += `-----------------------------------------\n`;
    content += `${msg.content}\n`;
    content += `=========================================\n\n`;
  });

  const sanitizedTitle = session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  downloadFile(content, `chat_${sanitizedTitle}.txt`, 'text/plain;charset=utf-8');
}

/**
 * Export a single chat session to a beautifully formatted Markdown file
 */
export function exportChatAsMarkdown(session: ChatSession) {
  let md = `# ${session.title}\n\n`;
  
  // Metadata Table
  md += `| Metadata | Details |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Created** | ${formatTimestamp(session.createdAt)} |\n`;
  md += `| **Base Model** | \`${session.model}\` |\n`;
  md += `| **System Prompt** | *${session.systemPrompt || 'None'}* |\n\n`;
  
  md += `---\n\n`;

  session.messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const roleEmoji = isUser ? '👤 **User**' : '🤖 **Assistant**';
    const timestampStr = formatTimestamp(msg.timestamp);
    const modelBadge = (!isUser && msg.modelUsed) ? ` 🏷️ \`${msg.modelUsed}\`` : '';
    
    md += `### ${roleEmoji} *(${timestampStr})${modelBadge}*\n\n`;
    md += `${msg.content}\n\n`;
    
    if (!isUser && msg.tokenUsage) {
      const usage = msg.tokenUsage;
      md += `> 📊 **Usage**: Prompt Tokens: ${usage.promptTokens} | Completion Tokens: ${usage.completionTokens} | Total: ${usage.totalTokens}\n\n`;
    }
    
    md += `---\n\n`;
  });

  const sanitizedTitle = session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  downloadFile(md, `chat_${sanitizedTitle}.md`, 'text/markdown;charset=utf-8');
}

/**
 * Export all chat sessions as a serialized JSON backup file
 */
export function exportAllChatsAsJson(sessions: ChatSession[]) {
  const jsonContent = JSON.stringify(sessions, null, 2);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(jsonContent, `agentrouter_chats_backup_${timestamp}.json`, 'application/json;charset=utf-8');
}

/**
 * Parse and validate imported JSON file containing chat sessions
 */
export function importChatsFromJson(file: File): Promise<ChatSession[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const parsed = JSON.parse(result);
        
        if (!Array.isArray(parsed)) {
          throw new Error('Imported data must be an array of chat sessions');
        }

        // Basic structural validation
        const validatedSessions: ChatSession[] = [];
        
        for (const item of parsed) {
          if (!item.id || !item.title || !Array.isArray(item.messages)) {
            throw new Error('Invalid session format. Missing id, title, or messages.');
          }
          
          // Validate messages inside the session
          const validatedMessages = item.messages.map((msg: any) => {
            if (!msg.id || !msg.role || !msg.content) {
              throw new Error('Invalid message format inside session.');
            }
            return {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : Date.now(),
              modelUsed: msg.modelUsed,
              tokenUsage: msg.tokenUsage,
            };
          });

          validatedSessions.push({
            id: item.id,
            title: item.title,
            messages: validatedMessages,
            model: item.model || 'gpt-4o-mini',
            systemPrompt: item.systemPrompt || '',
            createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
            updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
          });
        }
        
        resolve(validatedSessions);
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse JSON file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}
