import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { registry } from '@/lib/registry';
import type { OrchestratorIntent, ActionResult, ChatMessage } from '@/types';

export interface OrchestratorResponse {
  message: ChatMessage;
  intent?: OrchestratorIntent;
}

const client = new Anthropic();

const SYSTEM_PROMPT = `You are CTRL, the AI core of CTRLpanel — a personal life-OS command center.
You have access to the user's calendar, Trello boards, and other tools through registered functions.
Be sharp, concise, and direct. Keep responses to 1-3 sentences unless displaying data.
When you run a tool, summarize the result naturally — don't just repeat raw data.
If you can't help with something, say so in one sentence.
Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

function buildTools(): Anthropic.Tool[] {
  return registry.getAllActions().map((action) => {
    const properties: Record<string, { type: string; description: string }> = {};
    for (const p of action.parameters) {
      properties[p.name] = {
        type: p.type === 'date' ? 'string' : p.type,
        description: p.name,
      };
    }
    return {
      name: `${action.moduleId}__${action.id}`,
      description: `${action.description}. Examples: ${action.examples.join(' | ')}`,
      input_schema: {
        type: 'object' as const,
        properties,
        required: action.parameters.filter((p) => p.required).map((p) => p.name),
      },
    };
  });
}

function fallbackResponse(content: string): OrchestratorResponse {
  return {
    message: { id: uuidv4(), role: 'assistant', content, timestamp: new Date() },
  };
}

export async function processMessage(userMessage: string): Promise<OrchestratorResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackResponse('AI brain offline — ANTHROPIC_API_KEY not configured.');
  }

  const tools = buildTools();

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (err) {
    return fallbackResponse(`Connection error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  // Claude wants to execute an action
  if (response.stop_reason === 'tool_use') {
    const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!toolBlock) return fallbackResponse('Tool call malformed.');

    const [moduleId, actionId] = toolBlock.name.split('__');
    const action = registry.getAction(moduleId, actionId);
    if (!action) return fallbackResponse(`Action "${toolBlock.name}" not registered.`);

    let result: ActionResult;
    try {
      result = await action.execute(toolBlock.input as Record<string, unknown>);
    } catch (err) {
      result = {
        success: false,
        message: `Action failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }

    // Send tool result back so Claude can craft a natural reply
    let followUp: Anthropic.Message;
    try {
      followUp = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        tools,
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: response.content },
          {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: result.message }],
          },
        ],
      });
    } catch {
      // Fall back to raw action message if second call fails
      return {
        message: { id: uuidv4(), role: 'assistant', content: result.message, timestamp: new Date(), actionResult: result },
        intent: { moduleId, actionId, parameters: toolBlock.input as Record<string, unknown>, confidence: 1 },
      };
    }

    const text = followUp.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    return {
      message: {
        id: uuidv4(),
        role: 'assistant',
        content: text?.text ?? result.message,
        timestamp: new Date(),
        actionResult: result,
      },
      intent: { moduleId, actionId, parameters: toolBlock.input as Record<string, unknown>, confidence: 1 },
    };
  }

  // Pure conversational reply
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return fallbackResponse(text?.text ?? 'No response generated.');
}
