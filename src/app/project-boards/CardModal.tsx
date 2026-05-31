'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Flag, Calendar, Tag, User, CheckSquare, MessageSquare, Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChecklistItem { id: string; text: string; checked: boolean; position: number }
export interface Comment { id: string; text: string; created_at: string }
export interface Card {
  id: string; column_id: string; project_id: string; title: string;
  description: string | null; priority: string; due_date: string | null;
  tags: string[]; assignee: string | null; position: number; archived: boolean;
  created_at: string; updated_at: string;
  card_checklist_items: ChecklistItem[];
  card_comments: Comment[];
}

interface Column { id: string; title: string }

const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-zinc-700 text-zinc-300',
  medium: 'bg-blue-900/60 text-blue-300',
  high:   'bg-amber-900/60 text-amber-300',
  urgent: 'bg-rose-900/60 text-rose-400',
};

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-zinc-500', medium: 'bg-blue-400', high: 'bg-amber-400', urgent: 'bg-rose-500',
};

interface Props {
  card: Card;
  columns: Column[];
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
}

export function CardModal({ card: initialCard, columns, onClose, onUpdate, onDelete }: Props) {
  const [card, setCard] = useState<Card>(initialCard);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  function patch(fields: Partial<Card>) {
    setCard(prev => ({ ...prev, ...fields }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/project-boards/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: card.id, title: card.title, description: card.description,
        priority: card.priority, due_date: card.due_date,
        tags: card.tags, assignee: card.assignee, column_id: card.column_id,
      }),
    });
    setSaving(false);
    if (res.ok) { const updated = await res.json(); setCard(updated); onUpdate(updated); setDirty(false); }
  }

  async function addChecklist() {
    if (!newCheckItem.trim()) return;
    const res = await fetch('/api/project-boards/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card.id, text: newCheckItem.trim(), position: card.card_checklist_items.length }),
    });
    if (res.ok) {
      const item = await res.json();
      const updated = { ...card, card_checklist_items: [...card.card_checklist_items, item] };
      setCard(updated); onUpdate(updated); setNewCheckItem('');
    }
  }

  async function toggleChecklist(item: ChecklistItem) {
    const res = await fetch('/api/project-boards/checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, checked: !item.checked }),
    });
    if (res.ok) {
      const updated = { ...card, card_checklist_items: card.card_checklist_items.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i) };
      setCard(updated); onUpdate(updated);
    }
  }

  async function deleteChecklist(itemId: string) {
    await fetch(`/api/project-boards/checklist?id=${itemId}`, { method: 'DELETE' });
    const updated = { ...card, card_checklist_items: card.card_checklist_items.filter(i => i.id !== itemId) };
    setCard(updated); onUpdate(updated);
  }

  async function addComment() {
    if (!newComment.trim()) return;
    const res = await fetch('/api/project-boards/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card.id, text: newComment.trim() }),
    });
    if (res.ok) {
      const comment = await res.json();
      const updated = { ...card, card_comments: [...card.card_comments, comment] };
      setCard(updated); onUpdate(updated); setNewComment('');
    }
  }

  async function deleteComment(commentId: string) {
    await fetch(`/api/project-boards/comments?id=${commentId}`, { method: 'DELETE' });
    const updated = { ...card, card_comments: card.card_comments.filter(c => c.id !== commentId) };
    setCard(updated); onUpdate(updated);
  }

  function addTag() {
    const t = newTag.trim().toLowerCase();
    if (!t || card.tags.includes(t)) { setNewTag(''); return; }
    patch({ tags: [...card.tags, t] });
    setNewTag('');
  }

  const checkedCount = card.card_checklist_items.filter(i => i.checked).length;
  const totalCount = card.card_checklist_items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{ background: 'rgba(10,14,22,0.98)', border: '1px solid rgba(0,212,255,0.15)', boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 shrink-0">
          <span className={cn('mt-1 w-2.5 h-2.5 rounded-full shrink-0', PRIORITY_DOT[card.priority])} />
          <textarea
            ref={titleRef}
            value={card.title}
            onChange={e => patch({ title: e.target.value })}
            className="flex-1 text-zinc-100 font-semibold text-base bg-transparent resize-none focus:outline-none leading-snug"
            rows={2}
            style={{ fontFamily: 'inherit' }}
          />
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 px-5 pb-3 shrink-0">
          {/* Column */}
          <select
            value={card.column_id}
            onChange={e => patch({ column_id: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
          >
            {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>

          {/* Priority */}
          <select
            value={card.priority}
            onChange={e => patch({ priority: e.target.value })}
            className={cn('border border-zinc-700 rounded-lg px-2 py-1 text-xs focus:outline-none', PRIORITY_COLORS[card.priority])}
          >
            {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p} className="bg-zinc-900">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>

          {/* Due date */}
          <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1">
            <Calendar size={11} className="text-zinc-500" />
            <input
              type="date"
              value={card.due_date ?? ''}
              onChange={e => patch({ due_date: e.target.value || null })}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none w-[100px]"
            />
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1">
            <User size={11} className="text-zinc-500" />
            <input
              value={card.assignee ?? ''}
              onChange={e => patch({ assignee: e.target.value || null })}
              placeholder="Assignee"
              className="bg-transparent text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none w-[90px]"
            />
          </div>
        </div>

        <div className="border-t border-zinc-800/60 mx-5" />

        {/* Body */}
        <div className="px-5 py-4 space-y-5 flex-1">
          {/* Description */}
          <div>
            <label className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Description</label>
            <textarea
              value={card.description ?? ''}
              onChange={e => patch({ description: e.target.value || null })}
              placeholder="Add a description…"
              rows={3}
              className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5"><Tag size={10} /> Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {card.tags.map(t => (
                <span key={t} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full">
                  {t}
                  <button onClick={() => patch({ tags: card.tags.filter(x => x !== t) })} className="text-zinc-500 hover:text-rose-400 transition-colors">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Add tag…"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
              />
              <button onClick={addTag} className="px-3 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-600 transition-colors">Add</button>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckSquare size={10} /> Checklist
              {totalCount > 0 && <span className="ml-auto text-zinc-600">{checkedCount}/{totalCount}</span>}
            </label>
            {totalCount > 0 && (
              <div className="mb-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(checkedCount / totalCount) * 100}%` }} />
              </div>
            )}
            <div className="space-y-1.5 mb-2">
              {card.card_checklist_items.sort((a, b) => a.position - b.position).map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button onClick={() => toggleChecklist(item)} className={cn('shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors', item.checked ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600 hover:border-cyan-500')}>
                    {item.checked && <Check size={10} className="text-white" />}
                  </button>
                  <span className={cn('flex-1 text-sm', item.checked ? 'line-through text-zinc-600' : 'text-zinc-300')}>{item.text}</span>
                  <button onClick={() => deleteChecklist(item.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all shrink-0">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCheckItem}
                onChange={e => setNewCheckItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChecklist()}
                placeholder="Add item…"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
              />
              <button onClick={addChecklist} className="px-3 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-600 transition-colors">Add</button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5"><MessageSquare size={10} /> Comments</label>
            <div className="space-y-2 mb-2">
              {card.card_comments.sort((a, b) => a.created_at.localeCompare(b.created_at)).map(c => (
                <div key={c.id} className="group bg-zinc-800/50 rounded-xl px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-zinc-300 flex-1">{c.text}</p>
                    <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all shrink-0 mt-0.5">
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="Write a comment…"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
              />
              <button onClick={addComment} className="px-3 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-600 transition-colors">Post</button>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
            <div>
              <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Created</p>
              <p className="text-zinc-500 text-xs mt-0.5">{new Date(card.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Updated</p>
              <p className="text-zinc-500 text-xs mt-0.5">{new Date(card.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800 shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-rose-400 text-xs">Delete this card?</span>
              <button onClick={() => { onDelete(card.id); onClose(); }} className="px-3 py-1.5 bg-rose-600 text-white text-xs rounded-lg hover:bg-rose-500 transition-colors">Yes, delete</button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-lg hover:bg-zinc-700 transition-colors">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-zinc-600 hover:text-rose-400 text-xs transition-colors">
              <Trash2 size={12} /> Delete card
            </button>
          )}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-zinc-500 text-sm hover:text-zinc-300 transition-colors">Cancel</button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{ background: dirty ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)', color: dirty ? '#00D4FF' : '#71717a', border: `1px solid ${dirty ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)'}` }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
