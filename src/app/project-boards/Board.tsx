'use client';

import { useState, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, Trash2, Edit2, Flag, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card } from './CardModal';

export interface Column { id: string; title: string; position: number }

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-zinc-600', medium: 'bg-blue-500', high: 'bg-amber-500', urgent: 'bg-rose-500',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low', medium: 'Med', high: 'High', urgent: 'Urgent',
};

// ── Sortable Card ─────────────────────────────────────────────────────────────

function SortableCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const overdue = card.due_date && new Date(card.due_date) < new Date() && card.priority !== 'low';

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
    >
      <div
        onClick={onClick}
        className="group rounded-xl p-3 cursor-pointer transition-all duration-150 mb-2"
        style={{ background: 'rgba(16,22,34,0.8)', border: '1px solid rgba(0,212,255,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(20,28,42,0.95)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(16,22,34,0.8)'; }}
      >
        {/* Drag handle area */}
        <div className="flex items-start gap-2">
          <div
            {...listeners}
            className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing select-none"
            style={{ color: 'rgba(160,175,200,0.2)', fontSize: '11px', lineHeight: 1 }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(0,212,255,0.4)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(160,175,200,0.2)')}
          >⠿</div>

          <div className="flex-1 min-w-0">
            {/* Tags */}
            {card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {card.tags.slice(0, 3).map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{t}</span>
                ))}
              </div>
            )}
            {/* Title */}
            <p className="text-zinc-200 text-sm leading-snug mb-2">{card.title}</p>

            {/* Footer */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full text-white', PRIORITY_COLOR[card.priority])}>
                {PRIORITY_LABEL[card.priority]}
              </span>
              {card.due_date && (
                <span className={cn('flex items-center gap-1 text-[10px]', overdue ? 'text-rose-400' : 'text-zinc-500')}>
                  <Calendar size={9} />{card.due_date}
                </span>
              )}
              {card.assignee && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <User size={9} />{card.assignee}
                </span>
              )}
              {card.card_checklist_items.length > 0 && (
                <span className="text-[10px] text-zinc-500">
                  ✓ {card.card_checklist_items.filter(i => i.checked).length}/{card.card_checklist_items.length}
                </span>
              )}
              {card.card_comments.length > 0 && (
                <span className="text-[10px] text-zinc-500">💬 {card.card_comments.length}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Droppable Column ──────────────────────────────────────────────────────────

interface ColumnProps {
  column: Column;
  cards: Card[];
  filter: string;
  onAddCard: (columnId: string) => void;
  onOpenCard: (card: Card) => void;
  onRenameColumn: (col: Column) => void;
  onDeleteColumn: (col: Column) => void;
}

function KanbanColumn({ column, cards, filter, onAddCard, onOpenCard, onRenameColumn, onDeleteColumn }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const [menuOpen, setMenuOpen] = useState(false);

  const filtered = filter
    ? cards.filter(c =>
        c.title.toLowerCase().includes(filter) ||
        c.tags.some(t => t.toLowerCase().includes(filter)) ||
        (c.assignee ?? '').toLowerCase().includes(filter) ||
        c.priority.includes(filter)
      )
    : cards;

  const cardIds = filtered.map(c => c.id);

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-xl mb-0"
        style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', borderBottom: 'none', borderRadius: '12px 12px 0 0' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300">{column.title}</span>
          <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 w-40 rounded-xl overflow-hidden shadow-xl" style={{ background: 'rgba(14,20,30,0.98)', border: '1px solid rgba(0,212,255,0.12)' }}>
              <button onClick={() => { onRenameColumn(column); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">
                <Edit2 size={11} /> Rename column
              </button>
              <button onClick={() => { onDeleteColumn(column); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-rose-400 hover:bg-zinc-800 transition-colors">
                <Trash2 size={11} /> Delete column
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 px-2 pt-2 pb-1 min-h-[60px] rounded-b-xl"
        style={{ background: 'rgba(8,12,20,0.5)', border: '1px solid rgba(0,212,255,0.1)', borderTop: 'none', borderRadius: '0 0 12px 12px' }}
      >
        <SortableContext id={column.id} items={cardIds} strategy={verticalListSortingStrategy}>
          {filtered.map(card => (
            <SortableCard key={card.id} card={card} onClick={() => onOpenCard(card)} />
          ))}
        </SortableContext>
        {filtered.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-zinc-700 text-xs">No cards</p>
          </div>
        )}
      </div>

      {/* Add card */}
      <button
        onClick={() => onAddCard(column.id)}
        className="flex items-center gap-1.5 mt-1.5 px-3 py-2 text-zinc-600 hover:text-zinc-300 text-xs transition-colors rounded-xl hover:bg-zinc-800/50 w-full"
      >
        <Plus size={12} /> Add card
      </button>
    </div>
  );
}

// ── Drag overlay card (ghost) ─────────────────────────────────────────────────

function CardOverlay({ card }: { card: Card }) {
  return (
    <div
      className="w-72 rounded-xl p-3 rotate-2 shadow-2xl"
      style={{ background: 'rgba(20,28,42,0.98)', border: '1px solid rgba(0,212,255,0.35)', boxShadow: '0 0 30px rgba(0,212,255,0.15)' }}
    >
      <p className="text-zinc-200 text-sm">{card.title}</p>
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────────

interface BoardProps {
  columns: Column[];
  cardsByColumn: Record<string, Card[]>;
  filter: string;
  onColumnsChange: (cols: Column[]) => void;
  onCardsChange: (map: Record<string, Card[]>) => void;
  onAddCard: (columnId: string) => void;
  onOpenCard: (card: Card) => void;
  onRenameColumn: (col: Column) => void;
  onDeleteColumn: (col: Column) => void;
  onAddColumn: () => void;
  onSavePositions: (map: Record<string, Card[]>) => void;
}

export function KanbanBoard({
  columns, cardsByColumn, filter,
  onColumnsChange, onCardsChange,
  onAddCard, onOpenCard, onRenameColumn, onDeleteColumn, onAddColumn,
  onSavePositions,
}: BoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Find which column a card is in
  const findColumnOfCard = useCallback((cardId: string) => {
    for (const col of columns) {
      if ((cardsByColumn[col.id] ?? []).some(c => c.id === cardId)) return col.id;
    }
    return null;
  }, [columns, cardsByColumn]);

  function onDragStart({ active }: DragStartEvent) {
    const colId = findColumnOfCard(active.id as string);
    if (!colId) return;
    const card = (cardsByColumn[colId] ?? []).find(c => c.id === active.id);
    if (card) setActiveCard(card);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;
    const activeColId = findColumnOfCard(active.id as string);
    if (!activeColId) return;

    // Determine target column: over.id may be a column id or a card id
    const isOverColumn = columns.some(c => c.id === over.id);
    const overColId = isOverColumn
      ? (over.id as string)
      : findColumnOfCard(over.id as string);

    if (!overColId || activeColId === overColId) return;

    // Move card to new column optimistically
    const activeCards = [...(cardsByColumn[activeColId] ?? [])];
    const overCards   = [...(cardsByColumn[overColId]   ?? [])];
    const cardToMove  = activeCards.find(c => c.id === active.id);
    if (!cardToMove) return;

    const newActive = activeCards.filter(c => c.id !== active.id);
    const overIndex = isOverColumn
      ? overCards.length
      : overCards.findIndex(c => c.id === over.id);
    const newOver = [...overCards];
    newOver.splice(Math.max(0, overIndex), 0, { ...cardToMove, column_id: overColId });

    onCardsChange({ ...cardsByColumn, [activeColId]: newActive, [overColId]: newOver });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null);
    if (!over || active.id === over.id) return;

    const activeColId = findColumnOfCard(active.id as string);
    if (!activeColId) return;

    const isOverColumn = columns.some(c => c.id === over.id);
    const overColId = isOverColumn
      ? (over.id as string)
      : findColumnOfCard(over.id as string);

    if (!overColId) return;

    let newMap = { ...cardsByColumn };

    if (activeColId === overColId) {
      // Reorder within same column
      const colCards = [...(cardsByColumn[activeColId] ?? [])];
      const oldIdx = colCards.findIndex(c => c.id === active.id);
      const newIdx = colCards.findIndex(c => c.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        newMap = { ...newMap, [activeColId]: arrayMove(colCards, oldIdx, newIdx) };
      }
    }
    // Cross-column move already applied in onDragOver

    onCardsChange(newMap);
    onSavePositions(newMap);
  }

  const columnIds = columns.map(c => c.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="flex gap-4 h-full items-start overflow-x-auto pb-4 pr-4">
        <SortableContext items={columnIds} strategy={verticalListSortingStrategy}>
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={cardsByColumn[col.id] ?? []}
              filter={filter}
              onAddCard={onAddCard}
              onOpenCard={onOpenCard}
              onRenameColumn={onRenameColumn}
              onDeleteColumn={onDeleteColumn}
            />
          ))}
        </SortableContext>

        {/* Add column */}
        <button
          onClick={onAddColumn}
          className="flex items-center gap-2 w-72 shrink-0 px-4 py-3 rounded-xl text-zinc-600 hover:text-zinc-300 transition-colors text-sm"
          style={{ border: '1px dashed rgba(0,212,255,0.15)', background: 'rgba(0,212,255,0.02)' }}
        >
          <Plus size={14} /> Add column
        </button>
      </div>

      <DragOverlay>
        {activeCard ? <CardOverlay card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
