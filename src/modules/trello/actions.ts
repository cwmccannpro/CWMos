import { trelloAdapter } from '@/lib/adapters/trello/trello-api-adapter';
import type { ModuleAction, ActionResult } from '@/types';

const MODULE_ID = 'trello';

export const trelloActions: ModuleAction[] = [
  {
    id: 'get-boards',
    moduleId: MODULE_ID,
    name: 'Get Boards',
    description: 'List all available Trello boards',
    examples: [
      'Show me my Trello boards',
      "What boards do I have?",
      'List my project boards',
    ],
    parameters: [],
    async execute(): Promise<ActionResult> {
      const boards = await trelloAdapter.getBoards();
      if (boards.length === 0) {
        return { success: true, message: 'No boards found.', data: [] };
      }
      const list = boards.map((b) => `• ${b.name}`).join('\n');
      return {
        success: true,
        message: `Your Trello boards:\n${list}`,
        data: boards,
      };
    },
  },

  {
    id: 'create-card',
    moduleId: MODULE_ID,
    name: 'Create Card',
    description: 'Create a new Trello card on a board',
    examples: [
      'Create a Trello card to update homepage copy',
      'Add a card for the bug fix to the backlog',
      'Create a task card in Product Backlog',
    ],
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Card title',
        required: true,
      },
      {
        name: 'listId',
        type: 'string',
        description: 'Target list ID',
        required: true,
      },
      {
        name: 'desc',
        type: 'string',
        description: 'Optional card description',
        required: false,
      },
    ],
    async execute(params): Promise<ActionResult> {
      const name = (params.name as string) || 'New Card';
      const listId = params.listId as string;

      if (!listId) {
        return { success: false, message: 'A listId is required to create a card.' };
      }

      const card = await trelloAdapter.createCard({ name, listId, desc: params.desc as string | undefined });

      return {
        success: true,
        message: `Created Trello card "${card.name}".`,
        data: card,
      };
    },
  },

  {
    id: 'move-card',
    moduleId: MODULE_ID,
    name: 'Move Card',
    description: 'Move a Trello card to a different list',
    examples: ['Move the homepage card to In Progress', 'Mark the bug fix card as done'],
    parameters: [
      { name: 'cardId', type: 'string', description: 'Card ID', required: true },
      { name: 'listId', type: 'string', description: 'Target list ID', required: true },
    ],
    async execute(params): Promise<ActionResult> {
      const cardId = params.cardId as string;
      const listId = params.listId as string;
      if (!cardId || !listId) {
        return { success: false, message: 'cardId and listId are required.' };
      }
      const card = await trelloAdapter.moveCard(cardId, listId);
      return {
        success: true,
        message: `Moved card "${card.name}".`,
        data: card,
      };
    },
  },

  {
    id: 'archive-card',
    moduleId: MODULE_ID,
    name: 'Archive Card',
    description: 'Archive (remove) a Trello card',
    examples: ['Archive the done cards', 'Remove the stale backlog item'],
    parameters: [
      { name: 'cardId', type: 'string', description: 'Card ID to archive', required: true },
    ],
    async execute(params): Promise<ActionResult> {
      const cardId = params.cardId as string;
      if (!cardId) return { success: false, message: 'cardId is required.' };
      await trelloAdapter.archiveCard(cardId);
      return { success: true, message: 'Card archived.' };
    },
  },
];
