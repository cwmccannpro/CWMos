'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { LayoutDashboard, Plus, Search, ChevronDown, Edit2, Trash2, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanBoard, type Column } from './Board';
import { CardModal, type Card } from './CardModal';

interface Project { id: string; name: string; description: string | null; color: string; created_at: string }

const DEFAULT_COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
const PROJECT_COLORS  = ['#00D4FF', '#8B5CF6', '#F59E0B', '#10b981', '#f97316', '#ef4444', '#ec4899'];

// ── ProjectModal ──────────────────────────────────────────────────────────────

function ProjectModal({
  project, onClose, onSave,
}: { project?: Project; onClose: () => void; onSave: (p: Project) => void }) {
  const [name, setName]     = useState(project?.name ?? '');
  const [desc, setDesc]     = useState(project?.description ?? '');
  const [color, setColor]   = useState(project?.color ?? PROJECT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/project-boards/projects', {
      method: project ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(project ? { id: project.id } : {}), name: name.trim(), description: desc || null, color }),
    });
    setSaving(false);
    if (res.ok) { onSave(await res.json()); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: 'rgba(10,14,22,0.98)', border: '1px solid rgba(0,212,255,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-zinc-100 font-semibold">{project ? 'Edit Project' : 'New Project'}</h2>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Project name"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
        />
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 resize-none"
        />
        <div>
          <label className="block text-zinc-500 text-xs mb-2">Color</label>
          <div className="flex gap-2">
            {PROJECT_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full transition-transform"
                style={{ background: c, transform: color === c ? 'scale(1.35)' : 'scale(1)', boxShadow: color === c ? `0 0 8px ${c}` : 'none' }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
          <button onClick={save} disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.25)' }}
          >
            {saving ? 'Saving…' : project ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onClose }: { message: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative rounded-2xl p-6 space-y-4 w-80"
        style={{ background: 'rgba(10,14,22,0.98)', border: '1px solid rgba(248,113,113,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-zinc-300 text-sm">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-sm hover:bg-rose-500 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

function FilterBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
      <Search size={13} className="text-zinc-600 shrink-0" />
      <input
        value={value}
        onChange={e => onChange(e.target.value.toLowerCase())}
        placeholder="Filter by title, tag, priority, assignee…"
        className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none min-w-0"
      />
      {value && <button onClick={() => onChange('')}><X size={12} className="text-zinc-600 hover:text-zinc-300" /></button>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectBoardsPage() {
  const [projects, setProjects]           = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [columns, setColumns]             = useState<Column[]>([]);
  const [cardsByColumn, setCardsByColumn] = useState<Record<string, Card[]>>({});
  const [loading, setLoading]             = useState(true);
  const [boardLoading, setBoardLoading]   = useState(false);
  const [filter, setFilter]               = useState('');

  // Modals
  const [projectModal, setProjectModal]   = useState<'new' | Project | null>(null);
  const [editingCard, setEditingCard]     = useState<Card | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Inline text inputs
  const [addingCard, setAddingCard]       = useState<{ columnId: string; title: string } | null>(null);
  const [addingColumn, setAddingColumn]   = useState(false);
  const [newColTitle, setNewColTitle]     = useState('');
  const [renamingCol, setRenamingCol]     = useState<Column | null>(null);

  // Project selector dropdown
  const [projDropdown, setProjDropdown]   = useState(false);

  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load projects
  useEffect(() => {
    fetch('/api/project-boards/projects')
      .then(r => r.json())
      .then(data => {
        setProjects(data ?? []);
        if (data?.length) setActiveProjectId(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Load board when project changes
  useEffect(() => {
    if (!activeProjectId) return;
    setBoardLoading(true);
    fetch(`/api/project-boards/board?project_id=${activeProjectId}`)
      .then(r => r.json())
      .then(({ columns: cols, cards }) => {
        const sortedCols = (cols ?? []).sort((a: Column, b: Column) => a.position - b.position);
        setColumns(sortedCols);
        // Build map: columnId → sorted cards
        const map: Record<string, Card[]> = {};
        for (const col of sortedCols) {
          map[col.id] = (cards ?? []).filter((c: Card) => c.column_id === col.id).sort((a: Card, b: Card) => a.position - b.position);
        }
        setCardsByColumn(map);
        setBoardLoading(false);
      })
      .catch(() => setBoardLoading(false));
  }, [activeProjectId]);

  // Save card positions to backend (debounced)
  const savePositions = useCallback((map: Record<string, Card[]>) => {
    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(() => {
      const positions = Object.entries(map).flatMap(([colId, cards]) =>
        cards.map((c, i) => ({ id: c.id, column_id: colId, position: i }))
      );
      fetch('/api/project-boards/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'bulk', positions }),
      });
    }, 600);
  }, []);

  // ── Project actions ─────────────────────────────────────────────────────────

  function onProjectSaved(p: Project) {
    setProjects(prev => {
      const exists = prev.find(x => x.id === p.id);
      if (exists) return prev.map(x => x.id === p.id ? p : x);
      // New project: create default columns
      createDefaultColumns(p.id);
      return [...prev, p];
    });
    setActiveProjectId(p.id);
  }

  async function createDefaultColumns(projectId: string) {
    for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
      await fetch('/api/project-boards/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, title: DEFAULT_COLUMNS[i], position: i }),
      });
    }
    // Reload board
    setActiveProjectId(projectId);
  }

  function deleteProject(p: Project) {
    setConfirmDelete({
      message: `Delete "${p.name}" and all its cards? This cannot be undone.`,
      onConfirm: async () => {
        await fetch(`/api/project-boards/projects?id=${p.id}`, { method: 'DELETE' });
        const next = projects.filter(x => x.id !== p.id);
        setProjects(next);
        setActiveProjectId(next[0]?.id ?? null);
      },
    });
  }

  // ── Column actions ──────────────────────────────────────────────────────────

  async function addColumn() {
    if (!newColTitle.trim() || !activeProjectId) return;
    const res = await fetch('/api/project-boards/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: activeProjectId, title: newColTitle.trim(), position: columns.length }),
    });
    if (res.ok) {
      const col = await res.json();
      setColumns(prev => [...prev, col]);
      setCardsByColumn(prev => ({ ...prev, [col.id]: [] }));
    }
    setNewColTitle(''); setAddingColumn(false);
  }

  async function renameColumn(col: Column, title: string) {
    if (!title.trim()) return;
    await fetch('/api/project-boards/columns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: col.id, title: title.trim() }),
    });
    setColumns(prev => prev.map(c => c.id === col.id ? { ...c, title: title.trim() } : c));
    setRenamingCol(null);
  }

  function deleteColumn(col: Column) {
    setConfirmDelete({
      message: `Delete column "${col.title}" and all its cards?`,
      onConfirm: async () => {
        await fetch(`/api/project-boards/columns?id=${col.id}`, { method: 'DELETE' });
        setColumns(prev => prev.filter(c => c.id !== col.id));
        setCardsByColumn(prev => { const next = { ...prev }; delete next[col.id]; return next; });
      },
    });
  }

  // ── Card actions ────────────────────────────────────────────────────────────

  async function addCard(columnId: string, title: string) {
    if (!title.trim() || !activeProjectId) return;
    const colCards = cardsByColumn[columnId] ?? [];
    const res = await fetch('/api/project-boards/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_id: columnId, project_id: activeProjectId, title: title.trim(), position: colCards.length }),
    });
    if (res.ok) {
      const card = await res.json();
      setCardsByColumn(prev => ({ ...prev, [columnId]: [...(prev[columnId] ?? []), card] }));
    }
    setAddingCard(null);
  }

  function updateCard(updated: Card) {
    setCardsByColumn(prev => {
      // Card may have moved column
      const newMap: Record<string, Card[]> = {};
      for (const [colId, cards] of Object.entries(prev)) {
        newMap[colId] = cards.filter(c => c.id !== updated.id);
      }
      const targetCol = updated.column_id;
      newMap[targetCol] = [...(newMap[targetCol] ?? []), updated];
      return newMap;
    });
    setEditingCard(updated);
  }

  function deleteCard(cardId: string) {
    fetch(`/api/project-boards/cards?id=${cardId}`, { method: 'DELETE' });
    setCardsByColumn(prev => {
      const newMap: Record<string, Card[]> = {};
      for (const [colId, cards] of Object.entries(prev)) {
        newMap[colId] = cards.filter(c => c.id !== cardId);
      }
      return newMap;
    });
  }

  const activeProject = projects.find(p => p.id === activeProjectId);
  const totalCards = Object.values(cardsByColumn).reduce((s, cards) => s + cards.length, 0);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,212,255,0.3)', letterSpacing: '0.12em' }}>LOADING…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <LayoutDashboard size={16} className="text-violet-400 shrink-0" />
        <h1 className="text-zinc-100 font-semibold">Project Boards</h1>

        {/* Project selector */}
        {projects.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setProjDropdown(v => !v)}
              className="flex items-center gap-2 ml-2 pl-3 pr-2 py-1.5 rounded-lg text-sm transition-colors"
              style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', color: activeProject?.color ?? '#00D4FF' }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: activeProject?.color ?? '#00D4FF' }} />
              <span className="text-zinc-200 text-sm max-w-[140px] truncate">{activeProject?.name ?? 'Select project'}</span>
              <ChevronDown size={12} className="text-zinc-500" />
            </button>

            {projDropdown && (
              <div className="absolute top-10 left-0 z-20 w-64 rounded-xl overflow-hidden shadow-xl"
                style={{ background: 'rgba(10,14,22,0.98)', border: '1px solid rgba(0,212,255,0.12)' }}
              >
                {projects.map(p => (
                  <div key={p.id} className="flex items-center group">
                    <button
                      onClick={() => { setActiveProjectId(p.id); setProjDropdown(false); }}
                      className={cn('flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors', p.id === activeProjectId ? 'bg-zinc-800' : 'hover:bg-zinc-800/50')}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="text-zinc-300 truncate">{p.name}</span>
                    </button>
                    <button onClick={() => { setProjectModal(p); setProjDropdown(false); }} className="px-2 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-all"><Edit2 size={11} /></button>
                    <button onClick={() => { deleteProject(p); setProjDropdown(false); }} className="px-2 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all"><Trash2 size={11} /></button>
                  </div>
                ))}
                <div className="border-t border-zinc-800">
                  <button onClick={() => { setProjectModal('new'); setProjDropdown(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors">
                    <Plus size={12} /> New project
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />
        <span className="text-zinc-600 text-xs hidden sm:block">{totalCards} card{totalCards !== 1 ? 's' : ''}</span>
        <button
          onClick={() => setProjectModal('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF' }}
        >
          <Plus size={12} /> New Project
        </button>
      </div>

      {/* No projects empty state */}
      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <LayoutDashboard size={28} className="text-violet-500" />
          </div>
          <div>
            <p className="text-zinc-200 font-medium text-lg">No projects yet</p>
            <p className="text-zinc-500 text-sm mt-1">Create your first project board to start organizing work.</p>
          </div>
          <button
            onClick={() => setProjectModal('new')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', color: '#00D4FF' }}
          >
            <Plus size={14} /> Create First Project
          </button>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="px-6 pt-4 pb-2 shrink-0">
            <FilterBar value={filter} onChange={setFilter} />
          </div>

          {/* Board */}
          <div className="flex-1 overflow-hidden px-6 pt-2">
            {boardLoading ? (
              <div className="flex items-center justify-center h-full">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,212,255,0.3)', letterSpacing: '0.12em' }}>LOADING BOARD…</span>
              </div>
            ) : (
              <>
                {/* Rename column inline dialog */}
                {renamingCol && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setRenamingCol(null)}>
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative rounded-xl p-4 space-y-3 w-72"
                      style={{ background: 'rgba(10,14,22,0.98)', border: '1px solid rgba(0,212,255,0.15)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-zinc-300 text-sm font-medium">Rename column</p>
                      <input
                        autoFocus
                        defaultValue={renamingCol.title}
                        onKeyDown={e => { if (e.key === 'Enter') renameColumn(renamingCol, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setRenamingCol(null); }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setRenamingCol(null)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 transition-colors">Cancel</button>
                        <button onClick={e => { const input = (e.currentTarget.parentElement?.parentElement?.querySelector('input') as HTMLInputElement); renameColumn(renamingCol, input.value); }} className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }}>Rename</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick add card inline */}
                {addingCard && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setAddingCard(null)}>
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative rounded-xl p-4 space-y-3 w-80"
                      style={{ background: 'rgba(10,14,22,0.98)', border: '1px solid rgba(0,212,255,0.15)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-zinc-300 text-sm font-medium">New Card</p>
                      <input
                        autoFocus
                        value={addingCard.title}
                        onChange={e => setAddingCard({ ...addingCard, title: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') addCard(addingCard.columnId, addingCard.title); if (e.key === 'Escape') setAddingCard(null); }}
                        placeholder="Card title…"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setAddingCard(null)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 transition-colors">Cancel</button>
                        <button onClick={() => addCard(addingCard.columnId, addingCard.title)} className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }}>Add Card</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add column inline */}
                {addingColumn && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setAddingColumn(false)}>
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative rounded-xl p-4 space-y-3 w-72"
                      style={{ background: 'rgba(10,14,22,0.98)', border: '1px solid rgba(0,212,255,0.15)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-zinc-300 text-sm font-medium">New Column</p>
                      <input
                        autoFocus
                        value={newColTitle}
                        onChange={e => setNewColTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') setAddingColumn(false); }}
                        placeholder="Column name…"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setAddingColumn(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 transition-colors">Cancel</button>
                        <button onClick={addColumn} className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }}>Add</button>
                      </div>
                    </div>
                  </div>
                )}

                <KanbanBoard
                  columns={columns}
                  cardsByColumn={cardsByColumn}
                  filter={filter}
                  onColumnsChange={setColumns}
                  onCardsChange={setCardsByColumn}
                  onAddCard={(colId) => setAddingCard({ columnId: colId, title: '' })}
                  onOpenCard={setEditingCard}
                  onRenameColumn={setRenamingCol}
                  onDeleteColumn={deleteColumn}
                  onAddColumn={() => { setNewColTitle(''); setAddingColumn(true); }}
                  onSavePositions={savePositions}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {projectModal && (
        <ProjectModal
          project={projectModal === 'new' ? undefined : projectModal}
          onClose={() => setProjectModal(null)}
          onSave={onProjectSaved}
        />
      )}

      {editingCard && (
        <CardModal
          card={editingCard}
          columns={columns}
          onClose={() => setEditingCard(null)}
          onUpdate={updateCard}
          onDelete={deleteCard}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={confirmDelete.message}
          onConfirm={confirmDelete.onConfirm}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
