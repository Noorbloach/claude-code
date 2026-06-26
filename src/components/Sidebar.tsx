'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChatStore } from '../store/chatStore';
import { exportAllChatsAsJson, importChatsFromJson } from '../utils/export';
import {
  Plus, MessageSquare, Trash2, Settings, Search, Database,
  Upload, Download, BookOpen, Sparkles, X, Edit2, Menu,
  MoreHorizontal, Hash, Clock, Archive, Zap,
} from 'lucide-react';

// ── Relative time helper ──
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Sidebar() {
  const {
    sessions, activeSessionId, searchQuery, sidebarOpen,
    createSession, deleteSession, clearAllSessions,
    setActiveSessionId, updateSessionTitle, setSearchQuery,
    setSidebarOpen, setShowSettings, setShowPromptLibrary,
    importSessions, apiKey, isValidated
  } = useChatStore();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const filteredSessions = useMemo(() =>
    sessions.filter(s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [sessions, searchQuery]
  );

  // Group by date
  const groups = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
    
    const result: { label: string; items: typeof filteredSessions }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Previous 7 Days', items: [] },
      { label: 'Previous 30 Days', items: [] },
      { label: 'Older', items: [] },
    ];
    
    filteredSessions.forEach(s => {
      const d = new Date(s.updatedAt); d.setHours(0, 0, 0, 0);
      if (d >= now) result[0].items.push(s);
      else if (d >= yesterday) result[1].items.push(s);
      else if (d >= weekAgo) result[2].items.push(s);
      else if (d >= monthAgo) result[3].items.push(s);
      else result[4].items.push(s);
    });
    
    return result.filter(g => g.items.length > 0);
  }, [filteredSessions]);

  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importChatsFromJson(file);
      importSessions(imported);
    } catch (err: any) { alert(`Import failed: ${err.message}`); }
    e.target.value = '';
  };

  const msgCount = (s: typeof sessions[0]) => s.messages.filter(m => m.role !== 'system').length;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3.5 left-4 z-50 p-2 rounded-xl sidebar-mobile-toggle"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside className={`
        sidebar-root fixed inset-y-0 left-0 z-40 flex flex-col
        md:relative md:translate-x-0 md:z-auto
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* ── Brand Bar ── */}
        <div className="sidebar-brand">
          <div className="flex items-center gap-3 min-w-0">
            <div className="sidebar-brand-icon">
              <Sparkles className="h-4 w-4 text-white" />
              {apiKey && (
                <span className={`sidebar-status-dot ${isValidated ? 'active' : 'inactive'}`} />
              )}
            </div>
            <div className="min-w-0">
              <div className="sidebar-brand-title">Ryiys Hacker</div>
              <div className="sidebar-brand-subtitle">Claude Unlimited</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden sidebar-close-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── New Chat Button ── */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => { createSession(); setSidebarOpen(false); }}
            className="sidebar-new-chat-btn"
          >
            <div className="sidebar-new-chat-icon">
              <Plus className="h-4 w-4" />
            </div>
            <span>New Chat</span>
            <kbd className="sidebar-kbd">⌘K</kbd>
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-3 py-2">
          <div className="sidebar-search-wrapper">
            <Search className="sidebar-search-icon" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="sidebar-search-clear">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* ── Chat List ── */}
        <div className="flex-1 overflow-y-auto sidebar-chat-list">
          {filteredSessions.length === 0 ? (
            <div className="sidebar-empty-state">
              <div className="sidebar-empty-icon">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="sidebar-empty-title">
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </p>
              <p className="sidebar-empty-subtitle">
                {searchQuery ? 'Try a different search term' : 'Start a new chat to begin'}
              </p>
            </div>
          ) : (
            groups.map(({ label, items }) => (
              <div key={label} className="sidebar-group">
                <div className="sidebar-group-label">
                  <span>{label}</span>
                </div>
                {items.map(session => {
                  const isActive = session.id === activeSessionId;
                  const isEditing = session.id === editingSessionId;
                  const showContext = session.id === contextMenuId;
                  const count = msgCount(session);

                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveSessionId(session.id);
                          setSidebarOpen(false);
                          setContextMenuId(null);
                        }
                      }}
                      className={`sidebar-chat-item ${isActive ? 'active' : ''}`}
                    >
                      {/* Active indicator bar */}
                      {isActive && <div className="sidebar-active-indicator" />}

                      <div className="sidebar-chat-item-content">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onBlur={() => {
                              updateSessionTitle(session.id, editTitle.trim() || session.title);
                              setEditingSessionId(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateSessionTitle(session.id, editTitle.trim() || session.title);
                                setEditingSessionId(null);
                              } else if (e.key === 'Escape') setEditingSessionId(null);
                            }}
                            onClick={e => e.stopPropagation()}
                            className="sidebar-edit-input"
                          />
                        ) : (
                          <>
                            <div className="sidebar-chat-title">{session.title}</div>
                            <div className="sidebar-chat-meta">
                              <span>{relativeTime(session.updatedAt)}</span>
                              <span className="sidebar-meta-dot" />
                              <span>{count} msg{count !== 1 ? 's' : ''}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {!isEditing && (
                        <div className="sidebar-chat-actions">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setContextMenuId(showContext ? null : session.id);
                            }}
                            className="sidebar-action-btn"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>

                          {/* Context menu */}
                          {showContext && (
                            <div ref={contextMenuRef} className="sidebar-context-menu" onClick={e => e.stopPropagation()}>
                              <button
                                className="sidebar-context-item"
                                onClick={() => {
                                  setEditingSessionId(session.id);
                                  setEditTitle(session.title);
                                  setContextMenuId(null);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" /> Rename
                              </button>
                              <div className="sidebar-context-divider" />
                              <button
                                className="sidebar-context-item danger"
                                onClick={() => {
                                  if (confirm('Delete this conversation?')) deleteSession(session.id);
                                  setContextMenuId(null);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-actions">
            <button
              onClick={() => setShowPromptLibrary(true)}
              className="sidebar-footer-btn"
            >
              <BookOpen className="h-4 w-4 sidebar-footer-icon" />
              <span>Prompts</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="sidebar-footer-btn"
            >
              <Settings className="h-4 w-4 sidebar-footer-icon" />
              <span>Settings</span>
            </button>
          </div>

          <div className="sidebar-footer-utils">
            <label className="sidebar-util-btn" title="Import chats">
              <Upload className="h-3.5 w-3.5" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={() => sessions.length ? exportAllChatsAsJson(sessions) : alert('No chats to export')}
              className="sidebar-util-btn"
              title="Export chats"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => { if (confirm('Delete ALL conversations? This cannot be undone.')) clearAllSessions(); }}
              className="sidebar-util-btn danger"
              title="Clear all conversations"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
