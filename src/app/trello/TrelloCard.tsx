'use client';

import { useState, useRef, useEffect } from 'react';
import { Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TrelloCard, TrelloList } from '@/lib/adapters/trello/types';
import { trelloAdapter } from '@/lib/adapters/trello/trello-api-adapter';

interface Props {
  card: TrelloCard;
  lists: TrelloList[];
  onUpdated: (card: TrelloCard) => void;
  onArchived: (cardId: string) => void;
  onMoved: (card: TrelloCard) => void;
}

export function TrelloCardItem({ card, lists, onUpdated, onArchived, onMoved }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(card.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Keep local name in sync if card updates from a poll
  useEffect(() => {
    if (!editing) setName(card.name);
  }, [card.name, editing]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === card.name) {
      setName(card.name);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await trelloAdapter.updateCard({ id: card.id, name: trimmed });
      onUpdated(updated);
    } catch {
      setName(card.name);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  async function archive() {
    try {
      await trelloAdapter.archiveCard(card.id);
      onArchived(card.id);
    } catch {}
  }

  async function move(targetListId: string) {
    try {
      const updated = await trelloAdapter.moveCard(card.id, targetListId);
      onMoved(updated);
    } catch {}
  }

  const currentIdx = lists.findIndex((l) => l.id === card.listId);
  const prevList = currentIdx > 0 ? lists[currentIdx - 1] : null;
  const nextList = currentIdx < lists.length - 1 ? lists[currentIdx + 1] : null;

  return (
    <div className="group p-2.5 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors">
      {editing ? (
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveName();
            if (e.key === 'Escape') { setName(card.name); setEditing(false); }
          }}
          disabled={saving}
          className="w-full bg-zinc-700 text-zinc-100 text-sm rounded px-1.5 py-0.5 outline-none border border-blue-500"
        />
      ) : (
        <p
          className="text-zinc-200 text-sm leading-snug cursor-text"
          onClick={() => setEditing(true)}
        >
          {card.name}
        </p>
      )}

      {card.desc && (
        <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{card.desc}</p>
      )}

      {card.labels.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {card.labels.map((label) => (
            <span key={label} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
              {label}
            </span>
          ))}
        </div>
      )}

      {card.due && (
        <p className="text-xs text-amber-400 mt-1.5">
          Due {new Date(card.due).toLocaleDateString()}
        </p>
      )}

      {/* Hover actions: move left/right, archive */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {prevList && (
          <button
            onClick={() => move(prevList.id)}
            title={`Move to ${prevList.name}`}
            className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
          >
            <ChevronLeft size={12} />
          </button>
        )}
        {nextList && (
          <button
            onClick={() => move(nextList.id)}
            title={`Move to ${nextList.name}`}
            className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
          >
            <ChevronRight size={12} />
          </button>
        )}
        <button
          onClick={archive}
          title="Archive card"
          className="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 ml-auto"
        >
          <Archive size={12} />
        </button>
      </div>
    </div>
  );
}
