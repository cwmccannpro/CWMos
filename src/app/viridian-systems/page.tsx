'use client';

import { Leaf, ExternalLink, FileText, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

const QUICK_LINKS = [
  {
    label: 'Trello Board',
    description: 'Documentation & Notes board',
    icon: <LayoutDashboard size={16} className="text-blue-400" />,
    href: '/trello',
    internal: true,
  },
];

const SECTIONS = [
  { label: 'Documentation', count: null, description: 'Specs, architecture docs, and runbooks' },
  { label: 'Notes', count: null, description: 'Meeting notes, decisions, and research' },
  { label: 'Tasks', count: null, description: 'Active work items and backlog' },
];

export default function ViridianSystemsPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <Leaf size={20} className="text-green-400" />
        <h1 className="text-zinc-100 text-xl font-semibold">Viridian Systems</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quick links */}
        <div>
          <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">Quick Links</h2>
          <div className="flex gap-3 flex-wrap">
            {QUICK_LINKS.map((link) =>
              link.internal ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group"
                >
                  {link.icon}
                  <div>
                    <p className="text-zinc-200 text-sm font-medium">{link.label}</p>
                    <p className="text-zinc-500 text-xs">{link.description}</p>
                  </div>
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group"
                >
                  {link.icon}
                  <div>
                    <p className="text-zinc-200 text-sm font-medium group-hover:underline">{link.label}</p>
                    <p className="text-zinc-500 text-xs">{link.description}</p>
                  </div>
                  <ExternalLink size={12} className="text-zinc-600 ml-1" />
                </a>
              )
            )}
          </div>
        </div>

        {/* Sections */}
        <div>
          <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">Sections</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SECTIONS.map((section) => (
              <div
                key={section.label}
                className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText size={14} className="text-green-400" />
                  <span className="text-zinc-200 text-sm font-medium">{section.label}</span>
                </div>
                <p className="text-zinc-500 text-xs">{section.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
