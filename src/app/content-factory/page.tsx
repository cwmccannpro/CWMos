'use client';

import { BarChart3, Plus, TrendingUp, Users, Eye, Heart } from 'lucide-react';

const PLATFORMS = [
  { name: 'YouTube', color: 'text-red-400', bg: 'bg-red-400/10', connected: false },
  { name: 'TikTok', color: 'text-pink-400', bg: 'bg-pink-400/10', connected: false },
  { name: 'Instagram', color: 'text-purple-400', bg: 'bg-purple-400/10', connected: false },
  { name: 'X / Twitter', color: 'text-sky-400', bg: 'bg-sky-400/10', connected: false },
  { name: 'LinkedIn', color: 'text-blue-400', bg: 'bg-blue-400/10', connected: false },
  { name: 'Facebook', color: 'text-indigo-400', bg: 'bg-indigo-400/10', connected: false },
];

const STAT_CARDS = [
  { label: 'Total Views', value: '—', icon: <Eye size={16} />, color: 'text-blue-400' },
  { label: 'Followers', value: '—', icon: <Users size={16} />, color: 'text-green-400' },
  { label: 'Engagements', value: '—', icon: <Heart size={16} />, color: 'text-pink-400' },
  { label: 'Growth', value: '—', icon: <TrendingUp size={16} />, color: 'text-amber-400' },
];

export default function ContentFactoryPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <BarChart3 size={20} className="text-blue-400" />
        <h1 className="text-zinc-100 text-xl font-semibold">Content Factory</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Aggregate stats */}
        <div>
          <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">Overview</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STAT_CARDS.map((stat) => (
              <div key={stat.label} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className={`flex items-center gap-1.5 mb-2 ${stat.color}`}>
                  {stat.icon}
                  <span className="text-xs font-medium">{stat.label}</span>
                </div>
                <p className="text-zinc-300 text-2xl font-semibold">{stat.value}</p>
                <p className="text-zinc-600 text-xs mt-0.5">Connect a platform to see data</p>
              </div>
            ))}
          </div>
        </div>

        {/* Platform connections */}
        <div>
          <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">Platforms</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORMS.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${platform.bg} flex items-center justify-center`}>
                    <span className={`text-xs font-bold ${platform.color}`}>
                      {platform.name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-zinc-200 text-sm font-medium">{platform.name}</p>
                    <p className="text-zinc-600 text-xs">Not connected</p>
                  </div>
                </div>
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
                  <Plus size={11} />
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
