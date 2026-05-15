'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard, ExternalLink } from 'lucide-react';
import { trelloAdapter } from '@/lib/adapters/trello/trello-api-adapter';
import type { TrelloBoard, TrelloCard, TrelloList } from '@/lib/adapters/trello/types';
import type { WidgetProps, WidgetSettingsProps } from '@/types';
import { cn } from '@/lib/utils';

// ─── Settings panel ───────────────────────────────────────────────────────────

export function TrelloListSettings({ config, onConfigChange }: WidgetSettingsProps) {
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingLists, setLoadingLists] = useState(false);

  const selectedBoardId = config.boardId as string | undefined;
  const selectedListIds = (config.listIds as string[] | undefined) ?? [];

  useEffect(() => {
    trelloAdapter.getBoards().then(setBoards).finally(() => setLoadingBoards(false));
  }, []);

  useEffect(() => {
    if (!selectedBoardId) { setLists([]); return; }
    setLoadingLists(true);
    trelloAdapter.getLists(selectedBoardId).then(setLists).finally(() => setLoadingLists(false));
  }, [selectedBoardId]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Board</label>
        {loadingBoards ? (
          <div className="h-7 bg-zinc-800 rounded animate-pulse" />
        ) : (
          <select
            value={selectedBoardId ?? ''}
            onChange={(e) => onConfigChange({ ...config, boardId: e.target.value, listIds: [] })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500"
          >
            <option value="">Select a board…</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {selectedBoardId && (
        <div>
          <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">
            Lists {selectedListIds.length > 0 ? `(${selectedListIds.length} selected)` : '(all)'}
          </label>
          {loadingLists ? (
            <div className="h-7 bg-zinc-800 rounded animate-pulse" />
          ) : (
            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {lists.map((list) => (
                <label key={list.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={selectedListIds.includes(list.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selectedListIds, list.id]
                        : selectedListIds.filter((id) => id !== list.id);
                      onConfigChange({ ...config, listIds: next });
                    }}
                    className="rounded accent-blue-500"
                  />
                  <span className="text-zinc-300 text-xs">{list.name}</span>
                </label>
              ))}
              {lists.length === 0 && <p className="text-zinc-600 text-xs">No lists found</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function TrelloListWidget({ widgetInstanceId, config }: WidgetProps) {
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardName, setBoardName] = useState('');

  const boardId = config.boardId as string | undefined;
  const listIds = (config.listIds as string[] | undefined) ?? [];
  const listIdsKey = listIds.join(',');

  useEffect(() => {
    if (!boardId) { setLoading(false); return; }

    setLoading(true);
    let cancelled = false;

    async function load() {
      const [allBoards, allLists] = await Promise.all([
        trelloAdapter.getBoards(),
        trelloAdapter.getLists(boardId!),
      ]);
      if (cancelled) return;

      const board = allBoards.find((b) => b.id === boardId);
      if (board) setBoardName(board.name);

      const targetLists = listIds.length > 0
        ? allLists.filter((l) => listIds.includes(l.id))
        : allLists;
      setLists(targetLists);

      const allCards: TrelloCard[] = [];
      for (const list of targetLists) {
        const listCards = await trelloAdapter.getCards(list.id);
        if (cancelled) return;
        allCards.push(...listCards);
      }
      setCards(allCards);
    }

    load().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetInstanceId, boardId, listIdsKey]);

  if (!boardId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
        <LayoutDashboard size={20} className="text-zinc-600" />
        <p className="text-zinc-500 text-xs">Open settings to choose a board</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <LayoutDashboard size={12} className="text-blue-400 shrink-0" />
        <span className="text-zinc-400 text-xs font-medium truncate">{boardName || 'Trello'}</span>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-7 bg-zinc-800 rounded animate-pulse" />)}
        </div>
      ) : cards.length === 0 ? (
        <p className="text-zinc-500 text-xs">No cards in selected lists</p>
      ) : (
        <div className="overflow-y-auto flex-1 space-y-3">
          {lists.map((list) => {
            const listCards = cards.filter((c) => c.listId === list.id);
            if (listCards.length === 0) return null;
            return (
              <div key={list.id}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold mb-1">{list.name}</p>
                <div className="space-y-1">
                  {listCards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-start gap-1.5 group bg-zinc-800/60 rounded px-2 py-1.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-200 text-xs leading-snug line-clamp-2">{card.name}</p>
                        {card.labels.length > 0 && (
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {card.labels.map((label) => (
                              <span
                                key={label}
                                className="text-[9px] px-1 py-0.5 rounded bg-zinc-700 text-zinc-400"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                        {card.due && (
                          <p className={cn(
                            'text-[9px] mt-0.5',
                            new Date(card.due) < new Date() ? 'text-rose-400' : 'text-zinc-500'
                          )}>
                            Due {new Date(card.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-opacity shrink-0 mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
