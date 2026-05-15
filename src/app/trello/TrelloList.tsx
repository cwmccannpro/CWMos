'use client';

import { useState } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import type { TrelloCard, TrelloList } from '@/lib/adapters/trello/types';
import { trelloAdapter } from '@/lib/adapters/trello/trello-api-adapter';
import { TrelloCardItem } from './TrelloCard';

interface Props {
  list: TrelloList;
  cards: TrelloCard[];
  lists: TrelloList[];
  onCardsChange: (listId: string, cards: TrelloCard[]) => void;
  onCardMoved: (card: TrelloCard) => void;
}

export function TrelloListColumn({ list, cards, lists, onCardsChange, onCardMoved }: Props) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAddCard() {
    if (!newCardName.trim()) {
      setAddingCard(false);
      return;
    }
    setSaving(true);
    try {
      const card = await trelloAdapter.createCard({ name: newCardName.trim(), listId: list.id });
      onCardsChange(list.id, [...cards, card]);
      setNewCardName('');
      setAddingCard(false);
    } catch {
      // keep form open so the user can retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-64 shrink-0 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-h-full">
      {/* List header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800 shrink-0">
        <span className="text-zinc-300 text-sm font-medium">{list.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-zinc-600 text-xs">{cards.length}</span>
          <button className="p-0.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {cards.map((card) => (
          <TrelloCardItem
            key={card.id}
            card={card}
            lists={lists}
            onUpdated={(updated) =>
              onCardsChange(list.id, cards.map((c) => (c.id === updated.id ? updated : c)))
            }
            onArchived={(cardId) =>
              onCardsChange(list.id, cards.filter((c) => c.id !== cardId))
            }
            onMoved={(movedCard) => {
              onCardsChange(list.id, cards.filter((c) => c.id !== movedCard.id));
              onCardMoved(movedCard);
            }}
          />
        ))}
      </div>

      {/* Add card */}
      <div className="p-2 border-t border-zinc-800 shrink-0">
        {addingCard ? (
          <div className="space-y-1.5">
            <textarea
              autoFocus
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                if (e.key === 'Escape') { setAddingCard(false); setNewCardName(''); }
              }}
              placeholder="Card title…"
              rows={2}
              className="w-full bg-zinc-800 text-zinc-100 text-sm rounded px-2 py-1.5 outline-none border border-blue-500 resize-none placeholder:text-zinc-600"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleAddCard}
                disabled={saving || !newCardName.trim()}
                className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setAddingCard(false); setNewCardName(''); }}
                className="px-2 py-1 rounded text-zinc-400 text-xs hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 text-xs transition-colors"
          >
            <Plus size={12} />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}
