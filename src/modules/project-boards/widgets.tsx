'use client';

import { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard } from 'lucide-react';
import type { WidgetProps, WidgetSettingsProps } from '@/types';

// Lightweight local shapes — the widget only needs a read-only slice of the board.
interface BoardProject { id: string; name: string; color: string }
interface BoardColumn  { id: string; title: string; position: number }
interface BoardCard    { id: string; column_id: string; title: string; priority: string; position: number }

const PRIORITY_DOT: Record<string, string> = {
  low: '#52525b', medium: '#3b82f6', high: '#f59e0b', urgent: '#f43f5e',
};

async function fetchProjects(): Promise<BoardProject[]> {
  const res = await fetch('/api/project-boards/projects');
  if (!res.ok) return [];
  return res.json();
}

async function fetchBoard(projectId: string): Promise<{ columns: BoardColumn[]; cards: BoardCard[] }> {
  const res = await fetch(`/api/project-boards/board?project_id=${projectId}`);
  if (!res.ok) return { columns: [], cards: [] };
  return res.json();
}

// ─── Settings panel — pick which project the widget shows ──────────────────────

export function ProjectBoardSettings({ config, onConfigChange }: WidgetSettingsProps) {
  const [projects, setProjects] = useState<BoardProject[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingColumns, setLoadingColumns] = useState(false);

  const selectedProject = config.projectId as string | undefined;
  const selectedColumn  = config.columnId as string | undefined;

  useEffect(() => { fetchProjects().then(setProjects).finally(() => setLoadingProjects(false)); }, []);

  // Columns belong to a project, so list them for the chosen project — or the
  // first project, which is what the widget falls back to when none is set.
  const effectiveProjectId = selectedProject || projects[0]?.id;

  useEffect(() => {
    if (!effectiveProjectId) { setColumns([]); return; }
    setLoadingColumns(true);
    fetchBoard(effectiveProjectId)
      .then(({ columns: cols }) => setColumns([...cols].sort((a, b) => a.position - b.position)))
      .finally(() => setLoadingColumns(false));
  }, [effectiveProjectId]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Project</label>
        {loadingProjects ? (
          <div className="h-7 bg-zinc-800 rounded animate-pulse" />
        ) : (
          <select
            value={selectedProject ?? ''}
            // Reset the column when the project changes — the old column id no longer applies.
            onChange={(e) => onConfigChange({ ...config, projectId: e.target.value, columnId: '' })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500"
          >
            <option value="">First project (default)</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      <div>
        <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Column</label>
        {loadingColumns ? (
          <div className="h-7 bg-zinc-800 rounded animate-pulse" />
        ) : (
          <select
            value={selectedColumn ?? ''}
            onChange={(e) => onConfigChange({ ...config, columnId: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500"
          >
            <option value="">All columns</option>
            {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function ProjectBoardWidget({ config }: WidgetProps) {
  const [project, setProject] = useState<BoardProject | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [cards, setCards]     = useState<BoardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty]     = useState(false);

  const configProjectId = config.projectId as string | undefined;

  const load = useCallback(async () => {
    setLoading(true);
    const projects = await fetchProjects();
    if (!projects.length) { setEmpty(true); setLoading(false); return; }
    setEmpty(false);
    // Use the configured project if it still exists, else fall back to the first.
    const target = projects.find((p) => p.id === configProjectId) ?? projects[0];
    setProject(target);
    const { columns: cols, cards: cds } = await fetchBoard(target.id);
    setColumns([...cols].sort((a, b) => a.position - b.position));
    setCards(cds);
    setLoading(false);
  }, [configProjectId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" /></div>;
  }

  if (empty) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-1.5">
        <LayoutDashboard size={20} className="text-violet-500/60" />
        <p className="text-zinc-500 text-xs">No projects yet</p>
        <p className="text-zinc-700 text-[10px]">Create one in Project Boards</p>
      </div>
    );
  }

  // Show one pinned column if configured (and it still exists); otherwise all.
  const configColumnId = config.columnId as string | undefined;
  let visibleColumns = columns;
  if (configColumnId) {
    const found = columns.filter((c) => c.id === configColumnId);
    if (found.length) visibleColumns = found;
  }
  const singleColumn = visibleColumns.length === 1;
  const cap = singleColumn ? 12 : 4;
  const visibleColIds = new Set(visibleColumns.map((c) => c.id));
  const total = cards.filter((c) => visibleColIds.has(c.column_id)).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: project?.color ?? '#8B5CF6' }} />
        <span className="text-zinc-200 text-sm font-medium truncate">{project?.name}</span>
        {singleColumn && (
          <span className="text-violet-300/80 text-[11px] truncate shrink-0">· {visibleColumns[0].title}</span>
        )}
        <span className="text-zinc-600 text-[10px] ml-auto shrink-0">{total} card{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Columns (vertical sections so it reads well at any width) */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {visibleColumns.map((col) => {
          const colCards = cards
            .filter((c) => c.column_id === col.id)
            .sort((a, b) => a.position - b.position);
          return (
            <div key={col.id}>
              {/* Hide the per-column label when a single column is pinned — it's already in the header */}
              {!singleColumn && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium truncate">{col.title}</span>
                  <span className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 rounded-full shrink-0">{colCards.length}</span>
                </div>
              )}
              <div className="space-y-1">
                {colCards.slice(0, cap).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                    style={{ background: 'rgba(16,22,34,0.7)', border: '1px solid rgba(0,212,255,0.06)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_DOT[c.priority] ?? '#52525b' }} />
                    <span className="text-zinc-300 text-xs truncate">{c.title}</span>
                  </div>
                ))}
                {colCards.length === 0 && <p className="text-zinc-700 text-[10px] px-2">No cards</p>}
                {colCards.length > cap && <p className="text-zinc-600 text-[10px] px-2">+{colCards.length - cap} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
