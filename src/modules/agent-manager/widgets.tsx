'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import type { WidgetProps, ChatMessage } from '@/types';

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi! Ask me about your calendar, habits, or anything else.',
  timestamp: new Date(),
};

export function MasterControllerWidget(_: WidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: trimmed, timestamp: new Date() };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/master-controller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setMessages((p) => [...p, data.message]);
    } catch {
      setMessages((p) => [...p, {
        id: uuidv4(), role: 'assistant', content: 'Connection error.', timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
              'shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
              msg.role === 'user' ? 'bg-blue-600' : 'bg-zinc-700'
            )}>
              {msg.role === 'user'
                ? <User size={10} className="text-white" />
                : <Bot size={10} className="text-zinc-300" />}
            </div>
            <div className={cn(
              'max-w-[85%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed',
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="shrink-0 w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
              <Bot size={10} className="text-zinc-300" />
            </div>
            <div className="bg-zinc-800 rounded-xl rounded-tl-sm px-2.5 py-1.5">
              <Loader2 size={12} className="text-zinc-400 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1.5 border border-zinc-700 focus-within:border-zinc-600 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything…"
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-500 outline-none"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            onMouseDown={(e) => e.stopPropagation()}
            className="shrink-0 p-1 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
          >
            <Send size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
