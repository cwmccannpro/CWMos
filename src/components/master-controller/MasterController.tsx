'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Send, Bot, User, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

interface MasterControllerProps {
  open: boolean;
  onClose: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `CTRL ONLINE.\n\nI'm your AI command core. Ask me anything about your calendar, Trello, nutrition, or just talk.\n\n▸ "What's on my calendar today?"\n▸ "Create a Trello card to update the homepage"\n▸ "How are my macros looking?"`,
  timestamp: new Date(),
};

// ── Web Speech API types (not in standard TS lib) ────────────────────────────
interface ISpeechRecognition extends EventTarget {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; stop(): void;
  onresult: ((e: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: new () => ISpeechRecognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.05;
  utt.pitch = 0.9;
  // Prefer a deeper/clear voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    /david|mark|alex|daniel|google uk english male/i.test(v.name)
  ) ?? voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('female'));
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

export function MasterController({ open, onClose }: MasterControllerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Stop listening when panel closes
  useEffect(() => {
    if (!open) stopListening();
  }, [open]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    recognitionRef.current = rec;

    rec.onresult = (e) => {
      const results = e.results;
      let transcript = '';
      for (let i = 0; i < Object.keys(results).length; i++) {
        transcript += results[i][0].transcript;
      }
      setInput(transcript);
    };

    rec.onend = () => {
      setListening(false);
      // Auto-send if there's a transcript
      setInput(prev => {
        if (prev.trim()) {
          // Trigger send via a small delay so state settles
          setTimeout(() => {
            document.getElementById('mc-send-btn')?.click();
          }, 100);
        }
        return prev;
      });
    };

    rec.onerror = () => setListening(false);

    rec.start();
    setListening(true);
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/master-controller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      if (voiceEnabled && data.message?.content) {
        speak(data.message.content);
      }
    } catch {
      const errMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'CONNECTION ERROR. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, voiceEnabled]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!open) return null;

  const hasSpeechAPI = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div
      className="flex flex-col h-full w-80"
      style={{
        background: 'rgba(6, 9, 14, 0.97)',
        borderLeft: '1px solid rgba(0,212,255,0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-16 shrink-0"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}
      >
        <div className="flex flex-col gap-1">
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              color: '#00D4FF',
            }}
          >
            Master Controller
          </span>
          <span
            className="animate-mc-underline block"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, #00D4FF 0%, rgba(0,212,255,0.3) 60%, transparent 100%)',
            }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {/* TTS toggle */}
          <button
            onClick={() => {
              setVoiceEnabled(v => !v);
              if (voiceEnabled) window.speechSynthesis?.cancel();
            }}
            title={voiceEnabled ? 'Mute voice' : 'Enable voice responses'}
            className="p-1.5 rounded-md transition-all duration-200"
            style={{ color: voiceEnabled ? '#00D4FF' : 'rgba(0,212,255,0.2)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#00D4FF'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = voiceEnabled ? '#00D4FF' : 'rgba(0,212,255,0.2)'}
          >
            {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-all duration-200"
            style={{ color: 'rgba(0,212,255,0.3)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#00D4FF'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(0,212,255,0.3)'}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
          >
            <div
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
              style={msg.role === 'user' ? {
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.4)',
              } : {
                background: 'rgba(0,212,255,0.07)',
                border: '1px solid rgba(0,212,255,0.2)',
              }}
            >
              {msg.role === 'user'
                ? <User size={9} style={{ color: '#8B5CF6' }} />
                : <Bot size={9} style={{ color: '#00D4FF' }} />
              }
            </div>

            <div
              className="max-w-[85%] px-3 py-2"
              style={msg.role === 'user' ? {
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.22)',
                borderRadius: '10px 2px 10px 10px',
                color: 'rgba(210,200,255,0.88)',
                fontSize: '0.72rem',
                lineHeight: '1.55',
                boxShadow: '0 0 14px rgba(139,92,246,0.07)',
              } : {
                background: 'rgba(8,14,24,0.8)',
                border: '1px solid rgba(0,212,255,0.09)',
                borderLeft: '2px solid rgba(0,212,255,0.45)',
                borderRadius: '2px 10px 10px 10px',
                color: 'rgba(190,215,240,0.82)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.63rem',
                lineHeight: '1.65',
              }}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.actionResult && !msg.actionResult.success && (
                <p className="text-red-400 text-[10px] mt-1">Action failed</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)' }}
            >
              <Bot size={9} style={{ color: '#00D4FF' }} />
            </div>
            <div
              className="px-3 py-2"
              style={{
                background: 'rgba(8,14,24,0.8)',
                border: '1px solid rgba(0,212,255,0.09)',
                borderLeft: '2px solid rgba(0,212,255,0.45)',
                borderRadius: '2px 10px 10px 10px',
              }}
            >
              <Loader2 size={11} className="animate-spin" style={{ color: '#00D4FF' }} />
            </div>
          </div>
        )}
      </div>

      {/* Listening indicator */}
      {listening && (
        <div
          className="mx-3 mb-2 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#00D4FF', boxShadow: '0 0 8px rgba(0,212,255,0.8)' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#00D4FF', letterSpacing: '0.1em' }}>
            LISTENING…
          </span>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-4 shrink-0">
        <div
          className="flex items-end gap-2 p-2 rounded-xl"
          style={{
            background: 'rgba(4,7,12,0.9)',
            border: '1px solid rgba(0,212,255,0.14)',
          }}
        >
          {/* Mic button */}
          {hasSpeechAPI && (
            <button
              onClick={toggleMic}
              title={listening ? 'Stop listening' : 'Speak a command'}
              className="shrink-0 p-1.5 rounded-lg transition-all duration-200"
              style={listening ? {
                background: 'rgba(0,212,255,0.18)',
                border: '1px solid rgba(0,212,255,0.6)',
                color: '#00D4FF',
                boxShadow: '0 0 12px rgba(0,212,255,0.4)',
              } : {
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.15)',
                color: 'rgba(0,212,255,0.45)',
              }}
            >
              {listening ? <MicOff size={11} /> : <Mic size={11} />}
            </button>
          )}

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? '' : 'ENTER COMMAND…'}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none max-h-32 leading-relaxed placeholder:opacity-25"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.63rem',
              letterSpacing: '0.05em',
              color: 'rgba(0,212,255,0.85)',
              caretColor: '#00D4FF',
            }}
          />

          <button
            id="mc-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="shrink-0 p-1.5 rounded-lg transition-all duration-200 disabled:opacity-25"
            style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: '#00D4FF',
            }}
            onMouseEnter={e => {
              if (!(e.currentTarget as HTMLButtonElement).disabled) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.22)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0,212,255,0.3)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.1)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <Send size={11} />
          </button>
        </div>
        <p
          className="text-center mt-1.5"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.48rem',
            letterSpacing: '0.1em',
            color: 'rgba(0,212,255,0.18)',
          }}
        >
          ENTER · SEND &nbsp;|&nbsp; SHIFT+ENTER · NEWLINE {hasSpeechAPI ? '| MIC · VOICE' : ''}
        </p>
      </div>
    </div>
  );
}
