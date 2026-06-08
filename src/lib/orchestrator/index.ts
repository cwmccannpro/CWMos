import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { registry } from '@/lib/registry';
import type { OrchestratorIntent, ActionResult, ChatMessage } from '@/types';
import type {
  ChatCompletionTool,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';

export interface OrchestratorResponse {
  message: ChatMessage;
  intent?: OrchestratorIntent;
}

// Lazily instantiated: the OpenAI SDK throws at construction when no API key is
// present, and this module gets imported during `next build` page-data collection
// (where the build env has no OPENAI_API_KEY). Constructing on first use keeps the
// import side-effect-free. processMessage only calls this after the key check.
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  return (_client ??= new OpenAI());
}

// Model is overridable via env so the brain can be swapped without code changes.
// Defaults to a fast, inexpensive chat model that supports function calling.
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

function buildSystemPrompt(): string {
  const moduleNames = registry.getAllModules().map((m) => m.metadata.name);
  const moduleList = moduleNames.length
    ? moduleNames.join(', ')
    : 'various modules';
  return `You are CTRL, the AI core of CTRLpanel — a personal life-OS command center.
You have access to the user's data through registered module tools: ${moduleList}.
Be sharp, concise, and direct. Keep responses to 1-3 sentences unless displaying data.
When you run a tool, summarize the result naturally — don't just repeat raw data.
If you can't help with something, say so in one sentence.
Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
}

// Map a module action parameter onto a JSON-schema property the model understands.
function paramToSchema(type: string, options?: string[]) {
  switch (type) {
    case 'date':
      return { type: 'string' as const, description: 'ISO 8601 date string' };
    case 'enum':
      return { type: 'string' as const, ...(options ? { enum: options } : {}) };
    default:
      return { type };
  }
}

function buildTools(): ChatCompletionTool[] {
  return registry.getAllActions().map((action) => {
    const properties: Record<string, unknown> = {};
    for (const p of action.parameters) {
      properties[p.name] = { ...paramToSchema(p.type, p.options), description: p.name };
    }
    return {
      type: 'function',
      function: {
        name: `${action.moduleId}__${action.id}`,
        description: `${action.description}. Examples: ${action.examples.join(' | ')}`,
        parameters: {
          type: 'object',
          properties,
          required: action.parameters.filter((p) => p.required).map((p) => p.name),
        },
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
  if (!process.env.OPENAI_API_KEY) {
    return fallbackResponse('AI brain offline — OPENAI_API_KEY not configured.');
  }

  const tools = buildTools();
  const SYSTEM_PROMPT = buildSystemPrompt();

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await getClient().chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1024,
      messages,
      ...(tools.length ? { tools } : {}),
    });
  } catch (err) {
    return fallbackResponse(`Connection error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  const responseMessage = completion.choices[0]?.message;
  const toolCall = responseMessage?.tool_calls?.[0];

  // ChatGPT wants to execute an action
  if (responseMessage && toolCall?.type === 'function') {
    const [moduleId, actionId] = toolCall.function.name.split('__');
    const action = registry.getAction(moduleId, actionId);
    if (!action) return fallbackResponse(`Action "${toolCall.function.name}" not registered.`);

    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(toolCall.function.arguments || '{}');
    } catch {
      // Malformed arguments — fall through with empty input; the action validates.
    }

    let result: ActionResult;
    try {
      result = await action.execute(input);
    } catch (err) {
      result = {
        success: false,
        message: `Action failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }

    // Send the tool result back so ChatGPT can craft a natural reply
    let followUp: OpenAI.Chat.Completions.ChatCompletion;
    try {
      followUp = await getClient().chat.completions.create({
        model: MODEL,
        max_completion_tokens: 512,
        messages: [
          ...messages,
          responseMessage,
          { role: 'tool', tool_call_id: toolCall.id, content: result.message },
        ],
        ...(tools.length ? { tools } : {}),
      });
    } catch {
      // Fall back to raw action message if the second call fails
      return {
        message: { id: uuidv4(), role: 'assistant', content: result.message, timestamp: new Date(), actionResult: result },
        intent: { moduleId, actionId, parameters: input, confidence: 1 },
      };
    }

    const text = followUp.choices[0]?.message?.content;
    return {
      message: {
        id: uuidv4(),
        role: 'assistant',
        content: text ?? result.message,
        timestamp: new Date(),
        actionResult: result,
      },
      intent: { moduleId, actionId, parameters: input, confidence: 1 },
    };
  }

  // Pure conversational reply
  return fallbackResponse(responseMessage?.content ?? 'No response generated.');
}
