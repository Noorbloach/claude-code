'use client';

import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { 
  X, 
  Search, 
  Copy, 
  Check, 
  MessageSquarePlus, 
  BookOpen, 
  Code, 
  PenTool, 
  BarChart2, 
  UserCheck, 
  HelpCircle 
} from 'lucide-react';
import { PromptTemplate } from '../types';

const LIBRARY_TEMPLATES: PromptTemplate[] = [
  {
    id: 'refactor',
    title: 'Code Refactor & Optimize',
    category: 'coding',
    description: 'Refactor code to improve performance, readability, and adherence to clean coding patterns.',
    prompt: 'Please analyze the following code for performance bottlenecks, redundancies, and readability issues. Refactor it using modern best practices, clean structure, and appropriate typing. Explain the changes you made and why:\n\n```js\n// Paste code here\n```'
  },
  {
    id: 'tests',
    title: 'Generate Unit Tests',
    category: 'coding',
    description: 'Create comprehensive unit tests covering edge cases, happy paths, and error states.',
    prompt: 'Write comprehensive unit tests for the following code. Cover happy paths, negative paths, boundary conditions, and mock any external dependencies. Use a popular testing framework like Jest, Vitest, or PyTest and explain the test cases:\n\n```js\n// Paste code here\n```'
  },
  {
    id: 'sql-opt',
    title: 'SQL Query Optimizer',
    category: 'coding',
    description: 'Optimize slow SQL queries by improving joins, indexes, and query structures.',
    prompt: 'Explain how to optimize the following SQL query. Identify potential performance issues, suggest indexing strategies, and rewrite the query for maximum execution efficiency:\n\n```sql\n-- Paste query here\n```'
  },
  {
    id: 'blog-outline',
    title: 'Blog Post Outline Creator',
    category: 'writing',
    description: 'Generate a structured outline for a blog post, including SEO keywords and headings.',
    prompt: 'Create a highly structured, engaging blog post outline for the topic: "[Insert Topic]". Include suggestions for an attention-grabbing introduction, logical heading hierarchies (H2, H3), key talking points for each section, recommended SEO keywords, and a call-to-action conclusion.'
  },
  {
    id: 'brainstorm',
    title: 'Creative Brainstorming',
    category: 'writing',
    description: 'Brainstorm creative angles, hooks, and ideas for articles, marketing, or stories.',
    prompt: 'I need creative brainstorming ideas for "[Insert Project/Product]". Generate 10 unique, compelling angles or hooks. For each idea, provide a catchy title, a brief description of the core concept, and explain why it would resonate with an audience.'
  },
  {
    id: 'swot',
    title: 'SWOT Analysis Generator',
    category: 'analysis',
    description: 'Generate a comprehensive SWOT analysis for any product, business, or project.',
    prompt: 'Conduct a comprehensive SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for "[Insert Business/Product]". Format it in a structured markdown table with detailed bullet points for each category.'
  },
  {
    id: 'data-interpret',
    title: 'Data Interpreter & Insights',
    category: 'analysis',
    description: 'Analyze data points and provide actionable business insights with visualizations.',
    prompt: 'I have the following data:\n\n```\n[Paste data here]\n```\n\nProvide a comprehensive analysis including: key trends, statistical insights, potential outliers, and actionable business recommendations.'
  },
  {
    id: 'interview-prep',
    title: 'Interview Coach',
    category: 'roleplay',
    description: 'Practice job interviews with an AI that asks tough questions and gives feedback.',
    prompt: 'Act as a senior technical interviewer at a top tech company. You are interviewing me for a [Insert Role] position. Ask me challenging behavioral and technical questions one at a time, then provide detailed feedback on my answers including what was good and what could be improved.'
  },
  {
    id: 'debate',
    title: 'Debate Partner',
    category: 'roleplay',
    description: 'Practice debating skills with an AI that argues the opposite position.',
    prompt: 'Act as an expert debate partner. I will state my position on "[Insert Topic]", and you should argue the opposing viewpoint with well-researched, logical arguments. After each round, provide a brief analysis of both sides.'
  }
];

export default function PromptLibrary() {
  const { showPromptLibrary, setShowPromptLibrary, createSession } = useChatStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'coding' | 'writing' | 'analysis' | 'roleplay'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!showPromptLibrary) return null;

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {}
  };

  const handleUseInNewChat = (text: string) => {
    createSession(undefined, 'New Prompt Chat', undefined);
    navigator.clipboard.writeText(text);
    setShowPromptLibrary(false);
    alert('Started a new conversation! The prompt has been copied to your clipboard. Paste (Cmd+V/Ctrl+V) and press Enter.');
  };

  const filtered = LIBRARY_TEMPLATES.filter(tpl => {
    const matchesSearch = tpl.title.toLowerCase().includes(search.toLowerCase()) || 
                          tpl.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeTab === 'all' || tpl.category === activeTab;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'coding': return <Code className="h-4 w-4" />;
      case 'writing': return <PenTool className="h-4 w-4" />;
      case 'analysis': return <BarChart2 className="h-4 w-4" />;
      case 'roleplay': return <UserCheck className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={() => setShowPromptLibrary(false)}
        className="fixed inset-0"
        style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(4px)' }}
      />

      {/* Drawer */}
      <div 
        className="relative w-full max-w-md h-full overflow-hidden flex flex-col z-10 animate-slide-left"
        style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', color: 'var(--text-primary)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <h2 className="font-bold text-base">Prompt Library</h2>
          </div>
          <button 
            onClick={() => setShowPromptLibrary(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full pl-9 text-xs py-2.5"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
            {['all', 'coding', 'writing', 'analysis', 'roleplay'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className="px-2.5 py-1 rounded-lg border transition-all"
                style={{
                  background: activeTab === tab ? 'var(--accent-light)' : 'transparent',
                  borderColor: activeTab === tab ? 'var(--accent)' : 'transparent',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-tertiary)',
                  fontWeight: activeTab === tab ? 700 : 500
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              No matching templates found.
            </div>
          ) : (
            filtered.map((tpl) => {
              const isCopied = copiedId === tpl.id;
              return (
                <div 
                  key={tpl.id}
                  className="p-4 rounded-xl space-y-3 transition-all group"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span style={{ color: 'var(--text-tertiary)' }}>{getCategoryIcon(tpl.category)}</span>
                        <span style={{ color: 'var(--text-primary)' }}>{tpl.title}</span>
                      </div>
                      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {tpl.description}
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-3 rounded-lg text-[10px] font-mono line-clamp-3 leading-normal" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                    {tpl.prompt}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 text-xs pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                    <button
                      onClick={() => handleCopy(tpl.id, tpl.prompt)}
                      className="btn-ghost text-[10px] py-1.5 px-3 flex items-center gap-1"
                    >
                      {isCopied ? (
                        <><Check className="h-3 w-3" style={{ color: 'var(--success)' }} /><span style={{ color: 'var(--success)' }}>Copied</span></>
                      ) : (
                        <><Copy className="h-3 w-3" /><span>Copy</span></>
                      )}
                    </button>
                    <button
                      onClick={() => handleUseInNewChat(tpl.prompt)}
                      className="btn-primary text-[10px] py-1.5 px-3 flex items-center gap-1"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      Use in Chat
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
