'use client';

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

interface MasterControllerProps {
  open: boolean;
  onClose: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    `Hi! I'm your Master Controller. I can help you manage your calendar, Trello boards, and more. Try asking me something like:\n\n• "What's on my calendar today?"\n• "Create a Trello card to update homepage copy"\n• "Show me my upcoming events"`,
  timestamp: new Date(),
};

export function MasterController({ open, onClose }: MasterControllerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/master-controller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!open) return null;

  return (
    <div className="flex flex-col h-full w-80 bg-zinc-900 border-l border-zinc-800 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-blue-400" />
          <span className="text-zinc-100 text-sm font-medium">Master Controller</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2.5',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={cn(
                'shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5',
                msg.role === 'user' ? 'bg-blue-600' : 'bg-zinc-700'
              )}
            >
              {msg.role === 'user' ? (
                <User size={12} className="text-white" />
              ) : (
                <Bot size={12} className="text-zinc-300" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.actionResult && !msg.actionResult.success && (
                <p className="text-red-400 text-xs mt-1">
                  Action failed
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="shrink-0 w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
              <Bot size={12} className="text-zinc-300" />
            </div>
            <div className="bg-zinc-800 rounded-xl rounded-tl-sm px-3 py-2">
              <Loader2 size={14} className="text-zinc-400 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 shrink-0">
        <div className="flex items-end gap-2 bg-zinc-800 rounded-xl p-2 border border-zinc-700 focus-within:border-zinc-600 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 resize-none outline-none max-h-32 leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="shrink-0 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-zinc-600 text-xs mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
