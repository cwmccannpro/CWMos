import type { ComponentType } from 'react';

// ─── Module Identity ────────────────────────────────────────────────────────

export type ModuleId = string;

export interface ModuleMetadata {
  id: ModuleId;
  name: string;
  description: string;
  /** lucide-react icon name */
  icon: string;
  version: string;
}

export interface ModuleRoute {
  path: string;
  label: string;
  icon?: string;
}

// ─── Widget System ───────────────────────────────────────────────────────────

export interface WidgetProps {
  widgetInstanceId: string;
  moduleId: ModuleId;
  /** Per-instance config stored in dashboard layout */
  config: Record<string, unknown>;
}

/** Props passed to a widget's settings panel component */
export interface WidgetSettingsProps {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export interface WidgetDefinition {
  /** Stable identifier for this widget type, unique within a module */
  id: string;
  moduleId: ModuleId;
  name: string;
  description: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  component: ComponentType<WidgetProps>;
  /** Optional settings panel. Rendered inside the widget chrome when user opens settings. */
  settingsComponent?: ComponentType<WidgetSettingsProps>;
  /** If true, the widget wrapper removes its inner padding (e.g. for grid-style widgets). */
  noPadding?: boolean;
}

/** A placed widget instance on the dashboard grid */
export interface WidgetLayoutItem {
  /** Unique instance id (one definition can be placed multiple times) */
  instanceId: string;
  /** Which WidgetDefinition this instance uses */
  definitionId: string;
  moduleId: ModuleId;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Per-instance configuration (board selection, user selection, etc.) */
  config?: Record<string, unknown>;
}

export interface DashboardLayout {
  items: WidgetLayoutItem[];
}

// ─── Action System ───────────────────────────────────────────────────────────

export type ActionParameterType = 'string' | 'number' | 'boolean' | 'date' | 'enum';

export interface ActionParameter {
  name: string;
  type: ActionParameterType;
  description: string;
  required: boolean;
  /** Only for type = 'enum' */
  options?: string[];
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ModuleAction {
  id: string;
  moduleId: ModuleId;
  name: string;
  description: string;
  /** Natural-language examples the orchestrator can use for intent matching */
  examples: string[];
  parameters: ActionParameter[];
  execute: (params: Record<string, unknown>) => Promise<ActionResult>;
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export type Permission =
  | 'calendar:read'
  | 'calendar:write'
  | 'trello:read'
  | 'trello:write'
  | 'agent-manager:read'
  | 'agent-manager:write'
  | 'viridian-systems:read'
  | 'content-factory:read'
  | 'habit-tracker:read'
  | 'habit-tracker:write';

// ─── Module Contract ─────────────────────────────────────────────────────────

export interface ModuleDefinition {
  metadata: ModuleMetadata;
  routes: ModuleRoute[];
  widgets: WidgetDefinition[];
  actions: ModuleAction[];
  permissions: Permission[];
}

// ─── Master Controller ────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actionResult?: ActionResult;
}

export interface OrchestratorIntent {
  moduleId: ModuleId;
  actionId: string;
  parameters: Record<string, unknown>;
  confidence: number;
}
