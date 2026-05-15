'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadData, saveData } from '@/lib/habit-tracker/store';
import type { HabitTrackerData } from '@/lib/habit-tracker/store';
import { HabitGrid } from './HabitGrid';
import { HabitChart } from './HabitChart';
import { EditPanel } from './EditPanel';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function HabitTrackerPage() {
  const now = new Date();
  const [data, setData] = useState<HabitTrackerData | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const loaded = loadData();
    setData(loaded);
    setActiveUserId(loaded.users[0]?.id ?? null);
  }, []);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    const atCurrent = year === now.getFullYear() && month === now.getMonth();
    if (atCurrent) return;
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const handleToggle = useCallback((key: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const next: HabitTrackerData = {
        ...prev,
        log: { ...prev.log, [key]: !prev.log[key] },
      };
      saveData(next);
      return next;
    });
  }, []);

  function handleSaveEdit(updated: HabitTrackerData) {
    setData(updated);
    saveData(updated);
    setEditOpen(false);
    // Keep active user selection valid after edit
    if (!updated.users.find((u) => u.id === activeUserId)) {
      setActiveUserId(updated.users[0]?.id ?? null);
    }
  }

  if (!data) return null;

  const activeUser = data.users.find((u) => u.id === activeUserId);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <Target size={20} className="text-blue-400" />
        <h1 className="text-zinc-100 text-xl font-semibold">Habit Tracker</h1>
        <button
          onClick={() => setEditOpen(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <Settings size={13} />
          Settings
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* User tabs */}
        <div className="flex gap-2">
          {data.users.map((u) => (
            <button
              key={u.id}
              onClick={() => setActiveUserId(u.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors border',
                activeUserId === u.id
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
              )}
            >
              {u.name}
            </button>
          ))}
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-zinc-200 text-sm font-medium w-36 text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-20"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Grid */}
        {activeUser && (
          <HabitGrid
            user={activeUser}
            year={year}
            month={month}
            log={data.log}
            onToggle={handleToggle}
          />
        )}

        {/* Chart */}
        {activeUser && (
          <HabitChart
            user={activeUser}
            year={year}
            month={month}
            log={data.log}
          />
        )}
      </div>

      {editOpen && data && (
        <EditPanel
          data={data}
          onSave={handleSaveEdit}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
