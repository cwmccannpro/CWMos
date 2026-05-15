'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import { trelloAdapter } from '@/lib/adapters/trello/trello-api-adapter';
import type { TrelloBoard, TrelloList, TrelloCard } from '@/lib/adapters/trello/types';
import { TrelloListColumn } from './TrelloList';
import { cn } from '@/lib/utils';

const POLL_INTERVAL_MS = 30_000;

interface BoardData {
  board: TrelloBoard;
  lists: TrelloList[];
  cardsByList: Record<string, TrelloCard[]>;
}

export default function TrelloPage() {
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const selectedBoardIdRef = useRef(selectedBoardId);
  selectedBoardIdRef.current = selectedBoardId;

  // Fetch all lists + cards for a board and return structured data
  async function fetchBoardData(boardId: string, boards: TrelloBoard[]): Promise<BoardData | null> {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return null;

    const lists = await trelloAdapter.getLists(boardId);
    const cardsByList: Record<string, TrelloCard[]> = {};
    await Promise.all(
      lists.map(async (list) => {
        cardsByList[list.id] = await trelloAdapter.getCards(list.id);
      })
    );
    return { board, lists, cardsByList };
  }

  // Initial load: fetch boards then first board's data
  useEffect(() => {
    trelloAdapter
      .getBoards()
      .then(async (b) => {
        setBoards(b);
        if (b.length === 0) return;
        const firstId = b[0].id;
        setSelectedBoardId(firstId);
        const data = await fetchBoardData(firstId, b);
        if (data) { setBoardData(data); setLastUpdated(new Date()); }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh board data (used by poll and manual refresh button)
  const refresh = useCallback(async (silent = false) => {
    const boardId = selectedBoardIdRef.current;
    if (!boardId) return;
    if (!silent) setRefreshing(true);
    try {
      const currentBoards = await trelloAdapter.getBoards();
      setBoards(currentBoards);
      const data = await fetchBoardData(boardId, currentBoards);
      if (data) { setBoardData(data); setLastUpdated(new Date()); }
    } catch {
      // silent poll failures don't surface as errors
    } finally {
      if (!silent) setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch board
  useEffect(() => {
    if (!selectedBoardId || boards.length === 0) return;
    setLoading(true);
    setBoardData(null);
    fetchBoardData(selectedBoardId, boards)
      .then((data) => {
        if (data) { setBoardData(data); setLastUpdated(new Date()); }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoardId]);

  // Polling
  useEffect(() => {
    const id = setInterval(() => refresh(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Optimistic: update cards in a specific list
  function handleCardsChange(listId: string, cards: TrelloCard[]) {
    setBoardData((prev) =>
      prev ? { ...prev, cardsByList: { ...prev.cardsByList, [listId]: cards } } : prev
    );
  }

  // Optimistic: card moved — add it to its new list
  function handleCardMoved(movedCard: TrelloCard) {
    setBoardData((prev) => {
      if (!prev) return prev;
      const target = prev.cardsByList[movedCard.listId] ?? [];
      return {
        ...prev,
        cardsByList: {
          ...prev.cardsByList,
          [movedCard.listId]: [...target, movedCard],
        },
      };
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800 shrink-0">
        <LayoutDashboard size={20} className="text-blue-400" />
        <h1 className="text-zinc-100 text-xl font-semibold">Trello</h1>

        {/* Board tabs */}
        <div className="flex items-center gap-1 ml-4">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setSelectedBoardId(board.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                selectedBoardId === board.id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
              )}
            >
              {board.name}
            </button>
          ))}
        </div>

        {/* Refresh + last updated */}
        <div className="ml-auto flex items-center gap-2">
          {lastUpdated && (
            <span className="text-zinc-600 text-xs">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refresh(false)}
            disabled={refreshing}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-x-auto p-6">
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <p className="text-red-400 font-medium">Failed to load Trello</p>
            <p className="text-zinc-500 text-sm max-w-sm">{error}</p>
          </div>
        )}

        {!error && loading && (
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-64 shrink-0 h-48 bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!error && !loading && boardData && (
          <div className="flex gap-4 items-start h-full">
            {boardData.lists.map((list) => (
              <TrelloListColumn
                key={list.id}
                list={list}
                cards={boardData.cardsByList[list.id] ?? []}
                lists={boardData.lists}
                onCardsChange={handleCardsChange}
                onCardMoved={handleCardMoved}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
