'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Message } from '../types';
import { useChatStore } from '../store/chatStore';
import { Copy, Check, Edit2, Trash2, RotateCw, Volume2, VolumeX, CheckCheck, CornerDownLeft, Sparkles, User, Download, ImageIcon, ZoomIn } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  sessionId: string;
  isLast: boolean;
  onRegenerate?: () => void;
  speechState: {
    isSpeaking: boolean;
    speak: (text: string, onEnd?: () => void) => void;
    stopSpeaking: () => void;
  };
}

function CopyableCode({ className, children, inline, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(codeString); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  if (!inline && match) {
    return (
      <div className="my-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-4 py-2 text-xs font-mono" style={{ background: '#0d1117', color: '#8b949e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="uppercase tracking-wider">{match[1]}</span>
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-white/5 transition-colors">
            {copied ? <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></> : <><Copy className="h-3 w-3" /><span>Copy</span></>}
          </button>
        </div>
        <pre className="!m-0 !rounded-none overflow-x-auto" style={{ background: '#0d1117' }}>
          <code className={className} {...props}>{children}</code>
        </pre>
      </div>
    );
  }
  return (
    <code className={`px-1.5 py-0.5 rounded-md text-xs font-mono ${inline ? '' : ''}`} style={{ background: 'var(--accent-lighter)', color: 'var(--accent)', border: '1px solid var(--border-light)' }} {...props}>
      {children}
    </code>
  );
}

export default function MessageItem({ message, sessionId, isLast, onRegenerate, speechState }: MessageItemProps) {
  const { deleteMessage, updateMessage, truncateMessagesAfter, isGenerating } = useChatStore();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [localSpeaking, setLocalSpeaking] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const handleEditSubmit = () => {
    if (!editContent.trim()) return;
    updateMessage(sessionId, message.id, { content: editContent.trim() });
    setIsEditing(false);
    if (isUser && onRegenerate) {
      truncateMessagesAfter(sessionId, message.id);
      setTimeout(() => onRegenerate(), 50);
    }
  };

  const handleSpeechToggle = () => {
    if (localSpeaking) { speechState.stopSpeaking(); setLocalSpeaking(false); }
    else { setLocalSpeaking(true); speechState.speak(message.content, () => setLocalSpeaking(false)); }
  };

  useEffect(() => { if (!speechState.isSpeaking) setLocalSpeaking(false); }, [speechState.isSpeaking]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Typing indicator
  const isStreaming = isLast && !isUser && isGenerating && !message.content;

  return (
    <div className={`group flex gap-3 w-full animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      
      {/* Avatar */}
      {isUser && (
        <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center mt-1 order-last"
          style={{
            background: 'var(--accent-gradient)',
            boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
            flexShrink: 0
          }}
        >
          <User className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Content block */}
      <div className={`flex flex-col gap-1.5 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Meta row */}
        <div className={`flex items-center gap-2 text-[10px] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{isUser ? 'You' : 'Assistant'}</span>
          <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>{formatTime(message.timestamp)}</span>
          {!isUser && message.modelUsed && (
            <span className="px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--accent-lighter)', color: 'var(--accent)', border: '1px solid var(--accent-light)', fontSize: '9px' }}>
              {message.modelUsed}
            </span>
          )}
        </div>

        {/* Bubble */}
        {isEditing ? (
          <div className="w-full space-y-2">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); } }}
              className="input-field w-full min-h-[80px] text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setIsEditing(false); setEditContent(message.content); }} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
              <button onClick={handleEditSubmit} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" /> Save
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`relative group/bubble text-sm leading-relaxed ${isUser ? 'rounded-[20px] rounded-tr-[4px]' : 'rounded-[20px] rounded-tl-[4px]'}`}
            style={isUser ? {
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              padding: '12px 18px',
              boxShadow: '0 4px 16px rgba(99,102,241,0.2)',
              wordBreak: 'break-word'
            } : {
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-tertiary) 100%)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '14px 20px',
              boxShadow: '0 4px 20px rgba(99,102,241,0.03), inset 0 1px 0 rgba(255,255,255,0.05)',
              wordBreak: 'break-word'
            }}
          >
            {isStreaming ? (
              <div className="typing-dots py-1">
                <span /><span /><span />
              </div>
            ) : message.imageUrl ? (
              /* ── IMAGE RESULT ── */
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden group/img" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                  <img
                    src={message.imageUrl}
                    alt={message.imagePrompt || 'Generated image'}
                    className="w-full object-cover rounded-xl"
                    style={{ maxWidth: '480px' }}
                  />
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all rounded-xl flex items-center justify-center gap-3 opacity-0 group-hover/img:opacity-100">
                    <a
                      href={message.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/90 text-gray-800 transition-all hover:scale-110"
                      title="View full size"
                    >
                      <ZoomIn className="h-5 w-5" />
                    </a>
                    <a
                      href={message.imageUrl}
                      download="generated-image.png"
                      className="p-2.5 rounded-xl bg-white/90 text-gray-800 transition-all hover:scale-110"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </a>
                  </div>
                </div>
                {message.content && (
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    “{message.content}”
                  </p>
                )}
              </div>
            ) : isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="markdown-body">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]} components={{ code: CopyableCode }}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Token usage for assistant */}
        {!isUser && !isEditing && message.tokenUsage && (
          <div className="flex items-center gap-2 text-[9px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
            <span>↑{message.tokenUsage.promptTokens}</span>
            <span>↓{message.tokenUsage.completionTokens}</span>
            <span style={{ color: 'var(--accent)', opacity: 0.7 }}>tokens</span>
          </div>
        )}

        {/* Action buttons */}
        {!isEditing && (
          <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            style={{ paddingTop: '2px' }}
          >
            <button onClick={handleCopy} className="p-1.5 rounded-lg transition-all hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-tertiary)' }} title="Copy">
              {copied ? <CheckCheck className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button onClick={handleSpeechToggle} className="p-1.5 rounded-lg transition-all hover:bg-[var(--bg-hover)]" style={{ color: localSpeaking ? 'var(--accent)' : 'var(--text-tertiary)' }} title={localSpeaking ? 'Stop' : 'Read aloud'}>
              {localSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            {isUser && (
              <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-lg transition-all hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-tertiary)' }} title="Edit">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            {!isUser && isLast && !isGenerating && onRegenerate && (
              <button onClick={onRegenerate} className="p-1.5 rounded-lg transition-all hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-tertiary)' }} title="Regenerate">
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => { if (confirm('Delete this message?')) deleteMessage(sessionId, message.id); }} className="p-1.5 rounded-lg transition-all hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-tertiary)' }} title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
