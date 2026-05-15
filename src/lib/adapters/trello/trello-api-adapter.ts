import type {
  TrelloAdapter,
  TrelloBoard,
  TrelloList,
  TrelloCard,
  CreateCardInput,
  UpdateCardInput,
} from './types';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api/trello${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Trello API error: ${res.status}`);
  }
  return res.json();
}

export class TrelloApiAdapter implements TrelloAdapter {
  async getBoards(): Promise<TrelloBoard[]> {
    return apiFetch('/boards');
  }

  async getLists(boardId: string): Promise<TrelloList[]> {
    return apiFetch(`/boards/${boardId}/lists`);
  }

  async getCards(listId: string): Promise<TrelloCard[]> {
    return apiFetch(`/lists/${listId}/cards`);
  }

  async createCard(input: CreateCardInput): Promise<TrelloCard> {
    return apiFetch('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        listId: input.listId,
        desc: input.desc,
        due: input.due,
      }),
    });
  }

  async updateCard(input: UpdateCardInput): Promise<TrelloCard> {
    return apiFetch(`/cards/${input.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        desc: input.desc,
        due: input.due,
      }),
    });
  }

  async moveCard(cardId: string, listId: string): Promise<TrelloCard> {
    return apiFetch(`/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idList: listId }),
    });
  }

  async archiveCard(cardId: string): Promise<void> {
    await apiFetch(`/cards/${cardId}`, { method: 'DELETE' });
  }
}

// Default adapter instance — swap provider by replacing this export
export const trelloAdapter = new TrelloApiAdapter();
