// Domain types for the Trello system.
// These are kept adapter-agnostic so the rest of the app never depends on
// Trello's API shape. Future adapters (Notion, Linear) implement this same interface.

export interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

export interface TrelloList {
  id: string;
  name: string;
  boardId: string;
  position: number;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  listId: string;
  boardId: string;
  due?: string | null;
  url: string;
  labels: string[];
}

export interface CreateCardInput {
  name: string;
  desc?: string;
  listId: string;
  due?: string | null;
  labels?: string[];
}

export interface UpdateCardInput extends Partial<CreateCardInput> {
  id: string;
}

/**
 * Provider-agnostic task board adapter interface.
 * Implement this for Trello, Notion, Linear, ClickUp, etc.
 */
export interface TrelloAdapter {
  getBoards(): Promise<TrelloBoard[]>;
  getLists(boardId: string): Promise<TrelloList[]>;
  getCards(listId: string): Promise<TrelloCard[]>;
  createCard(input: CreateCardInput): Promise<TrelloCard>;
  updateCard(input: UpdateCardInput): Promise<TrelloCard>;
  moveCard(cardId: string, listId: string): Promise<TrelloCard>;
  archiveCard(cardId: string): Promise<void>;
}
