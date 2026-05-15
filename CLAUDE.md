# CLAUDE.md

## Project
This repository is for **CWM Control Center**, a modular command-center web application.

The app is designed around:
- a persistent left sidebar
- a customizable home dashboard with draggable/resizable widgets
- a global Master Controller chat interface
- modules that can be added over time
- integrations that should remain isolated behind adapters/services

Initial modules:
- Home Dashboard
- iCalendar
- Trello

Future modules may include:
- Notes
- CRM
- Email
- Files
- Goals/Habits
- Social planning
- Finance

---

## Core philosophy
Prioritize **modularity, extensibility, and maintainability**.

This codebase should feel like a real platform, not a bundle of unrelated feature pages.

Whenever possible:
- build reusable patterns
- isolate module-specific logic
- keep shared systems generic
- use strong typing
- preserve clean boundaries between layers

---

## Architecture rules

### 1. Module-first architecture
Every major feature module should register itself through a shared module contract.

A module may expose:
- metadata
- navigation info
- routes
- widgets
- actions
- permissions/capabilities

Do not add new modules by scattering logic across unrelated files if a formal module registration pattern exists.

### 2. Master Controller rules
The Master Controller is a cross-module orchestration layer.

Important:
- do not hardcode module-specific execution logic directly into chat UI components
- chat UI should remain a UI layer
- orchestration/routing logic should live in shared orchestration utilities/services
- actual module operations should be invoked through registered module actions

### 3. Adapter/service separation
For external integrations:
- UI components must not talk directly to vendor APIs
- place external API logic in adapters/providers/services
- keep module business logic separate from presentation
- make it possible to swap providers later

Examples:
- calendar providers may later include ICS, Google Calendar, Outlook
- task systems may later include Trello, Notion, Linear, ClickUp

### 4. Dashboard widget system
Dashboard widgets should be modular.

Prefer a design where modules can contribute widget definitions rather than hardcoding all widgets centrally.

Separate:
- widget definitions
- widget layout state
- widget rendering

### 5. Keep shared code clean
Shared systems should stay generic:
- registry
- orchestrator
- layout shell
- dashboard engine
- action types
- persistence models

Avoid leaking module-specific assumptions into shared code.

---

## Preferred stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui patterns
- lucide-react
- Prisma
- PostgreSQL

When writing frontend code:
- prefer small focused components
- use clear prop types
- avoid giant components that mix rendering, business logic, and data wiring

---

## Coding preferences

### General
- favor clarity over cleverness
- write code that is easy to extend later
- avoid premature over-abstraction
- avoid fragile shortcuts
- use descriptive names
- keep folder placement intentional

### Types
- define shared types for core contracts
- prefer explicit interfaces/types for modules, widgets, actions, and integration entities
- avoid loose `any` unless there is a strong reason

### Components
- keep components presentational when possible
- move orchestration/business logic into hooks, services, or lib modules
- use composition instead of overstuffed files

### Comments
- only add comments where they improve maintainability
- use comments especially around orchestration boundaries or architectural assumptions

---

## Folder intent
This is the intended mental model of the codebase:

- `src/app` → routes, layouts, page composition
- `src/components` → reusable UI building blocks
- `src/modules` → self-contained feature modules
- `src/lib/registry` → module registration/discovery
- `src/lib/orchestrator` → Master Controller routing/execution logic
- `src/lib/adapters` → external system adapters/providers
- `src/lib/db` → database-related utilities
- `src/types` → shared contracts and domain types

Keep this structure coherent as the project grows.

---

## How to respond while coding
When implementing tasks in this repository:
- make the best architectural choice, not just the fastest one
- briefly explain important structural decisions
- point out tradeoffs when relevant
- after changes, summarize:
  1. what was added/changed
  2. why the structure makes sense
  3. what the best next step is

If something is ambiguous, choose the most scalable reasonable interpretation unless the ambiguity would meaningfully change the product.

---

## Current product priorities
In early development, prioritize this order:
1. app shell and sidebar
2. module registry foundation
3. dashboard widget framework
4. Master Controller orchestration shell
5. iCalendar integration layer
6. Trello integration layer
7. persistence/auth/settings

---

## Anti-patterns to avoid
Avoid these unless explicitly requested:
- hardcoding module behavior into shared systems
- mixing API logic directly into UI components
- giant files with multiple responsibilities
- one-off logic that breaks future module scalability
- inconsistent type shapes across modules
- overusing global state when local/module state is enough

---

## Definition of success
A good implementation in this repo should:
- make future modules easier to add
- keep the Master Controller generic
- keep integrations swappable
- keep the dashboard extensible
- feel like one coherent platform