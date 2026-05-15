import { v4 as uuidv4 } from 'uuid';
import { registry } from '@/lib/registry';
import type { OrchestratorIntent, ActionResult, ChatMessage } from '@/types';

export interface OrchestratorResponse {
  message: ChatMessage;
  intent?: OrchestratorIntent;
}

/**
 * Resolves a natural-language message to a module action intent.
 *
 * This is a lightweight keyword-based resolver used as a scaffold.
 * Replace this with an LLM-based intent classifier when ready.
 * The `examples` field on each ModuleAction is designed for few-shot prompting.
 */
function resolveIntent(userMessage: string): OrchestratorIntent | null {
  const lower = userMessage.toLowerCase();
  const allActions = registry.getAllActions();

  let bestMatch: { action: (typeof allActions)[0]; score: number } | null = null;

  for (const action of allActions) {
    // Score based on keyword overlap with action name, description, and examples
    const corpus = [
      action.name,
      action.description,
      ...action.examples,
    ]
      .join(' ')
      .toLowerCase();

    const words = lower.split(/\s+/).filter((w) => w.length > 3);
    const matches = words.filter((w) => corpus.includes(w)).length;
    const score = words.length > 0 ? matches / words.length : 0;

    if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { action, score };
    }
  }

  if (!bestMatch) return null;

  return {
    moduleId: bestMatch.action.moduleId,
    actionId: bestMatch.action.id,
    parameters: extractParameters(userMessage, bestMatch.action.parameters),
    confidence: bestMatch.score,
  };
}

/**
 * Naive parameter extraction from a message string.
 * In production, this is where LLM structured output would slot in.
 */
function extractParameters(
  message: string,
  parameters: { name: string; type: string; required: boolean }[]
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  // Very simple date extraction
  const dateMatch = message.match(
    /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}(?:am|pm))\b/i
  );
  if (dateMatch) {
    const hasDateParam = parameters.find((p) => p.type === 'date');
    if (hasDateParam) params[hasDateParam.name] = dateMatch[0];
  }

  // Extract quoted strings as potential title/name fields
  const quotedMatch = message.match(/"([^"]+)"/);
  if (quotedMatch) {
    const textParam = parameters.find(
      (p) => p.name === 'title' || p.name === 'name'
    );
    if (textParam) params[textParam.name] = quotedMatch[1];
  }

  return params;
}

export async function processMessage(
  userMessage: string
): Promise<OrchestratorResponse> {
  const intent = resolveIntent(userMessage);

  if (!intent) {
    return {
      message: {
        id: uuidv4(),
        role: 'assistant',
        content:
          "I'm not sure how to help with that yet. Try asking about your calendar or Trello boards.",
        timestamp: new Date(),
      },
    };
  }

  const action = registry.getAction(intent.moduleId, intent.actionId);
  if (!action) {
    return {
      message: {
        id: uuidv4(),
        role: 'assistant',
        content: `I found an intent for "${intent.actionId}" but the action is not available.`,
        timestamp: new Date(),
      },
    };
  }

  let result: ActionResult;
  try {
    result = await action.execute(intent.parameters);
  } catch (err) {
    result = {
      success: false,
      message: `Action failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  return {
    message: {
      id: uuidv4(),
      role: 'assistant',
      content: result.message,
      timestamp: new Date(),
      actionResult: result,
    },
    intent,
  };
}
