'use client';

import { Bot, Circle, Clock, Activity } from 'lucide-react';

const MOCK_AGENTS: {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'error';
  task: string;
  started: string;
}[] = [];

const statusColor = {
  running: 'text-green-400',
  idle: 'text-zinc-500',
  error: 'text-red-400',
};

export default function AgentManagerPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <Bot size={20} className="text-blue-400" />
        <h1 className="text-zinc-100 text-xl font-semibold">Agent Manager</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-zinc-600 text-xs">
            {MOCK_AGENTS.filter((a) => a.status === 'running').length} running
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {MOCK_AGENTS.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Bot size={24} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-zinc-400 font-medium">No agents running</p>
              <p className="text-zinc-600 text-sm mt-1 max-w-sm">
                Active agents will appear here — see their current task, status, and live activity logs.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {MOCK_AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="flex items-start gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl"
              >
                <div className="mt-0.5">
                  <Circle size={8} className={`fill-current ${statusColor[agent.status]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200 font-medium text-sm">{agent.name}</span>
                    <span className={`text-xs ${statusColor[agent.status]}`}>{agent.status}</span>
                  </div>
                  <p className="text-zinc-500 text-sm mt-0.5 truncate">{agent.task}</p>
                </div>
                <div className="flex items-center gap-1 text-zinc-600 text-xs shrink-0">
                  <Clock size={11} />
                  <span>{agent.started}</span>
                </div>
                <button className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                  <Activity size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
