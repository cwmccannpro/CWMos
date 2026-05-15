'use client';

import { useState } from 'react';
import { X, Plus, Trash2, UserRound } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import type { HabitTrackerData, HabitUser } from '@/lib/habit-tracker/store';

interface Props {
  data: HabitTrackerData;
  onSave: (data: HabitTrackerData) => void;
  onClose: () => void;
}

export function EditPanel({ data, onSave, onClose }: Props) {
  const [users, setUsers] = useState<HabitUser[]>(
    JSON.parse(JSON.stringify(data.users))
  );
  const [activeUserId, setActiveUserId] = useState(users[0]?.id ?? '');
  const [newHabitName, setNewHabitName] = useState('');

  const activeUser = users.find((u) => u.id === activeUserId);

  function updateUserName(userId: string, name: string) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, name } : u)));
  }

  function addUser() {
    const u: HabitUser = { id: uuidv4(), name: 'New Person', habits: [] };
    setUsers((prev) => [...prev, u]);
    setActiveUserId(u.id);
  }

  function addHabit() {
    if (!newHabitName.trim() || !activeUser) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === activeUserId
          ? { ...u, habits: [...u.habits, { id: uuidv4(), name: newHabitName.trim() }] }
          : u
      )
    );
    setNewHabitName('');
  }

  function updateHabitName(habitId: string, name: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === activeUserId
          ? { ...u, habits: u.habits.map((h) => (h.id === habitId ? { ...h, name } : h)) }
          : u
      )
    );
  }

  function deleteHabit(habitId: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === activeUserId
          ? { ...u, habits: u.habits.filter((h) => h.id !== habitId) }
          : u
      )
    );
  }

  function reorderHabit(habitId: string, dir: -1 | 1) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== activeUserId) return u;
        const idx = u.habits.findIndex((h) => h.id === habitId);
        if (idx < 0) return u;
        const next = [...u.habits];
        const target = idx + dir;
        if (target < 0 || target >= next.length) return u;
        [next[idx], next[target]] = [next[target], next[idx]];
        return { ...u, habits: next };
      })
    );
  }

  function save() {
    onSave({ ...data, users });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-zinc-100 font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* People tabs */}
          <div>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">People</p>
            <div className="flex gap-2 flex-wrap">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setActiveUserId(u.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-colors border',
                    activeUserId === u.id
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                  )}
                >
                  {u.name}
                </button>
              ))}
              <button
                onClick={addUser}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-zinc-800 text-zinc-500 border border-dashed border-zinc-700 hover:text-zinc-300 transition-colors"
              >
                <Plus size={12} />
                Add person
              </button>
            </div>
          </div>

          {activeUser && (
            <>
              {/* Name */}
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Display name</p>
                <div className="flex items-center gap-2">
                  <UserRound size={14} className="text-zinc-500 shrink-0" />
                  <input
                    value={activeUser.name}
                    onChange={(e) => updateUserName(activeUser.id, e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/60 transition-colors"
                  />
                </div>
              </div>

              {/* Habits */}
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">
                  Habits ({activeUser.habits.length})
                </p>
                <div className="space-y-2">
                  {activeUser.habits.map((habit, idx) => (
                    <div key={habit.id} className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => reorderHabit(habit.id, -1)}
                          disabled={idx === 0}
                          className="text-zinc-600 hover:text-zinc-400 disabled:opacity-20 leading-none"
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => reorderHabit(habit.id, 1)}
                          disabled={idx === activeUser.habits.length - 1}
                          className="text-zinc-600 hover:text-zinc-400 disabled:opacity-20 leading-none text-[8px]"
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>
                      <input
                        value={habit.name}
                        onChange={(e) => updateHabitName(habit.id, e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/60 transition-colors"
                      />
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0"
                        title="Delete habit"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Add new habit */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-6 shrink-0" />
                    <input
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addHabit(); }}
                      placeholder="New habit…"
                      className="flex-1 bg-zinc-800 border border-dashed border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-blue-500/50 placeholder:text-zinc-600 transition-colors"
                    />
                    <button
                      onClick={addHabit}
                      disabled={!newHabitName.trim()}
                      className="p-1.5 rounded text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                      title="Add habit"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-zinc-400 text-sm hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
